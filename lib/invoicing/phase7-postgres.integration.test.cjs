const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { BookingStatus, UserRole, PrismaClient } = require('@prisma/client')
const { configurePhase5TestDatabase } = require('../booking/phase5-postgres-test-target.cjs')

const target = configurePhase5TestDatabase(process.env)
const prisma = new PrismaClient()
const { db, disconnectDatabase } = require('../db.ts')
const { getInvoiceForActor, issueInvoiceForCompletedBooking } = require('./invoice-service.ts')

const runId = randomUUID()
const prefix = `phase7-it-${runId}`
const ids = { centers: [], users: [], vehicles: [], serviceTypes: [], bookings: [], services: [], parts: [], invoices: [] }

async function assertSafeEmptyTarget() {
  const identity = await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username`
  assert.equal(identity[0].database, target.database)
  assert.equal(identity[0].username, target.user)
  const expectedTotalsSignature = 'public.calculate_invoice_totals(integer)'
  const functionRows = await prisma.$queryRaw`
    SELECT to_regprocedure(${expectedTotalsSignature})::text AS signature
  `
  assert.ok(
    functionRows[0]?.signature,
    'Expected public.calculate_invoice_totals(integer), matching services.id SERIAL and Prisma Service.id Int. Install the repository function from database/functions.sql on this dedicated test database before running Phase 7 integration tests.',
  )
  const counts = await Promise.all([
    prisma.user.count(), prisma.vehicle.count(), prisma.serviceType.count(), prisma.serviceCenter.count(),
    prisma.mechanic.count(), prisma.booking.count(), prisma.service.count(), prisma.servicePart.count(),
    prisma.part.count(), prisma.invoice.count(), prisma.review.count(), prisma.notification.count(),
    prisma.auditLog.count(), prisma.serviceCenterHour.count(),
  ])
  assert.ok(counts.every((count) => count === 0), 'Refusing writes: dedicated integration DB must be empty.')
}

async function createFixture() {
  const center = await prisma.serviceCenter.create({ data: {
    name: `${prefix} center`, address: 'Synthetic test data', phone: '0000000000',
    email: `${runId}@example.invalid`, operatingHours: 'Integration test', timeZone: 'Etc/UTC',
  } })
  ids.centers.push(center.id)
  const customer = await prisma.user.create({ data: {
    name: `${prefix} customer`, email: `c-${runId}@example.invalid`,
    passwordHash: 'not-a-real-password', role: UserRole.CUSTOMER,
  } })
  ids.users.push(customer.id)
  const otherCustomer = await prisma.user.create({ data: {
    name: `${prefix} other`, email: `o-${runId}@example.invalid`,
    passwordHash: 'not-a-real-password', role: UserRole.CUSTOMER,
  } })
  ids.users.push(otherCustomer.id)
  const vehicle = await prisma.vehicle.create({ data: {
    ownerId: customer.id, make: 'Synthetic', model: 'Invoice Test', year: 2025,
    licensePlate: `P7${runId.replaceAll('-', '').slice(0, 10)}`,
  } })
  ids.vehicles.push(vehicle.id)
  const serviceType = await prisma.serviceType.create({ data: {
    name: `${prefix} maintenance`, description: 'Synthetic test data', basePrice: 100,
    estimatedDurationMinutes: 60,
  } })
  ids.serviceTypes.push(serviceType.id)
  return { center, customer, otherCustomer, vehicle, serviceType }
}

async function createBooking(fixture, status = BookingStatus.COMPLETED) {
  const booking = await prisma.booking.create({ data: {
    customerId: fixture.customer.id, vehicleId: fixture.vehicle.id, serviceTypeId: fixture.serviceType.id,
    serviceCenterId: fixture.center.id, status, scheduledDate: new Date(Date.now() - 60_000),
  } })
  ids.bookings.push(booking.id)
  return booking
}

async function createCompletedService(fixture, { laborCost = '0.00', parts = [] } = {}) {
  const booking = await createBooking(fixture)
  const service = await prisma.service.create({ data: {
    bookingId: booking.id, diagnosisNotes: 'synthetic diagnosis', workPerformed: 'synthetic work',
    laborCost, completedAt: new Date(),
  } })
  ids.services.push(service.id)
  if (parts.length) await prisma.servicePart.createMany({ data: parts.map((part) => ({ serviceId: service.id, ...part })) })
  return { booking, service }
}

async function cleanup() {
  if (ids.invoices.length) await prisma.invoice.deleteMany({ where: { id: { in: ids.invoices } } })
  if (ids.services.length) await prisma.servicePart.deleteMany({ where: { serviceId: { in: ids.services } } })
  if (ids.services.length) await prisma.service.deleteMany({ where: { id: { in: ids.services } } })
  if (ids.bookings.length) await prisma.invoice.deleteMany({ where: { bookingId: { in: ids.bookings } } })
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } })
  if (ids.parts.length) await prisma.part.deleteMany({ where: { id: { in: ids.parts } } })
  if (ids.serviceTypes.length) await prisma.serviceType.deleteMany({ where: { id: { in: ids.serviceTypes } } })
  if (ids.vehicles.length) await prisma.vehicle.deleteMany({ where: { id: { in: ids.vehicles } } })
  if (ids.users.length) await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
  if (ids.centers.length) await prisma.serviceCenter.deleteMany({ where: { id: { in: ids.centers } } })
}

test('Phase 7 invoice integration against the guarded dedicated PostgreSQL database', async (t) => {
  try {
    await assertSafeEmptyTarget()
    const fixture = await createFixture()
    const provider = { id: 500, role: UserRole.SERVICE_PROVIDER }
    const issue = (bookingId) => issueInvoiceForCompletedBooking(provider, bookingId, db.invoice)

    await t.test('SQL totals use labor and historical part quantities/prices; invoice and booking persist', async () => {
      const part = await prisma.part.create({ data: {
        name: `${prefix} filter`, partNumber: `P7-${runId.slice(0, 30)}`,
        unitPrice: '12.50', stockQuantity: 20, reorderThreshold: 1,
      } })
      ids.parts.push(part.id)
      const { booking, service } = await createCompletedService(fixture, {
        laborCost: '100.00',
        parts: [{ partId: part.id, quantity: 2, unitPriceAtTime: '12.50' }],
      })
      await prisma.part.update({ where: { id: part.id }, data: { unitPrice: '99.00' } })

      const result = await issue(booking.id)
      assert.equal(result.success, true, result.success ? undefined : `Invoice issuance failed (${result.reason}): ${result.error}`)
      if (!result.success) return
      ids.invoices.push(result.invoiceId)
      assert.equal(result.invoiceNumber, `INV-${booking.id}`)
      const persisted = await prisma.invoice.findUnique({ where: { id: result.invoiceId } })
      assert.equal(persisted.bookingId, booking.id)
      assert.equal(persisted.subtotal.toFixed(2), '125.00')
      assert.equal(persisted.tax.toFixed(2), '22.50')
      assert.equal(persisted.totalAmount.toFixed(2), '147.50')
      assert.equal(persisted.dueDate.getTime(), persisted.issuedAt.getTime())
      assert.equal((await prisma.booking.findUnique({ where: { id: booking.id } })).status, BookingStatus.INVOICED)

      const history = await db.invoice.findForActor(result.invoiceId, fixture.customer.id)
      assert.equal(history.booking.service.id, service.id)
      assert.equal(history.booking.service.serviceParts[0].quantity, 2)
      assert.equal(history.booking.service.serviceParts[0].unitPriceAtTime.toFixed(2), '12.50')
      assert.equal(await db.invoice.findForActor(result.invoiceId, fixture.otherCustomer.id), null)
      const denied = await getInvoiceForActor({ id: fixture.otherCustomer.id, role: UserRole.CUSTOMER }, result.invoiceId, db.invoice)
      assert.equal(denied.success, false)
      assert.equal(denied.reason, 'not_found')
    })

    await t.test('labor-only and zero-cost completed services calculate correctly', async () => {
      const laborOnly = await createCompletedService(fixture, { laborCost: '100.00' })
      const laborInvoice = await issue(laborOnly.booking.id)
      assert.equal(laborInvoice.success, true, laborInvoice.success ? undefined : `Labor-only invoice failed (${laborInvoice.reason}): ${laborInvoice.error}`)
      if (laborInvoice.success) {
        ids.invoices.push(laborInvoice.invoiceId)
        const stored = await prisma.invoice.findUnique({ where: { id: laborInvoice.invoiceId } })
        assert.equal(stored.subtotal.toFixed(2), '100.00')
        assert.equal(stored.tax.toFixed(2), '18.00')
        assert.equal(stored.totalAmount.toFixed(2), '118.00')
      }

      const zero = await createCompletedService(fixture)
      const zeroInvoice = await issue(zero.booking.id)
      assert.equal(zeroInvoice.success, true, zeroInvoice.success ? undefined : `Zero-cost invoice failed (${zeroInvoice.reason}): ${zeroInvoice.error}`)
      if (zeroInvoice.success) {
        ids.invoices.push(zeroInvoice.invoiceId)
        const stored = await prisma.invoice.findUnique({ where: { id: zeroInvoice.invoiceId } })
        assert.equal(stored.subtotal.toFixed(2), '0.00')
        assert.equal(stored.tax.toFixed(2), '0.00')
        assert.equal(stored.totalAmount.toFixed(2), '0.00')
      }
    })

    await t.test('repeat and concurrent requests issue one invoice and transition once', async () => {
      const duplicateTarget = await createCompletedService(fixture)
      const first = await issue(duplicateTarget.booking.id)
      assert.equal(first.success, true)
      if (first.success) ids.invoices.push(first.invoiceId)
      const repeat = await issue(duplicateTarget.booking.id)
      assert.equal(repeat.success, false)
      if (!repeat.success) assert.equal(repeat.reason, 'already_issued')
      assert.equal(await prisma.invoice.count({ where: { bookingId: duplicateTarget.booking.id } }), 1)

      const concurrentTarget = await createCompletedService(fixture)
      const results = await Promise.all([issue(concurrentTarget.booking.id), issue(concurrentTarget.booking.id)])
      assert.equal(results.filter((result) => result.success).length, 1)
      assert.equal(results.filter((result) => !result.success && result.reason === 'already_issued').length, 1)
      for (const result of results) if (result.success) ids.invoices.push(result.invoiceId)
      assert.equal(await prisma.invoice.count({ where: { bookingId: concurrentTarget.booking.id } }), 1)
      assert.equal((await prisma.booking.findUnique({ where: { id: concurrentTarget.booking.id } })).status, BookingStatus.INVOICED)
    })

    await t.test('ineligible bookings, missing service records, and nonexistent IDs remain unchanged', async () => {
      const inProgress = await createBooking(fixture, BookingStatus.IN_PROGRESS)
      const ineligible = await issue(inProgress.id)
      assert.equal(ineligible.success, false)
      if (!ineligible.success) assert.equal(ineligible.reason, 'invalid_state')

      const noService = await createBooking(fixture)
      const missing = await issue(noService.id)
      assert.equal(missing.success, false)
      if (!missing.success) assert.equal(missing.reason, 'missing_service')
      assert.equal((await prisma.booking.findUnique({ where: { id: noService.id } })).status, BookingStatus.COMPLETED)
      assert.equal(await prisma.invoice.count({ where: { bookingId: noService.id } }), 0)

      const nonexistent = await issue(2_000_000_000)
      assert.equal(nonexistent.success, false)
      if (!nonexistent.success) assert.equal(nonexistent.reason, 'not_found')
    })

    await t.test('invoice insert failure rolls back and leaves the booking completed', async () => {
      const blocked = await createCompletedService(fixture, { laborCost: '42.00' })
      const holderBooking = await createBooking(fixture)
      const collision = await prisma.invoice.create({ data: {
        bookingId: holderBooking.id, invoiceNumber: `INV-${blocked.booking.id}`,
        subtotal: '1.00', tax: '0.18', totalAmount: '1.18', issuedAt: new Date(), dueDate: new Date(),
      } })
      ids.invoices.push(collision.id)

      const result = await issue(blocked.booking.id)
      assert.equal(result.success, false)
      if (!result.success) assert.equal(result.reason, 'error')
      assert.equal(await prisma.invoice.count({ where: { bookingId: blocked.booking.id } }), 0)
      assert.equal((await prisma.booking.findUnique({ where: { id: blocked.booking.id } })).status, BookingStatus.COMPLETED)
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
