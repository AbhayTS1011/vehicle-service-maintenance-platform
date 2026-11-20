import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { listCustomerVehicles } from '@/lib/vehicles/vehicle-service'
import { getVehicleActor } from '@/lib/vehicles/server-session'
import DeleteVehicleButton from './DeleteVehicleButton'

export default async function VehicleListPage() {
  const actor = await getVehicleActor()
  if (!actor) redirect('/login')
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) redirect('/dashboard')
  const result = await listCustomerVehicles(actor, db.vehicle)

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <section style={{ maxWidth: 1100, margin: '0 auto' }}>
        <span className="badge">My Vehicles</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>My vehicles</h1>
        <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>Manage vehicles linked to your account.</p>
        <Link href="/dashboard/customer/vehicles/new" style={{ display: 'inline-block', marginBottom: '1.5rem', color: '#93c5fd' }}>Add vehicle</Link>
        {!result.success ? <p role="alert">{result.error}</p> : result.value.length === 0 ? (
          <p>You have no vehicles yet. Add a vehicle to request a service.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="Your vehicles" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead><tr>{['License plate', 'Vehicle', 'Year', 'Mileage', 'Actions'].map((item) => <th key={item} scope="col" style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #475569' }}>{item}</th>)}</tr></thead>
              <tbody>{result.value.map((vehicle) => <tr key={vehicle.id}>
                <td style={{ padding: '0.75rem' }}>{vehicle.licensePlate}</td>
                <td style={{ padding: '0.75rem' }}>{vehicle.make} {vehicle.model}</td>
                <td style={{ padding: '0.75rem' }}>{vehicle.year}</td>
                <td style={{ padding: '0.75rem' }}>{vehicle.mileage ?? 0}</td>
                <td style={{ padding: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                  <Link href={`/dashboard/customer/vehicles/${vehicle.id}`}>View</Link>
                  <Link href={`/dashboard/customer/vehicles/${vehicle.id}/edit`}>Edit</Link>
                  <DeleteVehicleButton id={vehicle.id} />
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
