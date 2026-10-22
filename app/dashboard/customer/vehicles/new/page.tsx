import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { getVehicleActor } from '@/lib/vehicles/server-session'
import VehicleForm from '../VehicleForm'

export default async function AddVehiclePage() {
  const actor = await getVehicleActor()
  if (!actor) redirect('/login')
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) redirect('/dashboard')
  return <main className="main-hero" style={{ padding: '2rem' }}><section style={{ maxWidth: 520, margin: '0 auto' }}>
    <span className="badge">Vehicle management</span><h1 style={{ margin: '1rem 0' }}>Add a vehicle</h1>
    <VehicleForm />
  </section></main>
}
