import { BookingStatus } from '@prisma/client'
import { sendNotificationEmail, type EmailDeliveryResult, type NotificationEvent } from './email'

export type BookingEmailContext = {
  id: number
  status: BookingStatus
  scheduledDate: Date
  customer: { name: string; email: string }
  serviceType: { name: string }
}

export type InvoiceEmailContext = {
  invoiceNumber: string
  booking: BookingEmailContext
}

export type WorkflowEmailRepository = {
  findBookingEmailContext: (bookingId: number) => Promise<BookingEmailContext | null>
  findInvoiceEmailContext: (invoiceId: number) => Promise<InvoiceEmailContext | null>
}

export type EmailSender = typeof sendNotificationEmail

const eventStatus: Partial<Record<NotificationEvent, BookingStatus>> = {
  booking_requested: BookingStatus.PENDING,
  booking_confirmed: BookingStatus.CONFIRMED,
  booking_rejected: BookingStatus.REJECTED,
  booking_cancelled: BookingStatus.CANCELLED,
  service_started: BookingStatus.IN_PROGRESS,
  service_completed: BookingStatus.COMPLETED,
}

function parsePositiveId(value: unknown) {
  const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function sendBookingWorkflowEmail(
  event: Exclude<NotificationEvent, 'invoice_issued'>,
  rawBookingId: unknown,
  repository: Pick<WorkflowEmailRepository, 'findBookingEmailContext'>,
  sender: EmailSender = sendNotificationEmail,
): Promise<EmailDeliveryResult> {
  const bookingId = parsePositiveId(rawBookingId)
  if (!bookingId) return { sent: false, reason: 'invalid_template_data' }
  try {
    const booking = await repository.findBookingEmailContext(bookingId)
    if (!booking || booking.id !== bookingId || booking.status !== eventStatus[event]) {
      return { sent: false, reason: 'invalid_template_data' }
    }
    return await sender(event, booking.customer.email, {
      recipientName: booking.customer.name,
      bookingId: booking.id,
      serviceName: booking.serviceType.name,
      scheduledDate: booking.scheduledDate,
    })
  } catch {
    return { sent: false, reason: 'delivery_failed' }
  }
}

export async function sendInvoiceWorkflowEmail(
  rawInvoiceId: unknown,
  repository: Pick<WorkflowEmailRepository, 'findInvoiceEmailContext'>,
  sender: EmailSender = sendNotificationEmail,
): Promise<EmailDeliveryResult> {
  const invoiceId = parsePositiveId(rawInvoiceId)
  if (!invoiceId) return { sent: false, reason: 'invalid_template_data' }
  try {
    const invoice = await repository.findInvoiceEmailContext(invoiceId)
    if (!invoice || invoice.booking.status !== BookingStatus.INVOICED) return { sent: false, reason: 'invalid_template_data' }
    return await sender('invoice_issued', invoice.booking.customer.email, {
      recipientName: invoice.booking.customer.name,
      bookingId: invoice.booking.id,
      serviceName: invoice.booking.serviceType.name,
      scheduledDate: invoice.booking.scheduledDate,
      invoiceNumber: invoice.invoiceNumber,
    })
  } catch {
    return { sent: false, reason: 'delivery_failed' }
  }
}

export const emailDeliveryWarning = 'The change was saved, but its email notification could not be delivered. Please contact the service center if needed.'

export async function notificationWarning(result: EmailDeliveryResult) {
  return result.sent ? undefined : emailDeliveryWarning
}

export async function notifySuccessfulBookingMutation<T extends { success: boolean }>(
  result: T,
  event: Exclude<NotificationEvent, 'invoice_issued'>,
  bookingId: unknown,
  repository: Pick<WorkflowEmailRepository, 'findBookingEmailContext'>,
  sender: EmailSender = sendNotificationEmail,
): Promise<T & { emailWarning?: string }> {
  if (!result.success) return { ...result }
  const warning = await notificationWarning(await sendBookingWorkflowEmail(event, bookingId, repository, sender))
  return warning ? { ...result, emailWarning: warning } : { ...result }
}

export async function notifySuccessfulInvoiceMutation<T extends { success: boolean }>(
  result: T,
  invoiceId: number | null,
  repository: Pick<WorkflowEmailRepository, 'findInvoiceEmailContext'>,
  sender: EmailSender = sendNotificationEmail,
): Promise<T & { emailWarning?: string }> {
  if (!result.success || invoiceId === null) return { ...result }
  const warning = await notificationWarning(await sendInvoiceWorkflowEmail(invoiceId, repository, sender))
  return warning ? { ...result, emailWarning: warning } : { ...result }
}
