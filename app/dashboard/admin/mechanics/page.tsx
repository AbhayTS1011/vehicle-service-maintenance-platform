import { UserRole } from '@prisma/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSessionActor } from '@/lib/admin/session'
import { listMechanics } from '@/lib/admin/management'
import { MechanicManagementForms } from './MechanicManagementForms'

export default async function MechanicManagementPage() {
  const actor = await getSessionActor()
  if (!actor) redirect('/login')
  if (actor.role !== UserRole.ADMIN) redirect('/dashboard')

  const result = await listMechanics(actor, {
    findCurrentServiceCenterId: () => db.mechanic.findCurrentServiceCenterId(),
    findMany: (serviceCenterId) => db.mechanic.findMany(serviceCenterId),
  })

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <section style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'left' }}>
        <div style={{ marginBottom: '2rem' }}>
          <span className="badge">Mechanic Management</span>
          <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Mechanics</h1>
          <p style={{ color: '#94a3b8' }}>Manage mechanics assigned to the configured service center.</p>
          <p style={{ marginTop: '1rem' }}><Link href="/dashboard/admin/service-center" style={{ color: '#93c5fd' }}>Manage service-center details</Link></p>
        </div>
        {!result.success ? (
          <p role="alert">{result.error}</p>
        ) : (
          <>
            <p>Total mechanics: {result.value.length}</p>
            <MechanicManagementForms mechanics={result.value} />
          </>
        )}
      </section>
    </main>
  )
}
