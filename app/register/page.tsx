// =====================================================================
// Register Page - Vehicle Service & Maintenance Platform
// =====================================================================

'use client'

import { useState as useReactState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerUser } from '../../lib/auth/actions'
import { UserRole } from '@prisma/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useReactState('')
  const [email, setEmail] = useReactState('')
  const [password, setPassword] = useReactState('')
  const [role, setRole] = useReactState<UserRole>('CUSTOMER')
  const [phone, setPhone] = useReactState('')
  const [error, setError] = useReactState('')
  const [loading, setLoading] = useReactState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await registerUser({ name, email, password, role, phone })
    setLoading(false)

    if (res.success) {
      router.push('/dashboard')
    } else {
      setError(res.error || 'Registration failed')
    }
  }

  return (
    <main className="main-hero">
      <div className="card" style={{ maxWidth: '28rem', width: '100%', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#60a5fa', textAlign: 'center' }}>
          Create Account
        </h2>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#f87171', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
            >
              <option value="CUSTOMER">Customer</option>
              <option value="FLEET_MANAGER">Fleet Manager</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Phone Number (Optional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              placeholder="+1-555-0100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#2563eb', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', marginTop: '1rem' }}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
