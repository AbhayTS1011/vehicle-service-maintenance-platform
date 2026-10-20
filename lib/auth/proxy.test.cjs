const assert = require('node:assert/strict')
const { test } = require('node:test')

process.env.JWT_SECRET = 'phase11-proxy-test-secret-that-is-not-used-outside-tests'

const { NextRequest } = require('next/server')
const { proxy } = require('../../proxy.ts')
const { signToken } = require('./jwt.ts')

async function request(path, role) {
  const headers = {}
  if (role !== undefined) {
    headers.cookie = `apex_session=${await signToken({
      sub: 'phase11-test-user',
      userId: 1,
      email: 'phase11@example.invalid',
      role,
    })}`
  }
  return proxy(new NextRequest(new URL(path, 'http://localhost'), { headers }))
}

function requestWithToken(path, token) {
  return proxy(new NextRequest(new URL(path, 'http://localhost'), {
    headers: { cookie: `apex_session=${token}` },
  }))
}

test('dashboard routes redirect unauthenticated requests to login', async () => {
  const response = await request('/dashboard/customer/bookings')

  assert.equal(response.status, 307)
  assert.equal(response.headers.get('location'), 'http://localhost/login')
})

test('malformed and expired sessions redirect to login', async () => {
  const malformed = await requestWithToken('/dashboard', 'not-a-token')
  assert.equal(malformed.status, 307)
  assert.equal(malformed.headers.get('location'), 'http://localhost/login')

  const expired = await signToken({
    sub: 'phase11-expired-user', userId: 1, email: 'expired@example.invalid', role: 'ADMIN',
  }, -1)
  const response = await requestWithToken('/dashboard', expired)

  assert.equal(response.status, 307)
  assert.equal(response.headers.get('location'), 'http://localhost/login')
})

test('signed sessions with unknown roles are rejected', async () => {
  const response = await request('/dashboard', 'SUPERUSER')

  assert.equal(response.status, 307)
  assert.equal(response.headers.get('location'), 'http://localhost/login')
})

test('customer and fleet-manager sessions cannot access provider or admin routes', async () => {
  for (const role of ['CUSTOMER', 'FLEET_MANAGER']) {
    for (const path of ['/dashboard/provider/bookings', '/dashboard/admin']) {
      const response = await request(path, role)
      assert.equal(response.status, 307, `${role} should be redirected from ${path}`)
      assert.equal(response.headers.get('location'), 'http://localhost/dashboard')
    }
  }
})

test('provider sessions cannot access admin or customer routes', async () => {
  for (const path of ['/dashboard/admin', '/dashboard/customer/bookings']) {
    const response = await request(path, 'SERVICE_PROVIDER')
    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), 'http://localhost/dashboard')
  }
})

test('each recognized role can access its route group and admins can access all groups', async () => {
  const permitted = [
    ['CUSTOMER', '/dashboard/customer/bookings'],
    ['FLEET_MANAGER', '/dashboard/customer/bookings'],
    ['SERVICE_PROVIDER', '/dashboard/provider/bookings'],
    ['ADMIN', '/dashboard/admin'],
    ['ADMIN', '/dashboard/customer/bookings'],
    ['ADMIN', '/dashboard/provider/bookings'],
  ]

  for (const [role, path] of permitted) {
    const response = await request(path, role)
    assert.equal(response.status, 200, `${role} should be allowed through ${path}`)
    assert.equal(response.headers.get('location'), null)
  }
})
