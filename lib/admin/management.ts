import { UserRole } from '@prisma/client'
import { z } from 'zod'

export type AdminActor = { id: number; role: UserRole } | null
export type ServiceCenterUpdate = z.infer<typeof serviceCenterSchema>
export type MechanicWrite = z.infer<typeof mechanicSchema>
export type ManagementResult<T = undefined> =
  | { success: true; value: T; message?: string }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'configuration' | 'error'; error: string }

const requiredText = (max: number) => z.string().trim().min(1).max(max)
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null)
const phoneSchema = requiredText(20).regex(/^(?=.*\d)[+()\d .-]+$/, 'Enter a valid phone number.')
const optionalPhoneSchema = z.union([z.literal(''), z.string().trim().max(20).regex(/^(?=.*\d)[+()\d .-]+$/)]).transform((value) => value || null)

const serviceCenterSchema = z.object({
  name: requiredText(100),
  address: requiredText(2000),
  phone: phoneSchema,
  email: requiredText(255).email().transform((value) => value.toLowerCase()),
  operatingHours: optionalText(100),
}).strict()

const mechanicSchema = z.object({
  name: requiredText(100),
  specialization: optionalText(100),
  phone: optionalPhoneSchema,
  isActive: z.boolean(),
}).strict()

const idSchema = z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number)

function authorized(actor: AdminActor): ManagementResult<never> | null {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to manage the service center.' }
  }
  if (actor.role !== UserRole.ADMIN) {
    return { success: false, reason: 'forbidden', error: 'Only an administrator can manage the service center.' }
  }
  return null
}

export async function readServiceCenter<T>(
  actor: AdminActor,
  repository: { findCurrent: () => Promise<T | null> },
): Promise<ManagementResult<T>> {
  const denied = authorized(actor)
  if (denied) return denied
  try {
    const value = await repository.findCurrent()
    return value ? { success: true, value } : { success: false, reason: 'not_found', error: 'No service center is configured.' }
  } catch {
    return { success: false, reason: 'error', error: 'Service center details could not be loaded. Please try again.' }
  }
}

export async function updateServiceCenter<T>(
  actor: AdminActor,
  input: unknown,
  repository: { updateCurrent: (data: z.infer<typeof serviceCenterSchema>) => Promise<T | null> },
): Promise<ManagementResult<T>> {
  const denied = authorized(actor)
  if (denied) return denied
  const parsed = serviceCenterSchema.safeParse(input)
  if (!parsed.success) return { success: false, reason: 'invalid_input', error: parsed.error.issues[0]?.message ?? 'Enter valid service-center details.' }
  try {
    const value = await repository.updateCurrent(parsed.data)
    return value ? { success: true, value, message: 'Service-center details saved.' } : { success: false, reason: 'not_found', error: 'No service center is configured.' }
  } catch {
    return { success: false, reason: 'error', error: 'Service-center details could not be saved. Please try again.' }
  }
}

export async function listMechanics<T>(
  actor: AdminActor,
  repository: { findCurrentServiceCenterId: () => Promise<number | null>; findMany: (serviceCenterId: number) => Promise<T[]> },
): Promise<ManagementResult<T[]>> {
  const denied = authorized(actor)
  if (denied) return denied
  try {
    const serviceCenterId = await repository.findCurrentServiceCenterId()
    if (!serviceCenterId) return { success: false, reason: 'configuration', error: 'No service center is configured.' }
    return { success: true, value: await repository.findMany(serviceCenterId) }
  } catch {
    return { success: false, reason: 'error', error: 'Mechanics could not be loaded. Please try again.' }
  }
}

export async function createMechanic<T>(
  actor: AdminActor,
  input: unknown,
  repository: { findCurrentServiceCenterId: () => Promise<number | null>; create: (serviceCenterId: number, data: z.infer<typeof mechanicSchema>) => Promise<T> },
): Promise<ManagementResult<T>> {
  const denied = authorized(actor)
  if (denied) return denied
  const parsed = mechanicSchema.safeParse(input)
  if (!parsed.success) return { success: false, reason: 'invalid_input', error: parsed.error.issues[0]?.message ?? 'Enter valid mechanic details.' }
  try {
    const serviceCenterId = await repository.findCurrentServiceCenterId()
    if (!serviceCenterId) return { success: false, reason: 'configuration', error: 'No service center is configured.' }
    return { success: true, value: await repository.create(serviceCenterId, parsed.data), message: 'Mechanic added.' }
  } catch {
    return { success: false, reason: 'error', error: 'Mechanic could not be added. Please check the details and try again.' }
  }
}

export async function updateMechanic(
  actor: AdminActor,
  idInput: unknown,
  input: unknown,
  repository: { findCurrentServiceCenterId: () => Promise<number | null>; update: (serviceCenterId: number, id: number, data: z.infer<typeof mechanicSchema>) => Promise<boolean> },
): Promise<ManagementResult<undefined>> {
  const denied = authorized(actor)
  if (denied) return denied
  const id = idSchema.safeParse(idInput)
  const parsed = mechanicSchema.safeParse(input)
  if (!id.success || !Number.isSafeInteger(id.data) || id.data <= 0 || !parsed.success) {
    return { success: false, reason: 'invalid_input', error: parsed.success ? 'Choose a valid mechanic.' : parsed.error.issues[0]?.message ?? 'Enter valid mechanic details.' }
  }
  try {
    const serviceCenterId = await repository.findCurrentServiceCenterId()
    if (!serviceCenterId) return { success: false, reason: 'configuration', error: 'No service center is configured.' }
    if (!await repository.update(serviceCenterId, id.data, parsed.data)) return { success: false, reason: 'not_found', error: 'Mechanic not found.' }
    return { success: true, value: undefined, message: 'Mechanic updated.' }
  } catch {
    return { success: false, reason: 'error', error: 'Mechanic could not be updated. Please try again.' }
  }
}

export async function deleteMechanic(
  actor: AdminActor,
  idInput: unknown,
  repository: { findCurrentServiceCenterId: () => Promise<number | null>; deleteOrDeactivate: (serviceCenterId: number, id: number) => Promise<'deleted' | 'deactivated' | null> },
): Promise<ManagementResult<undefined>> {
  const denied = authorized(actor)
  if (denied) return denied
  const id = idSchema.safeParse(idInput)
  if (!id.success || !Number.isSafeInteger(id.data) || id.data <= 0) return { success: false, reason: 'invalid_input', error: 'Choose a valid mechanic.' }
  try {
    const serviceCenterId = await repository.findCurrentServiceCenterId()
    if (!serviceCenterId) return { success: false, reason: 'configuration', error: 'No service center is configured.' }
    const result = await repository.deleteOrDeactivate(serviceCenterId, id.data)
    if (!result) return { success: false, reason: 'not_found', error: 'Mechanic not found.' }
    return {
      success: true,
      value: undefined,
      message: result === 'deactivated'
        ? 'This mechanic has booking or service history, so they were deactivated to preserve those records.'
        : 'Mechanic deleted.',
    }
  } catch {
    return { success: false, reason: 'error', error: 'Mechanic could not be removed. Please try again.' }
  }
}

export async function deleteMechanicRecord(
  serviceCenterId: number,
  id: number,
  repository: {
    lockServiceCenter: (serviceCenterId: number) => Promise<void>
    exists: (serviceCenterId: number, id: number) => Promise<boolean>
    hasHistory: (id: number) => Promise<boolean>
    deactivate: (id: number) => Promise<void>
    delete: (id: number) => Promise<void>
  },
): Promise<'deleted' | 'deactivated' | null> {
  await repository.lockServiceCenter(serviceCenterId)
  if (!await repository.exists(serviceCenterId, id)) return null
  if (await repository.hasHistory(id)) {
    await repository.deactivate(id)
    return 'deactivated'
  }
  await repository.delete(id)
  return 'deleted'
}
