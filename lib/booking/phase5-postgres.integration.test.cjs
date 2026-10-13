const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { configurePhase5TestDatabase } = require('./phase5-postgres-test-target.cjs')

// Enforce the explicit database allowlist and set DATABASE_URL before loading Prisma.
const testTarget = configurePhase5TestDatabase(process.env)
const { BookingStatus, UserRole, PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { db, disconnectDatabase } = require('../db.ts')
const {
  assignMechanicToProviderBooking,
  cancelCustomerBooking,
  completeProviderBooking,
  confirmProviderBooking,
  createCustomerBooking,
  getCustomerBookingDetails,
  listAvailableAppointmentSlots,
  listCustomerBookings,
  listProviderConfirmedBookings,
  listProviderInProgressBookings,
  listProviderPendingBookings,
  rejectProviderBooking,
  startProviderBooking,
  updateCustomerBooking,
} = require('./booking-service.ts')

const runId = randomUUID()
const prefix = `phase5-it-${runId}`
const ids = { bookings: [], vehicles: [], mechanics: [], centers: [], serviceTypes: [], users: [] }

function fixtureDate(daysAhead, hour = 8, minute = 0) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysAhead)
  date.setUTCHours(hour, minute, 0, 0)
  return date
}

function asDateInput(date) {
  return date.toISOString()
}

function bookingRepository(centerId) {
  return {
    ownsVehicle: (customerId, vehicleId) => db.bookingCatalog.ownsVehicle(customerId, vehicleId),
    serviceTypeExists: (serviceTypeId) => db.bookingCatalog.serviceTypeExists(serviceTypeId),
    serviceCenterId: async () => centerId,
    create: (data) => db.booking.createScheduledBooking(data),
  }
}

function customerEditRepository() {
  return {
    reschedulePending: (...args) => db.booking.reschedulePendingForCustomer(...args),
  }
}

function providerRepository(operation) {
  if (operation === 'pending') return { findPending: (query) => db.booking.findPendingProviderBookings(query) }
  if (operation === 'confirmed') return { findConfirmed: (query) => db.booking.findConfirmedProviderBookings(query) }
  return { findInProgress: (query) => db.booking.findInProgressProviderBookings(query) }
}

async function assertTargetAndSchema() {
  const connection = await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username`
  assert.equal(connection[0].database, testTarget.database)
  assert.equal(connection[0].username, testTarget.user)

  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `
  const tableNames = new Set(tables.map((row) => row.table_name))
  for (const required of ['users', 'vehicles', 'service_types', 'service_center', 'mechanics', 'bookings', 'service_center_hours']) {
    assert.ok(tableNames.has(required), `Missing required table ${required}`)
  }

  const statusRows = await prisma.$queryRaw`
    SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'booking_status' ORDER BY e.enumsortorder
  `
  assert.deepEqual(statusRows.map((row) => row.enumlabel), [
    'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED', 'REJECTED',
  ])

  const columns = await prisma.$queryRaw`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN
      ('users', 'vehicles', 'service_types', 'service_center', 'mechanics', 'bookings', 'service_center_hours')
  `
  const columnKeys = new Set(columns.map((row) => `${row.table_name}.${row.column_name}`))
  for (const required of [
    'users.role', 'vehicles.owner_id', 'service_types.estimated_duration_minutes', 'service_center.time_zone',
    'mechanics.service_center_id', 'mechanics.is_active', 'bookings.customer_id', 'bookings.vehicle_id',
    'bookings.service_type_id', 'bookings.mechanic_id', 'bookings.service_center_id', 'bookings.scheduled_date',
    'bookings.status', 'service_center_hours.day_of_week', 'service_center_hours.opens_at', 'service_center_hours.closes_at',
  ]) assert.ok(columnKeys.has(required), `Missing required column ${required}`)

  const hoursConstraints = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM pg_constraint
    WHERE conrelid = 'public.service_center_hours'::regclass
  `
  assert.equal(hoursConstraints[0].count, 4)
  const indexes = await prisma.$queryRaw`
    SELECT to_regclass('public.idx_bookings_center_status_date')::text AS index_name
  `
  assert.equal(indexes[0].index_name, 'idx_bookings_center_status_date')

  const bookingForeignKeys = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass AND contype = 'f'
  `
  assert.ok(bookingForeignKeys[0].count >= 5)
}

async function assertEmptyTestDatabase() {
  const counts = await Promise.all([
    prisma.user.count(), prisma.vehicle.count(), prisma.serviceType.count(), prisma.serviceCenter.count(),
    prisma.mechanic.count(), prisma.booking.count(), prisma.service.count(), prisma.invoice.count(),
    prisma.review.count(), prisma.notification.count(), prisma.auditLog.count(), prisma.serviceCenterHour.count(),
  ])
  assert.ok(counts.every((count) => count === 0), 'Refusing writes: the dedicated test database must be empty before this integration run.')
}

async function createFixture() {
  const center = await prisma.serviceCenter.create({
    data: {
      name: `${prefix} synthetic center`,
      address: 'Synthetic integration-test data only',
      phone: '0000000000',
      email: `${runId}@example.invalid`,
      operatingHours: 'Synthetic test hours configured by integration suite',
      timeZone: 'Etc/UTC',
    },
  })
  ids.centers.push(center.id)

  await prisma.serviceCenterHour.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      serviceCenterId: center.id,
      dayOfWeek,
      opensAt: new Date('1970-01-01T08:00:00.000Z'),
      closesAt: new Date('1970-01-01T12:00:00.000Z'),
    })),
  })

  const incompatibleCenter = await prisma.serviceCenter.create({
    data: {
      name: `${prefix} incompatible synthetic center`,
      address: 'Synthetic integration-test data only',
      phone: '0000000001',
      email: `other-${runId}@example.invalid`,
      operatingHours: 'Not used for scheduling',
      timeZone: 'Etc/UTC',
    },
  })
  ids.centers.push(incompatibleCenter.id)

  const users = {}
  for (const [key, role] of [
    ['customer', UserRole.CUSTOMER],
    ['otherCustomer', UserRole.CUSTOMER],
    ['provider', UserRole.SERVICE_PROVIDER],
    ['admin', UserRole.ADMIN],
  ]) {
    users[key] = await prisma.user.create({
      data: {
        name: `${prefix} ${key}`,
        email: `${key}-${runId}@example.invalid`,
        passwordHash: 'phase5-integration-fixture-not-for-authentication',
        role,
      },
    })
    ids.users.push(users[key].id)
  }

  const vehicles = []
  for (let i = 0; i < 2; i += 1) {
    vehicles.push(await prisma.vehicle.create({
      data: {
        ownerId: users[i === 0 ? 'customer' : 'otherCustomer'].id,
        make: 'Synthetic',
        model: 'Test Vehicle',
        year: 2025,
        licensePlate: `P5${runId.replaceAll('-', '').slice(0, 10)}${i}`,
      },
    }))
    ids.vehicles.push(vehicles[i].id)
  }

  const serviceTypes = []
  for (const [key, duration] of [['standard', 60], ['long', 90]]) {
    serviceTypes.push(await prisma.serviceType.create({
      data: {
        name: `${prefix} ${key}`,
        description: 'Synthetic integration-test service',
        basePrice: '10.00',
        estimatedDurationMinutes: duration,
      },
    }))
    ids.serviceTypes.push(serviceTypes[serviceTypes.length - 1].id)
  }

  const mechanics = []
  for (const [key, serviceCenterId, isActive] of [
    ['active-one', center.id, true],
    ['active-two', center.id, true],
    ['inactive', center.id, false],
    ['other-center', incompatibleCenter.id, true],
  ]) {
    mechanics.push(await prisma.mechanic.create({
      data: { name: `${prefix} ${key}`, specialization: 'Synthetic', serviceCenterId, isActive },
    }))
    ids.mechanics.push(mechanics[mechanics.length - 1].id)
  }

  return { center, users, vehicles, serviceTypes, mechanics }
}

async function createBooking(fixture, scheduledDate, note, customer = fixture.users.customer, vehicle = fixture.vehicles[0], serviceType = fixture.serviceTypes[0]) {
  const result = await createCustomerBooking(
    { id: customer.id, role: customer.role },
    {
      vehicleId: String(vehicle.id),
      serviceTypeId: String(serviceType.id),
      scheduledDate: asDateInput(scheduledDate),
      notes: note,
    },
    bookingRepository(fixture.center.id),
  )
  if (!result.success) return result

  const saved = await prisma.booking.findFirst({ where: { notes: note }, orderBy: { id: 'desc' } })
  assert.ok(saved, 'Application reported a booking success but PostgreSQL did not return the saved row.')
  ids.bookings.push(saved.id)
  return { success: true, booking: saved }
}

async function cleanupFixtures() {
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } })
  if (ids.centers.length) await prisma.serviceCenterHour.deleteMany({ where: { serviceCenterId: { in: ids.centers } } })
  if (ids.vehicles.length) await prisma.vehicle.deleteMany({ where: { id: { in: ids.vehicles } } })
  if (ids.mechanics.length) await prisma.mechanic.deleteMany({ where: { id: { in: ids.mechanics } } })
  if (ids.serviceTypes.length) await prisma.serviceType.deleteMany({ where: { id: { in: ids.serviceTypes } } })
  if (ids.centers.length) await prisma.serviceCenter.deleteMany({ where: { id: { in: ids.centers } } })
  if (ids.users.length) await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
}

test('Phase 5 booking lifecycle persists through the explicitly selected PostgreSQL test database', { timeout: 120_000 }, async (t) => {
  try {
    await prisma.$connect()
    await assertTargetAndSchema()
    await assertEmptyTestDatabase()
    const fixture = await createFixture()
    const customer = { id: fixture.users.customer.id, role: UserRole.CUSTOMER }
    const otherCustomer = { id: fixture.users.otherCustomer.id, role: UserRole.CUSTOMER }
    const provider = { id: fixture.users.provider.id, role: UserRole.SERVICE_PROVIDER }
    const admin = { id: fixture.users.admin.id, role: UserRole.ADMIN }
    const bookingRepo = bookingRepository(fixture.center.id)
    const availabilityRepo = {
      availableAppointmentSlots: (date, serviceTypeId) => db.bookingCatalog.availableAppointmentSlots(date, serviceTypeId),
    }
    const days = (offset) => fixtureDate(offset).toISOString().slice(0, 10)
    const at = (offset, hour = 8, minute = 0) => fixtureDate(offset, hour, minute)

    await t.test('schema, migration results, service duration, hours, increments, and mechanic capacity', async () => {
      const standardSlots = await listAvailableAppointmentSlots(customer, days(10), fixture.serviceTypes[0].id, availabilityRepo)
      assert.equal(standardSlots.success, true)
      assert.equal(standardSlots.configured, true)
      assert.equal(standardSlots.slots[0].toISOString(), at(10, 8).toISOString())
      assert.equal(standardSlots.slots.at(-1).toISOString(), at(10, 11).toISOString())
      assert.ok(standardSlots.slots.every((slot, index) => index === 0 || slot - standardSlots.slots[index - 1] === 15 * 60_000))
      assert.equal(standardSlots.slots.some((slot) => slot.toISOString() === at(10, 11, 15).toISOString()), false)

      const longSlots = await listAvailableAppointmentSlots(customer, days(11), fixture.serviceTypes[1].id, availabilityRepo)
      assert.equal(longSlots.success, true)
      assert.equal(longSlots.slots.at(-1).toISOString(), at(11, 10, 30).toISOString())
    })

    await t.test('customer booking creation persists and enforces vehicle ownership, listing, details, editing, and cancellation', async () => {
      const wrongVehicle = await createCustomerBooking(customer, {
        vehicleId: String(fixture.vehicles[1].id),
        serviceTypeId: String(fixture.serviceTypes[0].id),
        scheduledDate: asDateInput(at(12)),
        notes: `${prefix}:wrong-owner`,
      }, bookingRepo)
      assert.equal(wrongVehicle.success, false)
      assert.equal(await prisma.booking.count({ where: { notes: `${prefix}:wrong-owner` } }), 0)

      const created = await createBooking(fixture, at(12), `${prefix}:customer-reschedule`)
      assert.equal(created.success, true)
      let fresh = await prisma.booking.findUnique({ where: { id: created.booking.id } })
      assert.equal(fresh.status, BookingStatus.PENDING)
      assert.equal(fresh.customerId, fixture.users.customer.id)
      assert.equal(fresh.vehicleId, fixture.vehicles[0].id)

      const listed = await listCustomerBookings(customer, { findForCustomer: (customerId) => db.booking.findManyForCustomer(customerId) })
      assert.equal(listed.success, true)
      assert.ok(listed.bookings.some((booking) => booking.id === created.booking.id))
      const ownDetails = await getCustomerBookingDetails(customer, created.booking.id, {
        findForCustomer: (bookingId, customerId) => db.booking.findForCustomerById(bookingId, customerId),
      })
      assert.equal(ownDetails.success, true)
      const privateDetails = await getCustomerBookingDetails(otherCustomer, created.booking.id, {
        findForCustomer: (bookingId, customerId) => db.booking.findForCustomerById(bookingId, customerId),
      })
      assert.equal(privateDetails.success, false)

      const rescheduledDate = at(12, 9)
      const edited = await updateCustomerBooking(customer, created.booking.id, asDateInput(fresh.scheduledDate), asDateInput(rescheduledDate), 'updated integration note', customerEditRepository())
      assert.equal(edited.success, true)
      fresh = await prisma.booking.findUnique({ where: { id: created.booking.id } })
      assert.equal(fresh.scheduledDate.toISOString(), rescheduledDate.toISOString())
      assert.equal(fresh.notes, 'updated integration note')

      const stale = await updateCustomerBooking(customer, created.booking.id, asDateInput(created.booking.scheduledDate), asDateInput(at(12, 10)), 'stale note', customerEditRepository())
      assert.equal(stale.success, false)
      assert.equal(stale.reason, 'stale')
      const wrongOwnerEdit = await updateCustomerBooking(otherCustomer, created.booking.id, asDateInput(fresh.scheduledDate), asDateInput(at(12, 10)), 'wrong owner', customerEditRepository())
      assert.equal(wrongOwnerEdit.success, false)
      assert.equal(await prisma.booking.findUnique({ where: { id: created.booking.id } }).then((row) => row.notes), 'updated integration note')

      const cancelled = await cancelCustomerBooking(customer, created.booking.id, {
        cancelPendingForCustomer: (id, customerId) => db.booking.cancelPendingForCustomer(id, customerId),
        findStatusForCustomer: (id, customerId) => db.booking.findStatusForCustomer(id, customerId),
      })
      assert.equal(cancelled.success, true)
      assert.equal((await prisma.booking.findUnique({ where: { id: created.booking.id } })).status, BookingStatus.CANCELLED)
      const editCancelled = await updateCustomerBooking(customer, created.booking.id, asDateInput(fresh.scheduledDate), asDateInput(at(12, 10)), 'must not update', customerEditRepository())
      assert.equal(editCancelled.success, false)
      assert.equal((await prisma.booking.findUnique({ where: { id: created.booking.id } })).status, BookingStatus.CANCELLED)
    })

    await t.test('provider pending, confirmation, rejection, start, completion, and mechanic assignment persist atomically', async () => {
      const confirmBooking = await createBooking(fixture, at(14), `${prefix}:confirm`)
      const rejectBooking = await createBooking(fixture, at(15), `${prefix}:reject`)
      const assignedA = await createBooking(fixture, at(16), `${prefix}:assign-a`)
      const assignedB = await createBooking(fixture, at(16), `${prefix}:assign-b`, fixture.users.customer, fixture.vehicles[0])
      for (const result of [confirmBooking, rejectBooking, assignedA, assignedB]) assert.equal(result.success, true)

      const pending = await listProviderPendingBookings(provider, providerRepository('pending'))
      assert.equal(pending.success, true)
      assert.ok(pending.bookings.some((booking) => booking.id === confirmBooking.booking.id))

      const deniedConfirm = await confirmProviderBooking(customer, confirmBooking.booking.id, {
        confirmPending: (id) => db.booking.confirmPendingForProvider(id),
        findStatus: (id) => db.booking.findStatusById(id),
      })
      assert.equal(deniedConfirm.success, false)
      assert.equal((await prisma.booking.findUnique({ where: { id: confirmBooking.booking.id } })).status, BookingStatus.PENDING)

      const confirmed = await confirmProviderBooking(admin, confirmBooking.booking.id, {
        confirmPending: (id) => db.booking.confirmPendingForProvider(id),
        findStatus: (id) => db.booking.findStatusById(id),
      })
      assert.equal(confirmed.success, true)
      assert.equal((await prisma.booking.findUnique({ where: { id: confirmBooking.booking.id } })).status, BookingStatus.CONFIRMED)
      const confirmedList = await listProviderConfirmedBookings(provider, providerRepository('confirmed'))
      assert.equal(confirmedList.success, true)
      assert.ok(confirmedList.bookings.some((booking) => booking.id === confirmBooking.booking.id))

      const cannotStartPending = await startProviderBooking(provider, rejectBooking.booking.id, {
        startConfirmed: (id) => db.booking.startConfirmedForProvider(id),
        findStatus: (id) => db.booking.findStatusById(id),
      })
      assert.equal(cannotStartPending.success, false)
      assert.equal((await prisma.booking.findUnique({ where: { id: rejectBooking.booking.id } })).status, BookingStatus.PENDING)
      const rejected = await rejectProviderBooking(provider, rejectBooking.booking.id, {
        rejectPending: (id) => db.booking.rejectPendingForProvider(id),
        findStatus: (id) => db.booking.findStatusById(id),
      })
      assert.equal(rejected.success, true)
      assert.equal((await prisma.booking.findUnique({ where: { id: rejectBooking.booking.id } })).status, BookingStatus.REJECTED)
      assert.notEqual(BookingStatus.REJECTED, BookingStatus.CANCELLED)

      const started = await startProviderBooking(provider, confirmBooking.booking.id, {
        startConfirmed: (id) => db.booking.startConfirmedForProvider(id),
        findStatus: (id) => db.booking.findStatusById(id),
      })
      assert.equal(started.success, true)
      assert.equal((await prisma.booking.findUnique({ where: { id: confirmBooking.booking.id } })).status, BookingStatus.IN_PROGRESS)
      const inProgress = await listProviderInProgressBookings(provider, providerRepository('in-progress'))
      assert.equal(inProgress.success, true)
      assert.ok(inProgress.bookings.some((booking) => booking.id === confirmBooking.booking.id))
      const completed = await completeProviderBooking(admin, confirmBooking.booking.id, {
        completeInProgress: (id) => db.booking.completeInProgressForProvider(id),
        findStatus: (id) => db.booking.findStatusById(id),
      })
      assert.equal(completed.success, true)
      assert.equal((await prisma.booking.findUnique({ where: { id: confirmBooking.booking.id } })).status, BookingStatus.COMPLETED)
      const cannotCompleteRejected = await completeProviderBooking(provider, rejectBooking.booking.id, {
        completeInProgress: (id) => db.booking.completeInProgressForProvider(id),
        findStatus: (id) => db.booking.findStatusById(id),
      })
      assert.equal(cannotCompleteRejected.success, false)
      assert.equal((await prisma.booking.findUnique({ where: { id: rejectBooking.booking.id } })).status, BookingStatus.REJECTED)

      for (const assignmentBooking of [assignedA, assignedB]) {
        const result = await confirmProviderBooking(provider, assignmentBooking.booking.id, {
          confirmPending: (id) => db.booking.confirmPendingForProvider(id),
          findStatus: (id) => db.booking.findStatusById(id),
        })
        assert.equal(result.success, true)
      }

      const assignmentRepository = {
        findBookingContext: (id) => db.booking.findBookingAssignmentContext(id),
        findMechanic: (id) => db.booking.findMechanicForAssignment(id),
        assignMechanic: (bookingId, mechanicId, centerId) => db.booking.assignMechanicToConfirmedBooking(bookingId, mechanicId, centerId),
      }
      const incompatible = await assignMechanicToProviderBooking(provider, assignedA.booking.id, fixture.mechanics[3].id, assignmentRepository)
      assert.equal(incompatible.success, false)
      assert.equal(incompatible.reason, 'service_center_mismatch')
      const inactive = await assignMechanicToProviderBooking(provider, assignedA.booking.id, fixture.mechanics[2].id, assignmentRepository)
      assert.equal(inactive.success, false)
      assert.equal(inactive.reason, 'mechanic_unavailable')
      const firstAssignment = await assignMechanicToProviderBooking(provider, assignedA.booking.id, fixture.mechanics[0].id, assignmentRepository)
      assert.equal(firstAssignment.success, true)
      assert.equal((await prisma.booking.findUnique({ where: { id: assignedA.booking.id } })).mechanicId, fixture.mechanics[0].id)

      const competingAssignments = await Promise.all([
        assignMechanicToProviderBooking(provider, assignedB.booking.id, fixture.mechanics[0].id, assignmentRepository),
        assignMechanicToProviderBooking(admin, assignedB.booking.id, fixture.mechanics[1].id, assignmentRepository),
      ])
      assert.equal(competingAssignments.filter((result) => result.success).length, 1)
      const assignedFresh = await prisma.booking.findUnique({ where: { id: assignedB.booking.id } })
      assert.ok([fixture.mechanics[0].id, fixture.mechanics[1].id].includes(assignedFresh.mechanicId))
      const staleAssignment = await assignMechanicToProviderBooking(provider, assignedB.booking.id, fixture.mechanics[0].id, assignmentRepository)
      assert.equal(staleAssignment.success, false)
      assert.equal((await prisma.booking.findUnique({ where: { id: assignedB.booking.id } })).mechanicId, assignedFresh.mechanicId)
    })

    await t.test('booking-time checks reject a closing-boundary slot and serialize conflicting capacity claims', async () => {
      const invalidSlot = await createBooking(fixture, at(17, 11, 15), `${prefix}:after-close`)
      assert.equal(invalidSlot.success, false)
      assert.equal(await prisma.booking.count({ where: { notes: `${prefix}:after-close` } }), 0)

      const concurrentDate = at(18)
      const concurrentResults = await Promise.all([0, 1, 2].map((index) => createCustomerBooking(customer, {
        vehicleId: String(fixture.vehicles[0].id),
        serviceTypeId: String(fixture.serviceTypes[0].id),
        scheduledDate: asDateInput(concurrentDate),
        notes: `${prefix}:concurrent-${index}`,
      }, bookingRepo)))
      assert.equal(concurrentResults.filter((result) => result.success).length, 2)
      const persistedCount = await prisma.booking.count({ where: { notes: { startsWith: `${prefix}:concurrent-` } } })
      const persistedRows = await prisma.booking.findMany({ where: { notes: { startsWith: `${prefix}:concurrent-` } }, select: { id: true } })
      ids.bookings.push(...persistedRows.map((row) => row.id))
      assert.equal(persistedCount, 2)
    })
  } finally {
    try {
      await cleanupFixtures()
    } finally {
      await prisma.$disconnect()
      await disconnectDatabase()
    }
  }
})
