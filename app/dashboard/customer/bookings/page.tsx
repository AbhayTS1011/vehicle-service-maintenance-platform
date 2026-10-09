import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { verifyToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { listCustomerBookings } from '@/lib/booking/booking-service'

const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default async function CustomerBookingsPage() {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload?.userId) redirect('/login')
  if (payload.role !== UserRole.CUSTOMER && payload.role !== UserRole.FLEET_MANAGER) redirect('/dashboard')

  const result = await listCustomerBookings(
    { id: payload.userId, role: payload.role },
    { findForCustomer: (customerId) => db.booking.findManyForCustomer(customerId) },
  )

  return (
    <main className="main-hero" style={{ padding: '2rem', textAlign: 'left' }}>
      <section style={{ width: '100%', maxWidth: '1000px' }}>
        <span className="badge">Service history</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Your bookings</h1>
        {!result.success ? (
          <p role="alert">{result.error}</p>
        ) : result.bookings.length === 0 ? (
          <div>
            <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>You have no bookings yet.</p>
            <Link href="/dashboard/customer/bookings/new" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
              Request a service
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="Your service bookings" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead>
                <tr>
                  {['Reference', 'Vehicle', 'Service', 'Requested for', 'Status', 'Requested on', 'Details'].map((heading) => (
                    <th key={heading} scope="col" style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #475569', color: '#cbd5e1' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>#{booking.id}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>
                      {booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.licensePlate})
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{booking.serviceType.name}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{dateTime.format(booking.scheduledDate)}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{booking.status.replaceAll('_', ' ')}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{dateTime.format(booking.createdAt)}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>
                      <Link href={`/dashboard/customer/bookings/${booking.id}`} style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
