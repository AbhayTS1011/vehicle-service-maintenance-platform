import { BookingStatus, UserRole } from '@prisma/client'

export type ServiceRecordActor = { id: number; role: UserRole } | null
export type ConsumedPartInput = { partId: unknown; quantity: unknown }
export type ServiceCompletionInventoryPart = { id: number; name: string; partNumber: string; unitPrice: unknown; stockQuantity: number }

export type ServiceCompletionInput = {
  bookingId: unknown
  diagnosisNotes: unknown
  workPerformed: unknown
  laborCost: unknown
  parts: unknown
}

export type ServiceCompletionResult =
  | { success: true; serviceId: number }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'invalid_part' | 'insufficient_stock' | 'already_recorded' | 'error'; error: string }

export type ServiceRecordRepository = {
  createForInProgressBooking: (data: {
    bookingId: number
    diagnosisNotes: string | null
    workPerformed: string
    laborCost: number
    parts: Array<{ partId: number; quantity: number }>
  }) => Promise<{ serviceId: number } | { reason: 'not_found' | 'invalid_state' | 'invalid_part' | 'insufficient_stock' | 'already_recorded' }>
}

const parsePositiveId = (value: unknown) => {
  const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function completeBookingWithServiceRecord(
  actor: ServiceRecordActor,
  input: ServiceCompletionInput,
  repository: ServiceRecordRepository,
): Promise<ServiceCompletionResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to record completed service.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to record service work.' }
  }

  const bookingId = parsePositiveId(input?.bookingId)
  const workPerformed = typeof input?.workPerformed === 'string' ? input.workPerformed.trim() : ''
  const diagnosisNotes = typeof input?.diagnosisNotes === 'string' ? input.diagnosisNotes.trim() : ''
  const laborCostText = typeof input?.laborCost === 'number' ? String(input.laborCost) : input?.laborCost
  const laborCost = typeof laborCostText === 'string' && /^\d{1,8}(?:\.\d{1,2})?$/.test(laborCostText)
    ? Number(laborCostText)
    : NaN

  if (!bookingId || !workPerformed || workPerformed.length > 5000 || diagnosisNotes.length > 5000 ||
      !Number.isFinite(laborCost) || laborCost < 0 || laborCost > 99_999_999.99 || !Array.isArray(input.parts) || input.parts.length > 100) {
    return { success: false, reason: 'invalid_input', error: 'Enter valid service details and parts used.' }
  }

  const aggregated = new Map<number, number>()
  for (const item of input.parts as ConsumedPartInput[]) {
    if (!item || typeof item !== 'object') {
      return { success: false, reason: 'invalid_input', error: 'Choose valid parts and quantities.' }
    }
    const partId = parsePositiveId(item.partId)
    const quantity = parsePositiveId(item.quantity)
    if (!partId || !quantity || quantity > 100_000) {
      return { success: false, reason: 'invalid_input', error: 'Choose valid parts and quantities.' }
    }
    const total = (aggregated.get(partId) ?? 0) + quantity
    if (total > 100_000) return { success: false, reason: 'invalid_input', error: 'Part quantity is too large.' }
    aggregated.set(partId, total)
  }

  try {
    const result = await repository.createForInProgressBooking({
      bookingId,
      diagnosisNotes: diagnosisNotes || null,
      workPerformed,
      laborCost,
      parts: Array.from(aggregated.entries()).map(([partId, quantity]) => ({ partId, quantity })),
    })
    if ('serviceId' in result) return { success: true, serviceId: result.serviceId }
    const messages = {
      not_found: 'Booking not found.',
      invalid_state: 'Only in-progress bookings can be recorded as completed.',
      invalid_part: 'One or more selected parts are no longer available.',
      insufficient_stock: 'There is not enough inventory for the selected parts.',
      already_recorded: 'A service record already exists for this booking.',
    } as const
    return { success: false, reason: result.reason, error: messages[result.reason] }
  } catch {
    return { success: false, reason: 'error', error: 'Service could not be recorded. Please try again.' }
  }
}

export function canViewServiceRecords(actor: ServiceRecordActor) {
  return Boolean(actor && Number.isSafeInteger(actor.id) && actor.id > 0 &&
    [UserRole.CUSTOMER, UserRole.FLEET_MANAGER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN].includes(actor.role))
}

export function serviceRecordBookingStatusForCreation(status: BookingStatus) {
  return status === BookingStatus.IN_PROGRESS
}
