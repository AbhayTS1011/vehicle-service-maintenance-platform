import { SignJWT, jwtVerify } from 'jose'
import { UserRole } from '@prisma/client'
import { getJwtSecret } from './jwt-secret'

export interface JWTPayload {
  sub: string
  userId: number
  email: string
  role: UserRole
  iat: number
  exp: number
}

export type SessionTokenClaims = Pick<JWTPayload, 'sub' | 'userId' | 'email' | 'role'>

const roles = new Set<string>(Object.values(UserRole))

function hasValidSessionClaims(payload: Record<string, unknown>): payload is JWTPayload & Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000)
  return typeof payload.sub === 'string' &&
    Number.isSafeInteger(payload.userId) && (payload.userId as number) > 0 &&
    payload.sub === String(payload.userId) &&
    typeof payload.email === 'string' && payload.email.length <= 255 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) &&
    typeof payload.role === 'string' && roles.has(payload.role) &&
    Number.isSafeInteger(payload.iat) && (payload.iat as number) > 0 && (payload.iat as number) <= now &&
    Number.isSafeInteger(payload.exp) && (payload.exp as number) > (payload.iat as number) && (payload.exp as number) > now
}

export async function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresInSeconds: number = 60 * 60 * 24 * 7,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ ...payload, iat: now, exp: now + expiresInSeconds })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(new TextEncoder().encode(getJwtSecret()))
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    if (typeof token !== 'string' || token.length === 0) return null
    const { payload } = await jwtVerify(token, new TextEncoder().encode(getJwtSecret()), {
      algorithms: ['HS256'],
      requiredClaims: ['exp', 'iat'],
    })
    return hasValidSessionClaims(payload) ? payload : null
  } catch {
    return null
  }
}
