const { test } = require('node:test')
const assert = require('node:assert/strict')
const { UserRole } = require('@prisma/client')
const { createCustomerBooking } = require('./booking-service.ts')

function repository(overrides = {}) {
  const calls = { ownership: [], serviceTypes: [], created: [] }
  return {
    calls,
    ownsVehicle: async (customerId, vehicleId) => {
      calls.ownership.push([customerId, vehicleId])
      return true
    },
    serviceTypeExists: async (serviceTypeId) => {
      calls.serviceTypes.push(serviceTypeId)
      return true
    },
    serviceCenterId: async () => 1,
    create: async (data) => calls.created.push(data),
    ...overrides,
  }
}

const validInput = {
  vehicleId: '12',
  serviceTypeId: '4',
  scheduledDate: '2027-05-20T10:30',
  notes: 'Oil change',
}

test('creates a booking for the signed-in customer with PENDING status', async () => {
  const repo = repository()
  const result = await createCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, validInput, repo)
  assert.deepEqual(result, { success: true })
  assert.deepEqual(repo.calls.created[0], {
    customerId: 7,
    vehicleId: 12,
    serviceTypeId: 4,
    serviceCenterId: 1,
    scheduledDate: new Date('2027-05-20T10:30'),
    notes: 'Oil change',
  })
  assert.equal(repo.calls.created[0].status, undefined)
})

test('rejects unauthenticated booking attempts', async () => {
  const repo = repository()
  const result = await createCustomerBooking(null, validInput, repo)
  assert.equal(result.success, false)
  assert.equal(repo.calls.created.length, 0)
})

test('rejects another customer vehicle', async () => {
  const repo = repository({ ownsVehicle: async () => false })
  const result = await createCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, validInput, repo)
  assert.equal(result.success, false)
  assert.equal(repo.calls.created.length, 0)
})

test('rejects invalid service types', async () => {
  const repo = repository({ serviceTypeExists: async () => false })
  const result = await createCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, validInput, repo)
  assert.equal(result.success, false)
  assert.equal(repo.calls.created.length, 0)
})

test('rejects missing required fields', async () => {
  const repo = repository()
  const result = await createCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, { vehicleId: '12' }, repo)
  assert.equal(result.success, false)
  assert.equal(repo.calls.created.length, 0)
})

test('ignores client supplied customer ID and booking status', async () => {
  const repo = repository()
  await createCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, {
    ...validInput,
    customerId: 999,
    status: 'COMPLETED',
  }, repo)
  assert.equal(repo.calls.created[0].customerId, 7)
  assert.equal(repo.calls.created[0].status, undefined)
})
