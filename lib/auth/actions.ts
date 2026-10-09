// =====================================================================
// Authentication Server Actions (Registration, Login, Logout)
// =====================================================================

'use server'

import { db } from '../db'
import { hashPassword, verifyPassword } from './password'

export async function registerUser(formData: any) {
  try {
    const { name, email, password, role = 'CUSTOMER', phone } = formData
    if (!name || !email || !password) {
      return { success: false, error: 'Name, email and password are required' }
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return { success: false, error: 'Email already registered' }
    }

    const passwordHash = await hashPassword(password)

    const newUser = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        phone,
      },
    })

    await db.auditLog.create({
      data: {
        tableName: 'users',
        recordId: newUser.id,
        action: 'REGISTER',
        changedBy: newUser.id,
        details: `User registered with role ${role}`,
      },
    })

    return { success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Registration failed' }
  }
}

export async function loginUser(formData: any) {
  try {
    const { email, password } = formData
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' }
    }

    const normalizedEmail = email.toLowerCase().trim()

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Check user exists and has passwordHash
    if (user == null) {
      await db.auditLog.create({
        data: {
          tableName: 'users',
          action: 'LOGIN_FAILED',
          details: `Failed login attempt for email: ${normalizedEmail}`,
        },
      })
      return { success: false, error: 'Invalid email or password' }
    }

    const passwordValid = await verifyPassword(password, (user as { passwordHash: string }).passwordHash)
    if (!passwordValid) {
      await db.auditLog.create({
        data: {
          tableName: 'users',
          action: 'LOGIN_FAILED',
          details: `Failed login attempt for email: ${normalizedEmail}`,
        },
      })
      return { success: false, error: 'Invalid email or password' }
    }

    await db.auditLog.create({
      data: {
        tableName: 'users',
        action: 'LOGIN_SUCCESS',
        details: `User logged in successfully`,
      }
    })

    // Return user info using! non-null assertions
    return { success: true, user: { id: (user as any).id, name: (user as any).name, email: (user as any).email, role: (user as any).role } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Login failed' }
  }
}

export async function logoutUser() {
  await db.auditLog.create({
    data: {
      tableName: 'users',
      action: 'LOGOUT',
      details: `User logged out`,
    }
  })
}
