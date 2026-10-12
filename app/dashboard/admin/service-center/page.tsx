import { UserRole } from '@prisma/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSessionActor } from '@/lib/admin/session'
import { readServiceCenter } from '@/lib/admin/management'
import { ServiceCenterForm } from './ServiceCenterForm'

export default async function ServiceCenterPage() {
  const actor = await getSessionActor()
  if (!actor) redirect('/login')
  if (actor.role !== UserRole.ADMIN) redirect('/dashboard')

  const result = await readServiceCenter(actor, { findCurrent: () => db.serviceCenter.findCurrent() })

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
        <span className="badge">Service Center Management</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Service Center Information</h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          Update the configured service center. Appointment timezone and weekly schedule settings remain on the schedule page.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          <Link href="/dashboard/admin/service-center/schedule" style={{ color: '#93c5fd' }}>
            Configure appointment timezone and weekly hours
          </Link>
        </p>
        {!result.success ? (
          <p role="alert">{result.error}</p>
        ) : (
          <>
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>Service center #{result.value.id} · single-center operation</p>
            <ServiceCenterForm center={result.value} />
          </>
        )}
      </div>
    </main>
  )
}
