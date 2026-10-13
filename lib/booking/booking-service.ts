import { BookingStatus, UserRole, type Prisma } from '@prisma/client'

export type BookingActor = { id: number; role: UserRole } | null

export const providerPendingBookingsQuery = {
  where: { status: BookingStatus.PENDING },
  select: {
    id: true,
    status: true,
    scheduledDate: true,
    createdAt: true,
    customer: { select: { name: true } },
    vehicle: { select: { make: true, model: true, licensePlate: true } },
    serviceType: { select: { name: true } },
  },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
} satisfies Prisma.BookingFindManyArgs

export type ProviderPendingBookingsQuery = typeof providerPendingBookingsQuery
export type ProviderPendingBooking = Prisma.BookingGetPayload<{
  select: typeof providerPendingBookingsQuery.select
}>

export const providerConfirmedBookingsQuery = {
  ...providerPendingBookingsQuery,
  where: { status: BookingStatus.CONFIRMED },
  select: {
    ...providerPendingBookingsQuery.select,
    mechanicId: true,
    mechanic: { select: { id: true, name: true } },
    serviceCenter: {
      select: {
        id: true,
        mechanics: {
          where: { isActive: true },
          select: { id: true, name: true, specialization: true },
          orderBy: { name: 'asc' },
        },
      },
    },
  },
} satisfies Prisma.BookingFindManyArgs

export type ProviderConfirmedBookingsQuery = typeof providerConfirmedBookingsQuery
export type ProviderConfirmedBooking = Prisma.BookingGetPayload<{
  select: typeof providerConfirmedBookingsQuery.select
}>

export const providerInProgressBookingsQuery = {
  ...providerPendingBookingsQuery,
  where: { status: BookingStatus.IN_PROGRESS },
  select: {
    ...providerPendingBookingsQuery.select,
    mechanic: { select: { name: true } },
  },
} satisfies Prisma.BookingFindManyArgs

export type ProviderInProgressBookingsQuery = typeof providerInProgressBookingsQuery
export type ProviderInProgressBooking = Prisma.BookingGetPayload<{
  select: typeof providerInProgressBookingsQuery.select
}>

export type ProviderPendingBookingsResult =
  | { success: true; bookings: ProviderPendingBooking[] }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'error'; error: string }

export type ProviderPendingBookingsRepository = {
  findPending: (query: ProviderPendingBookingsQuery) => Promise<ProviderPendingBooking[]>
}

export type ProviderConfirmedBookingsResult =
  | { success: true; bookings: ProviderConfirmedBooking[] }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'error'; error: string }

export type ProviderConfirmedBookingsRepository = {
  findConfirmed: (query: ProviderConfirmedBookingsQuery) => Promise<ProviderConfirmedBooking[]>
}

export type ProviderInProgressBookingsResult =
  | { success: true; bookings: ProviderInProgressBooking[] }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'error'; error: string }

export type ProviderInProgressBookingsRepository = {
  findInProgress: (query: ProviderInProgressBookingsQuery) => Promise<ProviderInProgressBooking[]>
}

export type ProviderBookingAssignmentContext = {
  status: BookingStatus
  mechanicId: number | null
  serviceCenterId: number
}

export type ProviderMechanicAssignmentCandidate = {
  id: number
  name: string
  isActive: boolean | null
  serviceCenterId: number
}

export type ProviderMechanicAssignmentResult =
  | { success: true; mechanic: { id: number; name: string } }
  | {
      success: false
      reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'already_assigned' | 'mechanic_unavailable' | 'mechanic_busy' | 'service_center_mismatch' | 'error'
      error: string
    }

export type ProviderMechanicAssignmentRepository = {
  findBookingContext: (bookingId: number) => Promise<ProviderBookingAssignmentContext | null>
  findMechanic: (mechanicId: number) => Promise<ProviderMechanicAssignmentCandidate | null>
  assignMechanic: (bookingId: number, mechanicId: number, serviceCenterId: number) => Promise<number>
}

export async function listProviderPendingBookings(
  actor: BookingActor,
  repository: ProviderPendingBookingsRepository,
): Promise<ProviderPendingBookingsResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to view pending bookings.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to view pending bookings.' }
  }

  try {
    const bookings = await repository.findPending(providerPendingBookingsQuery)
    return { success: true, bookings }
  } catch {
    return {
      success: false,
      reason: 'error',
      error: 'Pending service requests could not be loaded. Please try again.',
    }
  }
}

export async function listProviderConfirmedBookings(
  actor: BookingActor,
  repository: ProviderConfirmedBookingsRepository,
): Promise<ProviderConfirmedBookingsResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to view confirmed bookings.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to view confirmed bookings.' }
  }

  try {
    const bookings = await repository.findConfirmed(providerConfirmedBookingsQuery)
    return { success: true, bookings }
  } catch {
    return {
      success: false,
      reason: 'error',
      error: 'Confirmed bookings could not be loaded. Please try again.',
    }
  }
}

export async function listProviderInProgressBookings(
  actor: BookingActor,
  repository: ProviderInProgressBookingsRepository,
): Promise<ProviderInProgressBookingsResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to view in-progress bookings.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to view in-progress bookings.' }
  }
  try {
    return { success: true, bookings: await repository.findInProgress(providerInProgressBookingsQuery) }
  } catch {
    return { success: false, reason: 'error', error: 'In-progress bookings could not be loaded. Please try again.' }
  }
}

export async function assignMechanicToProviderBooking(
  actor: BookingActor,
  bookingInput: unknown,
  mechanicInput: unknown,
  repository: ProviderMechanicAssignmentRepository,
): Promise<ProviderMechanicAssignmentResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to assign a mechanic.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to assign mechanics.' }
  }

  const parseId = (input: unknown) => typeof input === 'number'
    ? input
    : typeof input === 'string' && /^\d+$/.test(input)
      ? Number(input)
      : Number.NaN
  const bookingId = parseId(bookingInput)
  const mechanicId = parseId(mechanicInput)
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0 || !Number.isSafeInteger(mechanicId) || mechanicId <= 0) {
    return { success: false, reason: 'invalid_input', error: 'Choose a valid booking and mechanic.' }
  }

  try {
    const booking = await repository.findBookingContext(bookingId)
    if (!booking) return { success: false, reason: 'not_found', error: 'Booking not found.' }
    if (booking.status !== BookingStatus.CONFIRMED) {
      return { success: false, reason: 'invalid_state', error: 'A mechanic can only be assigned to a confirmed booking.' }
    }
    if (booking.mechanicId !== null) {
      return { success: false, reason: 'already_assigned', error: 'A mechanic is already assigned to this booking.' }
    }

    const mechanic = await repository.findMechanic(mechanicId)
    if (!mechanic || mechanic.isActive !== true) {
      return { success: false, reason: 'mechanic_unavailable', error: 'That mechanic is not available for assignment.' }
    }
    if (mechanic.serviceCenterId !== booking.serviceCenterId) {
      return { success: false, reason: 'service_center_mismatch', error: 'Choose a mechanic from this booking’s service center.' }
    }

    const updated = await repository.assignMechanic(bookingId, mechanicId, booking.serviceCenterId)
    if (updated === 1) return { success: true, mechanic: { id: mechanic.id, name: mechanic.name } }
    if (updated === 2) {
      return { success: false, reason: 'mechanic_busy', error: 'That mechanic already has an overlapping appointment.' }
    }
    if (updated !== 0) {
      return { success: false, reason: 'error', error: 'The mechanic could not be assigned. Please try again.' }
    }

    const latest = await repository.findBookingContext(bookingId)
    if (!latest) return { success: false, reason: 'not_found', error: 'Booking not found.' }
    if (latest.status !== BookingStatus.CONFIRMED) {
      return { success: false, reason: 'invalid_state', error: 'This booking is no longer confirmed.' }
    }
    if (latest.mechanicId !== null) {
      return { success: false, reason: 'already_assigned', error: 'A mechanic was already assigned to this booking.' }
    }
    const latestMechanic = await repository.findMechanic(mechanicId)
    if (!latestMechanic || latestMechanic.isActive !== true) {
      return { success: false, reason: 'mechanic_unavailable', error: 'That mechanic is no longer available for assignment.' }
    }
    if (latestMechanic.serviceCenterId !== latest.serviceCenterId) {
      return { success: false, reason: 'service_center_mismatch', error: 'Choose a mechanic from this booking’s service center.' }
    }
    return { success: false, reason: 'error', error: 'The mechanic could not be assigned. Please try again.' }
  } catch {
    return { success: false, reason: 'error', error: 'The mechanic could not be assigned. Please try again.' }
  }
}

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
  }) => Promise<{ created: true; bookingId?: number } | { created: false; reason: 'unavailable' | 'configuration' | 'invalid' }>
}

export type BookingResult = { success: true; bookingId?: number } | { success: false; error: string }

export type CustomerBookingUpdateResult =
  | { success: true }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'stale' | 'unavailable' | 'configuration' | 'error'; error: string }

export type CustomerBookingUpdateRepository = {
  reschedulePending: (bookingId: number, customerId: number, expectedScheduledDate: Date, scheduledDate: Date, notes: string | null) => Promise<
    { updated: true } | { updated: false; reason: 'not_found' | 'invalid_state' | 'stale' | 'unavailable' | 'configuration' }
  >
}

export async function updateCustomerBooking(
  actor: BookingActor,
  bookingInput: unknown,
  expectedScheduledDateInput: unknown,
  scheduledDateInput: unknown,
  notesInput: unknown,
  repository: CustomerBookingUpdateRepository,
): Promise<CustomerBookingUpdateResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to update your booking.' }
  }
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to update customer bookings.' }
  }
  const bookingId = typeof bookingInput === 'number'
    ? bookingInput
    : typeof bookingInput === 'string' && /^\d+$/.test(bookingInput)
      ? Number(bookingInput)
      : Number.NaN
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0 || typeof expectedScheduledDateInput !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(expectedScheduledDateInput) ||
      typeof scheduledDateInput !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(scheduledDateInput) ||
      (notesInput !== null && notesInput !== undefined && typeof notesInput !== 'string')) {
    return { success: false, reason: 'invalid_input', error: 'Choose a valid booking time and enter plain-text notes.' }
  }
  const expectedScheduledDate = new Date(expectedScheduledDateInput)
  const scheduledDate = new Date(scheduledDateInput)
  if (Number.isNaN(expectedScheduledDate.getTime()) || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return { success: false, reason: 'invalid_input', error: 'Choose a future appointment time.' }
  }
  if (typeof notesInput === 'string' && notesInput.length > 5000) {
    return { success: false, reason: 'invalid_input', error: 'Notes must be 5,000 characters or fewer.' }
  }

  try {
    const result = await repository.reschedulePending(
      bookingId,
      actor.id,
      expectedScheduledDate,
      scheduledDate,
      typeof notesInput === 'string' && notesInput.trim() ? notesInput.trim() : null,
    )
    if (result.updated) return { success: true }
    if (result.reason === 'not_found') return { success: false, reason: 'not_found', error: 'Booking not found.' }
    if (result.reason === 'invalid_state') return { success: false, reason: 'invalid_state', error: 'Only pending bookings can be edited or rescheduled.' }
    if (result.reason === 'stale') return { success: false, reason: 'stale', error: 'This booking changed since you opened it. Refresh the page and try again.' }
    if (result.reason === 'configuration') return { success: false, reason: 'configuration', error: 'Appointment scheduling is not configured. Please contact the service center.' }
    return { success: false, reason: 'unavailable', error: 'That appointment time is no longer available. Choose another time.' }
  } catch {
    return { success: false, reason: 'error', error: 'Your booking could not be updated. Please try again.' }
  }
}

export type AvailableSlotsResult =
  | { success: true; configured: boolean; slots: Date[] }
  | { success: false; error: string }

export async function listAvailableAppointmentSlots(
  actor: BookingActor,
  dateInput: unknown,
  serviceTypeInput: unknown,
  repository: { availableAppointmentSlots: (date: string, serviceTypeId: number) => Promise<{ configured: boolean; slots: Date[] }> },
): Promise<AvailableSlotsResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, error: 'Please sign in to view available appointments.' }
  }
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) {
    return { success: false, error: 'You do not have permission to view available appointments.' }
  }
  const serviceTypeId = typeof serviceTypeInput === 'number'
    ? serviceTypeInput
    : typeof serviceTypeInput === 'string' && /^\d+$/.test(serviceTypeInput)
      ? Number(serviceTypeInput)
      : Number.NaN
  const parsedDate = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00.000Z`) : null
  if (typeof dateInput !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput) ||
      !Number.isSafeInteger(serviceTypeId) || serviceTypeId <= 0 ||
      !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateInput) {
    return { success: false, error: 'Choose a valid appointment date and service.' }
  }
  try {
    const result = await repository.availableAppointmentSlots(dateInput, serviceTypeId)
    return { success: true, ...result }
  } catch {
    return { success: false, error: 'Available appointments could not be loaded. Please try again.' }
  }
}

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
  serviceTypeId: number
  notes: string | null
  serviceCenter: { name: string; address: string; phone: string; operatingHours: string | null; timeZone: string | null }
}

export type CustomerBookingDetailsResult =
  | { success: true; booking: CustomerBookingDetails }
  | { success: false; reason: 'not_found' | 'error'; error: string }

export type BookingCancellationResult =
  | { success: true }
  | {
      success: false
      reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'error'
      error: string
    }

export type BookingCancellationRepository = {
  cancelPendingForCustomer: (bookingId: number, customerId: number) => Promise<number>
  findStatusForCustomer: (bookingId: number, customerId: number) => Promise<string | null>
}

export type ProviderBookingConfirmationResult =
  | { success: true }
  | {
      success: false
      reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'error'
      error: string
    }

export type ProviderBookingConfirmationRepository = {
  confirmPending: (bookingId: number) => Promise<number>
  findStatus: (bookingId: number) => Promise<string | null>
}

export async function confirmProviderBooking(
  actor: BookingActor,
  input: unknown,
  repository: ProviderBookingConfirmationRepository,
): Promise<ProviderBookingConfirmationResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to confirm a booking.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to confirm bookings.' }
  }

  const bookingId = typeof input === 'number'
    ? input
    : typeof input === 'string' && /^\d+$/.test(input)
      ? Number(input)
      : Number.NaN
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    return { success: false, reason: 'invalid_input', error: 'Choose a valid booking to confirm.' }
  }

  try {
    const updated = await repository.confirmPending(bookingId)
    if (updated === 1) return { success: true }
    if (updated !== 0) {
      return { success: false, reason: 'error', error: 'The booking could not be confirmed. Please try again.' }
    }

    const currentStatus = await repository.findStatus(bookingId)
    if (currentStatus === null) {
      return { success: false, reason: 'not_found', error: 'Booking not found.' }
    }
    return {
      success: false,
      reason: 'invalid_state',
      error: 'Only pending bookings can be confirmed. Refresh the queue and try again.',
    }
  } catch {
    return { success: false, reason: 'error', error: 'The booking could not be confirmed. Please try again.' }
  }
}

export type ProviderBookingRejectionResult =
  | { success: true }
  | {
      success: false
      reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'error'
      error: string
    }

export type ProviderBookingRejectionRepository = {
  rejectPending: (bookingId: number) => Promise<number>
  findStatus: (bookingId: number) => Promise<string | null>
}

export async function rejectProviderBooking(
  actor: BookingActor,
  input: unknown,
  repository: ProviderBookingRejectionRepository,
): Promise<ProviderBookingRejectionResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to reject a booking.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to reject bookings.' }
  }

  const bookingId = typeof input === 'number'
    ? input
    : typeof input === 'string' && /^\d+$/.test(input)
      ? Number(input)
      : Number.NaN
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    return { success: false, reason: 'invalid_input', error: 'Choose a valid booking to reject.' }
  }

  try {
    const updated = await repository.rejectPending(bookingId)
    if (updated === 1) return { success: true }
    if (updated !== 0) {
      return { success: false, reason: 'error', error: 'The booking could not be rejected. Please try again.' }
    }

    const currentStatus = await repository.findStatus(bookingId)
    if (currentStatus === null) {
      return { success: false, reason: 'not_found', error: 'Booking not found.' }
    }
    return {
      success: false,
      reason: 'invalid_state',
      error: 'Only pending bookings can be rejected. Refresh the queue and try again.',
    }
  } catch {
    return { success: false, reason: 'error', error: 'The booking could not be rejected. Please try again.' }
  }
}

export type ProviderBookingStartResult =
  | { success: true }
  | {
      success: false
      reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'error'
      error: string
    }

export type ProviderBookingStartRepository = {
  startConfirmed: (bookingId: number) => Promise<number>
  findStatus: (bookingId: number) => Promise<string | null>
}

export async function startProviderBooking(
  actor: BookingActor,
  input: unknown,
  repository: ProviderBookingStartRepository,
): Promise<ProviderBookingStartResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to start service.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to start service.' }
  }

  const bookingId = typeof input === 'number'
    ? input
    : typeof input === 'string' && /^\d+$/.test(input)
      ? Number(input)
      : Number.NaN
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    return { success: false, reason: 'invalid_input', error: 'Choose a valid booking to start.' }
  }

  try {
    const updated = await repository.startConfirmed(bookingId)
    if (updated === 1) return { success: true }
    if (updated !== 0) {
      return { success: false, reason: 'error', error: 'Service could not be started. Please try again.' }
    }

    const currentStatus = await repository.findStatus(bookingId)
    if (currentStatus === null) {
      return { success: false, reason: 'not_found', error: 'Booking not found.' }
    }
    return {
      success: false,
      reason: 'invalid_state',
      error: 'Only confirmed bookings can be started. Refresh the list and try again.',
    }
  } catch {
    return { success: false, reason: 'error', error: 'Service could not be started. Please try again.' }
  }
}

export type ProviderBookingCompletionResult =
  | { success: true }
  | {
      success: false
      reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'error'
      error: string
    }

export type ProviderBookingCompletionRepository = {
  completeInProgress: (bookingId: number) => Promise<number>
  findStatus: (bookingId: number) => Promise<string | null>
}

export async function completeProviderBooking(
  actor: BookingActor,
  input: unknown,
  repository: ProviderBookingCompletionRepository,
): Promise<ProviderBookingCompletionResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to complete service.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to complete service.' }
  }
  const bookingId = typeof input === 'number'
    ? input
    : typeof input === 'string' && /^\d+$/.test(input)
      ? Number(input)
      : Number.NaN
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    return { success: false, reason: 'invalid_input', error: 'Choose a valid booking to complete.' }
  }
  try {
    const updated = await repository.completeInProgress(bookingId)
    if (updated === 1) return { success: true }
    if (updated !== 0) {
      return { success: false, reason: 'error', error: 'Service could not be completed. Please try again.' }
    }
    const currentStatus = await repository.findStatus(bookingId)
    if (currentStatus === null) return { success: false, reason: 'not_found', error: 'Booking not found.' }
    return {
      success: false,
      reason: 'invalid_state',
      error: 'Only in-progress bookings can be completed. Refresh the list and try again.',
    }
  } catch {
    return { success: false, reason: 'error', error: 'Service could not be completed. Please try again.' }
  }
}

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

export async function cancelCustomerBooking(
  actor: BookingActor,
  input: unknown,
  repository: BookingCancellationRepository,
): Promise<BookingCancellationResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to cancel a booking.' }
  }
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to cancel customer bookings.' }
  }

  const bookingId = typeof input === 'number'
    ? input
    : typeof input === 'string' && /^\d+$/.test(input)
      ? Number(input)
      : Number.NaN
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    return { success: false, reason: 'invalid_input', error: 'Choose a valid booking to cancel.' }
  }

  try {
    const updated = await repository.cancelPendingForCustomer(bookingId, actor.id)
    if (updated === 1) return { success: true }
    if (updated !== 0) {
      return { success: false, reason: 'error', error: 'The booking could not be cancelled. Please try again.' }
    }

    const currentStatus = await repository.findStatusForCustomer(bookingId, actor.id)
    if (currentStatus === null) {
      return { success: false, reason: 'not_found', error: 'Booking not found.' }
    }
    return {
      success: false,
      reason: 'invalid_state',
      error: 'Only pending bookings can be cancelled.',
    }
  } catch {
    return { success: false, reason: 'error', error: 'The booking could not be cancelled. Please try again.' }
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
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(scheduledDateText)) {
    return { success: false, error: 'Enter a valid preferred service date.' }
  }
  const scheduledDate = new Date(scheduledDateText)
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return { success: false, error: 'Choose a future appointment time.' }
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

  const created = await repository.create({
    customerId: actor.id,
    vehicleId,
    serviceTypeId,
    serviceCenterId,
    scheduledDate,
    ...(notes ? { notes } : {}),
  })
  if (!created.created) {
    if (created.reason === 'configuration') {
      return { success: false, error: 'Appointment scheduling is not configured. Please contact the service center.' }
    }
    if (created.reason === 'invalid') return { success: false, error: 'Choose a vehicle and service available to your account.' }
    return { success: false, error: 'That appointment time is no longer available. Choose another time.' }
  }
  return created.bookingId === undefined ? { success: true } : { success: true, bookingId: created.bookingId }
}
