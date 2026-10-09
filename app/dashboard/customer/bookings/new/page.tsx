import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth/jwt'
import BookingForm from './BookingForm'

export default async function NewBookingPage() {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload?.userId) redirect('/login')
  if (payload.role !== UserRole.CUSTOMER && payload.role !== UserRole.FLEET_MANAGER) redirect('/dashboard')

  let vehicles: Awaited<ReturnType<typeof db.bookingCatalog.vehiclesForCustomer>> = []
  let serviceTypes: Awaited<ReturnType<typeof db.bookingCatalog.serviceTypes>> = []
  let unavailable = false
  try {
    ;[vehicles, serviceTypes] = await Promise.all([
      db.bookingCatalog.vehiclesForCustomer(payload.userId),
      db.bookingCatalog.serviceTypes(),
    ])
  } catch {
    unavailable = true
  }

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <span className="badge">Service booking</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Request a service</h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          Choose one of your vehicles and a service. Your request will begin as pending.
        </p>
        {unavailable ? (
          <p role="alert">Booking options are unavailable right now. Please try again later.</p>
        ) : (
          <BookingForm vehicles={vehicles} serviceTypes={serviceTypes} />
        )}
      </div>
    </main>
  )
}
