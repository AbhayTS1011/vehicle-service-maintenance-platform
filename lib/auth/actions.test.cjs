const assert = require('node:assert/strict')
const { test } = require('node:test')

const { db } = require('../db.ts')
const { loginUser, registerUser } = require('./actions.ts')

test('registration server action persists the forced CUSTOMER role, not a submitted admin role', async () => {
  const originals = {
    findUnique: db.user.findUnique,
    create: db.user.create,
    auditCreate: db.auditLog.create,
  }
  db.user.findUnique = async () => null
  db.user.create = async ({ data }) => ({ id: 41, ...data })
  db.auditLog.create = async () => undefined

  try {
    const result = await registerUser({
      name: 'Public Account',
      email: 'public@example.invalid',
      password: 'test-password',
      role: 'ADMIN',
    })

    assert.equal(result.success, true)
    assert.equal(result.user.role, 'CUSTOMER')
  } finally {
    db.user.findUnique = originals.findUnique
    db.user.create = originals.create
    db.auditLog.create = originals.auditCreate
  }
})

test('authentication actions hide database exception details', async () => {
  const originalFindUnique = db.user.findUnique
  db.user.findUnique = async () => { throw new Error('database host and password must stay private') }

  try {
    const registration = await registerUser({ name: 'Test', email: 'test@example.invalid', password: 'test-password' })
    const login = await loginUser({ email: 'test@example.invalid', password: 'test-password' })

    assert.deepEqual(registration, { success: false, error: 'Registration failed. Please try again.' })
    assert.deepEqual(login, { success: false, error: 'Login failed. Please try again.' })
  } finally {
    db.user.findUnique = originalFindUnique
  }
})
