import { type NextRequest, NextResponse } from "next/server"
import {
  getGroupHistory,
  updateGroupHistory,
  deleteGroupHistory,
} from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** GET /api/grupos/historiales/[id] — detalle de un historial */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id: idParam } = await params

  try {
    const history = await getGroupHistory(Number.parseInt(idParam))
    return NextResponse.json(history)
  } catch (error) {
    logError("Error al obtener historial", { module: "group_histories", action: "get", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/grupos/historiales/[id] — edita un historial (y reemplaza sus asistentes) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:edit")) {
    logWarn("Permiso denegado para editar historial", { module: "group_histories", action: "edit_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id: idParam } = await params

  try {
    const data = await request.json()
    if (!data.group_id || !data.session_date || !data.summary?.trim()) {
      return NextResponse.json({ error: "Grupo, fecha y comentarios son obligatorios" }, { status: 422 })
    }
    const history = await updateGroupHistory(Number.parseInt(idParam), {
      group_id: data.group_id ?? null,
      group_name: data.group_name ?? null,
      title: data.title ?? null,
      session_date: data.session_date ?? null,
      coordinator_volunteer_id: data.coordinator_volunteer_id ?? null,
      summary: data.summary ?? null,
      attendees: Array.isArray(data.attendees) ? data.attendees : undefined,
    })
    logInfo("Historial actualizado", { module: "group_histories", action: "edit", user: session.id, meta: { id: params.id } })
    return NextResponse.json(history)
  } catch (error) {
    logError("Error al actualizar historial", { module: "group_histories", action: "edit", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** DELETE /api/grupos/historiales/[id] — elimina un historial (admin: cualquiera; voluntario: solo los que cargó él) */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:delete")) {
    logWarn("Permiso denegado para eliminar historial", { module: "group_histories", action: "delete_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id: idParam } = await params
  const id = Number.parseInt(idParam)

  try {
    const history = await getGroupHistory(id)
    if (!history) return NextResponse.json({ error: "Historial no encontrado" }, { status: 404 })

    // Admin borra cualquiera; el voluntario solo los que cargó él.
    const isOwner = history.created_by_volunteer_id === session.id
    if (session.role !== "admin" && !isOwner) {
      logWarn("Intento de eliminar historial ajeno", { module: "group_histories", action: "delete_denied_not_owner", user: session.id, meta: { id } })
      return NextResponse.json({ error: "Solo podés eliminar los historiales que cargaste vos" }, { status: 403 })
    }

    await deleteGroupHistory(id)
    logInfo("Historial eliminado", { module: "group_histories", action: "delete", user: session.id, meta: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar historial", { module: "group_histories", action: "delete", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
