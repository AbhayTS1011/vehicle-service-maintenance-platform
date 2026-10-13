const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { configurePhase5TestDatabase } = require('../booking/phase5-postgres-test-target.cjs')

// Explicitly require the same loopback-only dedicated test target used by Phase 5.
const target = configurePhase5TestDatabase(process.env)
const { BookingStatus, UserRole, PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { db, disconnectDatabase } = require('../db.ts')
const { completeBookingWithServiceRecord } = require('./service-record-service.ts')

const runId = randomUUID()
const prefix = `phase6-it-${runId}`
const ids = { centers: [], users: [], vehicles: [], services: [], bookings: [], mechanics: [], parts: [], serviceTypes: [] }

async function assertSafeEmptyTarget() {
  const identity = await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username`
  assert.equal(identity[0].database, target.database)
  assert.equal(identity[0].username, target.user)

  const inventoryFunction = await prisma.$queryRaw`
    SELECT to_regprocedure('public.deduct_part_inventory()')::text AS signature
  `
  assert.ok(
    inventoryFunction[0]?.signature,
    'Missing public.deduct_part_inventory(). Install the repository definition from database/triggers.sql on this dedicated test database before running Phase 6 integration tests.',
  )
  const inventoryTrigger = await prisma.$queryRaw`
    SELECT tg.tgname
    FROM pg_trigger AS tg
    JOIN pg_class AS tbl ON tbl.oid = tg.tgrelid
    JOIN pg_namespace AS ns ON ns.oid = tbl.relnamespace
    JOIN pg_proc AS fn ON fn.oid = tg.tgfoid
    JOIN pg_namespace AS fn_ns ON fn_ns.oid = fn.pronamespace
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'service_parts'
      AND tg.tgname = 'trg_deduct_inventory'
      AND NOT tg.tgisinternal
      AND fn_ns.nspname = 'public'
      AND fn.proname = 'deduct_part_inventory'
  `
  assert.equal(
    inventoryTrigger.length,
    1,
    'Missing public.trg_deduct_inventory on public.service_parts or it is not connected to deduct_part_inventory(). Install the repository definition from database/triggers.sql on this dedicated test database before running Phase 6 integration tests.',
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
  const provider = await prisma.user.create({ data: {
    name: `${prefix} provider`, email: `p-${runId}@example.invalid`,
    passwordHash: 'not-a-real-password', role: UserRole.SERVICE_PROVIDER,
  } })
  ids.users.push(provider.id)
  const vehicle = await prisma.vehicle.create({ data: {
    ownerId: customer.id, make: 'Synthetic', model: 'Test', year: 2025,
    licensePlate: `P6${runId.replaceAll('-', '').slice(0, 10)}`,
  } })
  ids.vehicles.push(vehicle.id)
  const serviceType = await prisma.serviceType.create({ data: {
    name: `${prefix} maintenance`, description: 'Synthetic test data', basePrice: 100,
    estimatedDurationMinutes: 60,
  } })
  ids.serviceTypes.push(serviceType.id)
  const mechanic = await prisma.mechanic.create({ data: {
    serviceCenterId: center.id, name: `${prefix} mechanic`, isActive: true,
  } })
  ids.mechanics.push(mechanic.id)
  const booking = await prisma.booking.create({ data: {
    customerId: customer.id, vehicleId: vehicle.id, serviceTypeId: serviceType.id,
    mechanicId: mechanic.id, serviceCenterId: center.id, status: BookingStatus.IN_PROGRESS,
    scheduledDate: new Date(Date.now() - 60_000),
  } })
  ids.bookings.push(booking.id)
  const lowStockBooking = await prisma.booking.create({ data: {
    customerId: customer.id, vehicleId: vehicle.id, serviceTypeId: serviceType.id,
    mechanicId: mechanic.id, serviceCenterId: center.id, status: BookingStatus.IN_PROGRESS,
    scheduledDate: new Date(Date.now() - 60_000),
  } })
  ids.bookings.push(lowStockBooking.id)
  const part = await prisma.part.create({ data: {
    name: `${prefix} oil filter`, partNumber: `P6-${runId.slice(0, 30)}`,
    unitPrice: 12.5, stockQuantity: 4, reorderThreshold: 1,
  } })
  ids.parts.push(part.id)
  const noStockPart = await prisma.part.create({ data: {
    name: `${prefix} unavailable filter`, partNumber: `P6X-${runId.slice(0, 29)}`,
    unitPrice: 2, stockQuantity: 0, reorderThreshold: 1,
  } })
  ids.parts.push(noStockPart.id)
  return { customer, provider, vehicle, booking, lowStockBooking, part, noStockPart }
}

async function cleanup() {
  if (ids.services.length) await prisma.service.deleteMany({ where: { id: { in: ids.services } } })
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } })
  if (ids.parts.length) await prisma.part.deleteMany({ where: { id: { in: ids.parts } } })
  if (ids.serviceTypes.length) await prisma.serviceType.deleteMany({ where: { id: { in: ids.serviceTypes } } })
  if (ids.mechanics.length) await prisma.mechanic.deleteMany({ where: { id: { in: ids.mechanics } } })
  if (ids.vehicles.length) await prisma.vehicle.deleteMany({ where: { id: { in: ids.vehicles } } })
  if (ids.users.length) await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
  if (ids.centers.length) await prisma.serviceCenter.deleteMany({ where: { id: { in: ids.centers } } })
}

test('Phase 6 service record and parts integration against the guarded dedicated PostgreSQL database', async (t) => {
  try {
    await assertSafeEmptyTarget()
    const fixture = await createFixture()
    const actor = { id: fixture.provider.id, role: UserRole.SERVICE_PROVIDER }
    const repository = { createForInProgressBooking: (data) => db.serviceRecord.createForInProgressBooking(data) }

    await t.test('record creation, inventory deduction, completion, and retrieval persist atomically', async () => {
      const result = await completeBookingWithServiceRecord(actor, {
        bookingId: String(fixture.booking.id), diagnosisNotes: 'filter worn',
        workPerformed: 'replaced filter', laborCost: '100.00',
        parts: [{ partId: String(fixture.part.id), quantity: '2' }],
      }, repository)
      assert.equal(result.success, true)
      ids.services.push(result.serviceId)
      assert.equal((await prisma.booking.findUnique({ where: { id: fixture.booking.id } })).status, BookingStatus.COMPLETED)
      assert.equal((await prisma.part.findUnique({ where: { id: fixture.part.id } })).stockQuantity, 2)
      const record = await prisma.service.findUnique({ where: { bookingId: fixture.booking.id }, include: { serviceParts: true } })
      assert.equal(record.workPerformed, 'replaced filter')
      assert.equal(record.serviceParts.length, 1)
      assert.equal(Number(record.serviceParts[0].unitPriceAtTime), 12.5)

      const retry = await completeBookingWithServiceRecord(actor, {
        bookingId: fixture.booking.id, diagnosisNotes: '', workPerformed: 'retry', laborCost: 0, parts: [],
      }, repository)
      assert.equal(retry.success, false)
      assert.equal(retry.reason, 'invalid_state')
      assert.equal((await prisma.part.findUnique({ where: { id: fixture.part.id } })).stockQuantity, 2)

      const customerRecords = await db.serviceRecord.findManyForActor(fixture.customer.id)
      assert.equal(customerRecords.length, 1)
      assert.equal(customerRecords[0].booking.id, fixture.booking.id)
      const providerRecords = await db.serviceRecord.findManyForActor()
      assert.ok(providerRecords.length >= 1)
      const recordsOutsideCustomerScope = await db.serviceRecord.findManyForActor(fixture.provider.id)
      assert.equal(recordsOutsideCustomerScope.length, 0)
    })

    await t.test('insufficient stock leaves service and booking unchanged', async () => {
      const result = await completeBookingWithServiceRecord(actor, {
        bookingId: fixture.lowStockBooking.id, diagnosisNotes: '', workPerformed: 'attempt',
        laborCost: '0', parts: [{ partId: fixture.noStockPart.id, quantity: '1' }],
      }, repository)
      assert.equal(result.success, false)
      assert.equal(result.reason, 'insufficient_stock')
      assert.equal(await prisma.service.count({ where: { bookingId: fixture.lowStockBooking.id } }), 0)
      assert.equal((await prisma.booking.findUnique({ where: { id: fixture.lowStockBooking.id } })).status, BookingStatus.IN_PROGRESS)
      assert.equal((await prisma.part.findUnique({ where: { id: fixture.noStockPart.id } })).stockQuantity, 0)
    })

    await t.test('concurrent completion attempts create one record and deduct stock once', async () => {
      // A fresh in-progress booking allows two racing transactions to contend on its row lock.
      const booking = await prisma.booking.create({ data: {
        customerId: fixture.customer.id, vehicleId: fixture.vehicle.id,
        serviceTypeId: (await prisma.booking.findUnique({ where: { id: fixture.booking.id }, select: { serviceTypeId: true } })).serviceTypeId,
        mechanicId: (await prisma.booking.findUnique({ where: { id: fixture.booking.id }, select: { mechanicId: true } })).mechanicId,
        serviceCenterId: fixture.booking.serviceCenterId, status: BookingStatus.IN_PROGRESS,
        scheduledDate: new Date(Date.now() - 60_000),
      } })
      ids.bookings.push(booking.id)
      const request = () => completeBookingWithServiceRecord(actor, {
        bookingId: booking.id, diagnosisNotes: '', workPerformed: 'racing completion', laborCost: 0,
        parts: [{ partId: fixture.part.id, quantity: 1 }],
      }, repository)
      const results = await Promise.all([request(), request()])
      assert.equal(results.filter((result) => result.success).length, 1)
      assert.equal(await prisma.service.count({ where: { bookingId: booking.id } }), 1)
      const record = await prisma.service.findUnique({ where: { bookingId: booking.id }, select: { id: true } })
      ids.services.push(record.id)
      assert.equal((await prisma.part.findUnique({ where: { id: fixture.part.id } })).stockQuantity, 1)
    })
  } finally {
    try {
      await cleanup()
    } finally {
      await prisma.$disconnect()
      await disconnectDatabase()
    }
  }
})
