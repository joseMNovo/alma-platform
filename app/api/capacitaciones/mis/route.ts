import { type NextRequest, NextResponse } from "next/server"
import { getMyTrainings, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * GET /api/capacitaciones/mis — lo que el usuario logueado puede ver.
 *
 * Devuelve las capacitaciones publicadas con su contenido y su progreso.
 * Las que no tiene habilitadas vienen igual (para que sepa que existen y
 * pueda pedir el acceso), pero con los ítems bloqueados.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const trainings = await getMyTrainings(toUserType(session.role), session.id)
    return NextResponse.json(trainings)
  } catch (error) {
    logError("Error al obtener mis capacitaciones", {
      module: "capacitaciones", action: "mis", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
