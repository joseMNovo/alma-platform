import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { invitePersonToPlatform } from "@/lib/data-manager"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** POST /api/personas/invitar
 *  Invita a una persona ya cargada en la base a crear su cuenta de participante.
 *  Body: { profile_id, registered_by_name? } */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "personas:create")) {
    logWarn("Permiso denegado para invitar participante", { module: "personas", action: "invite_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const profileId = Number(body.profile_id)
    if (!Number.isFinite(profileId)) {
      return NextResponse.json({ error: "Falta la persona a invitar" }, { status: 422 })
    }
    const registeredBy = typeof body.registered_by_name === "string" && body.registered_by_name.trim()
      ? body.registered_by_name.trim() : null

    const result = await invitePersonToPlatform(profileId, registeredBy)
    logInfo("Persona invitada a la plataforma", { module: "personas", action: "invite", user: session.id, meta: { profileId, outcome: result.outcome } })
    return NextResponse.json(result)
  } catch (error: any) {
    const msg = String(error?.message ?? "")
    if (msg.includes("409")) {
      return NextResponse.json({ error: "La persona ya tiene una cuenta de participante activa, o el email es de un voluntario/a." }, { status: 409 })
    }
    if (msg.includes("422")) {
      return NextResponse.json({ error: "La persona necesita un email para poder invitarla." }, { status: 422 })
    }
    if (msg.includes("404")) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    }
    logError("Error al invitar participante", { module: "personas", action: "invite", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
