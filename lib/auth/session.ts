// =====================================================================
// Session Management & Cookie Handling
// =====================================================================

import { cookies } from 'next/headers'
import { verifyToken, signToken, JWTPayload } from './jwt'
import { db } from '../db'

const COOKIE_NAME = 'apex_session'

export async function setSessionCookie(payload: Omit<JWTPayload, 'iat' | 'exp'>) {
  const token = await signToken(payload)
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearSessionCookie() {
  cookies().set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) return null

    const user = await db.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) return null

    // Return safe user object (excluding passwordHash)
    const { passwordHash, ...safeUser } = user
    return safeUser
  } catch (error) {
    return null
  }
}
