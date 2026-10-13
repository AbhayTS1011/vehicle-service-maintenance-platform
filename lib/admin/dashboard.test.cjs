const { test } = require('node:test')
const assert = require('node:assert/strict')
const { BookingStatus, UserRole } = require('@prisma/client')
const { readAdminDashboard } = require('./dashboard.ts')

function repository(overrides = {}) {
  return {
    findServiceCenter: async () => ({ id: 7, name: 'Service center' }),
    countBookingsByStatus: async () => [
      { status: BookingStatus.PENDING, count: 2 },
      { status: BookingStatus.COMPLETED, count: 1 },
    ],
    countMechanics: async () => ({ total: 4, active: 3 }),
    countLowStockParts: async () => 2,
    invoiceTotals: async () => ({ paidCount: 1, paidAmount: '100.00', unpaidCount: 2, unpaidAmount: '250.00' }),
    reviewSummary: async () => ({ count: 1, averageRating: 4 }),
    recentBookings: async () => [],
    ...overrides,
  }
}

test('admin reads operational metrics and missing booking statuses default to zero', async () => {
  const repo = repository()
  const result = await readAdminDashboard({ id: 1, role: UserRole.ADMIN }, repo)
  assert.equal(result.success, true)
  assert.equal(result.value.serviceCenterName, 'Service center')
  assert.equal(result.value.bookings.total, 3)
  assert.equal(result.value.bookings.byStatus.PENDING, 2)
  assert.equal(result.value.bookings.byStatus.CONFIRMED, 0)
  assert.equal(result.value.mechanics.active, 3)
  assert.equal(result.value.lowStockParts, 2)
  assert.equal(result.value.invoices.paidAmount, '100.00')
  assert.equal(result.value.reviews.averageRating, 4)
})

test('unauthenticated and non-admin actors are denied before repository access', async () => {
  let calls = 0
  const repo = repository({ findServiceCenter: async () => { calls += 1; return null } })
  assert.equal((await readAdminDashboard(null, repo)).reason, 'unauthenticated')
  assert.equal((await readAdminDashboard({ id: 2, role: UserRole.CUSTOMER }, repo)).reason, 'forbidden')
  assert.equal((await readAdminDashboard({ id: 3, role: UserRole.FLEET_MANAGER }, repo)).reason, 'forbidden')
  assert.equal((await readAdminDashboard({ id: 4, role: UserRole.SERVICE_PROVIDER }, repo)).reason, 'forbidden')
  assert.equal(calls, 0)
})

test('missing service center and database failures return safe outcomes', async () => {
  const missing = await readAdminDashboard({ id: 1, role: UserRole.ADMIN }, repository({ findServiceCenter: async () => null }))
  assert.equal(missing.reason, 'configuration')
  const failed = await readAdminDashboard({ id: 1, role: UserRole.ADMIN }, repository({ countLowStockParts: async () => { throw new Error('internal db detail') } }))
  assert.equal(failed.success, false)
  assert.equal(failed.error, 'Admin dashboard data could not be loaded. Please try again.')
  assert.doesNotMatch(failed.error, /internal db detail/)
})
