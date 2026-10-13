const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { BookingStatus, UserRole, PrismaClient } = require('@prisma/client')
const { configurePhase5TestDatabase } = require('../booking/phase5-postgres-test-target.cjs')

const target = configurePhase5TestDatabase(process.env)
const prisma = new PrismaClient()
const { db, disconnectDatabase } = require('../db.ts')
const { getCustomerBookingReview, submitCustomerReview } = require('./review-service.ts')

const runId = randomUUID()
const prefix = `phase8-it-${runId}`
const ids = { centers: [], users: [], vehicles: [], serviceTypes: [], bookings: [], services: [] }

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
  assert.ok(counts.every((count) => count === 0), 'Refusing writes: dedicated Phase 8 integration database must be empty.')
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
    ownerId: customer.id, make: 'Synthetic', model: 'Review Test', year: 2025,
    licensePlate: `P8${runId.replaceAll('-', '').slice(0, 10)}`,
  } })
  ids.vehicles.push(vehicle.id)
  const serviceType = await prisma.serviceType.create({ data: {
    name: `${prefix} maintenance`, description: 'Synthetic test data', basePrice: 100,
    estimatedDurationMinutes: 60,
  } })
  ids.serviceTypes.push(serviceType.id)
  return { center, customer, otherCustomer, vehicle, serviceType }
}

async function createBooking(fixture, status = BookingStatus.COMPLETED, withService = true) {
  const booking = await prisma.booking.create({ data: {
    customerId: fixture.customer.id, vehicleId: fixture.vehicle.id, serviceTypeId: fixture.serviceType.id,
    serviceCenterId: fixture.center.id, status, scheduledDate: new Date(Date.now() - 60_000),
  } })
  ids.bookings.push(booking.id)
  if (withService) {
    const service = await prisma.service.create({ data: {
      bookingId: booking.id, diagnosisNotes: 'synthetic diagnosis', workPerformed: 'synthetic work',
      laborCost: '0.00', completedAt: new Date(),
    } })
    ids.services.push(service.id)
  }
  return booking
}

async function cleanup() {
  if (ids.bookings.length) await prisma.review.deleteMany({ where: { bookingId: { in: ids.bookings } } })
  if (ids.services.length) await prisma.servicePart.deleteMany({ where: { serviceId: { in: ids.services } } })
  if (ids.services.length) await prisma.service.deleteMany({ where: { id: { in: ids.services } } })
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } })
  if (ids.serviceTypes.length) await prisma.serviceType.deleteMany({ where: { id: { in: ids.serviceTypes } } })
  if (ids.vehicles.length) await prisma.vehicle.deleteMany({ where: { id: { in: ids.vehicles } } })
  if (ids.users.length) await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
  if (ids.centers.length) await prisma.serviceCenter.deleteMany({ where: { id: { in: ids.centers } } })
}

test('Phase 8 review integration against the guarded dedicated PostgreSQL database', async (t) => {
  try {
    await assertSafeEmptyTarget()
    const fixture = await createFixture()
    const actor = { id: fixture.customer.id, role: UserRole.CUSTOMER }

    await t.test('eligible customer review persists and is retrieved only by its booking customer', async () => {
      const booking = await createBooking(fixture)
      const submitted = await submitCustomerReview(actor, booking.id, 4, '  Helpful service  ', db.review)
      assert.equal(submitted.success, true, submitted.success ? undefined : `Review submission failed (${submitted.reason}): ${submitted.error}`)
      if (!submitted.success) return
      assert.equal(submitted.review.bookingId, booking.id)
      assert.equal(submitted.review.rating, 4)
      assert.equal(submitted.review.comment, 'Helpful service')
      const persisted = await prisma.review.findUnique({ where: { bookingId: booking.id } })
      assert.equal(persisted.customerId, fixture.customer.id)
      assert.equal(persisted.rating, 4)
      assert.equal(persisted.comment, 'Helpful service')

      const visible = await getCustomerBookingReview(actor, booking.id, db.review)
      assert.equal(visible.success, true)
      if (visible.success) assert.deepEqual(visible.review, submitted.review)
      assert.deepEqual(await db.review.findForCustomerBooking(booking.id, fixture.otherCustomer.id), null)
      const hidden = await getCustomerBookingReview({ id: fixture.otherCustomer.id, role: UserRole.CUSTOMER }, booking.id, db.review)
      assert.equal(hidden.success, false)
      if (!hidden.success) assert.equal(hidden.reason, 'not_found')
    })

    await t.test('only completed or invoiced bookings with service records are eligible', async () => {
      for (const status of [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED]) {
        const booking = await createBooking(fixture, status)
        const result = await submitCustomerReview(actor, booking.id, 5, null, db.review)
        assert.equal(result.success, false)
        if (!result.success) assert.equal(result.reason, 'ineligible')
      }
      const missingService = await createBooking(fixture, BookingStatus.COMPLETED, false)
      const missing = await submitCustomerReview(actor, missingService.id, 5, null, db.review)
      assert.equal(missing.success, false)
      if (!missing.success) assert.equal(missing.reason, 'ineligible')

      const invoiced = await createBooking(fixture, BookingStatus.INVOICED)
      const accepted = await submitCustomerReview(actor, invoiced.id, 5, null, db.review)
      assert.equal(accepted.success, true, accepted.success ? undefined : `Invoiced review failed (${accepted.reason}): ${accepted.error}`)
    })

    await t.test('ownership, role, input, duplicate, and concurrent constraints are enforced', async () => {
      const booking = await createBooking(fixture)
      const foreign = await submitCustomerReview({ id: fixture.otherCustomer.id, role: UserRole.CUSTOMER }, booking.id, 5, null, db.review)
      assert.equal(foreign.success, false)
      if (!foreign.success) assert.equal(foreign.reason, 'not_found')

      for (const deniedActor of [null, { id: fixture.customer.id, role: UserRole.SERVICE_PROVIDER }, { id: fixture.customer.id, role: UserRole.ADMIN }]) {
        const denied = await submitCustomerReview(deniedActor, booking.id, 5, null, db.review)
        assert.equal(denied.success, false)
        if (!denied.success) assert.equal(denied.reason, deniedActor ? 'forbidden' : 'unauthenticated')
      }
      const invalid = await submitCustomerReview(actor, booking.id, 6, null, db.review)
      assert.equal(invalid.success, false)
      if (!invalid.success) assert.equal(invalid.reason, 'invalid_input')

      const concurrentBooking = await createBooking(fixture)
      const concurrent = await Promise.all([
        submitCustomerReview(actor, concurrentBooking.id, 4, 'first', db.review),
        submitCustomerReview(actor, concurrentBooking.id, 5, 'second', db.review),
      ])
      assert.equal(concurrent.filter((result) => result.success).length, 1)
      assert.equal(concurrent.filter((result) => !result.success && result.reason === 'already_reviewed').length, 1)
      assert.equal(await prisma.review.count({ where: { bookingId: concurrentBooking.id } }), 1)
      const duplicate = await submitCustomerReview(actor, concurrentBooking.id, 5, null, db.review)
      assert.equal(duplicate.success, false)
      if (!duplicate.success) assert.equal(duplicate.reason, 'already_reviewed')
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
