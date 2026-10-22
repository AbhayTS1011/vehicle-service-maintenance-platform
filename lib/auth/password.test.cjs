const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { test } = require('node:test')
const { hashPassword, verifyPassword, passwordHashNeedsUpgrade, PASSWORD_HASH_ITERATIONS } = require('./password.ts')

function legacyHash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return `${salt}:${crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex')}`
}

test('new password hashes are versioned PBKDF2-SHA512 at the approved work factor', async () => {
  const encoded = await hashPassword('strong test password')
  assert.match(encoded, /^pbkdf2-sha512\$v=1\$i=220000\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/)
  assert.equal(PASSWORD_HASH_ITERATIONS, 220_000)
  assert.equal(passwordHashNeedsUpgrade(encoded), false)
  assert.equal(await verifyPassword('strong test password', encoded), true)
  assert.equal(await verifyPassword('different password', encoded), false)
})

test('historical saltHex:digestHex hashes remain verifiable and are marked for upgrade', async () => {
  const encoded = legacyHash('legacy password')
  assert.match(encoded, /^[a-f\d]{32}:[a-f\d]{128}$/)
  assert.equal(await verifyPassword('legacy password', encoded), true)
  assert.equal(await verifyPassword('wrong password', encoded), false)
  assert.equal(passwordHashNeedsUpgrade(encoded), true)
})

test('malformed, unsupported and unreasonable hash parameters fail safely', async () => {
  const valid = await hashPassword('test password')
  const fields = valid.split('$')
  const malformed = [
    '', 'plaintext', 'abc:def', '0'.repeat(32) + ':' + '0'.repeat(126),
    valid.replace('pbkdf2-sha512', 'unknown-algorithm'),
    valid.replace('$v=1$', '$v=2$'),
    valid.replace('$i=220000$', '$i=999999$'),
    valid.replace('$i=220000$', '$i=0$'),
    `${fields.slice(0, 4).join('$')}$!${fields[4]}`,
    'x'.repeat(256),
  ]
  for (const candidate of malformed) {
    assert.equal(await verifyPassword('test password', candidate), false)
    assert.equal(passwordHashNeedsUpgrade(candidate), true)
  }
  assert.equal(await verifyPassword('x'.repeat(1025), valid), false)
  await assert.rejects(hashPassword('x'.repeat(1025)), /Password input is invalid/)
})
