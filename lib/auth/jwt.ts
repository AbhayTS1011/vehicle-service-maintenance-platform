import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-123456',
)

export interface JWTPayload {
  sub: string
  userId: number
  email: string
  role: string
  iat?: number
  exp?: number
  [key: string]: unknown
}

export async function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresInSeconds: number = 60 * 60 * 24 * 7,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ ...payload, iat: now, exp: now + expiresInSeconds })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] })
    return payload as JWTPayload
  } catch {
    return null
  }
}
