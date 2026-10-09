import { UserRole } from '@prisma/client'

export type BookingActor = { id: number; role: UserRole } | null

export type BookingRepository = {
  ownsVehicle: (customerId: number, vehicleId: number) => Promise<boolean>
  serviceTypeExists: (serviceTypeId: number) => Promise<boolean>
  serviceCenterId: () => Promise<number | null>
  create: (data: {
    customerId: number
    vehicleId: number
    serviceTypeId: number
    serviceCenterId: number
    scheduledDate: Date
    notes?: string
  }) => Promise<unknown>
}

export type BookingResult = { success: true } | { success: false; error: string }

export type CustomerBookingSummary = {
  id: number
  status: string
  scheduledDate: Date
  createdAt: Date
  vehicle: { make: string; model: string; licensePlate: string }
  serviceType: { name: string }
}

export type CustomerBookingListResult =
  | { success: true; bookings: CustomerBookingSummary[] }
  | { success: false; error: string }

export type CustomerBookingDetails = CustomerBookingSummary & {
  notes: string | null
  serviceCenter: { name: string; address: string; phone: string; operatingHours: string | null }
}

export type CustomerBookingDetailsResult =
  | { success: true; booking: CustomerBookingDetails }
  | { success: false; reason: 'not_found' | 'error'; error: string }

export async function listCustomerBookings(
  actor: BookingActor,
  repository: { findForCustomer: (customerId: number) => Promise<CustomerBookingSummary[]> },
): Promise<CustomerBookingListResult> {
  if (!actor || !Number.isSafeInteger(actor.id)) {
    return { success: false, error: 'Please sign in to view your bookings.' }
  }
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) {
    return { success: false, error: 'You do not have permission to view customer bookings.' }
  }

  try {
    const bookings = await repository.findForCustomer(actor.id)
    return { success: true, bookings }
  } catch {
    return { success: false, error: 'Your bookings could not be loaded. Please try again.' }
  }
}

export async function getCustomerBookingDetails(
  actor: BookingActor,
  bookingId: number,
  repository: { findForCustomer: (bookingId: number, customerId: number) => Promise<CustomerBookingDetails | null> },
): Promise<CustomerBookingDetailsResult> {
  if (!actor || !Number.isSafeInteger(actor.id)) {
    return { success: false, reason: 'error', error: 'Please sign in to view this booking.' }
  }
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) {
    return { success: false, reason: 'error', error: 'You do not have permission to view this booking.' }
  }
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    return { success: false, reason: 'not_found', error: 'Booking not found.' }
  }

  try {
    const booking = await repository.findForCustomer(bookingId, actor.id)
    if (!booking) return { success: false, reason: 'not_found', error: 'Booking not found.' }
    return { success: true, booking }
  } catch {
    return { success: false, reason: 'error', error: 'Booking details could not be loaded. Please try again.' }
  }
}

export async function createCustomerBooking(
  actor: BookingActor,
  input: unknown,
  repository: BookingRepository,
): Promise<BookingResult> {
  if (!actor || !Number.isSafeInteger(actor.id)) {
    return { success: false, error: 'Please sign in to create a booking.' }
  }
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) {
    return { success: false, error: 'You do not have permission to create a booking.' }
  }
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Please complete all required fields.' }
  }

  const fields = input as Record<string, unknown>
  const vehicleId = Number(fields.vehicleId)
  const serviceTypeId = Number(fields.serviceTypeId)
  const scheduledDateText = fields.scheduledDate
  const notesText = fields.notes

  if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0 ||
      !Number.isSafeInteger(serviceTypeId) || serviceTypeId <= 0 ||
      typeof scheduledDateText !== 'string' || !scheduledDateText.trim()) {
    return { success: false, error: 'Choose a vehicle, service, and preferred date.' }
  }
  const scheduledDate = new Date(scheduledDateText)
  if (Number.isNaN(scheduledDate.getTime())) {
    return { success: false, error: 'Enter a valid preferred service date.' }
  }
  if (notesText !== undefined && notesText !== null && typeof notesText !== 'string') {
    return { success: false, error: 'Notes must be plain text.' }
  }
  const notes = typeof notesText === 'string' ? notesText.trim() : ''

  if (!await repository.ownsVehicle(actor.id, vehicleId)) {
    return { success: false, error: 'That vehicle is not available in your account.' }
  }
  if (!await repository.serviceTypeExists(serviceTypeId)) {
    return { success: false, error: 'Choose a valid service type.' }
  }
  const serviceCenterId = await repository.serviceCenterId()
  if (!serviceCenterId) {
    return { success: false, error: 'Bookings are currently unavailable. Please try again later.' }
  }

  await repository.create({
    customerId: actor.id,
    vehicleId,
    serviceTypeId,
    serviceCenterId,
    scheduledDate,
    ...(notes ? { notes } : {}),
  })
  return { success: true }
}
