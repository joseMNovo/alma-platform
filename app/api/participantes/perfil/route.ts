import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/serverAuth"
import { getParticipantProfile, upsertParticipantProfile } from "@/lib/data-manager"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** GET /api/participantes/perfil — Returns the profile of the authenticated participant */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (session.role !== "participante") {
    return NextResponse.json({ error: "Solo para participantes" }, { status: 403 })
  }

  try {
    const profile = await getParticipantProfile(session.id)
    return NextResponse.json({ profile: profile ?? null })
  } catch (error) {
    logError("Error al obtener perfil de participante", {
      module: "participant_profile", action: "get_profile", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/participantes/perfil — Creates or updates the authenticated participant's profile */
export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (session.role !== "participante") {
    logWarn("Intento de editar perfil de participante sin rol correcto", {
      module: "participant_profile", action: "permission_denied", user: session.id,
    })
    return NextResponse.json({ error: "Solo para participantes" }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Only allow the participant to edit their own profile fields
    const allowed = [
      "name", "last_name", "phone", "birth_date", "city", "province",
      "address", "emergency_contact_name", "emergency_contact_phone",
      "notes", "accepts_notifications", "accepts_whatsapp",
    ]
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const profile = await upsertParticipantProfile(session.id, data)

    logInfo("Perfil de participante guardado", {
      module: "participant_profile", action: "save_profile", user: session.id,
    })

    return NextResponse.json({ profile })
  } catch (error) {
    logError("Error al guardar perfil de participante", {
      module: "participant_profile", action: "save_profile", user: session.id, error,
    })
    return NextResponse.json({ error: "Error al guardar el perfil" }, { status: 500 })
  }
}
