'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getSessionActor } from '@/lib/admin/session'
import { createMechanic as create, deleteMechanic as remove, updateMechanic as update } from '@/lib/admin/management'

export type MechanicActionState = { success: boolean; message?: string; error?: string }

function mechanicFields(formData: FormData) {
  const isActive = formData.get('isActive')
  return {
    name: formData.get('name'),
    specialization: formData.get('specialization') ?? '',
    phone: formData.get('phone') ?? '',
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : isActive,
  }
}

function revalidateMechanicViews() {
  revalidatePath('/dashboard/admin/mechanics')
  revalidatePath('/dashboard/provider/bookings/confirmed')
  revalidatePath('/dashboard/provider/bookings/in-progress')
  revalidatePath('/dashboard/customer/bookings/new')
}

export async function createMechanic(formData: FormData): Promise<MechanicActionState> {
  const result = await create(await getSessionActor(), mechanicFields(formData), {
    findCurrentServiceCenterId: () => db.mechanic.findCurrentServiceCenterId(),
    create: (serviceCenterId, data) => db.mechanic.create(serviceCenterId, data),
  })
  if (!result.success) return { success: false, error: result.error }
  revalidateMechanicViews()
  return { success: true, message: result.message }
}

export async function updateMechanic(formData: FormData): Promise<MechanicActionState> {
  const result = await update(await getSessionActor(), formData.get('mechanicId'), mechanicFields(formData), {
    findCurrentServiceCenterId: () => db.mechanic.findCurrentServiceCenterId(),
    update: (serviceCenterId, id, data) => db.mechanic.update(serviceCenterId, id, data),
  })
  if (!result.success) return { success: false, error: result.error }
  revalidateMechanicViews()
  return { success: true, message: result.message }
}

export async function deleteMechanic(formData: FormData): Promise<MechanicActionState> {
  const result = await remove(await getSessionActor(), formData.get('mechanicId'), {
    findCurrentServiceCenterId: () => db.mechanic.findCurrentServiceCenterId(),
    deleteOrDeactivate: (serviceCenterId, id) => db.mechanic.deleteOrDeactivate(serviceCenterId, id),
  })
  if (!result.success) return { success: false, error: result.error }
  revalidateMechanicViews()
  return { success: true, message: result.message }
}
