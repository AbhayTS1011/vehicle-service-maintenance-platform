'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth/jwt'
import { isValidTimeZone, type WeeklyOpening } from '@/lib/booking/scheduling'

export type ScheduleSettingsResult = { success: boolean; error?: string }

export async function saveSchedulingSettings(_previous: ScheduleSettingsResult | null, formData: FormData): Promise<ScheduleSettingsResult> {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || payload.role !== UserRole.ADMIN || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) {
    return { success: false, error: 'Only an administrator can change service-center scheduling settings.' }
  }

  const timeZone = formData.get('timeZone')
  if (typeof timeZone !== 'string' || !isValidTimeZone(timeZone.trim())) {
    return { success: false, error: 'Enter a valid IANA timezone, such as Asia/Kolkata.' }
  }

  const weeklyHours: WeeklyOpening[] = []
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    if (formData.get(`closed-${dayOfWeek}`) === 'on') continue
    const opensAt = formData.get(`opens-${dayOfWeek}`)
    const closesAt = formData.get(`closes-${dayOfWeek}`)
    const validClock = (value: FormDataEntryValue | null): value is string => {
      if (typeof value !== 'string' || !/^(\d{2}):(\d{2})$/.test(value)) return false
      const [, hour, minute] = /^(\d{2}):(\d{2})$/.exec(value)!
      return Number(hour) <= 23 && Number(minute) <= 59
    }
    if (!validClock(opensAt) || !validClock(closesAt) || opensAt >= closesAt) {
      return { success: false, error: 'For each open day, enter an opening time earlier than its closing time.' }
    }
    weeklyHours.push({ dayOfWeek, opensAt, closesAt })
  }

  try {
    const saved = await db.bookingCatalog.saveSchedulingSettings(timeZone.trim(), weeklyHours)
    if (!saved) return { success: false, error: 'No service center is configured.' }
    revalidatePath('/dashboard/admin/service-center/schedule')
    revalidatePath('/dashboard/customer/bookings/new')
    return { success: true }
  } catch {
    return { success: false, error: 'Scheduling settings could not be saved. Please try again.' }
  }
}
