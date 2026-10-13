import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { verifyToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { getInvoiceForActor } from '@/lib/invoicing/invoice-service'

const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, cookieStore] = await Promise.all([params, cookies()])
  const token = cookieStore.get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) redirect('/login')
  const actor = { id: payload.userId, role: payload.role as UserRole }
  const result = await getInvoiceForActor(actor, id, db.invoice)
  if (!result.success && result.reason === 'forbidden') redirect('/dashboard')
  if (!result.success && result.reason === 'not_found') notFound()

  const backHref = actor.role === UserRole.CUSTOMER || actor.role === UserRole.FLEET_MANAGER
    ? '/dashboard/customer/invoices'
    : '/dashboard/provider/invoices'
  if (!result.success) {
    return <main className="main-hero" style={{ padding: '2rem' }}><p role="alert">Invoice could not be loaded. Please try again.</p></main>
  }
  const invoice = result.invoice
  const service = invoice.booking.service

  return (
    <main className="main-hero" style={{ padding: '2rem', textAlign: 'left' }}>
      <article style={{ width: '100%', maxWidth: '850px', margin: '0 auto', border: '1px solid #475569', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <p><Link href={backHref} style={{ color: '#93c5fd' }}>Back to invoices</Link></p>
        <span className="badge">Invoice</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>{invoice.invoiceNumber}</h1>
        <p>Booking #{invoice.booking.id} · {invoice.status}</p>
        <p>Issued {dateFormat.format(invoice.issuedAt)} · Due {dateFormat.format(invoice.dueDate)}</p>
        <hr style={{ margin: '1rem 0', borderColor: '#475569' }} />
        <h2 style={{ fontSize: '1.25rem' }}>Service details</h2>
        <p>{invoice.booking.customer.name} · {invoice.booking.customer.email}</p>
        <p>{invoice.booking.vehicle.make} {invoice.booking.vehicle.model} ({invoice.booking.vehicle.licensePlate})</p>
        <p>{invoice.booking.serviceType.name}{service?.completedAt ? ` · Completed ${dateFormat.format(service.completedAt)}` : ''}</p>
        {service?.diagnosisNotes && <p>Diagnosis: {service.diagnosisNotes}</p>}
        {service?.workPerformed && <p>Work performed: {service.workPerformed}</p>}

        <h2 style={{ fontSize: '1.25rem', marginTop: '1.25rem' }}>Charges</h2>
        <table aria-label="Invoice charges" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Description</th><th scope="col" style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            <tr><td>Labor</td><td style={{ textAlign: 'right' }}>{money.format(Number(service?.laborCost ?? 0))}</td></tr>
            {service?.serviceParts.map((part, index) => (
              <tr key={`${part.part.partNumber}-${index}`}>
                <td>{part.part.name} ({part.part.partNumber}) × {part.quantity} @ {money.format(Number(part.unitPriceAtTime))}</td>
                <td style={{ textAlign: 'right' }}>{money.format(part.quantity * Number(part.unitPriceAtTime))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th scope="row" style={{ textAlign: 'right' }}>Subtotal</th><td style={{ textAlign: 'right' }}>{money.format(Number(invoice.subtotal))}</td></tr>
            <tr><th scope="row" style={{ textAlign: 'right' }}>Tax</th><td style={{ textAlign: 'right' }}>{money.format(Number(invoice.tax))}</td></tr>
            <tr><th scope="row" style={{ textAlign: 'right' }}>Total</th><td style={{ textAlign: 'right' }}>{money.format(Number(invoice.totalAmount))}</td></tr>
          </tfoot>
        </table>
        <p style={{ color: '#cbd5e1', marginTop: '1rem' }}>Payment collection is not available in this phase.</p>
      </article>
    </main>
  )
}
