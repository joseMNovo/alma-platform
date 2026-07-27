import { type NextRequest, NextResponse } from "next/server"
import { saveTrainingProgress, logTrainingView, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * POST /api/capacitaciones/progreso — ping del player.
 *
 * `watched_delta` son los segundos reproducidos desde el ping anterior.
 * Acumular deltas (y no la posición) es lo que impide que arrastrar la barra
 * al final cuente como "visto".
 *
 * Con `log_view: true` además registra la reproducción, tomando la IP del
 * request: el cliente no puede falsearla porque nunca la manda.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const itemId = Number.parseInt(String(data.item_id ?? 0), 10)
    if (!itemId) return NextResponse.json({ error: "Falta el contenido" }, { status: 400 })

    const userType = toUserType(session.role)

    if (data.log_view) {
      // La IP la resuelve el servidor a partir de los headers del proxy.
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        null
      logTrainingView(itemId, {
        user_type: userType,
        user_id: session.id,
        ip,
        user_agent: request.headers.get("user-agent"),
      }).catch(() => {})
    }

    const progress = await saveTrainingProgress(itemId, {
      user_type: userType,
      user_id: session.id,
      last_position_sec: Math.max(0, Number(data.last_position_sec) || 0),
      watched_delta: Math.max(0, Number(data.watched_delta) || 0),
      completed: Boolean(data.completed),
    })

    return NextResponse.json(progress)
  } catch (error) {
    logError("Error al guardar progreso", { module: "capacitaciones", action: "progress", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
