import { type NextRequest, NextResponse } from "next/server"
import {
  createTrainingItem, updateTrainingItem, deleteTrainingItem,
  logActivityEvent, toUserType,
} from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** Toda la gestión de contenido es admin: cargar, editar y borrar piezas. */
function denyIfNotManager(session: any) {
  if (!can(session, "capacitaciones:manage")) {
    logWarn("Permiso denegado sobre contenido de capacitación", {
      module: "capacitaciones", action: "item_denied", user: session.id,
    })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  return null
}

/** POST /api/capacitaciones/items — agregar contenido. training_id en el body. */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyIfNotManager(session)
  if (denied) return denied

  try {
    const data = await request.json()
    const trainingId = Number.parseInt(String(data.training_id ?? 0), 10)
    if (!trainingId) return NextResponse.json({ error: "Falta la capacitación" }, { status: 400 })
    if (!data.title?.trim()) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 422 })
    }
    if ((data.kind ?? "video") === "video" && !data.video_ref?.trim()) {
      return NextResponse.json({ error: "Pegá el link del video de YouTube" }, { status: 422 })
    }

    const item = await createTrainingItem(trainingId, { ...data, title: data.title.trim() })
    logInfo("Contenido agregado", {
      module: "capacitaciones", action: "create_item", user: session.id,
      meta: { training_id: trainingId, item_id: item.id, kind: item.kind },
    })
    logActivityEvent({ event_type: "create", module: "capacitaciones", action: "create_item", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json(item)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("422")) {
      return NextResponse.json({ error: "El link de YouTube no es válido" }, { status: 422 })
    }
    logError("Error al agregar contenido", { module: "capacitaciones", action: "create_item", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/capacitaciones/items?id=N — editar una pieza */
export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyIfNotManager(session)
  if (denied) return denied

  try {
    const itemId = Number.parseInt(new URL(request.url).searchParams.get("id") || "0", 10)
    if (!itemId) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    const data = await request.json()
    const item = await updateTrainingItem(itemId, data)
    logInfo("Contenido actualizado", {
      module: "capacitaciones", action: "edit_item", user: session.id, meta: { item_id: itemId },
    })
    return NextResponse.json(item)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("422")) {
      return NextResponse.json({ error: "El link de YouTube no es válido" }, { status: 422 })
    }
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 })
    }
    logError("Error al actualizar contenido", { module: "capacitaciones", action: "edit_item", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** DELETE /api/capacitaciones/items?id=N — quitar una pieza */
export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyIfNotManager(session)
  if (denied) return denied

  try {
    const itemId = Number.parseInt(new URL(request.url).searchParams.get("id") || "0", 10)
    if (!itemId) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await deleteTrainingItem(itemId)
    logInfo("Contenido eliminado", {
      module: "capacitaciones", action: "delete_item", user: session.id, meta: { item_id: itemId },
    })
    logActivityEvent({ event_type: "delete", module: "capacitaciones", action: "delete_item", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 })
    }
    logError("Error al eliminar contenido", { module: "capacitaciones", action: "delete_item", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
