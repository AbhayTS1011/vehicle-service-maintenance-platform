const assert = require('node:assert/strict')
const { test } = require('node:test')

const { UserRole } = require('@prisma/client')
const { parsePublicRegistrationInput } = require('./registration-input.ts')

test('public registration ignores a client-supplied privileged role', () => {
  const parsed = parsePublicRegistrationInput({
    name: 'Test Customer',
    email: 'customer@example.invalid',
    password: 'a-test-password',
    role: UserRole.ADMIN,
  })

  assert.equal(parsed.role, UserRole.CUSTOMER)
})

test('public registration always assigns CUSTOMER regardless of submitted role', () => {
  for (const role of Object.values(UserRole)) {
    assert.equal(parsePublicRegistrationInput({ name: 'Person', email: 'person@example.invalid', password: 'test', role }).role, UserRole.CUSTOMER)
  }
})

test('public registration rejects malformed input types', () => {
  for (const input of [
    null,
    [],
    'not an object',
    {},
    { name: 1, email: 'a@example.invalid', password: 'test' },
    { name: 'A', email: 'a@example.invalid', password: 'test', phone: 1 },
    { name: ' ', email: 'a@example.invalid', password: 'test' },
    { name: 'A', email: 'invalid-email', password: 'test' },
    { name: 'A', email: 'a@example.invalid', password: '' },
  ]) {
    assert.equal(parsePublicRegistrationInput(input), null)
  }
})

test('public registration preserves supported fields and discards unknown overrides', () => {
  assert.deepEqual(
    parsePublicRegistrationInput({
      name: ' Person ', email: ' person@example.invalid ', password: ' test ', phone: '123',
      ownerId: 999, id: 1, role: UserRole.SERVICE_PROVIDER,
    }),
    { name: 'Person', email: 'person@example.invalid', password: ' test ', phone: '123', role: UserRole.CUSTOMER },
  )
})
