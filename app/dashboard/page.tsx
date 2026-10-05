// =====================================================================
// Dashboard Hub - Vehicle Service Platform
// =====================================================================

import Link from 'next/link'
import { logoutUser } from '@/lib/auth/actions'

export default function DashboardPage() {
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

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div className="card">
            <h3>Vehicle Management</h3>
            <p>Use the navigation below to manage your vehicles.</p>
            <Link href="/dashboard/vehicles" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none' }}>
              My Vehicles
            </Link>
          </div>
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