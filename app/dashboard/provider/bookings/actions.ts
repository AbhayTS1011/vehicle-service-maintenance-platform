'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth/jwt'
import { confirmProviderBooking, rejectProviderBooking } from '@/lib/booking/booking-service'

export async function confirmBooking(formData: FormData) {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null

  const result = await confirmProviderBooking(actor, formData.get('bookingId'), {
    confirmPending: (bookingId) => db.booking.confirmPendingForProvider(bookingId),
    findStatus: (bookingId) => db.booking.findStatusById(bookingId),
  })

  if (result.success) revalidatePath('/dashboard/provider/bookings')
  return result
}

export async function rejectBooking(formData: FormData) {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null

  const result = await rejectProviderBooking(actor, formData.get('bookingId'), {
    rejectPending: (bookingId) => db.booking.rejectPendingForProvider(bookingId),
    findStatus: (bookingId) => db.booking.findStatusById(bookingId),
  })

  if (result.success) revalidatePath('/dashboard/provider/bookings')
  return result
}
