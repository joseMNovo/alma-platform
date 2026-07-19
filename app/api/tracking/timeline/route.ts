import { type NextRequest, NextResponse } from "next/server"
import { getActivityTimeline } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logWarn, logError } from "@/lib/logger"

// GET /api/tracking/timeline?user_type=&user_id= → eventos crudos de un usuario (solo admin)
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "tracking:view")) {
    logWarn("Permiso denegado para ver timeline de actividad", { module: "tracking", action: "timeline_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userType = searchParams.get("user_type")
  const userId = searchParams.get("user_id")

  if (!userType || !userId) {
    return NextResponse.json({ error: "user_type y user_id son requeridos" }, { status: 400 })
  }

  try {
    const timeline = await getActivityTimeline(userType, parseInt(userId))
    return NextResponse.json(timeline)
  } catch (error) {
    logError("Error al obtener timeline de actividad", { module: "tracking", action: "timeline", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
