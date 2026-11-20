import { cookies } from 'next/headers'
import { getCurrentUserFromHeaders } from '@/lib/auth/session'
import type { VehicleActor } from './vehicle-service'

export async function getVehicleActor(): Promise<VehicleActor> {
  try {
    const token = (await cookies()).get('apex_session')?.value
    if (!token) return null
    const user = await getCurrentUserFromHeaders(new Headers({ cookie: `apex_session=${token}` }))
    return user ? { id: user.id, role: user.role } : null
  } catch {
    return null
  }
}
