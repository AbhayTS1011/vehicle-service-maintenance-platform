'use server'

import { cookies, headers } from 'next/headers'
import { UserRole } from '@prisma/client'
import { db } from '../db'
import { hashPassword, passwordHashNeedsUpgrade, verifyPassword } from './password'
import { parsePublicRegistrationInput } from './registration-input'
import { signToken } from './jwt'
import { getJwtSecret } from './jwt-secret'
import { getLoginThrottleSecret, loginThrottleKey, normalizeLoginIdentifier, trustedClientIp } from './login-throttle'

const SESSION_COOKIE = 'apex_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

const safeUser = (user: { id: number; name: string; email: string; role: UserRole }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
})

async function establishSession(user: { id: number; name: string; email: string; role: UserRole }) {
  const token = await signToken({
    sub: String(user.id),
    userId: user.id,
    email: user.email,
    role: user.role,
  })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

async function writeRegistrationAudit(user: { id: number; role: UserRole }) {
  try {
    await db.auditLog.create({
      data: {
        tableName: 'users',
        recordId: user.id,
        action: 'REGISTER',
        user: { connect: { id: user.id } },
        details: `User registered with role ${user.role}`,
      },
    })
  } catch {
    // Audit availability must not turn a committed account creation into a reported failure.
  }
}

function isUniqueEmailConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

export async function registerUser(formData: unknown) {
  try {
    const registration = parsePublicRegistrationInput(formData)
    if (!registration) return { success: false, error: 'Enter a valid name, email and password.' }

    // Fail before writing an account if production token signing is misconfigured.
    getJwtSecret()
    const normalizedEmail = registration.email.toLowerCase().trim()
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) return { success: false, error: 'Email already registered' }

    const passwordHash = await hashPassword(registration.password)
    const newUser = await db.user.create({
      data: {
        name: registration.name,
        email: normalizedEmail,
        passwordHash,
        role: UserRole.CUSTOMER,
        phone: registration.phone || null,
      },
    })

    const sessionUser = safeUser(newUser)
    await establishSession(sessionUser)
    await writeRegistrationAudit(sessionUser)
    return { success: true, user: sessionUser }
  } catch (error) {
    if (isUniqueEmailConflict(error)) return { success: false, error: 'Email already registered' }
    return { success: false, error: 'Registration failed. Please try again.' }
  }
}

export async function loginUser(formData: unknown) {
  try {
    if (typeof formData !== 'object' || formData === null || Array.isArray(formData)) {
      return { success: false, error: 'Email and password are required' }
    }
    const input = formData as Record<string, unknown>
    if (typeof input.email !== 'string' || typeof input.password !== 'string' ||
        input.email.length > 255 || input.password.length < 1 || input.password.length > 1024 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      return { success: false, error: 'Email and password are required' }
    }

    getJwtSecret()
    const normalizedEmail = normalizeLoginIdentifier(input.email)
    const throttleSecret = getLoginThrottleSecret()
    const accountThrottleKey = loginThrottleKey('account', normalizedEmail, throttleSecret)
    const requestHeaders = await headers()
    const ip = trustedClientIp(requestHeaders)
    const ipThrottleKey = ip ? loginThrottleKey('ip', ip, throttleSecret) : null
    // Store errors deliberately fail closed; this action's generic operational
    // error is identical for known and unknown accounts.
    if (!await db.auth.consumeLoginRateLimit(accountThrottleKey, ipThrottleKey)) {
      return { success: false, error: 'Invalid email or password' }
    }

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || !await verifyPassword(input.password, user.passwordHash)) {
      return { success: false, error: 'Invalid email or password' }
    }

    if (passwordHashNeedsUpgrade(user.passwordHash)) {
      const upgradedHash = await hashPassword(input.password)
      const upgraded = await db.user.updatePasswordHashIfUnchanged({
        userId: user.id,
        expectedHash: user.passwordHash,
        nextHash: upgradedHash,
      })
      // A concurrent password change wins. Do not establish a session against
      // a stale credential, even if it matched the hash read at login start.
      if (!upgraded) return { success: false, error: 'Invalid email or password' }
    }

    await db.auth.clearAccountLoginRateLimit(accountThrottleKey)

    const sessionUser = safeUser(user)
    await establishSession(sessionUser)
    return { success: true, user: sessionUser }
  } catch {
    return { success: false, error: 'Login failed. Please try again.' }
  }
}

export async function logoutUser() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
  } catch {
    return { success: false, error: 'Logout failed. Please try again.' }
  }
  return { success: true }
}
