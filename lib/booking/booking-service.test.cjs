const { test } = require('node:test')
const assert = require('node:assert/strict')
const { UserRole } = require('@prisma/client')
const { createCustomerBooking, listCustomerBookings } = require('./booking-service.ts')

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

const bookingFor = (id) => ({
  id,
  status: 'PENDING',
  scheduledDate: new Date('2027-05-20T10:30:00Z'),
  createdAt: new Date('2027-05-01T09:00:00Z'),
  vehicle: { make: 'Honda', model: 'City', licensePlate: `KA01AB${id}` },
  serviceType: { name: 'General Service' },
})

function listingRepository(records, overrides = {}) {
  const calls = []
  return {
    calls,
    findForCustomer: async (customerId) => {
      calls.push(customerId)
      return records.filter((record) => record.customerId === customerId).map((record) => record.booking)
    },
    ...overrides,
  }
}

test('customer retrieves their own bookings', async () => {
  const repo = listingRepository([
    { customerId: 7, booking: bookingFor(21) },
    { customerId: 8, booking: bookingFor(22) },
  ])
  const result = await listCustomerBookings({ id: 7, role: UserRole.CUSTOMER }, repo)
  assert.equal(result.success, true)
  assert.deepEqual(result.bookings.map((booking) => booking.id), [21])
})

test('unauthenticated users cannot retrieve bookings', async () => {
  const repo = listingRepository([])
  const result = await listCustomerBookings(null, repo)
  assert.equal(result.success, false)
  assert.deepEqual(repo.calls, [])
})

test('booking list excludes another customer records', async () => {
  const repo = listingRepository([
    { customerId: 7, booking: bookingFor(21) },
    { customerId: 8, booking: bookingFor(22) },
  ])
  const result = await listCustomerBookings({ id: 8, role: UserRole.FLEET_MANAGER }, repo)
  assert.deepEqual(result.bookings.map((booking) => booking.id), [22])
})

test('customer with no bookings receives an empty list', async () => {
  const repo = listingRepository([])
  const result = await listCustomerBookings({ id: 7, role: UserRole.CUSTOMER }, repo)
  assert.deepEqual(result, { success: true, bookings: [] })
})

test('booking retrieval is scoped to the authenticated customer ID', async () => {
  const repo = listingRepository([])
  await listCustomerBookings({ id: 7, role: UserRole.CUSTOMER, customerId: 999 }, repo)
  assert.deepEqual(repo.calls, [7])
})

test('database failures return a safe error without database details', async () => {
  const repo = listingRepository([], { findForCustomer: async () => { throw new Error('secret SQL connection string') } })
  const result = await listCustomerBookings({ id: 7, role: UserRole.CUSTOMER }, repo)
  assert.deepEqual(result, {
    success: false,
    error: 'Your bookings could not be loaded. Please try again.',
  })
  assert.equal(JSON.stringify(result).includes('secret'), false)
})
