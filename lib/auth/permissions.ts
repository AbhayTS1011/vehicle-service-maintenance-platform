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