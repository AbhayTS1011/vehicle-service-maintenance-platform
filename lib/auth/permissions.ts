// =====================================================================
// Role-Based Access Control - Server-Side Helpers
// Middleware handles route protection; client components should rely on it
// =====================================================================

import { UserRole } from '@prisma/client'
import { db } from '../db'

// Server-side role check
export function checkRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

// Server-side ownership verification
export async function verifyVehicleOwnership(userId: number, vehicleId: number, userRole: UserRole): Promise<boolean> {
  // Admin and Service Provider can access all vehicles
  if (userRole === 'ADMIN' || userRole === 'SERVICE_PROVIDER') {
    return true
  }
  if (!Number.isSafeInteger(userId) || !Number.isSafeInteger(vehicleId)) return false
  return db.bookingCatalog.ownsVehicle(userId, vehicleId)
}
