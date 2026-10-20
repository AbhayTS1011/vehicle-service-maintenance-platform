import { UserRole } from '@prisma/client'
import { z } from 'zod'

export type PublicRegistrationInput = {
  name: string
  email: string
  password: string
  phone?: string
  role: UserRole
}

const publicRegistrationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(1024),
  phone: z.string().trim().max(20).optional(),
})

/** Public sign-up never accepts a role from the browser. */
export function parsePublicRegistrationInput(input: unknown): PublicRegistrationInput | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const parsed = publicRegistrationSchema.safeParse(input)
  if (!parsed.success) return null

  return {
    ...parsed.data,
    role: UserRole.CUSTOMER,
  }
}
