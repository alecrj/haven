// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Protected staff routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/staff')) {
    
    // Check for authentication token
    const token = request.cookies.get('staff-auth-token')
    
    // If no token and not on login page, redirect to staff login
    if (!token && !request.nextUrl.pathname.startsWith('/staff/login')) {
      return NextResponse.redirect(new URL('/staff/login', request.url))
    }
    
    // If has token but on login page, redirect to dashboard
    if (token && request.nextUrl.pathname.startsWith('/staff/login')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protected resident portal routes
  if (request.nextUrl.pathname.startsWith('/portal')) {
    const residentToken = request.cookies.get('resident-auth-token')
    
    if (!residentToken && request.nextUrl.pathname !== '/portal') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/staff/:path*', '/portal/:path*']
}