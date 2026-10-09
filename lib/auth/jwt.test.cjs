const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { signToken, verifyToken } = require('./jwt.ts')

const claims = { sub: '7', userId: 7, email: 'customer@example.test', role: 'CUSTOMER' }

test('verifies a signed HS256 token and its claims', async () => {
  const token = await signToken(claims)
  const payload = await verifyToken(token)

  assert.equal(payload?.sub, claims.sub)
  assert.equal(payload?.userId, claims.userId)
  assert.equal(payload?.role, claims.role)
  assert.ok((payload?.exp ?? 0) > Math.floor(Date.now() / 1000))
})

test('continues to verify tokens signed in the existing JWT format', async () => {
  const now = Math.floor(Date.now() / 1000)
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const signingInput = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...claims, iat: now, exp: now + 60 })}`
  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-123456'
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url')

  assert.equal((await verifyToken(`${signingInput}.${signature}`))?.userId, claims.userId)
})

test('rejects a token with a modified signature', async () => {
  const token = await signToken(claims)
  const [header, body, signature] = token.split('.')
  const replacement = signature[0] === 'A' ? 'B' : 'A'

  assert.equal(await verifyToken(`${header}.${body}.${replacement}${signature.slice(1)}`), null)
})

test('rejects an expired token', async () => {
  const token = await signToken(claims, -1)

  assert.equal(await verifyToken(token), null)
})

test('rejects malformed tokens', async () => {
  assert.equal(await verifyToken('not-a-jwt'), null)
})
