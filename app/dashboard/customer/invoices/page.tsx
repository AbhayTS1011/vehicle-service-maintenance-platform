import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { verifyToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { listInvoicesForActor } from '@/lib/invoicing/invoice-service'

const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' })
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export default async function CustomerInvoicesPage() {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) redirect('/login')
  if (payload.role !== UserRole.CUSTOMER && payload.role !== UserRole.FLEET_MANAGER) redirect('/dashboard')

  const result = await listInvoicesForActor(
    { id: payload.userId, role: payload.role },
    db.invoice,
  )

  return (
    <main className="main-hero" style={{ padding: '2rem', textAlign: 'left' }}>
      <section style={{ width: '100%', maxWidth: '1000px' }}>
        <span className="badge">Billing history</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Your invoices</h1>
        <p style={{ marginBottom: '1.5rem' }}>
          <Link href="/dashboard/customer/bookings" style={{ color: '#93c5fd' }}>Back to your bookings</Link>
        </p>
        {!result.success ? (
          <p role="alert">Invoices could not be loaded. Please try again.</p>
        ) : result.invoices.length === 0 ? (
          <p style={{ color: '#cbd5e1' }}>You do not have any invoices yet.</p>
        ) : (
          <ul style={{ display: 'grid', gap: '0.75rem' }}>
            {result.invoices.map((invoice) => (
              <li key={invoice.id} style={{ border: '1px solid #475569', borderRadius: '0.75rem', padding: '1rem' }}>
                <Link href={`/dashboard/invoices/${invoice.id}`} style={{ color: '#93c5fd', textDecoration: 'underline' }}>
                  {invoice.invoiceNumber} · Booking #{invoice.bookingId}
                </Link>
                <p>{invoice.booking.serviceType.name} · {invoice.booking.vehicle.make} {invoice.booking.vehicle.model}</p>
                <p>Total: {money.format(Number(invoice.totalAmount))} · Issued {dateFormat.format(invoice.issuedAt)} · {invoice.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
