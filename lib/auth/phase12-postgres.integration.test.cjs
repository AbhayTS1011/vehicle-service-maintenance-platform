const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { randomUUID } = require('node:crypto')
const { test } = require('node:test')
const { configurePhase12RateLimitTestDatabase } = require('./phase12-rate-limit-test-target.cjs')

const target = configurePhase12RateLimitTestDatabase(process.env)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const nextHeaders = require('next/headers')
const originalCookies = nextHeaders.cookies
const originalHeaders = nextHeaders.headers
const originalVercel = process.env.VERCEL
const cookieJar = new Map()
const runId = randomUUID()
const email = `phase12-${runId}@example.invalid`
const rateLimitKeys = new Set()
let createdUserId = null

nextHeaders.cookies = async () => ({
  set: (name, value, options) => cookieJar.set(name, { value, options }),
  delete: (name) => cookieJar.delete(name),
})
// Local test headers deliberately include spoofed forwarding data; local mode must ignore it.
nextHeaders.headers = async () => new Headers({ 'x-forwarded-for': '198.51.100.123' })
process.env.VERCEL = '0'

const { db, disconnectDatabase } = require('../db.ts')
const { loginUser, logoutUser, registerUser } = require('./actions.ts')
const { verifyToken } = require('./jwt.ts')
const { getLoginThrottleSecret, loginThrottleKey } = require('./login-throttle.ts')

function fixtureKey(kind, value) {
  const digest = loginThrottleKey(kind, value, getLoginThrottleSecret())
  rateLimitKeys.add(digest)
  return digest
}

async function assertSafeEmptyTarget() {
  const identity = await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username`
  assert.equal(identity[0].database, target.database)
  assert.equal(identity[0].username, target.user)
  const migrations = await prisma.$queryRaw`SELECT version FROM public.schema_migrations ORDER BY version`
  assert.deepEqual(migrations.map((row) => row.version), ['20261020_001', '20261022_001'])
  const functions = await prisma.$queryRaw`
    SELECT to_regprocedure('public.consume_login_rate_limit(text,text,integer)')::text AS limiter
  `
  assert.equal(functions[0].limiter, 'consume_login_rate_limit(text,text,integer)')
  const counts = await Promise.all([
    prisma.user.count(), prisma.vehicle.count(), prisma.serviceType.count(), prisma.serviceCenter.count(),
    prisma.mechanic.count(), prisma.booking.count(), prisma.service.count(), prisma.servicePart.count(),
    prisma.part.count(), prisma.invoice.count(), prisma.review.count(), prisma.notification.count(),
    prisma.auditLog.count(), prisma.serviceCenterHour.count(),
  ])
  assert.ok(counts.every((count) => count === 0), 'Refusing writes: Gate F database must have an empty application schema.')
  const limiterRows = await prisma.$queryRaw`SELECT count(*)::INTEGER AS count FROM public.login_rate_limit_buckets`
  assert.equal(limiterRows[0].count, 0, 'Refusing writes: Gate F limiter table must be empty.')
}

test.before(assertSafeEmptyTarget)

test('registration stores strong hashes; successful login upgrades legacy hashes before issuing a session', async () => {
  try {
    cookieJar.clear()
    const registration = await registerUser({
      name: 'Phase 12 Gate F Customer', email, password: 'gatef-integration-password', role: 'ADMIN',
    })
    assert.equal(registration.success, true, registration.error || 'Registration failed.')
    assert.equal(registration.user.role, 'CUSTOMER')
    createdUserId = registration.user.id

    const persisted = await prisma.user.findUnique({ where: { id: createdUserId } })
    assert.ok(persisted)
    assert.match(persisted.passwordHash, /^pbkdf2-sha512\$v=1\$i=220000\$/)
    assert.notEqual(persisted.passwordHash, 'gatef-integration-password')
    assert.ok(await verifyToken(cookieJar.get('apex_session')?.value || ''))

    await logoutUser()
    assert.equal(cookieJar.has('apex_session'), false)

    const legacySalt = crypto.randomBytes(16).toString('hex')
    const legacyHash = `${legacySalt}:${crypto.pbkdf2Sync('gatef-integration-password', legacySalt, 10_000, 64, 'sha512').toString('hex')}`
    await prisma.user.update({ where: { id: createdUserId }, data: { passwordHash: legacyHash } })
    const login = await loginUser({ email: email.toUpperCase(), password: 'gatef-integration-password' })
    assert.equal(login.success, true, login.error || 'Login failed.')
    const afterLogin = await prisma.user.findUnique({ where: { id: createdUserId } })
    assert.match(afterLogin.passwordHash, /^pbkdf2-sha512\$v=1\$i=220000\$/)
    assert.notEqual(afterLogin.passwordHash, legacyHash)
    const payload = await verifyToken(cookieJar.get('apex_session')?.value || '')
    assert.equal(payload?.userId, createdUserId)
    assert.equal(payload?.role, 'CUSTOMER')

    const accountKey = fixtureKey('account', email)
    const buckets = await prisma.$queryRaw`
      SELECT 1 FROM public.login_rate_limit_buckets
      WHERE bucket_kind = 'account' AND bucket_hash = ${accountKey}
    `
    assert.equal(buckets.length, 0, 'successful login clears only the account bucket')
  } finally {
    const fixtureUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (fixtureUser) {
      await prisma.auditLog.deleteMany({ where: { tableName: 'users', recordId: fixtureUser.id, action: 'REGISTER' } })
      await prisma.user.deleteMany({ where: { id: fixtureUser.id, email } })
    }
    cookieJar.clear()
  }
})

test('account throttling is shared across source IPs and IP throttling is independent across accounts', async () => {
  const account = fixtureKey('account', `account-${runId}@example.invalid`)
  const accountResults = []
  for (let index = 0; index < 6; index++) {
    accountResults.push(await db.auth.consumeLoginRateLimit(account, fixtureKey('ip', `198.51.100.${index + 1}`)))
  }
  assert.deepEqual(accountResults, [true, true, true, true, true, false])

  const sharedIp = fixtureKey('ip', '203.0.113.240')
  const ipResults = []
  for (let index = 0; index < 31; index++) {
    ipResults.push(await db.auth.consumeLoginRateLimit(fixtureKey('account', `distinct-${index}-${runId}@example.invalid`), sharedIp))
  }
  assert.equal(ipResults.filter(Boolean).length, 30)
  assert.equal(ipResults.at(-1), false)
})

test('concurrent requests atomically enforce the account threshold', async () => {
  const account = fixtureKey('account', `parallel-${runId}@example.invalid`)
  const results = await Promise.all(Array.from({ length: 24 }, () => db.auth.consumeLoginRateLimit(account, null)))
  assert.equal(results.filter(Boolean).length, 5)
  assert.equal(results.filter((allowed) => !allowed).length, 19)
})

test('fixed windows recover after expiry and stale rows are cleaned during limiter activity', async () => {
  const refillKey = fixtureKey('account', `refill-${runId}@example.invalid`)
  assert.equal(await db.auth.consumeLoginRateLimit(refillKey, null), true)
  await prisma.$executeRaw`
    UPDATE public.login_rate_limit_buckets
    SET window_started_at = clock_timestamp() - INTERVAL '16 minutes',
        expires_at = clock_timestamp() + INTERVAL '15 minutes', attempts = 6
    WHERE bucket_kind = 'account' AND bucket_hash = ${refillKey}
  `
  assert.equal(await db.auth.consumeLoginRateLimit(refillKey, null), true)
  const refilled = await prisma.$queryRaw`
    SELECT attempts FROM public.login_rate_limit_buckets
    WHERE bucket_kind = 'account' AND bucket_hash = ${refillKey}
  `
  assert.equal(refilled[0].attempts, 1)

  const staleKey = fixtureKey('ip', '192.0.2.250')
  await prisma.$executeRaw`
    INSERT INTO public.login_rate_limit_buckets(bucket_kind, bucket_hash, window_started_at, expires_at, attempts)
    VALUES ('ip', ${staleKey}, clock_timestamp() - INTERVAL '3 hours', clock_timestamp() - INTERVAL '2 hours', 1)
  `
  assert.equal(await db.auth.consumeLoginRateLimit(fixtureKey('account', `cleanup-${runId}@example.invalid`), null), true)
  const staleRows = await prisma.$queryRaw`
    SELECT 1 FROM public.login_rate_limit_buckets WHERE bucket_kind = 'ip' AND bucket_hash = ${staleKey}
  `
  assert.equal(staleRows.length, 0)
})

test.after(async () => {
  try {
    for (const key of rateLimitKeys) {
      await prisma.$executeRaw`DELETE FROM public.login_rate_limit_buckets WHERE bucket_hash = ${key}`
    }
    const fixtureUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (fixtureUser) {
      await prisma.auditLog.deleteMany({ where: { tableName: 'users', recordId: fixtureUser.id, action: 'REGISTER' } })
      await prisma.user.deleteMany({ where: { id: fixtureUser.id, email } })
    }
  } finally {
    await prisma.$disconnect()
    await disconnectDatabase()
    nextHeaders.cookies = originalCookies
    nextHeaders.headers = originalHeaders
    if (originalVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = originalVercel
  }
})
