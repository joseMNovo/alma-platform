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
  '/ajustes',
  '/mis-datos',
  '/capacitaciones',
  '/accesos',
  '/certificados',
  '/link-de-pago',
  '/encuestas',
  '/pagos-capacitaciones',
  '/auditoria',
  '/alertas',
  '/emision',
  '/historial-certificados',
  '/participantes',
  '/inscripciones',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('alma_token')?.value

  // Se avisa el motivo en la URL: sin esto, la pantalla de login ve el
  // localStorage intacto y vuelve a empujar adentro → rebote infinito.
  if (!token) {
    return NextResponse.redirect(new URL('/?sesion=vencida', request.url))
  }

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      return NextResponse.redirect(new URL('/?sesion=vencida', request.url))
    }
    await jwtVerify(token, new TextEncoder().encode(secret))
    return NextResponse.next()
  } catch {
    // Token inválido o expirado → redirigir al login y limpiar cookie
    const response = NextResponse.redirect(new URL('/?sesion=vencida', request.url))
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
    '/ajustes/:path*',
    '/mis-datos/:path*',
    '/capacitaciones/:path*',
    '/accesos/:path*',
    '/certificados/:path*',
    '/link-de-pago/:path*',
    '/encuestas/:path*',
    '/pagos-capacitaciones/:path*',
    '/auditoria/:path*',
    '/alertas/:path*',
    '/emision/:path*',
    '/historial-certificados/:path*',
    '/participantes/:path*',
    '/inscripciones/:path*',
  ],
}
