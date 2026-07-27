import { type NextRequest, NextResponse } from "next/server"
import { getParticipantesGestion } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * GET /api/participantes/gestion — lista de personas con login de participante,
 * con verificación de email, fecha de registro, inscripciones y si tienen
 * alguna capacitación habilitada.
 *
 * Es la vista de la pestaña "Participantes" (gemela de Voluntarios). La ven
 * admin y voluntario, igual que Voluntarios y Base de datos.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "personas:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    return NextResponse.json(await getParticipantesGestion())
  } catch (error) {
    logError("Error al listar participantes", { module: "participantes", action: "list_gestion", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
