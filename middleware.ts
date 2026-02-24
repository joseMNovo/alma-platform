import { NextRequest, NextResponse } from 'next/server'

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (isProtected && !request.cookies.get('alma_session')) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
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
