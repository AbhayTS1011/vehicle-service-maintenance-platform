import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth/jwt'
import { ScheduleSettingsForm } from '../ScheduleSettingsForm'

export default async function ServiceCenterSchedulePage() {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) redirect('/login')
  if (payload.role !== UserRole.ADMIN) redirect('/dashboard')

  let settings: Awaited<ReturnType<typeof db.bookingCatalog.schedulingSettings>> = null
  let error = false
  try {
    settings = await db.bookingCatalog.schedulingSettings()
  } catch {
    error = true
  }

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <section style={{ width: '100%', maxWidth: '800px', textAlign: 'left' }}>
        <span className="badge">Appointment configuration</span>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>Service-center schedule</h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          Configure the actual local timezone and one opening window per weekday. Active mechanics determine parallel appointment capacity.
        </p>
        {error ? (
          <p role="alert">Scheduling settings could not be loaded. Apply the booking scheduling migration and try again.</p>
        ) : !settings ? (
          <p role="alert">No service center is configured.</p>
        ) : (
          <>
            <p style={{ marginBottom: '1rem' }}>{settings.name}</p>
            <ScheduleSettingsForm timeZone={settings.timeZone} weeklyHours={settings.weeklyHours} />
          </>
        )}
      </section>
    </main>
  )
}
