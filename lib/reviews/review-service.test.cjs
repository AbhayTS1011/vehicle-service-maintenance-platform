const { test } = require('node:test')
const assert = require('node:assert/strict')
const { BookingStatus, UserRole } = require('@prisma/client')
const { getCustomerBookingReview, submitCustomerReview } = require('./review-service.ts')

const customer = { id: 8, role: UserRole.CUSTOMER }
const review = { id: 21, bookingId: 15, rating: 5, comment: 'Great service', createdAt: new Date('2026-10-10T12:00:00Z') }

function repository(overrides = {}) {
  const calls = []
  return {
    calls,
    async createForCompletedBooking(input) {
      calls.push(['create', input])
      return { review }
    },
    async findForCustomerBooking(bookingId, customerId) {
      calls.push(['find', bookingId, customerId])
      return { status: BookingStatus.COMPLETED, hasService: true, review }
    },
    ...overrides,
  }
}

test('customer can review an owned completed booking and the server supplies customer identity', async () => {
  const repo = repository()
  const result = await submitCustomerReview(customer, '15', '5', '  Great service  ', repo)
  assert.deepEqual(result, { success: true, review })
  assert.deepEqual(repo.calls[0], ['create', { bookingId: 15, customerId: customer.id, rating: 5, comment: 'Great service' }])
})

test('fleet manager can review their own eligible booking and blank comment is stored as null', async () => {
  const repo = repository()
  const result = await submitCustomerReview({ id: 8, role: UserRole.FLEET_MANAGER }, 15, 4, '  ', repo)
  assert.equal(result.success, true)
  assert.equal(repo.calls[0][1].comment, null)
  assert.equal(repo.calls[0][1].customerId, 8)
})

test('unauthenticated and non-customer roles are denied without repository access', async () => {
  for (const actor of [null, { id: 9, role: UserRole.SERVICE_PROVIDER }, { id: 9, role: UserRole.ADMIN }]) {
    const repo = repository()
    const result = await submitCustomerReview(actor, 15, 5, null, repo)
    assert.equal(result.success, false)
    assert.equal(result.reason, actor ? 'forbidden' : 'unauthenticated')
    assert.equal(repo.calls.length, 0)
  }
})

test('invalid booking IDs and ratings are rejected before persistence', async () => {
  for (const [bookingId, rating] of [[0, 5], ['bad', 5], [15, 0], [15, 6], [15, 2.5], [15, '5stars']]) {
    const repo = repository()
    const result = await submitCustomerReview(customer, bookingId, rating, null, repo)
    assert.equal(result.success, false)
    assert.equal(result.reason, 'invalid_input')
    assert.equal(repo.calls.length, 0)
  }
})

test('non-text comments are rejected and text is trimmed', async () => {
  const repo = repository()
  const invalid = await submitCustomerReview(customer, 15, 5, { body: 'not text' }, repo)
  assert.equal(invalid.success, false)
  if (!invalid.success) assert.equal(invalid.reason, 'invalid_input')
  assert.equal(repo.calls.length, 0)

  await submitCustomerReview(customer, 15, 5, '  Helpful  ', repo)
  assert.equal(repo.calls[0][1].comment, 'Helpful')
})

test('missing, ineligible, and previously reviewed bookings return safe domain errors', async () => {
  const scenarios = [
    ['not_found', 'Booking not found.'],
    ['ineligible', 'A review is available after the service is completed.'],
    ['already_reviewed', 'A review has already been submitted for this booking.'],
  ]
  for (const [reason, error] of scenarios) {
    const result = await submitCustomerReview(customer, 15, 5, null, repository({
      createForCompletedBooking: async () => ({ reason }),
    }))
    assert.deepEqual(result, { success: false, reason, error })
  }
})

test('database errors return a safe message without exposing internals', async () => {
  const result = await submitCustomerReview(customer, 15, 5, null, repository({
    createForCompletedBooking: async () => { throw new Error('database host/password leaked') },
  }))
  assert.deepEqual(result, {
    success: false,
    reason: 'error',
    error: 'Your review could not be submitted. Please try again.',
  })
  assert.doesNotMatch(result.error, /host|password/)
})

test('concurrent submissions produce one review and one duplicate result', async () => {
  let stored = false
  const repo = repository({
    async createForCompletedBooking() {
      if (stored) return { reason: 'already_reviewed' }
      stored = true
      await Promise.resolve()
      return { review }
    },
  })
  const results = await Promise.all([
    submitCustomerReview(customer, 15, 5, null, repo),
    submitCustomerReview(customer, 15, 4, null, repo),
  ])
  assert.equal(results.filter((result) => result.success).length, 1)
  assert.equal(results.filter((result) => !result.success && result.reason === 'already_reviewed').length, 1)
})

test('review read is scoped to the signed-in customer and reports eligible state', async () => {
  const repo = repository()
  const result = await getCustomerBookingReview(customer, '15', repo)
  assert.deepEqual(result, { success: true, eligible: true, review })
  assert.deepEqual(repo.calls[0], ['find', 15, customer.id])
})

test('only completed or invoiced bookings with service records are eligible to review', async () => {
  for (const status of [BookingStatus.COMPLETED, BookingStatus.INVOICED]) {
    const result = await getCustomerBookingReview(customer, 15, repository({
      findForCustomerBooking: async () => ({ status, hasService: true, review: null }),
    }))
    assert.deepEqual(result, { success: true, eligible: true, review: null })
  }
  for (const [status, hasService] of [[BookingStatus.PENDING, true], [BookingStatus.IN_PROGRESS, true], [BookingStatus.COMPLETED, false]]) {
    const result = await getCustomerBookingReview(customer, 15, repository({
      findForCustomerBooking: async () => ({ status, hasService, review: null }),
    }))
    assert.deepEqual(result, { success: true, eligible: false, review: null })
  }
})

test('review reads hide other customers bookings and safely handle repository errors', async () => {
  const missing = await getCustomerBookingReview(customer, 15, repository({ findForCustomerBooking: async () => null }))
  assert.deepEqual(missing, { success: false, reason: 'not_found', error: 'Booking not found.' })
  const failure = await getCustomerBookingReview(customer, 15, repository({
    findForCustomerBooking: async () => { throw new Error('database secret') },
  }))
  assert.deepEqual(failure, { success: false, reason: 'error', error: 'Review details could not be loaded. Please try again.' })
})
