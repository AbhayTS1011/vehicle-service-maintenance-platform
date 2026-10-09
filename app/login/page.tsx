// =====================================================================
// Login Page - Vehicle Service & Maintenance Platform
// =====================================================================

'use client'

import { useState as useReactState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginUser } from '../../lib/auth/actions'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useReactState('')
  const [password, setPassword] = useReactState('')
  const [error, setError] = useReactState('')
  const [loading, setLoading] = useReactState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await loginUser({ email, password })
    setLoading(false)

    if (res.success) {
      router.push('/dashboard')
    } else {
      setError(res.error || 'Login failed')
    }
  }

  return (
    <main className="main-hero">
      <div className="card" style={{ maxWidth: '28rem', width: '100%', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#60a5fa', textAlign: 'center' }}>
          Sign In to Apex Auto
        </h2>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#f87171', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              placeholder="provider@apexautocare.com"
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

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#2563eb', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', marginTop: '1rem' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
            Register here
          </Link>
        </p>
      </div>
    </main>
  )
}
