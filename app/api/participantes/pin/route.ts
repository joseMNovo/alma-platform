import { type NextRequest, NextResponse } from "next/server"
import { setParticipantePin, logActivityEvent, toUserType } from "@/lib/data-manager"
import { hashPassword } from "@/lib/utils/password"
import { getSessionUser } from "@/lib/serverAuth"
import { logInfo, logWarn, logError } from "@/lib/logger"

/**
 * POST /api/participantes/pin — el admin le fija el PIN a un participante.
 *
 * Espeja el flujo de Voluntarios (ícono llave): el PIN en claro se hashea acá
 * con bcrypt y al backend viaja SOLO el hash. Solo admin.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!session.is_admin) {
    logWarn("No-admin intentó fijar PIN de participante", { module: "participantes", action: "set_pin_denied", user: session.id })
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  try {
    const { id, pin } = await request.json()
    if (!id || !pin) {
      return NextResponse.json({ error: "id y pin son requeridos" }, { status: 400 })
    }
    if (!/^\d{4}$/.test(String(pin))) {
      return NextResponse.json({ error: "El PIN debe ser exactamente 4 dígitos numéricos" }, { status: 400 })
    }

    const hashedPin = await hashPassword(String(pin))
    await setParticipantePin(Number(id), hashedPin)

    logInfo("PIN de participante actualizado", { module: "participantes", action: "set_pin", user: session.id, meta: { participant_id: id } })
    logActivityEvent({ event_type: "edit", module: "participantes", action: "set_pin", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (error) {
    logError("Error al fijar PIN de participante", { module: "participantes", action: "set_pin", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
