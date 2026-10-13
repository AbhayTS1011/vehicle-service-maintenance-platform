const { test } = require('node:test')
const assert = require('node:assert/strict')
const { BookingStatus } = require('@prisma/client')
const {
  emailDeliveryWarning,
  notifySuccessfulBookingMutation,
  notifySuccessfulInvoiceMutation,
  sendBookingWorkflowEmail,
  sendInvoiceWorkflowEmail,
} = require('./email-workflows.ts')

function booking(status = BookingStatus.CONFIRMED) {
  return {
    id: 17, status, scheduledDate: new Date('2026-10-15T10:00:00Z'),
    customer: { name: 'Trusted Customer', email: 'trusted@example.test' },
    serviceType: { name: 'Maintenance' },
  }
}

test('status event mapping derives recipient and template data from the repository', async () => {
  const cases = [
    ['booking_requested', BookingStatus.PENDING],
    ['booking_confirmed', BookingStatus.CONFIRMED],
    ['booking_rejected', BookingStatus.REJECTED],
    ['booking_cancelled', BookingStatus.CANCELLED],
    ['service_started', BookingStatus.IN_PROGRESS],
    ['service_completed', BookingStatus.COMPLETED],
  ]
  for (const [event, status] of cases) {
    const calls = []
    const repository = { async findBookingEmailContext(id) { calls.push(id); return booking(status) } }
    let sent
    const result = await sendBookingWorkflowEmail(event, '17', repository, async (...args) => { sent = args; return { sent: true } })
    assert.deepEqual(result, { sent: true })
    assert.deepEqual(calls, [17])
    assert.equal(sent[0], event)
    assert.equal(sent[1], 'trusted@example.test')
    assert.equal(sent[2].recipientName, 'Trusted Customer')
    assert.equal(sent[2].bookingId, 17)
    assert.equal(sent[2].serviceName, 'Maintenance')
  }
})

test('failed, unauthorized, stale, invalid and missing booking operations do not send email', async () => {
  let reads = 0
  let sends = 0
  const repository = { async findBookingEmailContext() { reads += 1; return booking(BookingStatus.PENDING) } }
  const send = async () => { sends += 1; return { sent: true } }
  const denied = await notifySuccessfulBookingMutation({ success: false, reason: 'forbidden' }, 'booking_confirmed', 17, repository, send)
  assert.equal(denied.success, false)
  assert.equal(reads, 0)
  assert.equal(sends, 0)
  const stale = await sendBookingWorkflowEmail('booking_confirmed', 17, repository, send)
  assert.deepEqual(stale, { sent: false, reason: 'invalid_template_data' })
  const invalid = await sendBookingWorkflowEmail('booking_confirmed', 'bad', repository, send)
  assert.deepEqual(invalid, { sent: false, reason: 'invalid_template_data' })
  assert.equal(sends, 0)
  assert.equal((await sendBookingWorkflowEmail('booking_confirmed', 17, { async findBookingEmailContext() { return null } }, send)).sent, false)
})

test('invoice email uses the committed invoice record and trusted customer recipient', async () => {
  let sent
  const result = await sendInvoiceWorkflowEmail('91', {
    async findInvoiceEmailContext(id) {
      assert.equal(id, 91)
      return { invoiceNumber: 'INV-17', booking: booking(BookingStatus.INVOICED) }
    },
  }, async (...args) => { sent = args; return { sent: true } })
  assert.deepEqual(result, { sent: true })
  assert.equal(sent[0], 'invoice_issued')
  assert.equal(sent[1], 'trusted@example.test')
  assert.equal(sent[2].invoiceNumber, 'INV-17')
})

test('email failure is a delivery warning and does not convert committed mutation success to failure', async () => {
  const repository = { async findBookingEmailContext() { return booking(BookingStatus.CONFIRMED) } }
  const original = { success: true, bookingId: 17 }
  const result = await notifySuccessfulBookingMutation(original, 'booking_confirmed', 17, repository, async () => ({ sent: false, reason: 'delivery_failed' }))
  assert.equal(result.success, true)
  assert.equal(result.bookingId, 17)
  assert.equal(result.emailWarning, emailDeliveryWarning)
  const failed = await notifySuccessfulBookingMutation({ success: false, error: 'database failed' }, 'booking_confirmed', 17, repository, async () => {
    throw new Error('must not send')
  })
  assert.equal(failed.success, false)
  assert.equal(failed.emailWarning, undefined)
})

test('only the successful conditional booking transition attempts its status email', async () => {
  const repository = { async findBookingEmailContext() { return booking(BookingStatus.CONFIRMED) } }
  let sends = 0
  const sender = async () => { sends += 1; return { sent: true } }
  const results = await Promise.all([
    notifySuccessfulBookingMutation({ success: true }, 'booking_confirmed', 17, repository, sender),
    notifySuccessfulBookingMutation({ success: false, reason: 'invalid_state' }, 'booking_confirmed', 17, repository, sender),
  ])
  assert.equal(results.filter((result) => result.success).length, 1)
  assert.equal(sends, 1)
})

test('invoice notification runs only after successful issue and delivery failure preserves invoice success', async () => {
  let calls = 0
  const repo = { async findInvoiceEmailContext() { calls += 1; return null } }
  const failed = await notifySuccessfulInvoiceMutation({ success: false, reason: 'invalid_state' }, null, repo)
  assert.equal(failed.success, false)
  assert.equal(calls, 0)
  const issued = await notifySuccessfulInvoiceMutation({ success: true, invoiceId: 91 }, 91, repo)
  assert.equal(issued.success, true)
  assert.equal(issued.invoiceId, 91)
  assert.equal(issued.emailWarning, emailDeliveryWarning)
  assert.equal(calls, 1)
})
