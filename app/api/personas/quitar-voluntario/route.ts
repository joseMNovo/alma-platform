import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { revertVolunteerToParticipant } from "@/lib/data-manager"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** POST /api/personas/quitar-voluntario
 *  Quita el rol de voluntario/a de una persona y la vuelve participante.
 *  Body: { persona_id, registered_by_name? } */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  // Misma barrera que habilitar como voluntario/a: solo quien gestiona personas.
  if (!can(session, "personas:create")) {
    logWarn("Permiso denegado para revertir voluntario", { module: "personas", action: "revert_volunteer_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const personaId = Number(body.persona_id)
    if (!Number.isFinite(personaId)) {
      return NextResponse.json({ error: "Falta la persona" }, { status: 422 })
    }
    const registeredBy = typeof body.registered_by_name === "string" && body.registered_by_name.trim()
      ? body.registered_by_name.trim() : null

    const result = await revertVolunteerToParticipant(personaId, registeredBy)
    logInfo("Voluntario revertido a participante", { module: "personas", action: "revert_volunteer", user: session.id, meta: { personaId, outcome: result.outcome } })
    return NextResponse.json(result)
  } catch (error: any) {
    const msg = String(error?.message ?? "")
    if (msg.includes("409")) {
      return NextResponse.json({ error: "No se puede revertir: la persona no es voluntaria o es administrador/a." }, { status: 409 })
    }
    if (msg.includes("404")) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    }
    logError("Error al revertir voluntario", { module: "personas", action: "revert_volunteer", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
