const { test } = require('node:test')
const assert = require('node:assert/strict')
const { SignJWT } = require('jose')
const { UserRole } = require('@prisma/client')
const { signToken, verifyToken } = require('./jwt.ts')
const { getJwtSecret } = require('./jwt-secret.ts')

const claims = { sub: '7', userId: 7, email: 'customer@example.test', role: UserRole.CUSTOMER }
const key = () => new TextEncoder().encode(getJwtSecret())

function tokenWith(payload, alg = 'HS256', signingKey = key()) {
  return new SignJWT(payload).setProtectedHeader({ alg, typ: 'JWT' }).sign(signingKey)
}

function validClaims(overrides = {}) {
  const now = Math.floor(Date.now() / 1000)
  return { ...claims, iat: now, exp: now + 60, ...overrides }
}

test('signs and verifies a valid unexpired session token', async () => {
  const token = await signToken(claims)
  const payload = await verifyToken(token)

  assert.equal(payload?.sub, claims.sub)
  assert.equal(payload?.userId, claims.userId)
  assert.equal(payload?.email, claims.email)
  assert.equal(payload?.role, claims.role)
  assert.ok((payload?.exp ?? 0) > Math.floor(Date.now() / 1000))
})

test('accepts an existing-format HS256 token with matching subject and required time claims', async () => {
  const payload = await verifyToken(await tokenWith(validClaims()))
  assert.equal(payload?.userId, claims.userId)
})

test('rejects expired tokens and tokens without an expiration claim', async () => {
  const expired = await tokenWith(validClaims({ exp: Math.floor(Date.now() / 1000) - 1 }))
  const { exp, ...withoutExpiration } = validClaims()
  const missingExpiration = await tokenWith(withoutExpiration)
  assert.equal(await verifyToken(expired), null)
  assert.equal(await verifyToken(missingExpiration), null)
})

test('rejects tokens with a missing issued-at claim or a future issued-at claim', async () => {
  const { iat, ...withoutIssuedAt } = validClaims()
  const missingIssuedAt = await tokenWith(withoutIssuedAt)
  const futureIssuedAt = await tokenWith(validClaims({ iat: Math.floor(Date.now() / 1000) + 60 }))
  assert.equal(await verifyToken(missingIssuedAt), null)
  assert.equal(await verifyToken(futureIssuedAt), null)
})

test('rejects malformed tokens and invalid signatures', async () => {
  const token = await tokenWith(validClaims())
  const [header, body, signature] = token.split('.')
  const replacement = signature[0] === 'A' ? 'B' : 'A'

  assert.equal(await verifyToken('not-a-jwt'), null)
  assert.equal(await verifyToken(`${header}.${body}.${replacement}${signature.slice(1)}`), null)
  assert.equal(await verifyToken(undefined), null)
})

test('rejects a validly signed token using an algorithm other than HS256', async () => {
  const token = await tokenWith(validClaims(), 'HS384')
  assert.equal(await verifyToken(token), null)
})

test('rejects missing identity and role claims', async () => {
  const { userId, ...withoutUserId } = validClaims()
  const { role, ...withoutRole } = validClaims()

  assert.equal(await verifyToken(await tokenWith(withoutUserId)), null)
  assert.equal(await verifyToken(await tokenWith(withoutRole)), null)
})

test('rejects invalid user identifiers, mismatched subjects, unknown roles, and invalid claim types', async () => {
  const invalidPayloads = [
    validClaims({ userId: '7' }),
    validClaims({ userId: 0, sub: '0' }),
    validClaims({ userId: Number.MAX_SAFE_INTEGER + 1, sub: String(Number.MAX_SAFE_INTEGER + 1) }),
    validClaims({ sub: '8' }),
    validClaims({ role: 'SUPERUSER' }),
    validClaims({ role: 7 }),
    validClaims({ email: 7 }),
    validClaims({ email: 'not-an-email' }),
    validClaims({ iat: 'now' }),
    validClaims({ exp: 'later' }),
    validClaims({ exp: Math.floor(Date.now() / 1000) + 60, iat: Math.floor(Date.now() / 1000) + 120 }),
  ]

  for (const payload of invalidPayloads) {
    assert.equal(await verifyToken(await tokenWith(payload)), null, `accepted invalid claims: ${JSON.stringify(payload)}`)
  }
})

test('production signing fails closed when JWT_SECRET is missing or shorter than 32 characters', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalSecret = process.env.JWT_SECRET
  const tokenSignedBeforeProductionMode = await signToken(claims)
  process.env.NODE_ENV = 'production'
  delete process.env.JWT_SECRET

  try {
    await assert.rejects(signToken(claims), /JWT_SECRET must contain at least 32 characters in production/)
    assert.equal(await verifyToken(tokenSignedBeforeProductionMode), null)
    process.env.JWT_SECRET = 'too-short'
    await assert.rejects(signToken(claims), /JWT_SECRET must contain at least 32 characters in production/)
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  }
})
