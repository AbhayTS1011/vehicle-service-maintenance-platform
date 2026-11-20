const assert = require('node:assert/strict')
const { test } = require('node:test')
const { getJwtSecret } = require('./jwt-secret.ts')

test('requires a sufficiently long configured secret in production', () => {
  assert.throws(
    () => getJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '' }),
    /JWT_SECRET must contain at least 32 characters in production/,
  )
  assert.throws(
    () => getJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'too-short' }),
    /JWT_SECRET must contain at least 32 characters in production/,
  )
})

test('uses the configured production secret without exposing it in errors', () => {
  const secret = 'production-only-test-secret-with-more-than-32-characters'
  assert.equal(getJwtSecret({ NODE_ENV: 'production', JWT_SECRET: secret }), secret)
})

test('keeps the local development fallback outside production only', () => {
  assert.equal(getJwtSecret({ NODE_ENV: 'development' }), 'super-secret-jwt-key-change-in-production-123456')
})
