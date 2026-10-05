// =====================================================================
// Mechanic Management Page - Admin Dashboard
// =====================================================================

import { getCurrentUserFromHeaders } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function MechanicManagementPage() {
  const mechanics = [
    {
      id: 1,
      name: 'John Smith',
      specialization: 'General Repair',
      phone: '+1-555-0123',
      isActive: true,
    },
    {
      id: 2,
      name: 'Maria Garcia',
      specialization: 'Electrical',
      phone: '+1-555-0124',
      isActive: true,
    },
  ]

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <span className="badge">Mechanic Management</span>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Mechanics</h1>
          <p style={{ color: '#94a3b8' }}>
            Manage service center mechanics below.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <a href="/dashboard/admin/mechanics/new" style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', fontSize: '0.875rem' }}>
            Add Mechanic
          </a>
        </div>

        <p>Total mechanics: {mechanics.length}</p>
      </div>
    </main>
  )
}