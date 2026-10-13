'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth/jwt'
import { assignMechanicToProviderBooking, confirmProviderBooking, rejectProviderBooking, startProviderBooking } from '@/lib/booking/booking-service'
import { completeBookingWithServiceRecord } from '@/lib/service-records/service-record-service'
import { notifySuccessfulBookingMutation } from '@/lib/email-workflows'

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
  return notifySuccessfulBookingMutation(result, 'booking_confirmed', formData.get('bookingId'), db.workflowEmail)
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
  return notifySuccessfulBookingMutation(result, 'booking_rejected', formData.get('bookingId'), db.workflowEmail)
}

export async function startService(formData: FormData) {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null

  const result = await startProviderBooking(actor, formData.get('bookingId'), {
    startConfirmed: (bookingId) => db.booking.startConfirmedForProvider(bookingId),
    findStatus: (bookingId) => db.booking.findStatusById(bookingId),
  })

  if (result.success) {
    revalidatePath('/dashboard/provider/bookings/confirmed')
    revalidatePath('/dashboard/provider/bookings')
  }
  return notifySuccessfulBookingMutation(result, 'service_started', formData.get('bookingId'), db.workflowEmail)
}

export async function assignMechanic(formData: FormData) {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null

  const result = await assignMechanicToProviderBooking(actor, formData.get('bookingId'), formData.get('mechanicId'), {
    findBookingContext: (bookingId) => db.booking.findBookingAssignmentContext(bookingId),
    findMechanic: (mechanicId) => db.booking.findMechanicForAssignment(mechanicId),
    assignMechanic: (bookingId, mechanicId, serviceCenterId) =>
      db.booking.assignMechanicToConfirmedBooking(bookingId, mechanicId, serviceCenterId),
  })

  if (result.success) revalidatePath('/dashboard/provider/bookings/confirmed')
  return result
}

export async function completeService(formData: FormData) {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null

  const partIds = formData.getAll('partId')
  const quantities = formData.getAll('quantity')
  const parts = partIds.map((partId, index) => ({ partId, quantity: quantities[index] }))
    .filter((part) => part.partId !== '')
  const result = await completeBookingWithServiceRecord(actor, {
    bookingId: formData.get('bookingId'),
    diagnosisNotes: formData.get('diagnosisNotes'),
    workPerformed: formData.get('workPerformed'),
    laborCost: formData.get('laborCost'),
    parts,
  }, {
    createForInProgressBooking: (data) => db.serviceRecord.createForInProgressBooking(data),
  })

  if (result.success) {
    revalidatePath('/dashboard/provider/bookings/in-progress')
    revalidatePath('/dashboard/provider/bookings/confirmed')
    revalidatePath('/dashboard/provider/bookings')
    revalidatePath('/dashboard/service-records')
    revalidatePath('/dashboard/customer/bookings')
  }
  return notifySuccessfulBookingMutation(result, 'service_completed', formData.get('bookingId'), db.workflowEmail)
}
