import Link from 'next/link'
import { UserRole } from '@prisma/client'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getSessionActor } from '@/lib/admin/session'
import { readAdminDashboard } from '@/lib/admin/dashboard'

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="card" style={{ minWidth: 0 }}>
      <p style={{ color: '#94a3b8', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>{value}</p>
      {detail ? <p style={{ color: '#94a3b8', margin: 0, fontSize: '.9rem' }}>{detail}</p> : null}
    </article>
  )
}

export default async function AdminDashboardPage() {
  const actor = await getSessionActor()
  if (!actor) redirect('/login')
  if (actor.role !== UserRole.ADMIN) redirect('/dashboard')

  const result = await readAdminDashboard(actor, db.adminDashboard)

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <section style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', textAlign: 'left' }}>
        <span className="badge">Administrator overview</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0 .5rem' }}>Service center dashboard</h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          {result.success ? result.value.serviceCenterName : 'Operational summary'}
        </p>

        <nav aria-label="Admin operations" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <Link href="/dashboard/admin/service-center">Service center</Link>
          <Link href="/dashboard/admin/service-center/schedule">Schedule settings</Link>
          <Link href="/dashboard/admin/mechanics">Mechanics</Link>
          <Link href="/dashboard/provider/bookings">Booking queue</Link>
        </nav>

        {!result.success ? (
          <p role="alert">{result.error}</p>
        ) : (
          <>
            <section aria-label="Operational metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              <Metric label="Bookings" value={result.value.bookings.total} detail={`${result.value.bookings.byStatus.PENDING} pending · ${result.value.bookings.byStatus.CONFIRMED} confirmed · ${result.value.bookings.byStatus.IN_PROGRESS} in progress`} />
              <Metric label="Active mechanics" value={`${result.value.mechanics.active} / ${result.value.mechanics.total}`} detail="Active / total at this center" />
              <Metric label="Low-stock parts" value={result.value.lowStockParts} detail="Stock at or below reorder threshold" />
              <Metric label="Paid invoices" value={result.value.invoices.paidCount} detail={`Total: ₹${result.value.invoices.paidAmount}`} />
              <Metric label="Unpaid invoices" value={result.value.invoices.unpaidCount} detail={`Outstanding: ₹${result.value.invoices.unpaidAmount}`} />
              <Metric label="Customer reviews" value={result.value.reviews.count} detail={result.value.reviews.averageRating === null ? 'No ratings yet' : `Average rating: ${result.value.reviews.averageRating.toFixed(1)} / 5`} />
            </section>

            <section aria-labelledby="booking-status-heading" style={{ marginTop: '2rem' }}>
              <h2 id="booking-status-heading" style={{ fontSize: '1.25rem' }}>Booking status</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem' }}>
                {Object.entries(result.value.bookings.byStatus).map(([status, count]) => (
                  <span className="badge" key={status}>{status.replaceAll('_', ' ')}: {count}</span>
                ))}
              </div>
            </section>

            <section aria-labelledby="recent-bookings-heading" style={{ marginTop: '2rem' }}>
              <h2 id="recent-bookings-heading" style={{ fontSize: '1.25rem' }}>Recently scheduled bookings</h2>
              {result.value.recentBookings.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>No bookings have been recorded yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                    <caption className="sr-only">Most recently scheduled bookings for this service center</caption>
                    <thead><tr><th scope="col">Booking</th><th scope="col">Service</th><th scope="col">Scheduled</th><th scope="col">Status</th></tr></thead>
                    <tbody>
                      {result.value.recentBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td style={{ padding: '.75rem' }}>#{booking.id}</td>
                          <td style={{ padding: '.75rem' }}>{booking.serviceType.name}</td>
                          <td style={{ padding: '.75rem' }}>{booking.scheduledDate.toLocaleString()}</td>
                          <td style={{ padding: '.75rem' }}>{booking.status.replaceAll('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}
