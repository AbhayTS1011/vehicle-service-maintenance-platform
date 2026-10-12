import { UserRole } from '@prisma/client'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/jwt'
import type { AdminActor } from './management'

export async function getSessionActor(): Promise<AdminActor> {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0 ||
      !Object.values(UserRole).includes(payload.role as UserRole)) return null
  return { id: payload.userId, role: payload.role as UserRole }
}
