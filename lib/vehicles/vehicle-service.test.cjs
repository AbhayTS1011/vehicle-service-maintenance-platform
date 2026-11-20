const { test } = require('node:test')
const assert = require('node:assert/strict')
const { UserRole } = require('@prisma/client')
const { createCustomerVehicle, deleteCustomerVehicle, getCustomerVehicle, listCustomerVehicles, updateCustomerVehicle } = require('./vehicle-service.ts')

const customer = { id: 11, role: UserRole.CUSTOMER }
const otherCustomer = { id: 12, role: UserRole.CUSTOMER }
const input = { make: 'Toyota', model: 'Corolla', year: '2022', licensePlate: 'abc123', mileage: '12000', vin: '' }

function repository(options = {}) {
  const calls = []
  const record = { id: 3, ownerId: customer.id, make: 'Toyota', model: 'Corolla', year: 2022, licensePlate: 'ABC123', vin: null, mileage: 12000, createdAt: new Date(), updatedAt: new Date() }
  return {
    calls,
    async findManyForOwner(ownerId) { calls.push(['list', ownerId]); if (options.fail) throw Error('private database detail'); return ownerId === customer.id ? [record] : [] },
    async findForOwner(id, ownerId) { calls.push(['read', id, ownerId]); if (options.fail) throw Error('private database detail'); return id === record.id && ownerId === record.ownerId ? record : null },
    async createForOwner(ownerId, data) {
      calls.push(['create', ownerId, data])
      if (options.fail) throw Error('private database detail')
      if (options.duplicate) { const error = Error('unique'); error.code = 'P2002'; throw error }
      return { ...record, ...data, ownerId }
    },
    async updateForOwner(id, ownerId, data) {
      calls.push(['update', id, ownerId, data])
      if (options.fail) throw Error('private database detail')
      if (options.duplicate) { const error = Error('unique'); error.code = 'P2002'; throw error }
      return id === record.id && ownerId === record.ownerId ? { ...record, ...data } : null
    },
    async deleteForOwner(id, ownerId) { calls.push(['delete', id, ownerId]); if (options.fail) throw Error('private database detail'); return options.deleteResult ?? (id === record.id && ownerId === record.ownerId ? 'deleted' : 'not_found') },
  }
}

test('vehicle operations are scoped to the signed-in customer and creation ignores forged owner fields by rejecting them', async () => {
  const repo = repository()
  const created = await createCustomerVehicle(customer, input, repo)
  assert.equal(created.success, true)
  assert.equal(repo.calls[0][1], customer.id)
  assert.equal(repo.calls[0][2].licensePlate, 'ABC123')
  const forged = await createCustomerVehicle(customer, { ...input, ownerId: otherCustomer.id }, repo)
  assert.equal(forged.reason, 'invalid_input')
  assert.equal(repo.calls.length, 1)
  const listed = await listCustomerVehicles(customer, repo)
  assert.deepEqual(repo.calls[1], ['list', customer.id])
  assert.equal(listed.value.length, 1)
  assert.equal((await getCustomerVehicle(customer, '3', repo)).success, true)
  const crossRead = await getCustomerVehicle(otherCustomer, '3', repo)
  assert.equal(crossRead.reason, 'not_found')
  assert.equal(JSON.stringify(crossRead).includes('ABC123'), false)
  assert.deepEqual(repo.calls.at(-1), ['read', 3, otherCustomer.id])
})

test('unauthenticated and privileged non-customer roles cannot access customer vehicle CRUD', async () => {
  const repo = repository()
  for (const actor of [null, { id: 2, role: UserRole.ADMIN }, { id: 4, role: UserRole.SERVICE_PROVIDER }]) {
    assert.equal((await listCustomerVehicles(actor, repo)).success, false)
    assert.equal((await createCustomerVehicle(actor, input, repo)).success, false)
    assert.equal((await getCustomerVehicle(actor, 3, repo)).success, false)
    assert.equal((await updateCustomerVehicle(actor, 3, input, repo)).success, false)
    assert.equal((await deleteCustomerVehicle(actor, 3, repo)).success, false)
  }
  assert.deepEqual(repo.calls, [])
  assert.equal((await listCustomerVehicles({ id: 15, role: UserRole.FLEET_MANAGER }, repo)).success, true)
})

test('invalid IDs and vehicle fields are rejected before repository access', async () => {
  const repo = repository()
  assert.equal((await getCustomerVehicle(customer, '3x', repo)).reason, 'invalid_input')
  assert.equal((await updateCustomerVehicle(customer, -1, input, repo)).reason, 'invalid_input')
  assert.equal((await createCustomerVehicle(customer, { ...input, year: 1800 }, repo)).reason, 'invalid_input')
  assert.equal((await createCustomerVehicle(customer, { ...input, mileage: -1 }, repo)).reason, 'invalid_input')
  assert.equal((await createCustomerVehicle(customer, { ...input, make: 'x'.repeat(51) }, repo)).reason, 'invalid_input')
  assert.deepEqual(repo.calls, [])
})

test('cross-customer updates and deletes are not found and duplicate constraints are reported safely', async () => {
  const repo = repository({ duplicate: true })
  assert.equal((await updateCustomerVehicle(otherCustomer, 3, input, repository())).reason, 'not_found')
  assert.equal((await deleteCustomerVehicle(otherCustomer, 3, repository())).reason, 'not_found')
  assert.equal((await createCustomerVehicle(customer, input, repo)).reason, 'duplicate')
  assert.equal((await updateCustomerVehicle(customer, 3, input, repo)).reason, 'duplicate')
})

test('deletion preserves booking history and database errors do not expose internals', async () => {
  assert.equal((await deleteCustomerVehicle(customer, 3, repository({ deleteResult: 'has_bookings' }))).reason, 'has_bookings')
  const failed = await createCustomerVehicle(customer, input, repository({ fail: true }))
  assert.equal(failed.reason, 'error')
  assert.equal(JSON.stringify(failed).includes('private database'), false)
  assert.equal((await updateCustomerVehicle(customer, 3, input, repository({ fail: true }))).reason, 'error')
  assert.equal((await deleteCustomerVehicle(customer, 3, repository({ fail: true }))).reason, 'error')
  const failedList = await listCustomerVehicles(customer, repository({ fail: true }))
  assert.equal(failedList.reason, 'error')
  assert.equal(JSON.stringify(failedList).includes('private database'), false)
  const failedRead = await getCustomerVehicle(customer, 3, repository({ fail: true }))
  assert.equal(failedRead.reason, 'error')
  assert.equal(JSON.stringify(failedRead).includes('private database'), false)
})
