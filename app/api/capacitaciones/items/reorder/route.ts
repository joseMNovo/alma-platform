import { type NextRequest, NextResponse } from "next/server"
import { reorderTrainingItems } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logError } from "@/lib/logger"

/** PUT /api/capacitaciones/items/reorder — `{ training_id, order: [ids] }` */
export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { training_id, order } = await request.json()
    const trainingId = Number.parseInt(String(training_id ?? 0), 10)
    if (!trainingId || !Array.isArray(order)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const items = await reorderTrainingItems(trainingId, order.map(Number))
    logInfo("Contenido reordenado", {
      module: "capacitaciones", action: "reorder", user: session.id, meta: { training_id: trainingId },
    })
    return NextResponse.json(items)
  } catch (error) {
    logError("Error al reordenar contenido", { module: "capacitaciones", action: "reorder", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
