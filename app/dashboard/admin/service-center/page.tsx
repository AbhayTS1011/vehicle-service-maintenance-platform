// =====================================================================
// Service Center Management Page - Admin Dashboard
// =====================================================================

import { getCurrentUserFromHeaders } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function ServiceCenterPage() {
  // Middleware handles authentication - redirect if not admin
  // In a full implementation, this would check the user's role
  // For now, we'll show the page and rely on the existing auth flow

  const serviceCenter = {
    id: 1,
    name: "Apex Auto Care Center",
    address: "123 Mechanic Street, Auto City, AC 12345",
    phone: "+1-555-0199",
    email: "support@apexautocare.com",
    operatingHours: "Mon-Sat 8:00 AM - 6:00 PM",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <span className="badge">Service Center Management</span>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Service Center Information</h1>
          <p style={{ color: '#94a3b8' }}>
            Manage the service center details below.
          </p>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ color: '#60a5fa', marginBottom: '0.5rem' }}>Name</h3>
              <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>{serviceCenter.name}</p>
            </div>
            <div>
              <h3 style={{ color: '#60a5fa', marginBottom: '0.5rem' }}>Email</h3>
              <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>{serviceCenter.email}</p>
            </div>
          </div>
          <div>
            <h3 style={{ color: '#60a5fa', marginBottom: '0.5rem' }}>Phone</h3>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>{serviceCenter.phone}</p>
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Operating Hours</p>
              <p style={{ color: '#cbd5e1', fontSize: '1rem' }}>{serviceCenter.operatingHours}</p>
            </div>
          </div>
          <div>
            <h3 style={{ color: '#60a5fa', marginBottom: '0.5rem' }}>Address</h3>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>{serviceCenter.address}</p>
          </div>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Service center is configured for single center operation as per project requirements.
          </p>
        </div>
      </div>
    </main>
  )
}