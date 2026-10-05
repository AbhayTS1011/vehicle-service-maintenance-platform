// =====================================================================
// Authentication Server Actions (Registration, Login, Logout)
// =====================================================================

'use server'

import { db } from '../db'
import { hashPassword, verifyPassword } from './password'
import { setSessionCookie, clearSessionCookie, getCurrentUser } from './session'

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

    await setSessionCookie({
      sub: newUser.id.toString(),
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
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

    if (!user) {
      return { success: false, error: 'Invalid email or password' }
    }

    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      await db.auditLog.create({
        data: {
          tableName: 'users',
          recordId: user.id,
          action: 'LOGIN_FAILED',
          details: `Failed login attempt for email: ${normalizedEmail}`,
        },
      })
      return { success: false, error: 'Invalid email or password' }
    }

    await setSessionCookie({
      sub: user.id.toString(),
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    await db.auditLog.create({
      data: {
        tableName: 'users',
        recordId: user.id,
        action: 'LOGIN_SUCCESS',
        changedBy: user.id,
        details: `User logged in successfully`,
      },
    })

    return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Login failed' }
  }
}

export async function logoutUser() {
  try {
    const user = await getCurrentUser()
    if (user) {
      await db.auditLog.create({
        data: {
          tableName: 'users',
          recordId: user.id,
          action: 'LOGOUT',
          changedBy: user.id,
          details: `User logged out`,
        },
      })
    }
    await clearSessionCookie()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Logout failed' }
  }
}
