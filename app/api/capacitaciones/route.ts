import { type NextRequest, NextResponse } from "next/server"
import { getTrainings, createTraining, logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/**
 * GET /api/capacitaciones — catálogo.
 *
 * Se le pasa al backend quién pregunta: él decide qué contenido viaja.
 * Un ítem sin habilitación vuelve con locked=true y video_ref en null.
 * El filtrado NUNCA se hace acá ni en el cliente.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const trainings = await getTrainings({
      status: url.searchParams.get("status") || undefined,
      userType: toUserType(session.role),
      userId: session.id,
      includeItems: url.searchParams.get("include_items") === "true",
    })
    return NextResponse.json(trainings)
  } catch (error) {
    logError("Error al listar capacitaciones", { module: "capacitaciones", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** POST /api/capacitaciones — crear (admin) */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    logWarn("Permiso denegado para crear capacitación", {
      module: "capacitaciones", action: "create_denied", user: session.id,
    })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.title?.trim()) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 422 })
    }

    const training = await createTraining({
      ...data,
      title: data.title.trim(),
      created_by_volunteer_id: session.id || null,
    })

    logInfo("Capacitación creada", {
      module: "capacitaciones", action: "create", user: session.id,
      meta: { id: training.id, title: training.title },
    })
    logActivityEvent({ event_type: "create", module: "capacitaciones", action: "create", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json(training)
  } catch (error) {
    logError("Error al crear capacitación", { module: "capacitaciones", action: "create", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
