const { test } = require('node:test')
const assert = require('node:assert/strict')
const { BookingStatus, UserRole } = require('@prisma/client')
const {
  canViewServiceRecords,
  completeBookingWithServiceRecord,
  serviceRecordBookingStatusForCreation,
} = require('./service-record-service.ts')

function repository(overrides = {}) {
  const calls = []
  return {
    calls,
    async createForInProgressBooking(data) {
      calls.push(data)
      return { serviceId: 42 }
    },
    ...overrides,
  }
}

const provider = { id: 10, role: UserRole.SERVICE_PROVIDER }
const admin = { id: 11, role: UserRole.ADMIN }
const validInput = {
  bookingId: '7',
  diagnosisNotes: ' worn belt ',
  workPerformed: ' Replaced belt ',
  laborCost: '125.50',
  parts: [{ partId: '3', quantity: '2' }, { partId: '3', quantity: '1' }, { partId: '8', quantity: '1' }],
}

test('service provider can create a service record and completion request', async () => {
  const repo = repository()
  const result = await completeBookingWithServiceRecord(provider, validInput, repo)
  assert.deepEqual(result, { success: true, serviceId: 42 })
  assert.deepEqual(repo.calls[0], {
    bookingId: 7,
    diagnosisNotes: 'worn belt',
    workPerformed: 'Replaced belt',
    laborCost: 125.5,
    parts: [{ partId: 3, quantity: 3 }, { partId: 8, quantity: 1 }],
  })
})

test('admin can create a service record', async () => {
  const result = await completeBookingWithServiceRecord(admin, validInput, repository())
  assert.equal(result.success, true)
})

test('unauthenticated users and customer/fleet-manager roles are denied', async () => {
  for (const actor of [null, { id: 1, role: UserRole.CUSTOMER }, { id: 2, role: UserRole.FLEET_MANAGER }]) {
    const repo = repository()
    const result = await completeBookingWithServiceRecord(actor, validInput, repo)
    assert.equal(result.success, false)
    assert.equal(repo.calls.length, 0)
  }
})

test('invalid service fields, identifiers, quantities, and malformed parts are rejected', async () => {
  const invalidInputs = [
    { ...validInput, bookingId: '-7' },
    { ...validInput, workPerformed: ' ' },
    { ...validInput, laborCost: '-1' },
    { ...validInput, laborCost: '1.999' },
    { ...validInput, parts: [{ partId: '0', quantity: '1' }] },
    { ...validInput, parts: [{ partId: '3', quantity: '0' }] },
    { ...validInput, parts: 'not an array' },
  ]
  for (const input of invalidInputs) {
    const repo = repository()
    const result = await completeBookingWithServiceRecord(provider, input, repo)
    assert.equal(result.success, false)
    assert.equal(result.reason, 'invalid_input')
    assert.equal(repo.calls.length, 0)
  }
})

test('repository reports missing booking, invalid state, invalid parts, shortage, and existing record safely', async () => {
  for (const reason of ['not_found', 'invalid_state', 'invalid_part', 'insufficient_stock', 'already_recorded']) {
    const result = await completeBookingWithServiceRecord(provider, validInput, repository({
      async createForInProgressBooking() { return { reason } },
    }))
    assert.equal(result.success, false)
    assert.equal(result.reason, reason)
    assert.ok(!result.error.includes('database'))
  }
})

test('database failures return a safe error', async () => {
  const result = await completeBookingWithServiceRecord(provider, validInput, repository({
    async createForInProgressBooking() { throw new Error('secret db detail') },
  }))
  assert.deepEqual(result, {
    success: false,
    reason: 'error',
    error: 'Service could not be recorded. Please try again.',
  })
})

test('only in-progress bookings are eligible for service record creation', () => {
  assert.equal(serviceRecordBookingStatusForCreation(BookingStatus.IN_PROGRESS), true)
  assert.equal(serviceRecordBookingStatusForCreation(BookingStatus.COMPLETED), false)
  assert.equal(serviceRecordBookingStatusForCreation(BookingStatus.CONFIRMED), false)
})

test('service history access is restricted to valid signed-in platform roles', () => {
  assert.equal(canViewServiceRecords(null), false)
  assert.equal(canViewServiceRecords({ id: 0, role: UserRole.ADMIN }), false)
  for (const role of [UserRole.CUSTOMER, UserRole.FLEET_MANAGER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN]) {
    assert.equal(canViewServiceRecords({ id: 1, role }), true)
  }
})

test('concurrent completion requests rely on atomic repository result and only one can create', async () => {
  let serviceCreated = false
  const repo = repository({
    async createForInProgressBooking() {
      if (serviceCreated) return { reason: 'invalid_state' }
      serviceCreated = true
      await new Promise((resolve) => setImmediate(resolve))
      return { serviceId: 99 }
    },
  })
  const results = await Promise.all([
    completeBookingWithServiceRecord(provider, validInput, repo),
    completeBookingWithServiceRecord(admin, validInput, repo),
  ])
  assert.equal(results.filter((result) => result.success).length, 1)
  assert.equal(results.filter((result) => !result.success).length, 1)
})
