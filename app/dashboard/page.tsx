// =====================================================================
// Dashboard Hub - Vehicle Service Platform
// =====================================================================

import Link from 'next/link'
import { UserRole } from '@prisma/client'
import { logoutUser } from '@/lib/auth/actions'
import { getSessionActor } from '@/lib/admin/session'

export default async function DashboardPage() {
  const actor = await getSessionActor()
  // Middleware handles route protection - no need for client-side auth check
  // The middleware redirects unauthenticated users to /login

  async function handleLogout() {
    'use server'
    await logoutUser()
  }

  return (
    <main className="main-hero" style={{ padding: '3rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <span className="badge">Dashboard Hub</span>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome to Apex Auto</h1>
          <p style={{ color: '#94a3b8' }}>
            Vehicle Service & Maintenance Platform
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <LogoutButton />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'flex-start' }}>
          <div className="card">
            <h3>Vehicle Management</h3>
            <p>Use the navigation below to manage your vehicles.</p>
            <Link href="/dashboard/vehicles" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none' }}>
              My Vehicles
            </Link>
          </div>
          {actor?.role === UserRole.ADMIN ? (
            <div className="card">
              <h3>Administrator overview</h3>
              <p>Review service-center operations, booking status, inventory alerts, invoices, and customer ratings.</p>
              <Link href="/dashboard/admin" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none' }}>
                Open admin dashboard
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

async function handleLogout() {
  'use server'
  await logoutUser()
}

function LogoutButton() {
  return (
    <form onSubmit={handleLogout}>
      <button
        type="submit"
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          backgroundColor: '#ef4444',
          color: 'white',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Sign Out
      </button>
    </form>
  )
}
