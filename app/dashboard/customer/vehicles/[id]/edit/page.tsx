import { notFound, redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { getCustomerVehicle } from '@/lib/vehicles/vehicle-service'
import { getVehicleActor } from '@/lib/vehicles/server-session'
import VehicleForm from '../../VehicleForm'

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getVehicleActor()
  if (!actor) redirect('/login')
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) redirect('/dashboard')
  const { id } = await params
  const result = await getCustomerVehicle(actor, id, db.vehicle)
  if (!result.success && result.reason === 'not_found') notFound()
  if (!result.success) return <main className="main-hero" style={{ padding: '2rem' }}><p role="alert">{result.error}</p></main>
  return <main className="main-hero" style={{ padding: '2rem' }}><section style={{ maxWidth: 520, margin: '0 auto' }}>
    <span className="badge">Vehicle management</span><h1 style={{ margin: '1rem 0' }}>Edit vehicle</h1><VehicleForm vehicle={result.value} />
  </section></main>
}
