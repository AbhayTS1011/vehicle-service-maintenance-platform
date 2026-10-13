import { BookingStatus, UserRole } from '@prisma/client'
import type { AdminActor } from './management'

export type DashboardBooking = {
  id: number
  status: BookingStatus
  scheduledDate: Date
  serviceType: { name: string }
}

export type AdminDashboardData = {
  serviceCenterName: string
  bookings: { total: number; byStatus: Record<BookingStatus, number> }
  mechanics: { total: number; active: number }
  lowStockParts: number
  invoices: { paidCount: number; paidAmount: string; unpaidCount: number; unpaidAmount: string }
  reviews: { count: number; averageRating: number | null }
  recentBookings: DashboardBooking[]
}

export type AdminDashboardResult =
  | { success: true; value: AdminDashboardData }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'configuration' | 'error'; error: string }

export interface AdminDashboardRepository {
  findServiceCenter(): Promise<{ id: number; name: string } | null>
  countBookingsByStatus(serviceCenterId: number): Promise<Array<{ status: BookingStatus; count: number }>>
  countMechanics(serviceCenterId: number): Promise<{ total: number; active: number }>
  countLowStockParts(): Promise<number>
  invoiceTotals(serviceCenterId: number): Promise<{ paidCount: number; paidAmount: string; unpaidCount: number; unpaidAmount: string }>
  reviewSummary(serviceCenterId: number): Promise<{ count: number; averageRating: number | null }>
  recentBookings(serviceCenterId: number): Promise<DashboardBooking[]>
}

export async function readAdminDashboard(
  actor: AdminActor,
  repository: AdminDashboardRepository,
): Promise<AdminDashboardResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to view the admin dashboard.' }
  }
  if (actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'Only an administrator can view this dashboard.' }
  }

  try {
    const center = await repository.findServiceCenter()
    if (!center) return { success: false, reason: 'configuration', error: 'No service center is configured.' }
    const [statusCounts, mechanics, lowStockParts, invoices, reviews, recentBookings] = await Promise.all([
      repository.countBookingsByStatus(center.id),
      repository.countMechanics(center.id),
      repository.countLowStockParts(),
      repository.invoiceTotals(center.id),
      repository.reviewSummary(center.id),
      repository.recentBookings(center.id),
    ])
    const byStatus = Object.fromEntries(Object.values(BookingStatus).map((status) => [status, 0])) as Record<BookingStatus, number>
    for (const item of statusCounts) byStatus[item.status] = item.count
    return {
      success: true,
      value: {
        serviceCenterName: center.name,
        bookings: { total: Object.values(byStatus).reduce((total, count) => total + count, 0), byStatus },
        mechanics,
        lowStockParts,
        invoices,
        reviews,
        recentBookings,
      },
    }
  } catch {
    return { success: false, reason: 'error', error: 'Admin dashboard data could not be loaded. Please try again.' }
  }
}
