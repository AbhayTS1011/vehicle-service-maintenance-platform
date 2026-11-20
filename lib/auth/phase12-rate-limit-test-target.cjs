const EXPECTED = Object.freeze({ host: '127.0.0.1', port: 55432, database: 'vehicle_service_auth_gatef_test', user: 'vehicle_service_test' })

function configurePhase12RateLimitTestDatabase(environment = process.env) {
  const explicitUrl = environment.PHASE12_RATE_LIMIT_TEST_DATABASE_URL
  if (typeof explicitUrl !== 'string' || explicitUrl.trim() === '') {
    throw new Error('Set PHASE12_RATE_LIMIT_TEST_DATABASE_URL to the dedicated Gate F loopback test database before running integration tests.')
  }

  let parsed
  try {
    parsed = new URL(explicitUrl)
  } catch {
    throw new Error('PHASE12_RATE_LIMIT_TEST_DATABASE_URL is not a valid PostgreSQL URL.')
  }

  const valid =
    (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') &&
    parsed.hostname === EXPECTED.host &&
    parsed.port === String(EXPECTED.port) &&
    parsed.pathname === `/${EXPECTED.database}` &&
    decodeURIComponent(parsed.username) === EXPECTED.user &&
    parsed.password.length > 0 &&
    parsed.searchParams.get('schema') === 'public' &&
    [...parsed.searchParams.keys()].every((key) => key === 'schema') &&
    parsed.hash === ''

  if (!valid) {
    throw new Error('Refusing database writes: Gate F URL must target vehicle_service_auth_gatef_test as vehicle_service_test on 127.0.0.1:55432 with schema=public.')
  }

  environment.DATABASE_URL = explicitUrl
  return EXPECTED
}

module.exports = { configurePhase12RateLimitTestDatabase }
