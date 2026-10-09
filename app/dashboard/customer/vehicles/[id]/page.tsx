// =====================================================================
// Vehicle Details Page - Vehicle Service Platform
// =====================================================================

import { db } from '@/lib/db'
import Link from 'next/link'

export default async function VehicleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // In a full implementation, this would fetch the vehicle from the database
  // and check ownership via server-side validation
  // For now, display placeholder content

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <span className="badge">Vehicle Details</span>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Vehicle Details</h1>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.5rem' }}>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
            Vehicle details will be displayed here.
          </p>
          <p style={{ color: '#64748b' }}>
            Registration Number: N/A
          </p>
          <p style={{ color: '#64748b' }}>
            Make / Model: -
          </p>
          <p style={{ color: '#64748b' }}>
            Year: -
          </p>
          <p style={{ color: '#64748b' }}>
            Mileage: -
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/dashboard/vehicles" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#6b46c1', color: 'white', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none' }}>
              Back to Vehicles
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
