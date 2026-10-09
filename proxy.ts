// =====================================================================
// Next.js Proxy for Route Guarding & Authentication
// =====================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth/jwt'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('apex_session')?.value

  // Protected dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyToken(sessionCookie)
    if (!payload || !payload.role) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = payload.role as string

    // Role-based route guard checks
    if (pathname.startsWith('/dashboard/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/dashboard/provider') && role !== 'SERVICE_PROVIDER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/dashboard/customer') && role !== 'CUSTOMER' && role !== 'FLEET_MANAGER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
