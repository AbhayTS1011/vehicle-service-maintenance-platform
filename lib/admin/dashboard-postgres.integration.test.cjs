const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { BookingStatus, InvoiceStatus, UserRole, PrismaClient } = require('@prisma/client')
const { configurePhase5TestDatabase } = require('../booking/phase5-postgres-test-target.cjs')

const target = configurePhase5TestDatabase(process.env)
const prisma = new PrismaClient()
const { db, disconnectDatabase } = require('../db.ts')
const { readAdminDashboard } = require('./dashboard.ts')
const runId = randomUUID()
const prefix = `phase10-${runId}`
const ids = { center: null, users: [], vehicles: [], serviceTypes: [], mechanics: [], parts: [], bookings: [], invoices: [], reviews: [] }

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
  assert.ok(counts.every((count) => count === 0), 'Refusing writes: dedicated Phase 10 integration database must be empty.')
}

async function createFixture() {
  const center = await prisma.serviceCenter.create({ data: {
    name: `${prefix} center`, address: 'Synthetic test fixture', phone: '0000000000',
    email: `${runId}@example.invalid`, timeZone: 'Etc/UTC',
  } })
  ids.center = center.id
  const customer = await prisma.user.create({ data: {
    name: `${prefix} customer`, email: `${runId}@example.invalid`, passwordHash: 'not-a-real-password', role: UserRole.CUSTOMER,
  } })
  ids.users.push(customer.id)
  const vehicle = await prisma.vehicle.create({ data: {
    ownerId: customer.id, make: 'Synthetic', model: 'Dashboard Test', year: 2025,
    licensePlate: `P10${runId.replaceAll('-', '').slice(0, 9)}`,
  } })
  ids.vehicles.push(vehicle.id)
  const serviceType = await prisma.serviceType.create({ data: {
    name: `${prefix} service`, description: 'Synthetic test fixture', basePrice: 100, estimatedDurationMinutes: 60,
  } })
  ids.serviceTypes.push(serviceType.id)
  const activeMechanic = await prisma.mechanic.create({ data: { serviceCenterId: center.id, name: `${prefix} active`, isActive: true } })
  const inactiveMechanic = await prisma.mechanic.create({ data: { serviceCenterId: center.id, name: `${prefix} inactive`, isActive: false } })
  ids.mechanics.push(activeMechanic.id, inactiveMechanic.id)
  const lowStock = await prisma.part.create({ data: {
    name: `${prefix} low stock`, partNumber: `P10L${runId.replaceAll('-', '').slice(0, 8)}`,
    unitPrice: 10, stockQuantity: 2, reorderThreshold: 5,
  } })
  const adequateStock = await prisma.part.create({ data: {
    name: `${prefix} available`, partNumber: `P10A${runId.replaceAll('-', '').slice(0, 8)}`,
    unitPrice: 10, stockQuantity: 8, reorderThreshold: 5,
  } })
  ids.parts.push(lowStock.id, adequateStock.id)
  return { center, customer, vehicle, serviceType }
}

async function createBooking(fixture, status, scheduledDate) {
  const booking = await prisma.booking.create({ data: {
    customerId: fixture.customer.id, vehicleId: fixture.vehicle.id, serviceTypeId: fixture.serviceType.id,
    serviceCenterId: fixture.center.id, status, scheduledDate,
  } })
  ids.bookings.push(booking.id)
  return booking
}

async function cleanup() {
  if (ids.invoices.length) await prisma.invoice.deleteMany({ where: { id: { in: ids.invoices } } })
  if (ids.reviews.length) await prisma.review.deleteMany({ where: { id: { in: ids.reviews } } })
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } })
  if (ids.parts.length) await prisma.part.deleteMany({ where: { id: { in: ids.parts } } })
  if (ids.mechanics.length) await prisma.mechanic.deleteMany({ where: { id: { in: ids.mechanics } } })
  if (ids.serviceTypes.length) await prisma.serviceType.deleteMany({ where: { id: { in: ids.serviceTypes } } })
  if (ids.vehicles.length) await prisma.vehicle.deleteMany({ where: { id: { in: ids.vehicles } } })
  if (ids.users.length) await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
  if (ids.center) await prisma.serviceCenter.deleteMany({ where: { id: ids.center } })
}

test('Phase 10 dashboard aggregates persisted operational data for the configured center', async () => {
  try {
    await assertSafeEmptyTarget()
    const fixture = await createFixture()
    const pending = await createBooking(fixture, BookingStatus.PENDING, new Date('2026-10-20T10:00:00Z'))
    const confirmed = await createBooking(fixture, BookingStatus.CONFIRMED, new Date('2026-10-22T10:00:00Z'))
    const paidBooking = await createBooking(fixture, BookingStatus.INVOICED, new Date('2026-10-23T10:00:00Z'))
    const unpaidBooking = await createBooking(fixture, BookingStatus.INVOICED, new Date('2026-10-24T10:00:00Z'))
    const paidInvoice = await prisma.invoice.create({ data: {
      bookingId: paidBooking.id, invoiceNumber: `INV-P10-${paidBooking.id}`, subtotal: '100.00', tax: '18.00',
      totalAmount: '118.00', status: InvoiceStatus.PAID, dueDate: new Date(),
    } })
    const unpaidInvoice = await prisma.invoice.create({ data: {
      bookingId: unpaidBooking.id, invoiceNumber: `INV-P10-${unpaidBooking.id}`, subtotal: '50.00', tax: '9.00',
      totalAmount: '59.00', status: InvoiceStatus.UNPAID, dueDate: new Date(),
    } })
    ids.invoices.push(paidInvoice.id, unpaidInvoice.id)
    const review = await prisma.review.create({ data: { bookingId: paidBooking.id, customerId: fixture.customer.id, rating: 4, comment: 'Synthetic test fixture' } })
    ids.reviews.push(review.id)

    const result = await readAdminDashboard({ id: 9001, role: UserRole.ADMIN }, db.adminDashboard)
    assert.equal(result.success, true)
    assert.equal(result.value.serviceCenterName, fixture.center.name)
    assert.equal(result.value.bookings.total, 4)
    assert.equal(result.value.bookings.byStatus.PENDING, 1)
    assert.equal(result.value.bookings.byStatus.CONFIRMED, 1)
    assert.equal(result.value.bookings.byStatus.INVOICED, 2)
    assert.equal(result.value.mechanics.total, 2)
    assert.equal(result.value.mechanics.active, 1)
    assert.equal(result.value.lowStockParts, 1)
    assert.deepEqual(result.value.invoices, { paidCount: 1, paidAmount: '118.00', unpaidCount: 1, unpaidAmount: '59.00' })
    assert.deepEqual(result.value.reviews, { count: 1, averageRating: 4 })
    assert.equal(result.value.recentBookings.length, 4)
    assert.equal(result.value.recentBookings[0].id, unpaidBooking.id)
    assert.equal(result.value.recentBookings.some((booking) => booking.customer), false)
    assert.equal(result.value.recentBookings.some((booking) => booking.id === pending.id), true)
    assert.equal(result.value.recentBookings.some((booking) => booking.id === confirmed.id), true)
  } finally {
    try {
      await cleanup()
    } finally {
      await disconnectDatabase()
      await prisma.$disconnect()
    }
  }
})
