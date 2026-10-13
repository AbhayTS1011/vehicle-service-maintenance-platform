const { test } = require('node:test')
const assert = require('node:assert/strict')
const { configurePhase5TestDatabase } = require('./phase5-postgres-test-target.cjs')

const validUrl = 'postgresql://vehicle_service_test:unit-test-only@127.0.0.1:55432/vehicle_service_test?schema=public'

test('Phase 5 test target requires explicit opt-in and never falls back to DATABASE_URL', () => {
  assert.throws(
    () => configurePhase5TestDatabase({ DATABASE_URL: validUrl }),
    /Set PHASE5_TEST_DATABASE_URL/,
  )

  const environment = {
    PHASE5_TEST_DATABASE_URL: validUrl,
    DATABASE_URL: 'postgresql://production.invalid/not-a-test-database',
  }
  assert.deepEqual(configurePhase5TestDatabase(environment), {
    host: '127.0.0.1',
    port: 55432,
    database: 'vehicle_service_test',
    user: 'vehicle_service_test',
  })
  assert.equal(environment.DATABASE_URL, validUrl)
})

test('Phase 5 test target rejects non-loopback, wrong-port, wrong-database, or wrong-user URLs', () => {
  const unsafeUrls = [
    'postgresql://vehicle_service_test:secret@example.com:55432/vehicle_service_test?schema=public',
    'postgresql://vehicle_service_test:secret@127.0.0.1:5432/vehicle_service_test?schema=public',
    'postgresql://vehicle_service_test:secret@127.0.0.1:55432/postgres?schema=public',
    'postgresql://postgres:secret@127.0.0.1:55432/vehicle_service_test?schema=public',
    'postgresql://vehicle_service_test:secret@127.0.0.1:55432/vehicle_service_test?schema=other',
  ]

  for (const unsafeUrl of unsafeUrls) {
    assert.throws(
      () => configurePhase5TestDatabase({ PHASE5_TEST_DATABASE_URL: unsafeUrl }),
      (error) => {
        assert.match(error.message, /Refusing database writes/)
        assert.equal(error.message.includes('secret'), false)
        assert.equal(error.message.includes(unsafeUrl), false)
        return true
      },
    )
  }
})

test('Phase 5 test target rejects malformed URLs without echoing their contents', () => {
  const malformedUrl = 'not-a-database-url-with-secret'
  assert.throws(
    () => configurePhase5TestDatabase({ PHASE5_TEST_DATABASE_URL: malformedUrl }),
    (error) => {
      assert.match(error.message, /not a valid PostgreSQL URL/)
      assert.equal(error.message.includes(malformedUrl), false)
      return true
    },
  )
})
