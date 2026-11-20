import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { getCustomerVehicle } from '@/lib/vehicles/vehicle-service'
import { getVehicleActor } from '@/lib/vehicles/server-session'

export default async function VehicleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getVehicleActor()
  if (!actor) redirect('/login')
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) redirect('/dashboard')
  const { id } = await params
  const result = await getCustomerVehicle(actor, id, db.vehicle)
  if (!result.success && result.reason === 'not_found') notFound()
  if (!result.success) return <main className="main-hero" style={{ padding: '2rem' }}><p role="alert">{result.error}</p></main>
  const vehicle = result.value
  return <main className="main-hero" style={{ padding: '2rem' }}><section style={{ maxWidth: 650, margin: '0 auto' }}>
    <span className="badge">Vehicle details</span><h1 style={{ margin: '1rem 0' }}>{vehicle.year} {vehicle.make} {vehicle.model}</h1>
    <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.75rem 1.5rem' }}>
      <dt>License plate</dt><dd>{vehicle.licensePlate}</dd><dt>VIN</dt><dd>{vehicle.vin || 'Not provided'}</dd><dt>Mileage</dt><dd>{vehicle.mileage ?? 0}</dd>
    </dl>
    <p style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}><Link href={`/dashboard/customer/vehicles/${vehicle.id}/edit`}>Edit vehicle</Link><Link href="/dashboard/customer/vehicles">Back to vehicles</Link></p>
  </section></main>
}
