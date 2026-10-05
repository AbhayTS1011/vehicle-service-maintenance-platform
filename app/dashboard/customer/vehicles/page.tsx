// =====================================================================
// Vehicle List / Dashboard Page - Vehicle Service Platform
// =====================================================================

import Link from 'next/link'

export default function VehicleListPage() {
  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <span className="badge">My Vehicles</span>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>My Vehicles</h1>
          <p style={{ color: '#94a3b8' }}>
            Manage your vehicle(s) and track service history.
          </p>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Vehicle Management</h3>
          <p>Use the navigation below to add, view, edit, or delete your vehicles.</p>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/dashboard/vehicles/new" style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: '600' }}>
              Add Vehicle
            </Link>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          overflow: 'unset'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155'
          }}>
            <span style={{ fontWeight: '600', color: 'white' }}>Registration</span>
            <span style={{ fontWeight: '600', color: 'white' }}>Make / Model</span>
            <span style={{ fontWeight: '600', color: 'white' }}>Year</span>
            <span style={{ fontWeight: '600', color: 'white' }}>Mileage</span>
            <span style={{ fontWeight: '600', color: 'white' }}>Actions</span>
          </div>

          <div style={{ padding: '1rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Please log in to view your vehicles.
            </p>
            <Link href="/login" style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: '500' }}>
              Login
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link href="/login" style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '0.5rem',
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            Login to Manage Vehicles
          </Link>
        </div>
      </div>
    </main>
  )
}