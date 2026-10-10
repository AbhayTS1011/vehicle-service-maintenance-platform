import { BookingStatus, UserRole } from '@prisma/client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth/jwt'
import { listProviderPendingBookings } from '@/lib/booking/booking-service'

const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default async function ProviderBookingsPage() {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) {
    redirect('/login')
  }
  if (payload.role !== UserRole.SERVICE_PROVIDER && payload.role !== UserRole.ADMIN) {
    redirect('/dashboard')
  }

  const result = await listProviderPendingBookings(
    { id: payload.userId, role: payload.role },
    { findPending: (query) => db.booking.findPendingProviderBookings(query) },
  )

  return (
    <main className="main-hero" style={{ padding: '2rem', textAlign: 'left' }}>
      <section style={{ width: '100%', maxWidth: '1100px' }}>
        <span className="badge">Service provider</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Incoming booking requests</h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          Review customer requests that are waiting for service center review.
        </p>

        {!result.success ? (
          <p role="alert">{result.error}</p>
        ) : result.bookings.length === 0 ? (
          <p style={{ color: '#cbd5e1' }}>There are no pending booking requests.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="Pending service bookings" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
              <thead>
                <tr>
                  {['Reference', 'Customer', 'Vehicle', 'Service', 'Requested for', 'Received', 'Status'].map((heading) => (
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
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{booking.customer.name}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>
                      {booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.licensePlate})
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{booking.serviceType.name}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{dateTime.format(booking.scheduledDate)}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{dateTime.format(booking.createdAt)}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>
                      {booking.status === BookingStatus.PENDING ? 'Pending' : booking.status.replaceAll('_', ' ')}
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
