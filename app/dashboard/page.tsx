// =====================================================================
// Dashboard Hub - Vehicle Service & Maintenance Platform
// =====================================================================

import { getCurrentUser } from '../../lib/auth/session'
import { redirect } from 'next/navigation'
import { logoutUser } from '../../lib/auth/actions'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  async function handleLogout() {
    'use server'
    await logoutUser()
    redirect('/login')
  }

  return (
    <main className="main-hero" style={{ alignItems: 'flex-start', padding: '3rem' }}>
      <div className="hero-container" style={{ textAlign: 'left', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <span className="badge">Dashboard Hub</span>
            <h1 style={{ fontSize: '2.5rem', marginTop: '0.5rem' }}>Welcome, {user.name}</h1>
            <p style={{ color: '#94a3b8' }}>Role: <strong style={{ color: '#60a5fa' }}>{user.role}</strong> | Email: {user.email}</p>
          </div>
          <form action={handleLogout}>
            <button
              type="submit"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', backgroundColor: '#ef4444', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </form>
        </div>

        <div className="cards-grid" style={{ justifyContent: 'flex-start' }}>
          <div className="card">
            <h3>Role-Based Access Control</h3>
            <p>You are authenticated securely via HTTP-only JWT session cookie with <strong>{user.role}</strong> privileges.</p>
          </div>
          <div className="card">
            <h3>Next Phases Ready</h3>
            <p>Authentication & RBAC infrastructure is fully operational. Vehicle management, bookings, and services will be wired next.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
