import { type NextRequest, NextResponse } from "next/server"
import { suggestHistoryAttendees } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/** GET /api/grupos/historiales/suggest?q= — autocompletado de nombre de asistente */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const q = new URL(request.url).searchParams.get("q") || ""
    if (q.trim().length < 2) return NextResponse.json([])
    const suggestions = await suggestHistoryAttendees(q.trim())
    return NextResponse.json(suggestions)
  } catch (error) {
    logError("Error al sugerir asistentes", { module: "group_histories", action: "suggest", user: session.id, error })
    return NextResponse.json([], { status: 200 })
  }
}
