import { type NextRequest, NextResponse } from "next/server"
import {
  enrollInEvent, unenrollFromEvent, getParticipantEventIds,
  logActivityEvent, toUserType,
} from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logInfo, logError } from "@/lib/logger"

/**
 * Inscripción del PARTICIPANTE a un evento puntual del calendario.
 *
 * La unidad de inscripción es el encuentro (calendar_event_participants), no el
 * programa: así el número refleja quién va a ESA sesión. Es directa (sin
 * aprobación) y sin cupo.
 *
 * GET  → ids de los eventos a los que el participante ya se anotó
 * POST → { event_id } se anota
 * DELETE ?event_id=N → se desanota
 */

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.role !== "participante") {
    // El staff no se "anota"; su relación con el evento es la asignación.
    return NextResponse.json([])
  }
  try {
    return NextResponse.json(await getParticipantEventIds(session.id))
  } catch (error) {
    logError("Error al obtener inscripciones del participante", { module: "calendarios", action: "my_events", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.role !== "participante") {
    return NextResponse.json({ error: "Solo los participantes se inscriben a eventos" }, { status: 403 })
  }
  try {
    const { event_id } = await request.json()
    const eventId = Number.parseInt(String(event_id ?? 0), 10)
    if (!eventId) return NextResponse.json({ error: "Falta el evento" }, { status: 400 })

    await enrollInEvent(eventId, session.id)
    logInfo("Participante anotado a evento", { module: "calendarios", action: "enroll_event", user: session.id, meta: { event_id: eventId } })
    logActivityEvent({ event_type: "create", module: "calendarios", action: "enroll_event", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (error) {
    logError("Error al anotar participante a evento", { module: "calendarios", action: "enroll_event", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.role !== "participante") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const eventId = Number.parseInt(new URL(request.url).searchParams.get("event_id") || "0", 10)
    if (!eventId) return NextResponse.json({ error: "Falta el evento" }, { status: 400 })

    await unenrollFromEvent(eventId, session.id)
    logInfo("Participante desanotado de evento", { module: "calendarios", action: "unenroll_event", user: session.id, meta: { event_id: eventId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    logError("Error al desanotar participante de evento", { module: "calendarios", action: "unenroll_event", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
