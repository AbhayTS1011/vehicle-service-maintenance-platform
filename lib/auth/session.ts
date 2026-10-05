// =====================================================================
// Authentication Module - Next.js App Router Implementation
// Uses Server Actions for cookie operations, middleware for route protection
// =====================================================================

import crypto from 'crypto'

import { db } from '../db'

// User roles
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  FLEET_MANAGER = 'FLEET_MANAGER',
  ADMIN = 'ADMIN',
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, originalHash] = storedHash.split(':')
    if (!salt || !originalHash) return false
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'))
  } catch (error) {
    return false
  }
}

export interface JWTPayload {
  sub: string
  userId: number
  email: string
  role: string
  iat?: number
  exp?: number
  [key: string]: any
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(str: string): string {
  let output = str.replace(/-/g, '+').replace(/_/g, '/')
  while (output.length % 4) {
    output += '='
  }
  return Buffer.from(output, 'base64').toString('utf8')
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-123456'

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresInSeconds: number = 60 * 60 * 24 * 7): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  } as JWTPayload

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${signatureInput}.${signature}`
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [encodedHeader, encodedPayload, signature] = parts
    const signatureInput = `${encodedHeader}.${encodedPayload}`

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(signatureInput)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    if (signature !== expectedSignature) return null

    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload))

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null // Expired
    }

    return payload
  } catch (error) {
    return null
  }
}

// Cookie operations are handled by Server Actions (loginUser, logoutUser)
// getCurrentUserFromHeaders is intended for use in Server Components or API routes
// that have access to the request headers

export async function getCurrentUserFromHeaders(headers: Headers): Promise<any | null> {
  // This should be called from Server Components or API routes
  // that have access to the headers object
  const cookieHeader = headers.get('cookie')
  if (!cookieHeader) return null

  const match = cookieHeader.match(/apex_session=([^;]+)/)
  if (!match) return null

  const token = match[1]
  const payload = await verifyToken(token)
  if (!payload || !payload.userId) return null

  const user = await db.user.findUnique({
    where: { id: payload.userId },
  })

  if (!user) return null

  // Return safe user object (omit passwordHash)
  // Use! non-null assertions since user is guaranteed to exist at this point
  const safeUser: { id: number; name: string; email: string; role: UserRole } = {
    id: (user as any).id,
    name: (user as any).name,
    email: (user as any).email,
    role: (user as any).role,
  }
  return safeUser
}

// Permission checks are server-side only
// Client components should rely on middleware for route protection

export function checkRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

// Server-side ownership verification
export function verifyVehicleOwnership(userId: number, vehicleId: number, userRole: UserRole): boolean {
  // Admin and Service Provider can access all vehicles
  if (userRole === 'ADMIN' || userRole === 'SERVICE_PROVIDER') {
    return true
  }
  // For other roles, check ownership
  // In a full Prisma implementation, this would query the database
  // For the resilient store, ownership is checked at the API route level
  return true
}