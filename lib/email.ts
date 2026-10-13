import nodemailer from 'nodemailer'

export const notificationEvents = [
  'booking_requested',
  'booking_confirmed',
  'booking_rejected',
  'booking_cancelled',
  'service_started',
  'service_completed',
  'invoice_issued',
] as const

export type NotificationEvent = typeof notificationEvents[number]

export type NotificationEmailContext = {
  recipientName: string
  bookingId: number
  serviceName: string
  scheduledDate: Date
  invoiceNumber?: string
}

export type EmailDeliveryResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'invalid_configuration' | 'invalid_recipient' | 'invalid_template_data' | 'delivery_failed' }

export type EmailMessage = { from: string; to: string; subject: string; text: string; html: string }
export type EmailTransport = { sendMail: (message: EmailMessage) => Promise<unknown> }
export type SmtpConfiguration = { host: string; port: number; secure: boolean; user: string; password: string; from: string }
export type EmailEnvironment = Record<string, string | undefined>
export type TransportFactory = (configuration: SmtpConfiguration) => EmailTransport

const validEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
let cachedTransport: { key: string; transport: EmailTransport } | null = null

export function readSmtpConfiguration(environment: EmailEnvironment):
  | { configured: true; configuration: SmtpConfiguration }
  | { configured: false; reason: 'not_configured' | 'invalid_configuration' } {
  const required = [environment.SMTP_HOST, environment.SMTP_PORT, environment.SMTP_USER, environment.SMTP_PASSWORD, environment.SMTP_FROM]
  if (required.every((value) => !value?.trim())) return { configured: false, reason: 'not_configured' }
  if (required.some((value) => !value?.trim())) return { configured: false, reason: 'invalid_configuration' }

  const port = Number(environment.SMTP_PORT)
  const secureValue = environment.SMTP_SECURE?.trim().toLowerCase()
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-z0-9.-]+$/i.test(environment.SMTP_HOST!.trim()) ||
      /[\r\n]/.test(environment.SMTP_USER!) || environment.SMTP_USER!.length > 512 || !validEmail.test(environment.SMTP_FROM!.trim()) ||
      (secureValue && secureValue !== 'true' && secureValue !== 'false')) {
    return { configured: false, reason: 'invalid_configuration' }
  }

  return {
    configured: true,
    configuration: {
      host: environment.SMTP_HOST!.trim(),
      port,
      secure: secureValue ? secureValue === 'true' : port === 465,
      user: environment.SMTP_USER!.trim(),
      password: environment.SMTP_PASSWORD!,
      from: environment.SMTP_FROM!.trim(),
    },
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

function eventCopy(event: NotificationEvent) {
  const copy = {
    booking_requested: ['Booking request received', 'Your service booking request has been received.'],
    booking_confirmed: ['Booking confirmed', 'Your service booking is confirmed.'],
    booking_rejected: ['Booking update', 'The service center could not accept your booking request.'],
    booking_cancelled: ['Booking cancelled', 'Your pending service booking has been cancelled.'],
    service_started: ['Service started', 'Work on your vehicle has started.'],
    service_completed: ['Service completed', 'The service work for your vehicle is complete.'],
    invoice_issued: ['Invoice issued', 'An invoice has been issued for your completed service.'],
  } satisfies Record<NotificationEvent, [string, string]>
  return copy[event]
}

export function renderNotificationEmail(event: NotificationEvent, context: NotificationEmailContext) {
  const [subject, introduction] = eventCopy(event)
  const date = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
  }).format(context.scheduledDate)
  const bookingLine = `Booking #${context.bookingId}`
  const invoiceLine = event === 'invoice_issued' ? `Invoice ${context.invoiceNumber}` : ''
  const text = [
    `Hello ${context.recipientName},`, '', introduction, bookingLine,
    `Service: ${context.serviceName}`, `Scheduled: ${date}`, invoiceLine, '',
    'Vehicle Service & Maintenance Platform',
  ].filter(Boolean).join('\n')
  const html = `<!doctype html><html><body><main><p>Hello ${escapeHtml(context.recipientName)},</p><p>${escapeHtml(introduction)}</p><ul><li>${bookingLine}</li><li>Service: ${escapeHtml(context.serviceName)}</li><li>Scheduled: ${escapeHtml(date)} UTC</li>${invoiceLine ? `<li>${escapeHtml(invoiceLine)}</li>` : ''}</ul><p>Vehicle Service &amp; Maintenance Platform</p></main></body></html>`
  return { subject, text, html }
}

function createNodemailerTransport(configuration: SmtpConfiguration): EmailTransport {
  const transport = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    auth: { user: configuration.user, pass: configuration.password },
  })
  return { sendMail: (message) => transport.sendMail(message) }
}

export async function sendNotificationEmail(
  event: NotificationEvent,
  recipient: string,
  context: NotificationEmailContext,
  options: { environment?: EmailEnvironment; transportFactory?: TransportFactory } = {},
): Promise<EmailDeliveryResult> {
  if (typeof recipient !== 'string' || !validEmail.test(recipient.trim())) return { sent: false, reason: 'invalid_recipient' }
  if (!context || !Number.isSafeInteger(context.bookingId) || context.bookingId <= 0 ||
      typeof context.recipientName !== 'string' || !context.recipientName.trim() || context.recipientName.length > 200 ||
      typeof context.serviceName !== 'string' || !context.serviceName.trim() || context.serviceName.length > 200 ||
      !(context.scheduledDate instanceof Date) || Number.isNaN(context.scheduledDate.getTime()) ||
      (event === 'invoice_issued' && (typeof context.invoiceNumber !== 'string' || !/^INV-\d+$/.test(context.invoiceNumber)))) {
    return { sent: false, reason: 'invalid_template_data' }
  }
  const smtp = readSmtpConfiguration(options.environment ?? process.env)
  if (!smtp.configured) return { sent: false, reason: smtp.reason }

  const key = JSON.stringify(smtp.configuration)
  try {
    if (!cachedTransport || cachedTransport.key !== key) {
      cachedTransport = { key, transport: (options.transportFactory ?? createNodemailerTransport)(smtp.configuration) }
    }
    const template = renderNotificationEmail(event, context)
    await cachedTransport.transport.sendMail({ from: smtp.configuration.from, to: recipient.trim(), ...template })
    return { sent: true }
  } catch {
    return { sent: false, reason: 'delivery_failed' }
  }
}

/** Test-only reset; never closes or logs transport credentials. */
export function resetEmailTransportForTests() {
  cachedTransport = null
}
