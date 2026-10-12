'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getSessionActor } from '@/lib/admin/session'
import { updateServiceCenter as saveCenter } from '@/lib/admin/management'

export type ServiceCenterActionState = { success: boolean; message?: string; error?: string }

export async function updateServiceCenter(_previous: ServiceCenterActionState | null, formData: FormData): Promise<ServiceCenterActionState> {
  const actor = await getSessionActor()
  const result = await saveCenter(actor, {
    name: formData.get('name'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    operatingHours: formData.get('operatingHours'),
  }, { updateCurrent: (data) => db.serviceCenter.updateCurrent(data) })
  if (!result.success) return { success: false, error: result.error }
  revalidatePath('/dashboard/admin/service-center')
  revalidatePath('/dashboard/admin/service-center/schedule')
  return { success: true, message: result.message }
}
