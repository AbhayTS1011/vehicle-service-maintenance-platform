import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { verifyToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { IssueInvoiceForm } from './IssueInvoiceForm'

const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export default async function ProviderInvoicesPage() {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) redirect('/login')
  if (payload.role !== UserRole.SERVICE_PROVIDER && payload.role !== UserRole.ADMIN) redirect('/dashboard')

  let candidates: Awaited<ReturnType<typeof db.invoice.findCompletedWithoutInvoice>> = []
  let invoices: Awaited<ReturnType<typeof db.invoice.findManyForActor>> = []
  let loadError = false
  try {
    ;[candidates, invoices] = await Promise.all([
      db.invoice.findCompletedWithoutInvoice(),
      db.invoice.findManyForActor(),
    ])
  } catch {
    loadError = true
  }

  return (
    <main className="main-hero" style={{ padding: '2rem', textAlign: 'left' }}>
      <section style={{ width: '100%', maxWidth: '1100px' }}>
        <span className="badge">Service provider</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Invoices</h1>
        <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>
          Generate an invoice for a completed service. Totals come from the PostgreSQL invoice calculation function; payment collection is not available.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          <Link href="/dashboard/service-records" style={{ color: '#93c5fd' }}>View service records</Link>
          {' · '}
          <Link href="/dashboard/provider/bookings/in-progress" style={{ color: '#93c5fd' }}>View bookings</Link>
        </p>
        {loadError ? (
          <p role="alert">Invoices could not be loaded. Please try again.</p>
        ) : (
          <>
            <h2 style={{ fontSize: '1.35rem', margin: '1.5rem 0 0.75rem' }}>Completed services awaiting an invoice</h2>
            {candidates.length === 0 ? <p>No completed services are awaiting an invoice.</p> : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {candidates.map((booking) => (
                  <article key={booking.id} style={{ border: '1px solid #475569', borderRadius: '0.75rem', padding: '1rem' }}>
                    <h3>Booking #{booking.id} · {booking.serviceType.name}</h3>
                    <p>{booking.customer.name} · {booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.licensePlate})</p>
                    <p>Scheduled {dateFormat.format(booking.scheduledDate)}</p>
                    <p>Labor {money.format(Number(booking.service?.laborCost ?? 0))} · {booking.service?.serviceParts.length ?? 0} consumed part line(s)</p>
                    <IssueInvoiceForm bookingId={booking.id} />
                  </article>
                ))}
              </div>
            )}

            <h2 style={{ fontSize: '1.35rem', margin: '2rem 0 0.75rem' }}>Issued invoices</h2>
            {invoices.length === 0 ? <p>No invoices have been issued.</p> : (
              <ul style={{ display: 'grid', gap: '0.5rem' }}>
                {invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link href={`/dashboard/invoices/${invoice.id}`} style={{ color: '#93c5fd', textDecoration: 'underline' }}>
                      {invoice.invoiceNumber} · Booking #{invoice.bookingId} · {money.format(Number(invoice.totalAmount))}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  )
}
