const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { BookingStatus, UserRole, PrismaClient } = require('@prisma/client')
const { configurePhase5TestDatabase } = require('./booking/phase5-postgres-test-target.cjs')

const target = configurePhase5TestDatabase(process.env)
const prisma = new PrismaClient()
const { db, disconnectDatabase } = require('./db.ts')
const { sendBookingWorkflowEmail, sendInvoiceWorkflowEmail } = require('./email-workflows.ts')
const runId = randomUUID()
const tag = `phase9-${runId}`
const ids = { center: null, customer: null, vehicle: null, serviceType: null, bookings: [], invoices: [] }

async function assertSafeEmptyTarget() {
  const identity = await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username`
  assert.equal(identity[0].database, target.database)
  assert.equal(identity[0].username, target.user)
  const counts = await Promise.all([
    prisma.user.count(), prisma.vehicle.count(), prisma.serviceType.count(), prisma.serviceCenter.count(),
    prisma.mechanic.count(), prisma.booking.count(), prisma.service.count(), prisma.servicePart.count(),
    prisma.part.count(), prisma.invoice.count(), prisma.review.count(), prisma.notification.count(),
    prisma.auditLog.count(), prisma.serviceCenterHour.count(),
  ])
  assert.ok(counts.every((count) => count === 0), 'Refusing writes: dedicated Phase 9 integration database must be empty.')
}

async function createFixture() {
  const center = await prisma.serviceCenter.create({ data: {
    name: `${tag} center`, address: 'Synthetic test data', phone: '0000000000',
    email: `${runId}@example.invalid`, operatingHours: 'Integration test', timeZone: 'Etc/UTC',
  } })
  ids.center = center.id
  const customer = await prisma.user.create({ data: {
    name: `${tag} customer`, email: `c-${runId}@example.invalid`, passwordHash: 'not-a-real-password', role: UserRole.CUSTOMER,
  } })
  ids.customer = customer.id
  const vehicle = await prisma.vehicle.create({ data: {
    ownerId: customer.id, make: 'Synthetic', model: 'Email Test', year: 2025,
    licensePlate: `P9${runId.replaceAll('-', '').slice(0, 10)}`,
  } })
  ids.vehicle = vehicle.id
  const serviceType = await prisma.serviceType.create({ data: {
    name: `${tag} service`, description: 'Synthetic test data', basePrice: 100, estimatedDurationMinutes: 60,
  } })
  ids.serviceType = serviceType.id
  return { center, customer, vehicle, serviceType }
}

async function createBooking(fixture, status) {
  const booking = await prisma.booking.create({ data: {
    customerId: fixture.customer.id, vehicleId: fixture.vehicle.id, serviceTypeId: fixture.serviceType.id,
    serviceCenterId: fixture.center.id, status, scheduledDate: new Date('2026-10-20T10:00:00Z'),
  } })
  ids.bookings.push(booking.id)
  return booking
}

async function cleanup() {
  if (ids.invoices.length) await prisma.invoice.deleteMany({ where: { id: { in: ids.invoices } } })
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } })
  if (ids.serviceType) await prisma.serviceType.deleteMany({ where: { id: ids.serviceType } })
  if (ids.vehicle) await prisma.vehicle.deleteMany({ where: { id: ids.vehicle } })
  if (ids.customer) await prisma.user.deleteMany({ where: { id: ids.customer } })
  if (ids.center) await prisma.serviceCenter.deleteMany({ where: { id: ids.center } })
}

test('Phase 9 email recipient context reads from the guarded dedicated PostgreSQL database', async (t) => {
  try {
    await assertSafeEmptyTarget()
    const fixture = await createFixture()
    const pending = await createBooking(fixture, BookingStatus.PENDING)
    const invoiced = await createBooking(fixture, BookingStatus.INVOICED)
    const invoice = await prisma.invoice.create({ data: {
      bookingId: invoiced.id, invoiceNumber: `INV-${invoiced.id}`,
      subtotal: '100.00', tax: '18.00', totalAmount: '118.00', issuedAt: new Date(), dueDate: new Date(),
    } })
    ids.invoices.push(invoice.id)

    await t.test('booking email uses persisted status, customer address, service and schedule', async () => {
      let mail
      const result = await sendBookingWorkflowEmail('booking_requested', pending.id, db.workflowEmail, async (...args) => {
        mail = args
        return { sent: true }
      })
      assert.deepEqual(result, { sent: true })
      assert.equal(mail[1], fixture.customer.email)
      assert.equal(mail[2].bookingId, pending.id)
      assert.equal(mail[2].serviceName, fixture.serviceType.name)
      assert.equal(mail[2].scheduledDate.getTime(), pending.scheduledDate.getTime())
    })

    await t.test('invoice email requires and reads a persisted invoice for an invoiced booking', async () => {
      let mail
      const result = await sendInvoiceWorkflowEmail(invoice.id, db.workflowEmail, async (...args) => {
        mail = args
        return { sent: true }
      })
      assert.deepEqual(result, { sent: true })
      assert.equal(mail[0], 'invoice_issued')
      assert.equal(mail[1], fixture.customer.email)
      assert.equal(mail[2].invoiceNumber, invoice.invoiceNumber)
      assert.equal(mail[2].bookingId, invoiced.id)
    })
  } finally {
    try {
      await cleanup()
    } finally {
      await disconnectDatabase()
      await prisma.$disconnect()
    }
  }
})
