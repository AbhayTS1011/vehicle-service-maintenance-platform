import { UserRole } from '@prisma/client'
import { z } from 'zod'

export type VehicleActor = { id: number; role: UserRole } | null
export type VehicleInput = { make: string; model: string; year: number; licensePlate: string; vin: string | null; mileage: number }
export type VehicleRecord = Omit<VehicleInput, 'mileage'> & { id: number; ownerId: number; mileage: number | null; createdAt: Date; updatedAt: Date }
export type VehicleFailureReason = 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'duplicate' | 'has_bookings' | 'error'
export type VehicleResult<T> = { success: true; value: T; message?: string } | { success: false; reason: VehicleFailureReason; error: string }

const vehicleInputSchema = z.object({
  make: z.string().trim().min(1, 'Enter a make.').max(50, 'Make must be 50 characters or fewer.'),
  model: z.string().trim().min(1, 'Enter a model.').max(50, 'Model must be 50 characters or fewer.'),
  year: z.coerce.number().int().min(1900, 'Enter a valid year.').max(2100, 'Enter a valid year.'),
  licensePlate: z.string().trim().min(1, 'Enter a license plate.').max(20, 'License plate must be 20 characters or fewer.'),
  vin: z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    return normalized || null
  }).refine((value) => value === null || value.length <= 50, 'VIN must be 50 characters or fewer.'),
  mileage: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((value) => {
    if (value === null || value === undefined || value === '') return 0
    return typeof value === 'number' ? value : Number(value)
  }).pipe(z.number().int().min(0, 'Mileage cannot be negative.')),
}).strict()

const idSchema = z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number)

export type VehicleRepository<T = VehicleRecord> = {
  findManyForOwner: (ownerId: number) => Promise<T[]>
  findForOwner: (id: number, ownerId: number) => Promise<T | null>
  createForOwner: (ownerId: number, data: VehicleInput) => Promise<T>
  updateForOwner: (id: number, ownerId: number, data: VehicleInput) => Promise<T | null>
  deleteForOwner: (id: number, ownerId: number) => Promise<'deleted' | 'has_bookings' | 'not_found'>
}

function actorFailure(actor: VehicleActor): VehicleResult<never> | null {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to manage your vehicles.' }
  }
  if (actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.FLEET_MANAGER) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to manage customer vehicles.' }
  }
  return null
}

function parseId(input: unknown): number | null {
  const parsed = idSchema.safeParse(input)
  return parsed.success && Number.isSafeInteger(parsed.data) && parsed.data > 0 ? parsed.data : null
}

function parseVehicleInput(input: unknown): VehicleInput | null {
  const parsed = vehicleInputSchema.safeParse(input)
  if (!parsed.success) return null
  return { ...parsed.data, licensePlate: parsed.data.licensePlate.toUpperCase() }
}

function isUniqueConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

export async function listCustomerVehicles<T>(actor: VehicleActor, repository: Pick<VehicleRepository<T>, 'findManyForOwner'>): Promise<VehicleResult<T[]>> {
  const denied = actorFailure(actor)
  if (denied) return denied
  try {
    return { success: true, value: await repository.findManyForOwner(actor!.id) }
  } catch {
    return { success: false, reason: 'error', error: 'Your vehicles could not be loaded. Please try again.' }
  }
}

export async function getCustomerVehicle<T>(actor: VehicleActor, idInput: unknown, repository: Pick<VehicleRepository<T>, 'findForOwner'>): Promise<VehicleResult<T>> {
  const denied = actorFailure(actor)
  if (denied) return denied
  const id = parseId(idInput)
  if (!id) return { success: false, reason: 'invalid_input', error: 'Choose a valid vehicle.' }
  try {
    const value = await repository.findForOwner(id, actor!.id)
    return value ? { success: true, value } : { success: false, reason: 'not_found', error: 'Vehicle not found.' }
  } catch {
    return { success: false, reason: 'error', error: 'Vehicle details could not be loaded. Please try again.' }
  }
}

export async function createCustomerVehicle<T>(actor: VehicleActor, input: unknown, repository: Pick<VehicleRepository<T>, 'createForOwner'>): Promise<VehicleResult<T>> {
  const denied = actorFailure(actor)
  if (denied) return denied
  const data = parseVehicleInput(input)
  if (!data) return { success: false, reason: 'invalid_input', error: 'Enter valid vehicle details and try again.' }
  try {
    return { success: true, value: await repository.createForOwner(actor!.id, data), message: 'Vehicle added.' }
  } catch (error) {
    if (isUniqueConflict(error)) return { success: false, reason: 'duplicate', error: 'That license plate or VIN is already registered.' }
    return { success: false, reason: 'error', error: 'Vehicle could not be added. Please try again.' }
  }
}

export async function updateCustomerVehicle<T>(actor: VehicleActor, idInput: unknown, input: unknown, repository: Pick<VehicleRepository<T>, 'updateForOwner'>): Promise<VehicleResult<T>> {
  const denied = actorFailure(actor)
  if (denied) return denied
  const id = parseId(idInput)
  const data = parseVehicleInput(input)
  if (!id || !data) return { success: false, reason: 'invalid_input', error: 'Enter valid vehicle details and try again.' }
  try {
    const value = await repository.updateForOwner(id, actor!.id, data)
    return value ? { success: true, value, message: 'Vehicle updated.' } : { success: false, reason: 'not_found', error: 'Vehicle not found.' }
  } catch (error) {
    if (isUniqueConflict(error)) return { success: false, reason: 'duplicate', error: 'That license plate or VIN is already registered.' }
    return { success: false, reason: 'error', error: 'Vehicle could not be updated. Please try again.' }
  }
}

export async function deleteCustomerVehicle(actor: VehicleActor, idInput: unknown, repository: Pick<VehicleRepository<unknown>, 'deleteForOwner'>): Promise<VehicleResult<undefined>> {
  const denied = actorFailure(actor)
  if (denied) return denied
  const id = parseId(idInput)
  if (!id) return { success: false, reason: 'invalid_input', error: 'Choose a valid vehicle.' }
  try {
    const result = await repository.deleteForOwner(id, actor!.id)
    if (result === 'deleted') return { success: true, value: undefined, message: 'Vehicle deleted.' }
    if (result === 'has_bookings') return { success: false, reason: 'has_bookings', error: 'Vehicles with booking history cannot be deleted.' }
    return { success: false, reason: 'not_found', error: 'Vehicle not found.' }
  } catch {
    return { success: false, reason: 'error', error: 'Vehicle could not be deleted. Please try again.' }
  }
}
