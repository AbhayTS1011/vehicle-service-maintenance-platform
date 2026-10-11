const { test } = require('node:test')
const assert = require('node:assert/strict')
const { BookingStatus, UserRole } = require('@prisma/client')
const {
  cancelCustomerBooking,
  confirmProviderBooking,
  createCustomerBooking,
  listProviderConfirmedBookings,
  rejectProviderBooking,
  startProviderBooking,
  listProviderPendingBookings,
  providerConfirmedBookingsQuery,
  providerPendingBookingsQuery,
  listCustomerBookings,
  getCustomerBookingDetails,
} = require('./booking-service.ts')

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

const bookingDetailsFor = (id) => ({
  ...bookingFor(id),
  notes: 'Please inspect the brakes.',
  serviceCenter: {
    name: 'Apex Auto Care Center',
    address: '123 Mechanic Street',
    phone: '+1-555-0199',
    operatingHours: 'Mon-Sat 8:00 AM - 6:00 PM',
  },
})

function detailsRepository(records, overrides = {}) {
  const calls = []
  return {
    calls,
    findForCustomer: async (bookingId, customerId) => {
      calls.push([bookingId, customerId])
      return records.find((record) => record.booking.id === bookingId && record.customerId === customerId)?.booking ?? null
    },
    ...overrides,
  }
}

test('customer retrieves details for their own booking', async () => {
  const ownBooking = bookingDetailsFor(31)
  const repo = detailsRepository([{ customerId: 7, booking: ownBooking }])
  const result = await getCustomerBookingDetails({ id: 7, role: UserRole.CUSTOMER }, 31, repo)
  assert.deepEqual(result, { success: true, booking: ownBooking })
  assert.deepEqual(repo.calls, [[31, 7]])
})

test('customer cannot retrieve another customer booking', async () => {
  const repo = detailsRepository([{ customerId: 8, booking: bookingDetailsFor(32) }])
  const result = await getCustomerBookingDetails({ id: 7, role: UserRole.CUSTOMER }, 32, repo)
  assert.deepEqual(result, { success: false, reason: 'not_found', error: 'Booking not found.' })
  assert.deepEqual(repo.calls, [[32, 7]])
})

test('nonexistent booking is handled as not found', async () => {
  const repo = detailsRepository([])
  const result = await getCustomerBookingDetails({ id: 7, role: UserRole.CUSTOMER }, 999, repo)
  assert.deepEqual(result, { success: false, reason: 'not_found', error: 'Booking not found.' })
})

test('customer identity comes from the authenticated actor, not supplied data', async () => {
  const repo = detailsRepository([])
  await getCustomerBookingDetails({ id: 7, role: UserRole.CUSTOMER, customerId: 999 }, 33, repo)
  assert.deepEqual(repo.calls, [[33, 7]])
})

test('changing the booking ID does not bypass customer ownership filtering', async () => {
  const repo = detailsRepository([{ customerId: 8, booking: bookingDetailsFor(34) }])
  const result = await getCustomerBookingDetails({ id: 7, role: UserRole.CUSTOMER }, 34, repo)
  assert.equal(result.success, false)
  assert.deepEqual(repo.calls, [[34, 7]])
})

test('booking details database errors are returned safely', async () => {
  const repo = detailsRepository([], {
    findForCustomer: async () => { throw new Error('private database connection details') },
  })
  const result = await getCustomerBookingDetails({ id: 7, role: UserRole.CUSTOMER }, 35, repo)
  assert.deepEqual(result, {
    success: false,
    reason: 'error',
    error: 'Booking details could not be loaded. Please try again.',
  })
  assert.equal(JSON.stringify(result).includes('private'), false)
})

function cancellationRepository({ status = 'PENDING', customerId = 7, exists = true, fail = false } = {}) {
  const calls = []
  const record = { status, customerId }
  return {
    calls,
    record,
    async cancelPendingForCustomer(bookingId, actorId) {
      calls.push(['cancel', bookingId, actorId])
      if (fail) throw new Error('private SQL details')
      if (!exists || bookingId !== 41 || actorId !== record.customerId || record.status !== 'PENDING') return 0
      record.status = 'CANCELLED'
      return 1
    },
    async findStatusForCustomer(bookingId, actorId) {
      calls.push(['find', bookingId, actorId])
      if (!exists || bookingId !== 41 || actorId !== record.customerId) return null
      return record.status
    },
  }
}

test('customer cancels their own pending booking and status becomes CANCELLED', async () => {
  const repo = cancellationRepository()
  const result = await cancelCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, '41', repo)

  assert.deepEqual(result, { success: true })
  assert.equal(repo.record.status, 'CANCELLED')
  assert.deepEqual(repo.calls, [['cancel', 41, 7]])
})

test('customer cannot cancel another customer booking', async () => {
  const repo = cancellationRepository({ customerId: 8 })
  const result = await cancelCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, '41', repo)

  assert.deepEqual(result, { success: false, reason: 'not_found', error: 'Booking not found.' })
  assert.deepEqual(repo.calls, [['cancel', 41, 7], ['find', 41, 7]])
})

test('nonexistent booking cancellation returns not found', async () => {
  const repo = cancellationRepository({ exists: false })
  const result = await cancelCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, '999', repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'not_found')
})

for (const status of ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED']) {
  test(`does not cancel a booking in ${status} status`, async () => {
    const repo = cancellationRepository({ status })
    const result = await cancelCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, '41', repo)

    assert.deepEqual(result, {
      success: false,
      reason: 'invalid_state',
      error: 'Only pending bookings can be cancelled.',
    })
    assert.equal(repo.record.status, status)
  })
}

test('does not accept a client object containing booking, customer, or status overrides', async () => {
  const repo = cancellationRepository()
  const result = await cancelCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, {
    bookingId: '41',
    customerId: 8,
    status: 'COMPLETED',
  }, repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'invalid_input')
  assert.deepEqual(repo.calls, [])
})

test('concurrent cancellation requests cannot cancel more than once', async () => {
  const repo = cancellationRepository()
  const actor = { id: 7, role: UserRole.CUSTOMER }
  const results = await Promise.all([
    cancelCustomerBooking(actor, '41', repo),
    cancelCustomerBooking(actor, '41', repo),
  ])

  assert.equal(results.filter((result) => result.success).length, 1)
  assert.equal(results.filter((result) => !result.success && result.reason === 'invalid_state').length, 1)
  assert.equal(repo.record.status, 'CANCELLED')
})

test('cancellation requires authentication and a customer booking role', async () => {
  const repo = cancellationRepository()
  const unauthenticated = await cancelCustomerBooking(null, '41', repo)
  const forbidden = await cancelCustomerBooking({ id: 9, role: UserRole.ADMIN }, '41', repo)

  assert.equal(unauthenticated.success, false)
  assert.equal(unauthenticated.reason, 'unauthenticated')
  assert.equal(forbidden.success, false)
  assert.equal(forbidden.reason, 'forbidden')
  assert.deepEqual(repo.calls, [])
})

test('invalid booking IDs and database failures return safe cancellation errors', async () => {
  const repo = cancellationRepository({ fail: true })
  const invalid = await cancelCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, '4e1', repo)
  const failed = await cancelCustomerBooking({ id: 7, role: UserRole.CUSTOMER }, '41', repo)

  assert.equal(invalid.success, false)
  assert.equal(invalid.reason, 'invalid_input')
  assert.equal(failed.success, false)
  assert.equal(failed.reason, 'error')
  assert.equal(JSON.stringify(failed).includes('private SQL'), false)
})

const pendingQueueBooking = (id, status = BookingStatus.PENDING) => ({
  id,
  status,
  scheduledDate: new Date('2027-05-20T10:30:00.000Z'),
  createdAt: new Date('2027-05-01T08:15:00.000Z'),
  customer: { name: 'Sam Customer' },
  vehicle: { make: 'Toyota', model: 'Corolla', licensePlate: 'KA01AB1234' },
  serviceType: { name: 'Scheduled maintenance' },
})

function pendingQueueRepository(records = [], overrides = {}) {
  const calls = []
  return {
    calls,
    async findPending(query) {
      calls.push(query)
      if (overrides.fail) throw new Error('private SQL connection details')
      return records.filter((booking) => booking.status === query.where.status)
    },
  }
}

test('service providers can retrieve the pending booking queue', async () => {
  const repo = pendingQueueRepository([pendingQueueBooking(51)])
  const result = await listProviderPendingBookings({ id: 10, role: UserRole.SERVICE_PROVIDER }, repo)

  assert.deepEqual(result, { success: true, bookings: [pendingQueueBooking(51)] })
  assert.equal(repo.calls.length, 1)
  assert.equal(repo.calls[0].where.status, BookingStatus.PENDING)
})

test('admins can retrieve the pending booking queue', async () => {
  const repo = pendingQueueRepository([pendingQueueBooking(52)])
  const result = await listProviderPendingBookings({ id: 1, role: UserRole.ADMIN }, repo)

  assert.equal(result.success, true)
  assert.deepEqual(result.bookings.map((booking) => booking.id), [52])
  assert.equal(repo.calls.length, 1)
})

for (const role of [UserRole.CUSTOMER, UserRole.FLEET_MANAGER]) {
  test(`${role} cannot access the pending booking queue`, async () => {
    const repo = pendingQueueRepository([pendingQueueBooking(53)])
    const result = await listProviderPendingBookings({ id: 20, role }, repo)

    assert.deepEqual(result, {
      success: false,
      reason: 'forbidden',
      error: 'You do not have permission to view pending bookings.',
    })
    assert.deepEqual(repo.calls, [])
  })
}

test('unauthenticated users cannot access the pending booking queue', async () => {
  const repo = pendingQueueRepository([pendingQueueBooking(54)])
  const result = await listProviderPendingBookings(null, repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'unauthenticated')
  assert.deepEqual(repo.calls, [])
})

test('the pending queue query excludes every non-pending booking in the database query', async () => {
  const repo = pendingQueueRepository([
    pendingQueueBooking(55, BookingStatus.PENDING),
    pendingQueueBooking(56, BookingStatus.CONFIRMED),
    pendingQueueBooking(57, BookingStatus.IN_PROGRESS),
    pendingQueueBooking(58, BookingStatus.COMPLETED),
    pendingQueueBooking(59, BookingStatus.INVOICED),
    pendingQueueBooking(60, BookingStatus.CANCELLED),
  ])
  const result = await listProviderPendingBookings({ id: 10, role: UserRole.SERVICE_PROVIDER }, repo)

  assert.equal(result.success, true)
  assert.deepEqual(result.bookings.map((booking) => booking.id), [55])
  assert.deepEqual(providerPendingBookingsQuery.where, { status: BookingStatus.PENDING })
  assert.deepEqual(repo.calls[0].where, { status: BookingStatus.PENDING })
})

test('an empty pending booking queue returns an empty list', async () => {
  const repo = pendingQueueRepository()
  const result = await listProviderPendingBookings({ id: 10, role: UserRole.SERVICE_PROVIDER }, repo)

  assert.deepEqual(result, { success: true, bookings: [] })
})

test('pending queue database failures return a safe error', async () => {
  const repo = pendingQueueRepository([], { fail: true })
  const result = await listProviderPendingBookings({ id: 10, role: UserRole.SERVICE_PROVIDER }, repo)

  assert.deepEqual(result, {
    success: false,
    reason: 'error',
    error: 'Pending service requests could not be loaded. Please try again.',
  })
  assert.equal(JSON.stringify(result).includes('private SQL'), false)
})

test('pending queue selects only necessary customer, vehicle, service, and booking fields', async () => {
  const repo = pendingQueueRepository([pendingQueueBooking(61)])
  const result = await listProviderPendingBookings({ id: 10, role: UserRole.SERVICE_PROVIDER }, repo)

  assert.equal(result.success, true)
  assert.deepEqual(providerPendingBookingsQuery.select, {
    id: true,
    status: true,
    scheduledDate: true,
    createdAt: true,
    customer: { select: { name: true } },
    vehicle: { select: { make: true, model: true, licensePlate: true } },
    serviceType: { select: { name: true } },
  })
  assert.equal(JSON.stringify(providerPendingBookingsQuery).includes('passwordHash'), false)
  assert.equal(JSON.stringify(result.bookings).includes('passwordHash'), false)
  assert.equal(JSON.stringify(result.bookings).includes('email'), false)
})

function providerConfirmationRepository(initialStatus = BookingStatus.PENDING, overrides = {}) {
  let status = initialStatus
  return {
    async confirmPending(bookingId) {
      if (overrides.failUpdate) throw new Error('private SQL connection details')
      if (bookingId !== 71 || status !== BookingStatus.PENDING) return 0
      status = BookingStatus.CONFIRMED
      return 1
    },
    async findStatus(bookingId) {
      if (overrides.failStatus) throw new Error('private SQL connection details')
      return bookingId === 71 ? status : null
    },
    get status() { return status },
  }
}

test('service providers can confirm a pending booking', async () => {
  const repo = providerConfirmationRepository()
  const result = await confirmProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    '71',
    repo,
  )

  assert.deepEqual(result, { success: true })
  assert.equal(repo.status, BookingStatus.CONFIRMED)
})

test('admins can confirm a pending booking', async () => {
  const repo = providerConfirmationRepository()
  const result = await confirmProviderBooking({ id: 1, role: UserRole.ADMIN }, 71, repo)

  assert.deepEqual(result, { success: true })
  assert.equal(repo.status, BookingStatus.CONFIRMED)
})

test('unauthenticated users cannot confirm a booking', async () => {
  const repo = providerConfirmationRepository()
  const result = await confirmProviderBooking(null, 71, repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'unauthenticated')
  assert.equal(repo.status, BookingStatus.PENDING)
})

for (const role of [UserRole.CUSTOMER, UserRole.FLEET_MANAGER]) {
  test(`${role} cannot confirm a booking`, async () => {
    const repo = providerConfirmationRepository()
    const result = await confirmProviderBooking({ id: 20, role }, 71, repo)

    assert.equal(result.success, false)
    assert.equal(result.reason, 'forbidden')
    assert.equal(repo.status, BookingStatus.PENDING)
  })
}

test('a non-pending booking cannot be confirmed again', async () => {
  const repo = providerConfirmationRepository(BookingStatus.CANCELLED)
  const result = await confirmProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, 71, repo)

  assert.deepEqual(result, {
    success: false,
    reason: 'invalid_state',
    error: 'Only pending bookings can be confirmed. Refresh the queue and try again.',
  })
  assert.equal(repo.status, BookingStatus.CANCELLED)
})

test('a nonexistent booking is not confirmed', async () => {
  const repo = providerConfirmationRepository()
  const result = await confirmProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, 72, repo)

  assert.deepEqual(result, { success: false, reason: 'not_found', error: 'Booking not found.' })
})

test('invalid booking identifiers are rejected before database access', async () => {
  const repo = providerConfirmationRepository()
  const result = await confirmProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, '7x', repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'invalid_input')
  assert.equal(repo.status, BookingStatus.PENDING)
})

test('concurrent confirmation attempts transition a pending booking only once', async () => {
  const repo = providerConfirmationRepository()
  const actor = { id: 10, role: UserRole.SERVICE_PROVIDER }
  const results = await Promise.all([
    confirmProviderBooking(actor, 71, repo),
    confirmProviderBooking(actor, 71, repo),
  ])

  assert.equal(results.filter((result) => result.success).length, 1)
  assert.equal(results.filter((result) => !result.success && result.reason === 'invalid_state').length, 1)
  assert.equal(repo.status, BookingStatus.CONFIRMED)
})

test('confirmation database failures return safe errors', async () => {
  const failedUpdate = await confirmProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    71,
    providerConfirmationRepository(BookingStatus.PENDING, { failUpdate: true }),
  )
  assert.deepEqual(failedUpdate, {
    success: false,
    reason: 'error',
    error: 'The booking could not be confirmed. Please try again.',
  })
  assert.equal(JSON.stringify(failedUpdate).includes('private SQL'), false)

  const failedStatus = await confirmProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    71,
    providerConfirmationRepository(BookingStatus.CANCELLED, { failStatus: true }),
  )
  assert.equal(failedStatus.success, false)
  assert.equal(failedStatus.reason, 'error')
})

function providerRejectionRepository(initialStatus = BookingStatus.PENDING, overrides = {}) {
  let status = initialStatus
  return {
    async rejectPending(bookingId) {
      if (overrides.failReject) throw new Error('private SQL connection details')
      if (bookingId !== 81 || status !== BookingStatus.PENDING) return 0
      status = BookingStatus.REJECTED
      return 1
    },
    async findStatus(bookingId) {
      if (overrides.failStatus) throw new Error('private SQL connection details')
      return bookingId === 81 ? status : null
    },
    get status() { return status },
  }
}

test('service providers can reject a pending booking as REJECTED', async () => {
  const repo = providerRejectionRepository()
  const result = await rejectProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    '81',
    repo,
  )

  assert.deepEqual(result, { success: true })
  assert.equal(repo.status, BookingStatus.REJECTED)
  assert.notEqual(repo.status, BookingStatus.CANCELLED)
})

test('admins can reject a pending booking', async () => {
  const repo = providerRejectionRepository()
  const result = await rejectProviderBooking({ id: 1, role: UserRole.ADMIN }, 81, repo)

  assert.deepEqual(result, { success: true })
  assert.equal(repo.status, BookingStatus.REJECTED)
})

test('unauthenticated users cannot reject a booking', async () => {
  const repo = providerRejectionRepository()
  const result = await rejectProviderBooking(null, 81, repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'unauthenticated')
  assert.equal(repo.status, BookingStatus.PENDING)
})

for (const role of [UserRole.CUSTOMER, UserRole.FLEET_MANAGER]) {
  test(`${role} cannot reject a booking`, async () => {
    const repo = providerRejectionRepository()
    const result = await rejectProviderBooking({ id: 20, role }, 81, repo)

    assert.equal(result.success, false)
    assert.equal(result.reason, 'forbidden')
    assert.equal(repo.status, BookingStatus.PENDING)
  })
}

test('a non-pending booking cannot be rejected', async () => {
  const repo = providerRejectionRepository(BookingStatus.CONFIRMED)
  const result = await rejectProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, 81, repo)

  assert.deepEqual(result, {
    success: false,
    reason: 'invalid_state',
    error: 'Only pending bookings can be rejected. Refresh the queue and try again.',
  })
  assert.equal(repo.status, BookingStatus.CONFIRMED)
})

test('a nonexistent booking cannot be rejected', async () => {
  const repo = providerRejectionRepository()
  const result = await rejectProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, 82, repo)

  assert.deepEqual(result, { success: false, reason: 'not_found', error: 'Booking not found.' })
})

test('invalid rejection booking identifiers are rejected before database access', async () => {
  const repo = providerRejectionRepository()
  const result = await rejectProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, '8x', repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'invalid_input')
  assert.equal(repo.status, BookingStatus.PENDING)
})

test('concurrent rejection attempts transition a pending booking only once', async () => {
  const repo = providerRejectionRepository()
  const actor = { id: 10, role: UserRole.SERVICE_PROVIDER }
  const results = await Promise.all([
    rejectProviderBooking(actor, 81, repo),
    rejectProviderBooking(actor, 81, repo),
  ])

  assert.equal(results.filter((result) => result.success).length, 1)
  assert.equal(results.filter((result) => !result.success && result.reason === 'invalid_state').length, 1)
  assert.equal(repo.status, BookingStatus.REJECTED)
})

test('rejection database failures return safe errors', async () => {
  const failedUpdate = await rejectProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    81,
    providerRejectionRepository(BookingStatus.PENDING, { failReject: true }),
  )
  assert.deepEqual(failedUpdate, {
    success: false,
    reason: 'error',
    error: 'The booking could not be rejected. Please try again.',
  })
  assert.equal(JSON.stringify(failedUpdate).includes('private SQL'), false)

  const failedStatus = await rejectProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    81,
    providerRejectionRepository(BookingStatus.CONFIRMED, { failStatus: true }),
  )
  assert.equal(failedStatus.success, false)
  assert.equal(failedStatus.reason, 'error')
})

function confirmedBookingsRepository(records = [], overrides = {}) {
  const calls = []
  return {
    calls,
    async findConfirmed(query) {
      calls.push(query)
      if (overrides.fail) throw new Error('private SQL connection details')
      return records.filter((booking) => booking.status === query.where.status)
    },
  }
}

test('service providers can list confirmed bookings', async () => {
  const repo = confirmedBookingsRepository([pendingQueueBooking(91, BookingStatus.CONFIRMED)])
  const result = await listProviderConfirmedBookings({ id: 10, role: UserRole.SERVICE_PROVIDER }, repo)

  assert.equal(result.success, true)
  assert.deepEqual(result.bookings.map((booking) => booking.id), [91])
  assert.equal(repo.calls[0].where.status, BookingStatus.CONFIRMED)
})

test('admins can list confirmed bookings', async () => {
  const repo = confirmedBookingsRepository([pendingQueueBooking(92, BookingStatus.CONFIRMED)])
  const result = await listProviderConfirmedBookings({ id: 1, role: UserRole.ADMIN }, repo)

  assert.equal(result.success, true)
  assert.deepEqual(result.bookings.map((booking) => booking.id), [92])
})

for (const role of [UserRole.CUSTOMER, UserRole.FLEET_MANAGER]) {
  test(`${role} cannot view confirmed provider bookings`, async () => {
    const repo = confirmedBookingsRepository()
    const result = await listProviderConfirmedBookings({ id: 20, role }, repo)

    assert.equal(result.success, false)
    assert.equal(result.reason, 'forbidden')
    assert.deepEqual(repo.calls, [])
  })
}

test('unauthenticated users cannot view confirmed provider bookings', async () => {
  const repo = confirmedBookingsRepository()
  const result = await listProviderConfirmedBookings(null, repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'unauthenticated')
  assert.deepEqual(repo.calls, [])
})

test('confirmed bookings query excludes records in every other booking state', async () => {
  const repo = confirmedBookingsRepository([
    pendingQueueBooking(93, BookingStatus.PENDING),
    pendingQueueBooking(94, BookingStatus.CONFIRMED),
    pendingQueueBooking(95, BookingStatus.REJECTED),
    pendingQueueBooking(96, BookingStatus.CANCELLED),
    pendingQueueBooking(97, BookingStatus.IN_PROGRESS),
  ])
  const result = await listProviderConfirmedBookings({ id: 10, role: UserRole.SERVICE_PROVIDER }, repo)

  assert.equal(result.success, true)
  assert.deepEqual(result.bookings.map((booking) => booking.id), [94])
  assert.deepEqual(providerConfirmedBookingsQuery.where, { status: BookingStatus.CONFIRMED })
})

test('confirmed booking list handles empty results and database errors safely', async () => {
  const empty = await listProviderConfirmedBookings(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    confirmedBookingsRepository(),
  )
  assert.deepEqual(empty, { success: true, bookings: [] })

  const failed = await listProviderConfirmedBookings(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    confirmedBookingsRepository([], { fail: true }),
  )
  assert.deepEqual(failed, {
    success: false,
    reason: 'error',
    error: 'Confirmed bookings could not be loaded. Please try again.',
  })
})

function providerStartRepository(initialStatus = BookingStatus.CONFIRMED, overrides = {}) {
  let status = initialStatus
  return {
    async startConfirmed(bookingId) {
      if (overrides.failStart) throw new Error('private SQL connection details')
      if (bookingId !== 101 || status !== BookingStatus.CONFIRMED) return 0
      status = BookingStatus.IN_PROGRESS
      return 1
    },
    async findStatus(bookingId) {
      if (overrides.failStatus) throw new Error('private SQL connection details')
      return bookingId === 101 ? status : null
    },
    get status() { return status },
  }
}

test('service providers can start a confirmed booking', async () => {
  const repo = providerStartRepository()
  const result = await startProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    '101',
    repo,
  )

  assert.deepEqual(result, { success: true })
  assert.equal(repo.status, BookingStatus.IN_PROGRESS)
})

test('admins can start a confirmed booking', async () => {
  const repo = providerStartRepository()
  const result = await startProviderBooking({ id: 1, role: UserRole.ADMIN }, 101, repo)

  assert.deepEqual(result, { success: true })
  assert.equal(repo.status, BookingStatus.IN_PROGRESS)
})

test('unauthenticated users cannot start service', async () => {
  const repo = providerStartRepository()
  const result = await startProviderBooking(null, 101, repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'unauthenticated')
  assert.equal(repo.status, BookingStatus.CONFIRMED)
})

for (const role of [UserRole.CUSTOMER, UserRole.FLEET_MANAGER]) {
  test(`${role} cannot start a provider booking`, async () => {
    const repo = providerStartRepository()
    const result = await startProviderBooking({ id: 20, role }, 101, repo)

    assert.equal(result.success, false)
    assert.equal(result.reason, 'forbidden')
    assert.equal(repo.status, BookingStatus.CONFIRMED)
  })
}

for (const status of [BookingStatus.PENDING, BookingStatus.REJECTED, BookingStatus.CANCELLED, BookingStatus.IN_PROGRESS]) {
  test(`a booking in ${status} cannot be started`, async () => {
    const repo = providerStartRepository(status)
    const result = await startProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, 101, repo)

    assert.equal(result.success, false)
    assert.equal(result.reason, 'invalid_state')
    assert.equal(repo.status, status)
  })
}

test('a missing booking cannot be started', async () => {
  const repo = providerStartRepository()
  const result = await startProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, 102, repo)

  assert.deepEqual(result, { success: false, reason: 'not_found', error: 'Booking not found.' })
})

test('invalid start-service booking identifiers are rejected before database access', async () => {
  const repo = providerStartRepository()
  const result = await startProviderBooking({ id: 10, role: UserRole.SERVICE_PROVIDER }, '10x', repo)

  assert.equal(result.success, false)
  assert.equal(result.reason, 'invalid_input')
  assert.equal(repo.status, BookingStatus.CONFIRMED)
})

test('concurrent start-service attempts transition a confirmed booking only once', async () => {
  const repo = providerStartRepository()
  const actor = { id: 10, role: UserRole.SERVICE_PROVIDER }
  const results = await Promise.all([
    startProviderBooking(actor, 101, repo),
    startProviderBooking(actor, 101, repo),
  ])

  assert.equal(results.filter((result) => result.success).length, 1)
  assert.equal(results.filter((result) => !result.success && result.reason === 'invalid_state').length, 1)
  assert.equal(repo.status, BookingStatus.IN_PROGRESS)
})

test('start-service database failures return safe errors', async () => {
  const failedUpdate = await startProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    101,
    providerStartRepository(BookingStatus.CONFIRMED, { failStart: true }),
  )
  assert.deepEqual(failedUpdate, {
    success: false,
    reason: 'error',
    error: 'Service could not be started. Please try again.',
  })
  assert.equal(JSON.stringify(failedUpdate).includes('private SQL'), false)

  const failedStatus = await startProviderBooking(
    { id: 10, role: UserRole.SERVICE_PROVIDER },
    101,
    providerStartRepository(BookingStatus.PENDING, { failStatus: true }),
  )
  assert.equal(failedStatus.success, false)
  assert.equal(failedStatus.reason, 'error')
})
