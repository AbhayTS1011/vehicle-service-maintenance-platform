import { BookingStatus, UserRole } from '@prisma/client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth/jwt'
import { listProviderInProgressBookings } from '@/lib/booking/booking-service'
import type { ServiceCompletionInventoryPart } from '@/lib/service-records/service-record-service'
import { CompleteServiceForm } from './CompleteServiceForm'

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export default async function ProviderInProgressBookingsPage() {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) redirect('/login')
  if (payload.role !== UserRole.SERVICE_PROVIDER && payload.role !== UserRole.ADMIN) redirect('/dashboard')

  const result = await listProviderInProgressBookings(
    { id: payload.userId, role: payload.role },
    { findInProgress: (query) => db.booking.findInProgressProviderBookings(query) },
  )
  let inventory: ServiceCompletionInventoryPart[] = []
  let inventoryError = false
  if (result.success) {
    try {
      inventory = await db.part.findAvailableInventory()
    } catch {
      inventoryError = true
    }
  }

  return (
    <main className="main-hero" style={{ padding: '2rem', textAlign: 'left' }}>
      <section style={{ width: '100%', maxWidth: '1100px' }}>
        <span className="badge">Service provider</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>In-progress bookings</h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          Record the work and parts consumed to complete an in-progress booking. Inventory is deducted in the same database transaction.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          <a href="/dashboard/provider/bookings/confirmed" style={{ color: '#93c5fd' }}>View confirmed bookings</a>
          {' · '}
          <a href="/dashboard/service-records" style={{ color: '#93c5fd' }}>View service records</a>
          {' · '}
          <a href="/dashboard/provider/invoices" style={{ color: '#93c5fd' }}>Manage invoices</a>
        </p>
        {!result.success ? (
          <p role="alert">{result.error}</p>
        ) : result.bookings.length === 0 ? (
          <p style={{ color: '#cbd5e1' }}>There are no in-progress bookings.</p>
        ) : (
          <>
          {inventoryError && <p role="alert">Parts inventory could not be loaded, so service completion is temporarily unavailable.</p>}
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="In-progress service bookings" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
              <thead>
                <tr>
                  {['Reference', 'Customer', 'Vehicle', 'Service', 'Scheduled for', 'Status', 'Mechanic', 'Action'].map((heading) => (
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
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>
                      {booking.status === BookingStatus.IN_PROGRESS ? 'In progress' : booking.status.replaceAll('_', ' ')}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>{booking.mechanic?.name ?? 'Unassigned'}</td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>
                      {inventoryError ? <span>Unable to load inventory.</span> : <CompleteServiceForm bookingId={booking.id} parts={inventory} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </main>
  )
}
