// =====================================================================
// Native JWT Signing and Verification using Node.js crypto (Zero external dependency)
// =====================================================================

import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-123456'

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
