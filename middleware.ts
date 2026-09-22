import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

/** Páginas que exigen sesión. Todo lo que no esté acá es público. */
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
  '/puesto-venta',
  '/ingresos',
  '/inicio',
]

/**
 * La API va al revés que las páginas: **todo `/api/*` exige sesión salvo lo
 * que figure acá**.
 *
 * El default estaba invertido y eso dejaba cada ruta nueva abierta hasta que
 * alguien se acordara de ponerle el chequeo adentro. Varias no lo tenían:
 * `/api/emails/send` (que despacha mails de verdad por Resend, o sea un relay
 * abierto desde el dominio de ALMA), `/api/emails/logs` (la lista de
 * destinatarios), `/api/pendientes` y `/api/calendarios/asignacion`.
 * Olvidarse ahora falla del lado seguro.
 *
 * Lo de esta lista es lo que pasa ANTES de tener sesión —entrar, registrarse,
 * verificar el mail, recuperar el PIN— más lo que se comparte sin cuenta: la
 * vidriera y las landings de /academia, la verificación pública de
 * certificados, y las portadas que esas páginas muestran.
 */
const PUBLIC_API_PATHS = [
  '/api/auth',
  '/api/registro',
  '/api/voluntarios/register',
  '/api/participantes/verify-email',
  '/api/voluntarios/verify-email',
  '/api/pin-reset/request',
  '/api/pin-reset/confirm',
  '/api/publico',
  '/api/capacitaciones/portada',
]

const matchesPrefix = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  const isProtected = isApi
    ? !matchesPrefix(pathname, PUBLIC_API_PATHS)
    : matchesPrefix(pathname, PROTECTED_PATHS)

  if (!isProtected) return NextResponse.next()

  /**
   * Una API contesta 401; una página redirige al login.
   *
   * Si a un `fetch` le devolviéramos el redirect, el navegador lo seguiría y
   * la pantalla recibiría el HTML del login con status 200: el código que
   * espera JSON revienta con un error de parseo que no dice nada.
   *
   * En las páginas se avisa el motivo en la URL: sin eso, el login ve el
   * localStorage intacto y vuelve a empujar adentro → rebote infinito.
   */
  const rechazar = () => {
    if (isApi) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // Se lleva a dónde quería ir: si alguien comparte el link de un módulo,
    // después de entrar tiene que caer ahí y no en Inicio.
    const destino = new URL('/?sesion=vencida', request.url)
    destino.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(destino)
  }

  const token = request.cookies.get('alma_token')?.value
  if (!token) return rechazar()

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return rechazar()
    await jwtVerify(token, new TextEncoder().encode(secret))
    return NextResponse.next()
  } catch {
    // Token inválido o expirado → además de rechazar, se limpia la cookie
    const response = rechazar()
    response.cookies.delete('alma_token')
    response.cookies.delete('alma_session')
    return response
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/inventario/:path*',
    '/voluntarios/:path*',
    '/pendientes/:path*',
    '/calendarios/:path*',
    '/talleres/:path*',
    '/grupos/:path*',
    '/actividades/:path*',
    '/ajustes/:path*',
    '/mis-datos/:path*',
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
    '/puesto-venta/:path*',
    '/ingresos/:path*',
    '/inicio/:path*',
  ],
}
