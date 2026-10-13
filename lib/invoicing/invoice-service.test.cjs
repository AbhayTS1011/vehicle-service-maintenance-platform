const { test } = require('node:test')
const assert = require('node:assert/strict')
const { BookingStatus, UserRole } = require('@prisma/client')
const {
  getInvoiceForActor,
  invoiceCustomerFilter,
  invoiceEligibleBookingStatus,
  issueInvoiceForCompletedBooking,
  listInvoicesForActor,
} = require('./invoice-service.ts')

const provider = { id: 10, role: UserRole.SERVICE_PROVIDER }
const admin = { id: 11, role: UserRole.ADMIN }
const invoice = { id: 25, bookingId: 7, invoiceNumber: 'INV-7', totalAmount: '147.50' }

function repository(overrides = {}) {
  const calls = []
  return {
    calls,
    async issueForCompletedBooking(...args) { calls.push(args); return { invoiceId: 25, invoiceNumber: 'INV-7' } },
    async findManyForActor(...args) { calls.push(args); return [invoice] },
    async findForActor(...args) { calls.push(args); return invoice },
    async findCompletedWithoutInvoice() { calls.push(['findCompletedWithoutInvoice']); return [] },
    ...overrides,
  }
}

test('service providers and admins can issue a valid completed booking invoice', async () => {
  const issuedAt = new Date('2026-10-13T10:00:00.000Z')
  for (const actor of [provider, admin]) {
    const repo = repository()
    const result = await issueInvoiceForCompletedBooking(actor, '7', repo, () => issuedAt)
    assert.deepEqual(result, { success: true, invoiceId: 25, invoiceNumber: 'INV-7' })
    assert.deepEqual(repo.calls, [[7, issuedAt]])
  }
})

test('unauthenticated users, customers, and fleet managers cannot issue invoices', async () => {
  for (const actor of [null, { id: 1, role: UserRole.CUSTOMER }, { id: 2, role: UserRole.FLEET_MANAGER }]) {
    const repo = repository()
    const result = await issueInvoiceForCompletedBooking(actor, 7, repo)
    assert.equal(result.success, false)
    assert.equal(repo.calls.length, 0)
  }
})

test('invalid booking IDs are rejected before persistence', async () => {
  const repo = repository()
  for (const bookingId of [null, '', '0', '-1', '1.2', 'nope', Number.MAX_SAFE_INTEGER + 1]) {
    const result = await issueInvoiceForCompletedBooking(provider, bookingId, repo)
    assert.equal(result.success, false)
    assert.equal(result.reason, 'invalid_input')
  }
  assert.equal(repo.calls.length, 0)
})

test('missing, ineligible, unrecorded, and already-invoiced bookings fail safely', async () => {
  for (const reason of ['not_found', 'invalid_state', 'missing_service', 'already_issued']) {
    const result = await issueInvoiceForCompletedBooking(provider, 7, repository({
      async issueForCompletedBooking() { return { reason } },
    }))
    assert.equal(result.success, false)
    assert.equal(result.reason, reason)
  }
})

test('database errors do not expose internal details', async () => {
  const result = await issueInvoiceForCompletedBooking(provider, 7, repository({
    async issueForCompletedBooking() { throw new Error('private SQL detail') },
  }))
  assert.deepEqual(result, {
    success: false,
    reason: 'error',
    error: 'Invoice could not be issued. Please try again.',
  })
})

test('invoice reads scope customers to their own bookings and providers/admins to the single center', async () => {
  assert.equal(invoiceCustomerFilter({ id: 4, role: UserRole.CUSTOMER }), 4)
  assert.equal(invoiceCustomerFilter({ id: 5, role: UserRole.FLEET_MANAGER }), 5)
  assert.equal(invoiceCustomerFilter(provider), undefined)
  assert.equal(invoiceCustomerFilter(admin), undefined)
  assert.equal(invoiceCustomerFilter(null), null)

  const customerRepo = repository()
  const own = await getInvoiceForActor({ id: 4, role: UserRole.CUSTOMER }, '25', customerRepo)
  assert.equal(own.success, true)
  assert.deepEqual(customerRepo.calls, [[25, 4]])

  const providerRepo = repository()
  const listed = await listInvoicesForActor(provider, providerRepo)
  assert.equal(listed.success, true)
  assert.deepEqual(providerRepo.calls, [[undefined]])
})

test('invoice reads validate IDs, reject unauthorized actors, and hide database errors', async () => {
  const repo = repository()
  assert.equal((await getInvoiceForActor({ id: 1, role: UserRole.CUSTOMER }, 'NaN', repo)).reason, 'invalid_input')
  assert.equal((await getInvoiceForActor({ id: 1, role: UserRole.CUSTOMER }, '25', repository({ async findForActor() { return null } }))).reason, 'not_found')
  assert.equal((await listInvoicesForActor(null, repo)).reason, 'unauthenticated')
  assert.equal((await listInvoicesForActor({ id: 1, role: 'UNKNOWN' }, repo)).reason, 'forbidden')
  const failed = await listInvoicesForActor(provider, repository({ async findManyForActor() { throw new Error('private SQL detail') } }))
  assert.deepEqual(failed, { success: false, reason: 'error', invoices: [] })
})

test('only COMPLETED is an eligible invoice source state', () => {
  assert.equal(invoiceEligibleBookingStatus(BookingStatus.COMPLETED), true)
  for (const status of Object.values(BookingStatus).filter((status) => status !== BookingStatus.COMPLETED)) {
    assert.equal(invoiceEligibleBookingStatus(status), false)
  }
})
