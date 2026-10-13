import { BookingStatus, UserRole } from '@prisma/client'

export type InvoiceActor = { id: number; role: UserRole } | null
export type InvoiceMoney = string | number | { toString(): string }
export type InvoiceView = {
  id: number
  bookingId: number
  invoiceNumber: string
  subtotal: InvoiceMoney
  tax: InvoiceMoney
  totalAmount: InvoiceMoney
  status: string
  issuedAt: Date
  dueDate: Date
  booking: {
    id: number
    customer: { name: string; email: string }
    vehicle: { make: string; model: string; licensePlate: string }
    serviceType: { name: string }
    service: null | {
      diagnosisNotes: string | null
      workPerformed: string | null
      laborCost: InvoiceMoney
      completedAt: Date | null
      serviceParts: Array<{ quantity: number; unitPriceAtTime: InvoiceMoney; part: { name: string; partNumber: string } }>
    }
  }
}

export type InvoiceIssueCandidate = {
  id: number
  scheduledDate: Date
  customer: { name: string }
  vehicle: { make: string; model: string; licensePlate: string }
  serviceType: { name: string }
  service: null | { laborCost: InvoiceMoney; serviceParts: Array<{ quantity: number; unitPriceAtTime: InvoiceMoney; part: { name: string } }> }
}

export type InvoiceCreationResult =
  | { success: true; invoiceId: number; invoiceNumber: string }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'invalid_state' | 'missing_service' | 'already_issued' | 'error'; error: string }

export type InvoiceRepository = {
  issueForCompletedBooking: (bookingId: number, issuedAt: Date) => Promise<
    { invoiceId: number; invoiceNumber: string } |
    { reason: 'not_found' | 'invalid_state' | 'missing_service' | 'already_issued' }
  >
  findManyForActor: (customerId?: number) => Promise<InvoiceView[]>
  findForActor: (invoiceId: number, customerId?: number) => Promise<InvoiceView | null>
  findCompletedWithoutInvoice: () => Promise<InvoiceIssueCandidate[]>
}

function parsePositiveId(value: unknown) {
  const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function issueInvoiceForCompletedBooking(
  actor: InvoiceActor,
  rawBookingId: unknown,
  repository: Pick<InvoiceRepository, 'issueForCompletedBooking'>,
  now: () => Date = () => new Date(),
): Promise<InvoiceCreationResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to issue an invoice.' }
  }
  if (actor.role !== UserRole.SERVICE_PROVIDER && actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to issue invoices.' }
  }

  const bookingId = parsePositiveId(rawBookingId)
  if (!bookingId) return { success: false, reason: 'invalid_input', error: 'Choose a valid completed booking.' }

  try {
    const result = await repository.issueForCompletedBooking(bookingId, now())
    if ('invoiceId' in result) return { success: true, ...result }
    const messages = {
      not_found: 'Booking not found.',
      invalid_state: 'Only completed bookings can be invoiced.',
      missing_service: 'A completed service record is required before issuing an invoice.',
      already_issued: 'An invoice has already been issued for this booking.',
    } as const
    return { success: false, reason: result.reason, error: messages[result.reason] }
  } catch {
    return { success: false, reason: 'error', error: 'Invoice could not be issued. Please try again.' }
  }
}

export function invoiceCustomerFilter(actor: InvoiceActor): number | undefined | null {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) return null
  if (actor.role === UserRole.CUSTOMER || actor.role === UserRole.FLEET_MANAGER) return actor.id
  if (actor.role === UserRole.SERVICE_PROVIDER || actor.role === UserRole.ADMIN) return undefined
  return null
}

export async function listInvoicesForActor(actor: InvoiceActor, repository: Pick<InvoiceRepository, 'findManyForActor'>) {
  const customerId = invoiceCustomerFilter(actor)
  if (customerId === null) return { success: false as const, reason: actor ? 'forbidden' as const : 'unauthenticated' as const, invoices: [] }
  try {
    return { success: true as const, invoices: await repository.findManyForActor(customerId) }
  } catch {
    return { success: false as const, reason: 'error' as const, invoices: [] }
  }
}

export async function getInvoiceForActor(
  actor: InvoiceActor,
  rawInvoiceId: unknown,
  repository: Pick<InvoiceRepository, 'findForActor'>,
) {
  const customerId = invoiceCustomerFilter(actor)
  if (customerId === null) return { success: false as const, reason: actor ? 'forbidden' as const : 'unauthenticated' as const, invoice: null }
  const invoiceId = parsePositiveId(rawInvoiceId)
  if (!invoiceId) return { success: false as const, reason: 'invalid_input' as const, invoice: null }
  try {
    const invoice = await repository.findForActor(invoiceId, customerId)
    return invoice ? { success: true as const, invoice } : { success: false as const, reason: 'not_found' as const, invoice: null }
  } catch {
    return { success: false as const, reason: 'error' as const, invoice: null }
  }
}

export function invoiceEligibleBookingStatus(status: BookingStatus) {
  return status === BookingStatus.COMPLETED
}
