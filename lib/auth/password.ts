import { randomBytes, pbkdf2, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const pbkdf2Async = promisify(pbkdf2)
export const PASSWORD_HASH_ITERATIONS = 220_000
const MAX_ACCEPTED_ITERATIONS = 600_000
const DERIVED_KEY_BYTES = 64
const SALT_BYTES = 16
const LEGACY_ITERATIONS = 10_000
const MAX_PASSWORD_LENGTH = 1024
const MAX_STORED_HASH_LENGTH = 255

type ParsedHash = {
  format: 'versioned' | 'legacy'
  iterations: number
  salt: Buffer
  digest: Buffer
}

function parseHash(storedHash: string): ParsedHash | null {
  if (typeof storedHash !== 'string' || storedHash.length > MAX_STORED_HASH_LENGTH) return null

  const versioned = /^pbkdf2-sha512\$v=1\$i=(\d{1,6})\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/.exec(storedHash)
  if (versioned) {
    const iterations = Number(versioned[1])
    const salt = Buffer.from(versioned[2], 'base64url')
    const digest = Buffer.from(versioned[3], 'base64url')
    if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > MAX_ACCEPTED_ITERATIONS ||
        salt.length !== SALT_BYTES || digest.length !== DERIVED_KEY_BYTES) return null
    return { format: 'versioned', iterations, salt, digest }
  }

  // Historical format: 16-byte salt as 32 hex chars and a 64-byte digest as 128 hex chars.
  const legacy = /^([a-f\d]{32}):([a-f\d]{128})$/i.exec(storedHash)
  if (!legacy) return null
  return {
    format: 'legacy',
    iterations: LEGACY_ITERATIONS,
    // The original implementation supplied the 32-character hex salt string
    // itself to pbkdf2Sync, so the compatibility verifier must use its UTF-8 bytes.
    salt: Buffer.from(legacy[1], 'utf8'),
    digest: Buffer.from(legacy[2], 'hex'),
  }
}

async function derive(password: string, salt: Buffer, iterations: number): Promise<Buffer> {
  return pbkdf2Async(password, salt, iterations, DERIVED_KEY_BYTES, 'sha512') as Promise<Buffer>
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length < 1 || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('Password input is invalid.')
  }
  const salt = randomBytes(SALT_BYTES)
  const digest = await derive(password, salt, PASSWORD_HASH_ITERATIONS)
  return `pbkdf2-sha512$v=1$i=${PASSWORD_HASH_ITERATIONS}$${salt.toString('base64url')}$${digest.toString('base64url')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length < 1 || password.length > MAX_PASSWORD_LENGTH) return false
  const parsed = parseHash(storedHash)
  if (!parsed) return false
  try {
    const actual = await derive(password, parsed.salt, parsed.iterations)
    return timingSafeEqual(actual, parsed.digest)
  } catch {
    return false
  }
}

export function passwordHashNeedsUpgrade(storedHash: string): boolean {
  const parsed = parseHash(storedHash)
  return parsed === null || parsed.format === 'legacy' || parsed.iterations < PASSWORD_HASH_ITERATIONS
}
