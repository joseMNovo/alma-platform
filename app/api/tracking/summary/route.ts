import { type NextRequest, NextResponse } from "next/server"
import { getActivitySummary, getPersonas } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logWarn, logError } from "@/lib/logger"

// GET /api/tracking/summary → resumen de actividad por usuario (solo admin)
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "tracking:view")) {
    logWarn("Permiso denegado para ver resumen de actividad", { module: "tracking", action: "summary_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const [summary, personas] = await Promise.all([getActivitySummary(), getPersonas()])

    const enriched = summary.map((row) => {
      if (row.user_type === "voluntario" && row.user_id === 0) {
        return { ...row, name: "Administrador", last_name: "(env)" }
      }
      const persona = personas.find((p) =>
        row.user_type === "voluntario" ? p.volunteer_id === row.user_id : p.participant_id === row.user_id,
      )
      return { ...row, name: persona?.name ?? null, last_name: persona?.last_name ?? null }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    logError("Error al obtener resumen de actividad", { module: "tracking", action: "summary", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
