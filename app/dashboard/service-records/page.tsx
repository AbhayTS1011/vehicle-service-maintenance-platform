import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { verifyToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { canViewServiceRecords } from '@/lib/service-records/service-record-service'

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export default async function ServiceRecordsPage() {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const actor = payload && Number.isSafeInteger(payload.userId) && payload.userId > 0
    ? { id: payload.userId, role: payload.role as UserRole }
    : null
  if (!actor) redirect('/login')
  if (!canViewServiceRecords(actor)) redirect('/dashboard')

  const customerId = actor.role === UserRole.CUSTOMER || actor.role === UserRole.FLEET_MANAGER ? actor.id : undefined
  let records
  try {
    records = await db.serviceRecord.findManyForActor(customerId)
  } catch {
    return <main className="main-hero" style={{ padding: '2rem' }}><p role="alert">Service records could not be loaded. Please try again.</p></main>
  }

  return (
    <main className="main-hero" style={{ padding: '2rem', textAlign: 'left' }}>
      <section style={{ width: '100%', maxWidth: '1000px' }}>
        <span className="badge">Service history</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>
          {customerId === undefined ? 'Service records' : 'Your service records'}
        </h1>
        <p style={{ marginBottom: '1.5rem' }}>
          <Link href={customerId === undefined ? '/dashboard/provider/bookings/in-progress' : '/dashboard/customer/bookings'} style={{ color: '#93c5fd' }}>
            Back to {customerId === undefined ? 'in-progress bookings' : 'your bookings'}
          </Link>
        </p>
        {records.length === 0 ? (
          <p style={{ color: '#cbd5e1' }}>No completed service records are available.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {records.map((record) => (
              <article key={record.id} style={{ border: '1px solid #475569', borderRadius: '0.75rem', padding: '1rem' }}>
                <h2 style={{ fontSize: '1.2rem' }}>Booking #{record.booking.id} · {record.booking.serviceType.name}</h2>
                <p>{record.booking.vehicle.make} {record.booking.vehicle.model} ({record.booking.vehicle.licensePlate})</p>
                {customerId === undefined && <p>Customer: {record.booking.customer.name}</p>}
                <p>Scheduled: {dateTime.format(record.booking.scheduledDate)}</p>
                {record.completedAt && <p>Completed: {dateTime.format(record.completedAt)}</p>}
                <p>Mechanic: {record.mechanic?.name ?? 'Not assigned'}</p>
                {record.diagnosisNotes && <p><strong>Diagnosis:</strong> {record.diagnosisNotes}</p>}
                <p><strong>Work performed:</strong> {record.workPerformed}</p>
                <p><strong>Labor:</strong> {money.format(Number(record.laborCost))}</p>
                {record.serviceParts.length > 0 && (
                  <div>
                    <strong>Parts used</strong>
                    <ul>
                      {record.serviceParts.map((item, index) => (
                        <li key={`${record.id}-${index}`}>
                          {item.part.name} ({item.part.partNumber}) × {item.quantity} at {money.format(Number(item.unitPriceAtTime))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
