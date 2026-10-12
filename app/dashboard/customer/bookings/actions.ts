'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { verifyVehicleOwnership } from '@/lib/auth/permissions'
import { verifyToken } from '@/lib/auth/jwt'
import {
  cancelCustomerBooking,
  createCustomerBooking,
  listAvailableAppointmentSlots,
  updateCustomerBooking,
  type BookingCancellationResult,
  type CustomerBookingUpdateResult,
  type BookingResult,
} from '@/lib/booking/booking-service'

export async function cancelBooking(formData: FormData): Promise<BookingCancellationResult> {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null

  return cancelCustomerBooking(actor, formData.get('bookingId'), {
    cancelPendingForCustomer: (bookingId, customerId) => db.booking.cancelPendingForCustomer(bookingId, customerId),
    findStatusForCustomer: (bookingId, customerId) => db.booking.findStatusForCustomer(bookingId, customerId),
  })
}

export async function createBooking(_previousState: BookingResult | null, formData: FormData): Promise<BookingResult> {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null

  try {
    const result = await createCustomerBooking(actor, {
      vehicleId: formData.get('vehicleId'),
      serviceTypeId: formData.get('serviceTypeId'),
      scheduledDate: formData.get('scheduledDate'),
      notes: formData.get('notes'),
      // Any submitted customerId/status fields are deliberately ignored.
    }, {
      ownsVehicle: (customerId, vehicleId) => verifyVehicleOwnership(customerId, vehicleId, role ?? UserRole.CUSTOMER),
      serviceTypeExists: (id) => db.bookingCatalog.serviceTypeExists(id),
      serviceCenterId: () => db.bookingCatalog.serviceCenterId(),
      create: (data) => db.booking.createScheduledBooking(data),
    })
    return result
  } catch {
    return { success: false, error: 'We could not create your booking. Please try again.' }
  }
}

export async function getAvailableSlots(date: string, serviceTypeId: string) {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null
  return listAvailableAppointmentSlots(actor, date, serviceTypeId, {
    availableAppointmentSlots: (requestedDate, requestedServiceTypeId) =>
      db.bookingCatalog.availableAppointmentSlots(requestedDate, requestedServiceTypeId),
  })
}

export async function updateBooking(_previous: CustomerBookingUpdateResult | null, formData: FormData): Promise<CustomerBookingUpdateResult> {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null
  try {
    const result = await updateCustomerBooking(actor, formData.get('bookingId'), formData.get('expectedScheduledDate'), formData.get('scheduledDate'), formData.get('notes'), {
      reschedulePending: (bookingId, customerId, expectedDate, scheduledDate, notes) =>
        db.booking.reschedulePendingForCustomer(bookingId, customerId, expectedDate, scheduledDate, notes),
    })
    if (result.success) {
      revalidatePath('/dashboard/customer/bookings')
      const bookingId = formData.get('bookingId')
      if (typeof bookingId === 'string' && /^\d+$/.test(bookingId)) {
        revalidatePath(`/dashboard/customer/bookings/${bookingId}`)
      }
    }
    return result
  } catch {
    return { success: false, reason: 'error', error: 'Your booking could not be updated. Please try again.' }
  }
}
