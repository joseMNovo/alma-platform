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
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const history = await getGroupHistory(Number.parseInt(params.id))
    return NextResponse.json(history)
  } catch (error) {
    logError("Error al obtener historial", { module: "group_histories", action: "get", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/grupos/historiales/[id] — edita un historial (y reemplaza sus asistentes) */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:edit")) {
    logWarn("Permiso denegado para editar historial", { module: "group_histories", action: "edit_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.group_id || !data.session_date || !data.summary?.trim()) {
      return NextResponse.json({ error: "Grupo, fecha y comentarios son obligatorios" }, { status: 422 })
    }
    const history = await updateGroupHistory(Number.parseInt(params.id), {
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

/** DELETE /api/grupos/historiales/[id] — elimina un historial (admin) */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:delete")) {
    logWarn("Permiso denegado para eliminar historial", { module: "group_histories", action: "delete_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    await deleteGroupHistory(Number.parseInt(params.id))
    logInfo("Historial eliminado", { module: "group_histories", action: "delete", user: session.id, meta: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar historial", { module: "group_histories", action: "delete", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
