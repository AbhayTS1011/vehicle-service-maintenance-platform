const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  notificationEvents,
  readSmtpConfiguration,
  renderNotificationEmail,
  resetEmailTransportForTests,
  sendNotificationEmail,
} = require('./email.ts')

const config = {
  SMTP_HOST: 'mail.example.test', SMTP_PORT: '587', SMTP_SECURE: 'false',
  SMTP_USER: 'mailer@example.test', SMTP_PASSWORD: 'test-only-secret', SMTP_FROM: 'service@example.test',
}
const context = { recipientName: '<Customer>', bookingId: 42, serviceName: 'Oil & filter', scheduledDate: new Date('2026-10-13T12:30:00Z') }

test('optional SMTP config is distinguished from partial or malformed configuration', () => {
  assert.deepEqual(readSmtpConfiguration({}), { configured: false, reason: 'not_configured' })
  assert.deepEqual(readSmtpConfiguration({ SMTP_HOST: 'mail.example.test' }), { configured: false, reason: 'invalid_configuration' })
  assert.deepEqual(readSmtpConfiguration({ ...config, SMTP_PORT: 'not-a-port' }), { configured: false, reason: 'invalid_configuration' })
  const parsed = readSmtpConfiguration(config)
  assert.equal(parsed.configured, true)
  if (parsed.configured) {
    assert.equal(parsed.configuration.secure, false)
    assert.equal(parsed.configuration.password, config.SMTP_PASSWORD)
  }
})

test('every workflow event has a safe subject and usable text and escaped HTML template', () => {
  for (const event of notificationEvents) {
    const details = event === 'invoice_issued' ? { ...context, invoiceNumber: 'INV-42' } : context
    const rendered = renderNotificationEmail(event, details)
    assert.ok(rendered.subject)
    assert.match(rendered.text, /Booking #42/)
    assert.match(rendered.text, /Oil & filter/)
    assert.match(rendered.html, /&lt;Customer&gt;/)
    assert.match(rendered.html, /Oil &amp; filter/)
    assert.doesNotMatch(rendered.html, /<Customer>/)
  }
})

test('mocked SMTP delivery sends recipient, sender and both template alternatives and reuses transport', async () => {
  resetEmailTransportForTests()
  const messages = []
  let transportCount = 0
  const transportFactory = (configuration) => {
    transportCount += 1
    assert.equal(configuration.password, config.SMTP_PASSWORD)
    return { async sendMail(message) { messages.push(message); return { accepted: [message.to] } } }
  }
  assert.deepEqual(await sendNotificationEmail('booking_confirmed', 'customer@example.test', context, { environment: config, transportFactory }), { sent: true })
  assert.deepEqual(await sendNotificationEmail('service_started', 'customer@example.test', context, { environment: config, transportFactory }), { sent: true })
  assert.equal(transportCount, 1)
  assert.equal(messages.length, 2)
  assert.equal(messages[0].to, 'customer@example.test')
  assert.equal(messages[0].from, config.SMTP_FROM)
  assert.match(messages[0].subject, /Booking confirmed/)
  assert.match(messages[0].text, /service booking is confirmed/)
  assert.match(messages[0].html, /service booking is confirmed/)
  assert.equal(messages[1].subject, 'Service started')
  resetEmailTransportForTests()
})

test('missing SMTP config, invalid recipient/template and transport failures return safe outcomes', async () => {
  resetEmailTransportForTests()
  assert.deepEqual(await sendNotificationEmail('booking_requested', 'customer@example.test', context, { environment: {} }), {
    sent: false, reason: 'not_configured',
  })
  assert.deepEqual(await sendNotificationEmail('booking_requested', 'not-an-email', context, { environment: config }), {
    sent: false, reason: 'invalid_recipient',
  })
  assert.deepEqual(await sendNotificationEmail('invoice_issued', 'customer@example.test', context, { environment: config }), {
    sent: false, reason: 'invalid_template_data',
  })
  const failed = await sendNotificationEmail('booking_requested', 'customer@example.test', context, {
    environment: config,
    transportFactory: () => ({ async sendMail() { throw new Error('SMTP password and server response must remain private') } }),
  })
  assert.deepEqual(failed, { sent: false, reason: 'delivery_failed' })
  assert.doesNotMatch(JSON.stringify(failed), /password|server response/)
  resetEmailTransportForTests()
})
