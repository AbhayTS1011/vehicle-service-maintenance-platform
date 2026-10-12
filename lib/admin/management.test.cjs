const { test } = require('node:test')
const assert = require('node:assert/strict')
const { UserRole } = require('@prisma/client')
const {
  createMechanic,
  deleteMechanic,
  deleteMechanicRecord,
  listMechanics,
  readServiceCenter,
  updateMechanic,
  updateServiceCenter,
} = require('./management.ts')

const admin = { id: 1, role: UserRole.ADMIN }
const provider = { id: 2, role: UserRole.SERVICE_PROVIDER }
const centerInput = {
  name: 'Apex Auto Care',
  address: '100 Main Road',
  phone: '+91 98765 43210',
  email: 'SERVICE@EXAMPLE.COM ',
  operatingHours: 'Mon-Sat 8:00 AM - 6:00 PM',
}
const mechanicInput = { name: 'Asha Rao', specialization: 'Electrical', phone: '+91 98765 43210', isActive: true }

function serviceCenterRepository(overrides = {}) {
  const calls = []
  return {
    calls,
    async findCurrent() {
      calls.push(['findCurrent'])
      if (overrides.fail) throw Error('private database details')
      return overrides.record === null ? null : { id: 1, ...centerInput }
    },
    async updateCurrent(data) {
      calls.push(['updateCurrent', data])
      if (overrides.fail) throw Error('private database details')
      return overrides.record === null ? null : { id: 1, ...data }
    },
  }
}

test('admin can read the current service-center record through its repository', async () => {
  const repo = serviceCenterRepository()
  const result = await readServiceCenter(admin, repo)
  assert.equal(result.success, true)
  assert.equal(result.value.id, 1)
  assert.deepEqual(repo.calls, [['findCurrent']])
})

test('unauthenticated and non-admin actors cannot read or change service-center details', async () => {
  for (const actor of [null, provider, { id: 3, role: UserRole.CUSTOMER }]) {
    const repo = serviceCenterRepository()
    const read = await readServiceCenter(actor, repo)
    const update = await updateServiceCenter(actor, centerInput, repo)
    assert.equal(read.success, false)
    assert.equal(update.success, false)
    assert.deepEqual(repo.calls, [])
  }
})

test('admin can update normalized service-center fields without accepting protected IDs', async () => {
  const repo = serviceCenterRepository()
  const result = await updateServiceCenter(admin, { ...centerInput, id: 999, timeZone: 'UTC' }, repo)
  // Strict validation rejects unknown/protected fields instead of forwarding them.
  assert.equal(result.success, false)
  const saved = await updateServiceCenter(admin, centerInput, repo)
  assert.equal(saved.success, true)
  assert.equal(repo.calls[0]?.[0], 'updateCurrent')
  assert.equal(repo.calls[0]?.[1]?.email, 'service@example.com')
  assert.equal('id' in (repo.calls[0]?.[1] ?? {}), false)
})

test('invalid, missing and database-failed service-center operations are safe', async () => {
  const invalidRepo = serviceCenterRepository()
  const invalid = await updateServiceCenter(admin, { ...centerInput, phone: 'bad phone' }, invalidRepo)
  assert.equal(invalid.reason, 'invalid_input')
  assert.deepEqual(invalidRepo.calls, [])
  assert.equal((await readServiceCenter(admin, serviceCenterRepository({ record: null }))).reason, 'not_found')
  assert.equal((await readServiceCenter(admin, serviceCenterRepository({ fail: true }))).reason, 'error')
  const failure = await updateServiceCenter(admin, centerInput, serviceCenterRepository({ fail: true }))
  assert.equal(failure.reason, 'error')
  assert.equal(JSON.stringify(failure).includes('private database'), false)
})

function mechanicRepository(options = {}) {
  const calls = []
  return {
    calls,
    async findCurrentServiceCenterId() {
      calls.push(['center'])
      if (options.fail) throw Error('private database details')
      return options.noCenter ? null : 17
    },
    async findMany(centerId) {
      calls.push(['list', centerId])
      if (options.fail) throw Error('private database details')
      return options.mechanics ?? []
    },
    async create(centerId, data) {
      calls.push(['create', centerId, data])
      if (options.fail) throw Error('private database details')
      return { id: 42, serviceCenterId: centerId, ...data }
    },
    async update(centerId, id, data) {
      calls.push(['update', centerId, id, data])
      if (options.fail) throw Error('private database details')
      return !options.missing
    },
    async deleteOrDeactivate(centerId, id) {
      calls.push(['remove', centerId, id])
      if (options.fail) throw Error('private database details')
      return options.missing ? null : options.removeResult ?? 'deleted'
    },
  }
}

test('admin can list mechanics scoped to the configured service center', async () => {
  const records = [{ id: 3, name: 'Mech', serviceCenterId: 17 }]
  const repo = mechanicRepository({ mechanics: records })
  const result = await listMechanics(admin, repo)
  assert.deepEqual(result, { success: true, value: records })
  assert.deepEqual(repo.calls, [['center'], ['list', 17]])
})

test('empty mechanic lists and missing center configuration are handled', async () => {
  assert.deepEqual(await listMechanics(admin, mechanicRepository()), { success: true, value: [] })
  assert.equal((await listMechanics(admin, mechanicRepository({ noCenter: true }))).reason, 'configuration')
  assert.equal((await createMechanic(admin, mechanicInput, mechanicRepository({ noCenter: true }))).reason, 'configuration')
})

test('only admins can list and mutate mechanics', async () => {
  for (const actor of [null, provider, { id: 3, role: UserRole.FLEET_MANAGER }]) {
    const repo = mechanicRepository()
    assert.equal((await listMechanics(actor, repo)).success, false)
    assert.equal((await createMechanic(actor, mechanicInput, repo)).success, false)
    assert.equal((await updateMechanic(actor, 42, mechanicInput, repo)).success, false)
    assert.equal((await deleteMechanic(actor, 42, repo)).success, false)
    assert.deepEqual(repo.calls, [])
  }
})

test('admin creates a mechanic attached to the configured center, not client input', async () => {
  const repo = mechanicRepository()
  const result = await createMechanic(admin, { ...mechanicInput, serviceCenterId: 999 }, repo)
  assert.equal(result.reason, 'invalid_input')
  assert.deepEqual(repo.calls, [])
  const created = await createMechanic(admin, mechanicInput, repo)
  assert.equal(created.success, true)
  assert.equal(repo.calls.at(-1)[1], 17)
  assert.equal(repo.calls.at(-1)[2].name, 'Asha Rao')
})

test('mechanic create and update reject invalid IDs and fields', async () => {
  const repo = mechanicRepository()
  assert.equal((await createMechanic(admin, { ...mechanicInput, name: ' ' }, repo)).reason, 'invalid_input')
  assert.equal((await updateMechanic(admin, '42x', mechanicInput, repo)).reason, 'invalid_input')
  assert.equal((await updateMechanic(admin, 42, { ...mechanicInput, phone: 'telephone' }, repo)).reason, 'invalid_input')
  assert.deepEqual(repo.calls, [])
})

test('mechanic updates are scoped to the current center and missing mechanics are reported', async () => {
  const repo = mechanicRepository()
  assert.equal((await updateMechanic(admin, '42', mechanicInput, repo)).success, true)
  assert.equal(repo.calls.at(-1)[1], 17)
  assert.equal(repo.calls.at(-1)[2], 42)
  assert.equal((await updateMechanic(admin, 404, mechanicInput, mechanicRepository({ missing: true }))).reason, 'not_found')
})

test('mechanic deletion reports hard delete or history-preserving deactivation', async () => {
  const deletedRepo = mechanicRepository()
  assert.match((await deleteMechanic(admin, 42, deletedRepo)).message, /deleted/i)
  const historyRepo = mechanicRepository({ removeResult: 'deactivated' })
  assert.match((await deleteMechanic(admin, 42, historyRepo)).message, /deactivated to preserve/i)
  assert.equal((await deleteMechanic(admin, 404, mechanicRepository({ missing: true }))).reason, 'not_found')
})

test('mechanic repository soft-deactivates historical records and hard-deletes only unreferenced rows', async () => {
  const makeRepo = ({ exists = true, hasHistory = false } = {}) => {
    const events = []
    return {
      events,
      async lockServiceCenter(id) { events.push(['lock', id]) },
      async exists(centerId, id) { events.push(['exists', centerId, id]); return exists },
      async hasHistory(id) { events.push(['history', id]); return hasHistory },
      async deactivate(id) { events.push(['deactivate', id]) },
      async delete(id) { events.push(['delete', id]) },
    }
  }
  const referenced = makeRepo({ hasHistory: true })
  assert.equal(await deleteMechanicRecord(17, 42, referenced), 'deactivated')
  assert.deepEqual(referenced.events.map(([event]) => event), ['lock', 'exists', 'history', 'deactivate'])
  const unused = makeRepo()
  assert.equal(await deleteMechanicRecord(17, 43, unused), 'deleted')
  assert.deepEqual(unused.events.map(([event]) => event), ['lock', 'exists', 'history', 'delete'])
  const missing = makeRepo({ exists: false })
  assert.equal(await deleteMechanicRecord(17, 44, missing), null)
  assert.deepEqual(missing.events.map(([event]) => event), ['lock', 'exists'])
})

test('mechanic database failures are returned as safe operation errors', async () => {
  const failures = [
    await listMechanics(admin, mechanicRepository({ fail: true })),
    await createMechanic(admin, mechanicInput, mechanicRepository({ fail: true })),
    await updateMechanic(admin, 42, mechanicInput, mechanicRepository({ fail: true })),
    await deleteMechanic(admin, 42, mechanicRepository({ fail: true })),
  ]
  for (const failure of failures) {
    assert.equal(failure.reason, 'error')
    assert.equal(JSON.stringify(failure).includes('private database'), false)
  }
})
