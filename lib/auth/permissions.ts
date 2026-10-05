// =====================================================================
// Role-Based Access Control (RBAC) & Permissions
// =====================================================================

import { UserRole } from '@prisma/client'
import { getCurrentUser } from './session'
import { db } from '../db'

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized: Authentication required')
  }
  return user
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Required role [${allowedRoles.join(', ')}], got [${user.role}]`)
  }
  return user
}

export async function verifyVehicleOwnership(userId: number, vehicleId: number, userRole: UserRole) {
  if (userRole === 'ADMIN' || userRole === 'SERVICE_PROVIDER') {
    return true
  }

  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
  })

  if (!vehicle || vehicle.ownerId !== userId) {
    throw new Error('Forbidden: You do not own this vehicle')
  }

  return true
}

export async function verifyBookingOwnership(userId: number, bookingId: number, userRole: UserRole) {
  if (userRole === 'ADMIN' || userRole === 'SERVICE_PROVIDER') {
    return true
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking || booking.customerId !== userId) {
    throw new Error('Forbidden: You do not own this booking')
  }

  return true
}
