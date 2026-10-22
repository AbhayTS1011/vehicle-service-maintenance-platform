const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { test } = require('node:test')

const nextHeaders = require('next/headers')
const originalCookies = nextHeaders.cookies
const originalHeaders = nextHeaders.headers
const sessionCookies = new Map()
nextHeaders.cookies = async () => ({
  set: (name, value, options) => sessionCookies.set(name, { value, options }),
  delete: (name) => sessionCookies.delete(name),
})
nextHeaders.headers = async () => new Headers({ 'x-forwarded-for': '203.0.113.5' })

const { db } = require('../db.ts')
const { loginUser, registerUser } = require('./actions.ts')
const { verifyToken } = require('./jwt.ts')
const { hashPassword, PASSWORD_HASH_ITERATIONS } = require('./password.ts')

const dbMethods = {
  findUnique: db.user.findUnique,
  create: db.user.create,
  updatePasswordHashIfUnchanged: db.user.updatePasswordHashIfUnchanged,
  auditCreate: db.auditLog.create,
  consumeLoginRateLimit: db.auth.consumeLoginRateLimit,
  clearAccountLoginRateLimit: db.auth.clearAccountLoginRateLimit,
}

function mockLoginInfrastructure(overrides = {}) {
  db.auth.consumeLoginRateLimit = overrides.consumeLoginRateLimit || (async () => true)
  db.auth.clearAccountLoginRateLimit = overrides.clearAccountLoginRateLimit || (async () => undefined)
  db.user.updatePasswordHashIfUnchanged = overrides.updatePasswordHashIfUnchanged || (async () => true)
}

test.after(() => {
  nextHeaders.cookies = originalCookies
  nextHeaders.headers = originalHeaders
  db.user.findUnique = dbMethods.findUnique
  db.user.create = dbMethods.create
  db.user.updatePasswordHashIfUnchanged = dbMethods.updatePasswordHashIfUnchanged
  db.auditLog.create = dbMethods.auditCreate
  db.auth.consumeLoginRateLimit = dbMethods.consumeLoginRateLimit
  db.auth.clearAccountLoginRateLimit = dbMethods.clearAccountLoginRateLimit
})

test('registration stores a strong versioned hash and forces CUSTOMER over a submitted admin role', async () => {
  let storedPasswordHash = null
  db.user.findUnique = async () => null
  db.user.create = async ({ data }) => {
    storedPasswordHash = data.passwordHash
    return { id: 41, ...data }
  }
  db.auditLog.create = async () => undefined
  sessionCookies.clear()

  const result = await registerUser({
    name: 'Public Account',
    email: 'public@example.invalid',
    password: 'test-password',
    role: 'ADMIN',
  })

  assert.equal(result.success, true)
  assert.equal(result.user.role, 'CUSTOMER')
  assert.match(storedPasswordHash, /^pbkdf2-sha512\$v=1\$i=220000\$/)
  assert.notEqual(storedPasswordHash, 'test-password')
  const cookie = sessionCookies.get('apex_session')
  assert.ok(cookie)
  assert.equal(cookie.options.httpOnly, true)
  assert.equal(cookie.options.sameSite, 'lax')
  assert.equal((await verifyToken(cookie.value)).userId, 41)
})

test('login verifies the persisted strong hash, retains generic errors and establishes a session', async () => {
  mockLoginInfrastructure()
  const user = {
    id: 72,
    name: 'Existing Customer',
    email: 'customer@example.invalid',
    role: 'CUSTOMER',
    passwordHash: await hashPassword('correct horse battery staple'),
  }
  db.user.findUnique = async ({ where }) => where.email === user.email ? user : null
  sessionCookies.clear()

  const invalid = await loginUser({ email: user.email, password: 'wrong' })
  assert.deepEqual(invalid, { success: false, error: 'Invalid email or password' })
  assert.equal(sessionCookies.has('apex_session'), false)

  const result = await loginUser({ email: user.email.toUpperCase(), password: 'correct horse battery staple' })
  assert.equal(result.success, true)
  assert.equal((await verifyToken(sessionCookies.get('apex_session').value)).userId, user.id)
  assert.equal(result.user.passwordHash, undefined)
})

test('successful login upgrades a legacy hash conditionally and subsequent logins do not rehash', async () => {
  mockLoginInfrastructure()
  const password = 'legacy-password'
  const salt = crypto.randomBytes(16).toString('hex')
  const legacyHash = `${salt}:${crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex')}`
  const user = { id: 91, name: 'Legacy User', email: 'legacy@example.invalid', role: 'CUSTOMER', passwordHash: legacyHash }
  const updates = []
  db.user.findUnique = async () => user
  db.user.updatePasswordHashIfUnchanged = async (input) => {
    updates.push(input)
    if (user.passwordHash !== input.expectedHash) return false
    user.passwordHash = input.nextHash
    return true
  }
  sessionCookies.clear()

  assert.equal((await loginUser({ email: user.email, password })).success, true)
  assert.match(user.passwordHash, /^pbkdf2-sha512\$v=1\$i=220000\$/)
  assert.equal(updates.length, 1)
  assert.equal(updates[0].expectedHash, legacyHash)
  assert.equal(await require('./password.ts').verifyPassword(password, user.passwordHash), true)

  assert.equal((await loginUser({ email: user.email, password })).success, true)
  assert.equal(updates.length, 1)
})

test('a concurrent password change prevents stale login session establishment', async () => {
  mockLoginInfrastructure({ updatePasswordHashIfUnchanged: async () => false })
  const password = 'legacy-password'
  const salt = crypto.randomBytes(16).toString('hex')
  const legacyHash = `${salt}:${crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex')}`
  db.user.findUnique = async () => ({ id: 92, name: 'Legacy User', email: 'race@example.invalid', role: 'CUSTOMER', passwordHash: legacyHash })
  sessionCookies.clear()

  assert.deepEqual(await loginUser({ email: 'race@example.invalid', password }), {
    success: false,
    error: 'Invalid email or password',
  })
  assert.equal(sessionCookies.has('apex_session'), false)
})

test('rate-limit store or rehash persistence failures fail closed with safe errors', async () => {
  let lookups = 0
  db.user.findUnique = async () => { lookups++; return null }
  mockLoginInfrastructure({ consumeLoginRateLimit: async () => { throw new Error('private database details') } })
  sessionCookies.clear()
  assert.deepEqual(await loginUser({ email: 'nobody@example.invalid', password: 'some-password' }), {
    success: false,
    error: 'Login failed. Please try again.',
  })
  assert.equal(lookups, 0, 'rate-limit store failure must stop before account lookup')

  const password = 'legacy-password'
  const salt = crypto.randomBytes(16).toString('hex')
  const legacyHash = `${salt}:${crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex')}`
  db.user.findUnique = async () => ({ id: 93, name: 'Legacy', email: 'rehash@example.invalid', role: 'CUSTOMER', passwordHash: legacyHash })
  mockLoginInfrastructure({ updatePasswordHashIfUnchanged: async () => { throw new Error('private update details') } })
  assert.deepEqual(await loginUser({ email: 'rehash@example.invalid', password }), {
    success: false,
    error: 'Login failed. Please try again.',
  })
  assert.equal(sessionCookies.has('apex_session'), false)
  assert.equal(PASSWORD_HASH_ITERATIONS, 220_000)
})

test('account throttling has the same public error for known and unknown users and blocks before lookup', async () => {
  let lookups = 0
  db.user.findUnique = async () => { lookups++; return { id: 99 } }
  mockLoginInfrastructure({ consumeLoginRateLimit: async () => false })
  sessionCookies.clear()

  const known = await loginUser({ email: 'known@example.invalid', password: 'wrong-password' })
  const unknown = await loginUser({ email: 'unknown@example.invalid', password: 'wrong-password' })
  assert.deepEqual(known, { success: false, error: 'Invalid email or password' })
  assert.deepEqual(unknown, known)
  assert.equal(lookups, 0, 'blocked requests stop before account lookup and password derivation')
  assert.equal(sessionCookies.has('apex_session'), false)
})

test('duplicate registration race reports a safe duplicate result', async () => {
  db.user.findUnique = async () => null
  db.user.create = async () => { throw Object.assign(new Error('unique constraint'), { code: 'P2002' }) }
  assert.deepEqual(await registerUser({ name: 'Test', email: 'test@example.invalid', password: 'test-password' }), {
    success: false,
    error: 'Email already registered',
  })
})

test('logout removes the session cookie', async () => {
  sessionCookies.set('apex_session', { value: 'test', options: {} })
  const result = await require('./actions.ts').logoutUser()
  assert.equal(result.success, true)
  assert.equal(sessionCookies.has('apex_session'), false)
})

test('authentication actions hide database exception details and keep generic login errors', async () => {
  db.user.findUnique = async () => { throw new Error('database host and password must stay private') }
  mockLoginInfrastructure()
  const registration = await registerUser({ name: 'Test', email: 'test@example.invalid', password: 'test-password' })
  const login = await loginUser({ email: 'test@example.invalid', password: 'test-password' })

  assert.deepEqual(registration, { success: false, error: 'Registration failed. Please try again.' })
  assert.deepEqual(login, { success: false, error: 'Login failed. Please try again.' })
})
