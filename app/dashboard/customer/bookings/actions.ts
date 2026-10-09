'use server'

import { cookies } from 'next/headers'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { verifyVehicleOwnership } from '@/lib/auth/permissions'
import { verifyToken } from '@/lib/auth/jwt'
import { createCustomerBooking, type BookingResult } from '@/lib/booking/booking-service'

export async function createBooking(_previousState: BookingResult | null, formData: FormData): Promise<BookingResult> {
  const token = cookies().get('apex_session')?.value
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
      create: (data) => db.booking.create({ data }),
    })
    return result
  } catch {
    return { success: false, error: 'We could not create your booking. Please try again.' }
  }
}
