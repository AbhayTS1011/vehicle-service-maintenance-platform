const assert = require('node:assert/strict')
const { test } = require('node:test')
const { configurePhase12RateLimitTestDatabase } = require('./phase12-rate-limit-test-target.cjs')

const url = 'postgresql://vehicle_service_test:test-only@127.0.0.1:55432/vehicle_service_auth_gatef_test?schema=public'

test('Gate F PostgreSQL target requires explicit opt-in and overrides DATABASE_URL only with its exact local target', () => {
  assert.throws(() => configurePhase12RateLimitTestDatabase({ DATABASE_URL: url }), /Set PHASE12_RATE_LIMIT_TEST_DATABASE_URL/)
  const environment = { PHASE12_RATE_LIMIT_TEST_DATABASE_URL: url, DATABASE_URL: 'postgresql://external.invalid/app' }
  assert.deepEqual(configurePhase12RateLimitTestDatabase(environment), {
    host: '127.0.0.1', port: 55432, database: 'vehicle_service_auth_gatef_test', user: 'vehicle_service_test',
  })
  assert.equal(environment.DATABASE_URL, url)
})

test('Gate F target rejects external, wrong-database, wrong-role and wrong-schema URLs without echoing URLs', () => {
  const unsafe = [
    'postgresql://vehicle_service_test:secret@example.org:55432/vehicle_service_auth_gatef_test?schema=public',
    'postgresql://vehicle_service_test:secret@127.0.0.1:55432/vehicle_service_test?schema=public',
    'postgresql://postgres:secret@127.0.0.1:55432/vehicle_service_auth_gatef_test?schema=public',
    'postgresql://vehicle_service_test:secret@127.0.0.1:55432/vehicle_service_auth_gatef_test?schema=other',
  ]
  for (const unsafeUrl of unsafe) {
    assert.throws(() => configurePhase12RateLimitTestDatabase({ PHASE12_RATE_LIMIT_TEST_DATABASE_URL: unsafeUrl }), (error) => {
      assert.match(error.message, /Refusing database writes/)
      assert.equal(error.message.includes('secret'), false)
      assert.equal(error.message.includes(unsafeUrl), false)
      return true
    })
  }
})
