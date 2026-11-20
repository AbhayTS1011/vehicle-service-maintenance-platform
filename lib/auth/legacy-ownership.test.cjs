const assert = require('node:assert/strict')
const { test } = require('node:test')
const { UserRole } = require('@prisma/client')

const { db } = require('../db.ts')
const { verifyVehicleOwnership } = require('./permissions.ts')

test('customer and fleet-manager vehicle access requires a database ownership match', async () => {
  const originalOwnsVehicle = db.bookingCatalog.ownsVehicle
  const calls = []
  db.bookingCatalog.ownsVehicle = async (userId, vehicleId) => {
    calls.push([userId, vehicleId])
    return userId === 7 && vehicleId === 42
  }

  try {
    assert.equal(await verifyVehicleOwnership(7, 42, UserRole.CUSTOMER), true)
    assert.equal(await verifyVehicleOwnership(8, 42, UserRole.CUSTOMER), false)
    assert.equal(await verifyVehicleOwnership(7, 42, UserRole.FLEET_MANAGER), true)
    assert.deepEqual(calls, [[7, 42], [8, 42], [7, 42]])
  } finally {
    db.bookingCatalog.ownsVehicle = originalOwnsVehicle
  }
})

test('invalid vehicle ownership identifiers fail closed without querying', async () => {
  const originalOwnsVehicle = db.bookingCatalog.ownsVehicle
  db.bookingCatalog.ownsVehicle = async () => { throw new Error('must not query invalid identifiers') }

  try {
    assert.equal(await verifyVehicleOwnership(0, 42, UserRole.CUSTOMER), false)
    assert.equal(await verifyVehicleOwnership(7, Number.MAX_SAFE_INTEGER + 1, UserRole.CUSTOMER), false)
  } finally {
    db.bookingCatalog.ownsVehicle = originalOwnsVehicle
  }
})

test('admin and service-provider vehicle access keeps the established privileged bypass', async () => {
  const originalOwnsVehicle = db.bookingCatalog.ownsVehicle
  db.bookingCatalog.ownsVehicle = async () => { throw new Error('privileged access should not query ownership') }

  try {
    assert.equal(await verifyVehicleOwnership(1, 42, UserRole.ADMIN), true)
    assert.equal(await verifyVehicleOwnership(1, 42, UserRole.SERVICE_PROVIDER), true)
  } finally {
    db.bookingCatalog.ownsVehicle = originalOwnsVehicle
  }
})
