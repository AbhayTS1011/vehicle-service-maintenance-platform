const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
  LOGIN_LIMITS,
  getLoginThrottleSecret,
  loginThrottleKey,
  normalizeLoginIdentifier,
  trustedClientIp,
} = require('./login-throttle.ts')

test('account identifiers normalize consistently and account/IP HMAC buckets are independent', () => {
  const normalized = normalizeLoginIdentifier('  User@Example.invalid ')
  assert.equal(normalized, 'user@example.invalid')
  const secret = 'unit-test-login-throttle-secret-at-least-32-chars'
  const account = loginThrottleKey('account', normalized, secret)
  const sameAccount = loginThrottleKey('account', normalizeLoginIdentifier('USER@example.invalid'), secret)
  const ip = loginThrottleKey('ip', '203.0.113.10', secret)
  assert.equal(account, sameAccount)
  assert.notEqual(account, ip)
  assert.equal(account.length, 64)
  assert.equal(account.includes(normalized), false)
})

test('Vercel-overwritten client IP is used only in the configured Vercel runtime', () => {
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.10' })
  assert.equal(trustedClientIp(headers, {}), null)
  assert.equal(trustedClientIp(headers, { NODE_ENV: 'production', VERCEL: '0' }), null)
  assert.equal(trustedClientIp(headers, { NODE_ENV: 'production', VERCEL: '1' }), '203.0.113.10')
  assert.equal(trustedClientIp(headers, { NODE_ENV: 'development', VERCEL: '1' }), null)
  assert.equal(trustedClientIp(new Headers({ 'x-forwarded-for': 'attacker-value' }), { NODE_ENV: 'production', VERCEL: '1' }), null)
  assert.equal(trustedClientIp(new Headers({ 'x-forwarded-for': '1.1.1.1'.padEnd(129, 'x') }), { NODE_ENV: 'production', VERCEL: '1' }), null)
  assert.equal(trustedClientIp(new Headers({ 'x-real-ip': '203.0.113.10' }), { NODE_ENV: 'production', VERCEL: '1' }), null)
})

test('production requires an independent 32-character HMAC secret; local tests have a development fallback', () => {
  assert.throws(() => getLoginThrottleSecret({ NODE_ENV: 'production' }), /LOGIN_RATE_LIMIT_SECRET/)
  assert.throws(() => getLoginThrottleSecret({ NODE_ENV: 'production', LOGIN_RATE_LIMIT_SECRET: 'short' }), /LOGIN_RATE_LIMIT_SECRET/)
  assert.equal(getLoginThrottleSecret({ NODE_ENV: 'production', LOGIN_RATE_LIMIT_SECRET: 'a'.repeat(32) }), 'a'.repeat(32))
  assert.ok(getLoginThrottleSecret({ NODE_ENV: 'development' }).length >= 32)
})

test('fixed-window policy uses distinct account and source thresholds', () => {
  assert.deepEqual(LOGIN_LIMITS, { windowSeconds: 900, accountAttempts: 5, ipAttempts: 30 })
})
