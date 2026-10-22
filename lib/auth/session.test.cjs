const { test } = require('node:test')
const assert = require('node:assert/strict')
const { UserRole } = require('@prisma/client')

const nextHeaders = require('next/headers')
const originalCookies = nextHeaders.cookies
let cookieToken = null
nextHeaders.cookies = async () => ({ get: (name) => name === 'apex_session' && cookieToken ? { value: cookieToken } : undefined })

const { db } = require('../db.ts')
const { signToken } = require('./jwt.ts')
const { getCurrentUserFromHeaders } = require('./session.ts')
const { getVehicleActor } = require('../vehicles/server-session.ts')
const { listCustomerVehicles } = require('../vehicles/vehicle-service.ts')

const originalFindUnique = db.user.findUnique
test.after(() => {
  db.user.findUnique = originalFindUnique
  nextHeaders.cookies = originalCookies
})

test('vehicle session uses the shared verifier and persisted actor before owner-scoped reads', async () => {
  const lookups = []
  db.user.findUnique = async ({ where }) => {
    lookups.push(where.id)
    return { id: 7, name: 'Current Customer', email: 'customer@example.test', role: UserRole.CUSTOMER }
  }
  cookieToken = await signToken({ sub: '7', userId: 7, email: 'customer@example.test', role: UserRole.CUSTOMER })

  const actor = await getVehicleActor()
  assert.deepEqual(actor, { id: 7, role: UserRole.CUSTOMER })

  const ownerIds = []
  const result = await listCustomerVehicles(actor, {
    findManyForOwner: async (ownerId) => { ownerIds.push(ownerId); return [] },
  })
  assert.deepEqual(result, { success: true, value: [] })
  assert.deepEqual(lookups, [7])
  assert.deepEqual(ownerIds, [7])
})

test('client-supplied owner identity cannot replace the signed session identity', async () => {
  const lookups = []
  db.user.findUnique = async ({ where }) => {
    lookups.push(where.id)
    return { id: 7, name: 'Current Customer', email: 'customer@example.test', role: UserRole.CUSTOMER }
  }
  cookieToken = await signToken({ sub: '7', userId: 7, email: 'customer@example.test', role: UserRole.CUSTOMER })
  const headers = new Headers({ cookie: `apex_session=${cookieToken}; ownerId=900`, 'x-user-id': '900' })

  const user = await getCurrentUserFromHeaders(headers)
  assert.equal(user?.id, 7)
  assert.deepEqual(lookups, [7])
})

test('invalid session tokens fail closed without a database lookup or server error', async () => {
  let databaseCalls = 0
  db.user.findUnique = async () => { databaseCalls += 1; throw new Error('must not query invalid session') }
  cookieToken = 'malformed.token.value'

  assert.equal(await getVehicleActor(), null)
  assert.equal(await getCurrentUserFromHeaders(new Headers({ cookie: `apex_session=${cookieToken}` })), null)
  assert.equal(databaseCalls, 0)
})
