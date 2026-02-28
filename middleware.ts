import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PROTECTED_PATHS = [
  '/inventario',
  '/voluntarios',
  '/pendientes',
  '/calendarios',
  '/talleres',
  '/grupos',
  '/actividades',
  '/pagos',
  '/ajustes',
  '/mis-datos',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('alma_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    await jwtVerify(token, new TextEncoder().encode(secret))
    return NextResponse.next()
  } catch {
    // Token inválido o expirado → redirigir al login y limpiar cookie
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('alma_token')
    response.cookies.delete('alma_session')
    return response
  }
}

export const config = {
  matcher: [
    '/inventario/:path*',
    '/voluntarios/:path*',
    '/pendientes/:path*',
    '/calendarios/:path*',
    '/talleres/:path*',
    '/grupos/:path*',
    '/actividades/:path*',
    '/pagos/:path*',
    '/ajustes/:path*',
    '/mis-datos/:path*',
  ],
}
