import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { getParticipantProfile } from '@/lib/data-manager'
import { responderConSesion } from '@/lib/session'
import { esDestinoInterno } from '@/lib/destino-seguro'
import { logInfo, logWarn, logError } from '@/lib/logger'

/**
 * Verifica el email de un participante y, si el link venía de una compra,
 * además lo deja adentro.
 *
 * La sesión se abre SOLO cuando el link trae un `next` hacia /academia. Ese
 * `next` lo agrega el backend únicamente cuando el alta salió del wizard de
 * compra: en el registro común no existe, y ahí el link solo verifica.
 *
 * El canje asumido: para esa gente, el link del mail pasa a valer como
 * credencial. Es de un solo uso, vence, y quien tenga el correo podría
 * restablecer el PIN de todos modos — a cambio, quien compró en el stand no
 * tiene que volver a tipear nada.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const destino: string = typeof body?.next === 'string' ? body.next : ''
    const vieneDeCompra = esDestinoInterno(destino)

    const result: any = await api.post('/participants/verify-email', { token: body.token })
    logInfo("Email de participante verificado exitosamente", { module: "participantes", action: "verify_email" })

    if (!vieneDeCompra || !result?.participant_id) {
      return NextResponse.json(result)
    }

    const perfil = await getParticipantProfile(result.participant_id).catch(() => null)
    const user = {
      id: result.participant_id,
      name: perfil?.name || String(result.email || '').split('@')[0],
      last_name: perfil?.last_name || null,
      email: result.email,
      role: 'participante',
      photo: null,
      phone: perfil?.phone || null,
      is_admin: false,
      enrollments: { workshops: [], groups: [], activities: [] },
    }
    logInfo("Sesión abierta desde el link de verificación", {
      module: "participantes", action: "verify_email_login", user: result.participant_id,
    })
    return responderConSesion(user, true)
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('400') ? 400 : 500
    if (status === 400) {
      logWarn("Verificación de email de participante inválida o expirada", { module: "participantes", action: "verify_email" })
    } else {
      logError("Error al verificar email de participante", { module: "participantes", action: "verify_email", error })
    }
    return NextResponse.json({ error: msg }, { status })
  }
}
