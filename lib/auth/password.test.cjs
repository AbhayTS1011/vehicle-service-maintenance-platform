const assert = require('node:assert/strict')
const { test } = require('node:test')

const { hashPassword, verifyPassword } = require('./password.ts')

test('password hashes use a unique salt and can be verified', async () => {
  const first = await hashPassword('correct horse battery staple')
  const second = await hashPassword('correct horse battery staple')

  assert.notEqual(first, second)
  assert.equal(await verifyPassword('correct horse battery staple', first), true)
})

test('password verification rejects an incorrect password', async () => {
  const storedHash = await hashPassword('correct horse battery staple')

  assert.equal(await verifyPassword('incorrect password', storedHash), false)
})

test('password verification safely rejects malformed stored hashes', async () => {
  for (const storedHash of ['', 'missing-separator', ':hash', 'salt:', 'salt:not-hex']) {
    assert.equal(await verifyPassword('any password', storedHash), false)
  }
})

test('password verification safely rejects a hash with the wrong digest length', async () => {
  assert.equal(await verifyPassword('any password', 'salt:00'), false)
})
