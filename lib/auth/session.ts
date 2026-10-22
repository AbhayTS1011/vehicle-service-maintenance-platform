import { UserRole } from '@prisma/client'
import { db } from '../db'
import { verifyToken } from './jwt'

export type CurrentSessionUser = {
  id: number
  name: string
  email: string
  role: UserRole
}

/** Resolve the authenticated user from a signed, unexpired session and current database state. */
export async function getCurrentUserFromHeaders(headers: Headers): Promise<CurrentSessionUser | null> {
  const cookieHeader = headers.get('cookie')
  if (!cookieHeader) return null

  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('apex_session='))
  const token = cookie?.slice('apex_session='.length)
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await db.user.findUnique({ where: { id: payload.userId } })
  if (!user || !Object.values(UserRole).includes(user.role)) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}
