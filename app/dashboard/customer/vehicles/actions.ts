'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getVehicleActor } from '@/lib/vehicles/server-session'
import { createCustomerVehicle, deleteCustomerVehicle, updateCustomerVehicle } from '@/lib/vehicles/vehicle-service'

const vehiclesPath = '/dashboard/customer/vehicles'

export async function createVehicle(input: unknown) {
  const result = await createCustomerVehicle(await getVehicleActor(), input, db.vehicle)
  if (!result.success) return result
  revalidatePath(vehiclesPath)
  return { success: true as const, message: result.message }
}

export async function updateVehicle(id: unknown, input: unknown) {
  const result = await updateCustomerVehicle(await getVehicleActor(), id, input, db.vehicle)
  if (result.success) {
    revalidatePath(vehiclesPath)
    revalidatePath(`${vehiclesPath}/${result.value.id}`)
    return { success: true as const, message: result.message }
  }
  return result
}

export async function deleteVehicle(id: unknown) {
  const result = await deleteCustomerVehicle(await getVehicleActor(), id, db.vehicle)
  if (result.success) revalidatePath(vehiclesPath)
  return result
}
