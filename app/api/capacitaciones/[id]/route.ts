import { type NextRequest, NextResponse } from "next/server"
import { getTraining, updateTraining, deleteTraining, logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** GET /api/capacitaciones/[id] — detalle. El backend gatea el contenido. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const trainingId = Number.parseInt(id, 10)
    if (!trainingId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    // include_unpublished solo para quien administra el contenido.
    const training = await getTraining(trainingId, {
      userType: toUserType(session.role),
      userId: session.id,
      includeUnpublished: can(session, "capacitaciones:manage"),
    })
    return NextResponse.json(training)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Capacitación no encontrada" }, { status: 404 })
    }
    logError("Error al obtener capacitación", { module: "capacitaciones", action: "get", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/capacitaciones/[id] — editar (admin) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    logWarn("Permiso denegado para editar capacitación", {
      module: "capacitaciones", action: "edit_denied", user: session.id,
    })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const trainingId = Number.parseInt(id, 10)
    if (!trainingId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    const data = await request.json()
    if (data.title !== undefined && !data.title?.trim()) {
      return NextResponse.json({ error: "El título no puede estar vacío" }, { status: 422 })
    }

    const training = await updateTraining(trainingId, data)
    logInfo("Capacitación actualizada", {
      module: "capacitaciones", action: "edit", user: session.id, meta: { id: trainingId },
    })
    logActivityEvent({ event_type: "edit", module: "capacitaciones", action: "edit", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json(training)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Capacitación no encontrada" }, { status: 404 })
    }
    logError("Error al actualizar capacitación", { module: "capacitaciones", action: "edit", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/**
 * DELETE /api/capacitaciones/[id] — baja (admin).
 * Se lleva el contenido; las habilitaciones y los pagos quedan, porque son
 * registros de algo que efectivamente pasó.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const trainingId = Number.parseInt(id, 10)
    if (!trainingId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    await deleteTraining(trainingId)
    logInfo("Capacitación eliminada", {
      module: "capacitaciones", action: "delete", user: session.id, meta: { id: trainingId },
    })
    logActivityEvent({ event_type: "delete", module: "capacitaciones", action: "delete", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Capacitación no encontrada" }, { status: 404 })
    }
    logError("Error al eliminar capacitación", { module: "capacitaciones", action: "delete", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
