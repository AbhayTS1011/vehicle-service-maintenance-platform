const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { UserRole } = require('@prisma/client')
const { configurePhase5TestDatabase } = require('../booking/phase5-postgres-test-target.cjs')

const target = configurePhase5TestDatabase(process.env)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { db, disconnectDatabase } = require('../db.ts')
const { createCustomerVehicle, deleteCustomerVehicle, getCustomerVehicle, listCustomerVehicles, updateCustomerVehicle } = require('./vehicle-service.ts')
const runId = randomUUID()
const fixtureEmails = [`phase12-vehicle-a-${runId}@example.invalid`, `phase12-vehicle-b-${runId}@example.invalid`]
const fixtureOwnerIds = []
const fixtureVehicleIds = []
let fixtureServiceCenterId
let fixtureServiceTypeId

async function assertSafeTarget() {
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username`
  assert.equal(identity.database, target.database, 'Refusing writes: connected database does not match the dedicated test target.')
  assert.equal(identity.username, target.user, 'Refusing writes: connected database role does not match the dedicated test role.')
  const [vehicleTable] = await prisma.$queryRaw`SELECT to_regclass('public.vehicles')::text AS table_name`
  assert.equal(vehicleTable.table_name, 'vehicles', 'Refusing writes: public.vehicles table is missing; do not run destructive schema initialization against a populated target.')
}

async function createOwner(email, name) {
  const user = await prisma.user.create({ data: { name, email, passwordHash: 'integration-only-not-a-login-hash', role: UserRole.CUSTOMER } })
  fixtureOwnerIds.push(user.id)
  return { id: user.id, role: UserRole.CUSTOMER }
}

test('vehicle CRUD persists in PostgreSQL and isolates customer ownership', async () => {
  try {
    await assertSafeTarget()
    const [customerA, customerB] = await Promise.all([
      createOwner(fixtureEmails[0], `Vehicle test A ${runId.slice(0, 8)}`),
      createOwner(fixtureEmails[1], `Vehicle test B ${runId.slice(0, 8)}`),
    ])
    const createdA = await createCustomerVehicle(customerA, { make: 'Toyota', model: 'Corolla', year: 2022, licensePlate: `A${runId.slice(0, 10)}`, mileage: 12000, vin: `VIN-A-${runId}` }, db.vehicle)
    assert.equal(createdA.success, true, createdA.success ? '' : createdA.error)
    fixtureVehicleIds.push(createdA.value.id)
    const createdB = await createCustomerVehicle(customerB, { make: 'Honda', model: 'Civic', year: 2021, licensePlate: `B${runId.slice(0, 10)}`, mileage: 15000, vin: `VIN-B-${runId}` }, db.vehicle)
    assert.equal(createdB.success, true, createdB.success ? '' : createdB.error)
    fixtureVehicleIds.push(createdB.value.id)

    const [freshA, listA, listB] = await Promise.all([
      getCustomerVehicle(customerA, String(createdA.value.id), db.vehicle),
      listCustomerVehicles(customerA, db.vehicle),
      listCustomerVehicles(customerB, db.vehicle),
    ])
    assert.equal(freshA.success, true)
    assert.equal(freshA.value.licensePlate, createdA.value.licensePlate)
    assert.deepEqual(listA.value.map((vehicle) => vehicle.id), [createdA.value.id])
    assert.deepEqual(listB.value.map((vehicle) => vehicle.id), [createdB.value.id])

    const foreignRead = await getCustomerVehicle(customerA, createdB.value.id, db.vehicle)
    assert.equal(foreignRead.reason, 'not_found')
    const foreignUpdate = await updateCustomerVehicle(customerA, createdB.value.id, { make: 'Hijacked', model: 'Nope', year: 2020, licensePlate: `B${runId.slice(0, 10)}`, mileage: 1 }, db.vehicle)
    assert.equal(foreignUpdate.reason, 'not_found')
    const foreignDelete = await deleteCustomerVehicle(customerA, createdB.value.id, db.vehicle)
    assert.equal(foreignDelete.reason, 'not_found')
    assert.ok(await prisma.vehicle.findFirst({ where: { id: createdB.value.id, ownerId: customerB.id } }))

    const duplicatePlate = await createCustomerVehicle(customerA, { make: 'Toyota', model: 'Duplicate', year: 2020, licensePlate: createdB.value.licensePlate }, db.vehicle)
    assert.equal(duplicatePlate.reason, 'duplicate')
    const updated = await updateCustomerVehicle(customerA, createdA.value.id, { make: 'Toyota', model: 'Corolla Hybrid', year: 2023, licensePlate: createdA.value.licensePlate, mileage: 18000, vin: createdA.value.vin }, db.vehicle)
    assert.equal(updated.success, true)
    assert.equal((await prisma.vehicle.findUnique({ where: { id: createdA.value.id } })).model, 'Corolla Hybrid')

    fixtureServiceCenterId = (await prisma.serviceCenter.create({ data: {
      name: `Vehicle test center ${runId.slice(0, 8)}`, address: 'Test-only address', phone: '1234567890', email: `center-${runId}@example.invalid`,
    }, select: { id: true } })).id
    fixtureServiceTypeId = (await prisma.serviceType.create({ data: {
      name: `Vehicle test service ${runId}`, basePrice: 25, estimatedDurationMinutes: 30,
    }, select: { id: true } })).id
    await prisma.booking.create({ data: {
      customerId: customerA.id, vehicleId: createdA.value.id, serviceTypeId: fixtureServiceTypeId, serviceCenterId: fixtureServiceCenterId,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    } })
    assert.equal((await deleteCustomerVehicle(customerA, createdA.value.id, db.vehicle)).reason, 'has_bookings')
    assert.ok(await prisma.vehicle.findUnique({ where: { id: createdA.value.id } }), 'Vehicle with booking history must remain intact.')

    const deletedB = await deleteCustomerVehicle(customerB, createdB.value.id, db.vehicle)
    assert.equal(deletedB.success, true)
    assert.equal(await prisma.vehicle.findUnique({ where: { id: createdB.value.id } }), null)
  } finally {
    if (fixtureOwnerIds.length) await prisma.user.deleteMany({ where: { id: { in: fixtureOwnerIds }, email: { in: fixtureEmails } } })
    if (fixtureServiceTypeId) await prisma.serviceType.deleteMany({ where: { id: fixtureServiceTypeId } })
    if (fixtureServiceCenterId) await prisma.serviceCenter.deleteMany({ where: { id: fixtureServiceCenterId } })
    if (fixtureVehicleIds.length) await prisma.vehicle.deleteMany({ where: { id: { in: fixtureVehicleIds } } })
    await prisma.$disconnect()
    await disconnectDatabase()
  }
})
