import { type NextRequest, NextResponse } from "next/server"
import { notifyEventReminder, logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/**
 * POST /api/calendarios/notificar — recordatorio MANUAL de un evento.
 *
 * Lo dispara el staff desde el botón del calendario. Es el respaldo por si el
 * cron de recordatorios falla, o para avisar cuando el admin disponga. El
 * backend manda a todos los involucrados (voluntarios asignados + participantes
 * anotados): campanita al instante, emails en segundo plano.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "calendar:edit")) {
    logWarn("Sin permiso para enviar recordatorio de evento", { module: "calendarios", action: "notify_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { event_id } = await request.json()
    const eventId = Number.parseInt(String(event_id ?? 0), 10)
    if (!eventId) return NextResponse.json({ error: "Falta el evento" }, { status: 400 })

    const result = await notifyEventReminder(eventId)

    logInfo("Recordatorio manual de evento enviado", {
      module: "calendarios", action: "notify_event", user: session.id,
      meta: { event_id: eventId, recipients: result.recipients },
    })
    logActivityEvent({ event_type: "create", module: "calendarios", action: "notify_event", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json(result)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }
    logError("Error al enviar recordatorio de evento", { module: "calendarios", action: "notify_event", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
