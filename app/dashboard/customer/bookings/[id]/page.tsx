import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { verifyToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { getCustomerBookingDetails } from '@/lib/booking/booking-service'
import { CancelBookingForm } from '../CancelBookingForm'

const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default async function CustomerBookingDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const token = cookies().get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload?.userId) redirect('/login')
  if (payload.role !== UserRole.CUSTOMER && payload.role !== UserRole.FLEET_MANAGER) redirect('/dashboard')

  const bookingId = Number(params.id)
  const result = await getCustomerBookingDetails(
    { id: payload.userId, role: payload.role },
    bookingId,
    { findForCustomer: (id, customerId) => db.booking.findForCustomerById(id, customerId) },
  )

  if (!result.success && result.reason === 'not_found') notFound()

  return (
    <main className="main-hero" style={{ padding: '2rem', textAlign: 'left' }}>
      <section style={{ width: '100%', maxWidth: '760px' }}>
        <Link href="/dashboard/customer/bookings" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
          Back to bookings
        </Link>
        {!result.success ? (
          <p role="alert" style={{ marginTop: '1.5rem' }}>{result.error}</p>
        ) : (
          <>
            <span className="badge" style={{ display: 'table', marginTop: '1.5rem' }}>Booking details</span>
            <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Booking #{result.booking.id}</h1>
            <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 2fr', gap: '0.9rem 1.5rem', color: '#cbd5e1' }}>
              <dt>Vehicle</dt>
              <dd>{result.booking.vehicle.make} {result.booking.vehicle.model} ({result.booking.vehicle.licensePlate})</dd>
              <dt>Service</dt>
              <dd>{result.booking.serviceType.name}</dd>
              <dt>Requested for</dt>
              <dd>{dateTime.format(result.booking.scheduledDate)}</dd>
              <dt>Status</dt>
              <dd>{result.booking.status.replaceAll('_', ' ')}</dd>
              <dt>Booking created</dt>
              <dd>{dateTime.format(result.booking.createdAt)}</dd>
              {result.booking.notes && (
                <>
                  <dt>Notes</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{result.booking.notes}</dd>
                </>
              )}
              <dt>Service center</dt>
              <dd>
                {result.booking.serviceCenter.name}<br />
                {result.booking.serviceCenter.address}<br />
                {result.booking.serviceCenter.phone}
                {result.booking.serviceCenter.operatingHours && <><br />{result.booking.serviceCenter.operatingHours}</>}
              </dd>
            </dl>
            {result.booking.status === 'PENDING' && <CancelBookingForm bookingId={result.booking.id} />}
          </>
        )}
      </section>
    </main>
  )
}
