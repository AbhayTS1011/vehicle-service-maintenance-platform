const REQUIRED_HOST = '127.0.0.1'
const REQUIRED_PORT = '55432'
const REQUIRED_DATABASE = 'vehicle_service_test'
const REQUIRED_USER = 'vehicle_service_test'

function configurePhase5TestDatabase(environment = process.env) {
  const explicitUrl = environment.PHASE5_TEST_DATABASE_URL
  if (typeof explicitUrl !== 'string' || explicitUrl.trim() === '') {
    throw new Error('Set PHASE5_TEST_DATABASE_URL to the dedicated Phase 5 loopback test database before running integration tests.')
  }

  let parsed
  try {
    parsed = new URL(explicitUrl)
  } catch {
    throw new Error('PHASE5_TEST_DATABASE_URL is not a valid PostgreSQL URL.')
  }

  const valid =
    (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') &&
    parsed.hostname === REQUIRED_HOST &&
    parsed.port === REQUIRED_PORT &&
    parsed.pathname === `/${REQUIRED_DATABASE}` &&
    decodeURIComponent(parsed.username) === REQUIRED_USER &&
    parsed.password.length > 0 &&
    parsed.searchParams.get('schema') === 'public' &&
    [...parsed.searchParams.keys()].every((key) => key === 'schema') &&
    parsed.hash === ''

  if (!valid) {
    throw new Error('Refusing database writes: PHASE5_TEST_DATABASE_URL must target vehicle_service_test as vehicle_service_test on 127.0.0.1:55432 with schema=public.')
  }

  // The explicit opt-in is authoritative; never inherit a different DATABASE_URL.
  environment.DATABASE_URL = explicitUrl
  return Object.freeze({ host: REQUIRED_HOST, port: Number(REQUIRED_PORT), database: REQUIRED_DATABASE, user: REQUIRED_USER })
}

module.exports = { configurePhase5TestDatabase }
