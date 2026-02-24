import { type NextRequest, NextResponse } from "next/server"
import { getActivities, createActivity, updateActivity, deleteActivity } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

export async function GET() {
  try {
    const activities = await getActivities()
    return NextResponse.json(activities)
  } catch (error) {
    logError("Error al obtener actividades", { module: "actividades", action: "list" })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "actividades:create")) {
    logWarn("Permiso denegado para crear actividad", { module: "actividades", action: "create_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const activity = await createActivity({
      name: data.name,
      description: data.description || undefined,
      status: data.status || "activo",
    })
    logInfo("Actividad creada", { module: "actividades", action: "create_activity", user: session.id, meta: { id: activity.id, name: activity.name } })
    return NextResponse.json(activity)
  } catch (error) {
    logError("Error al crear actividad", { module: "actividades", action: "create_activity", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "actividades:edit")) {
    logWarn("Permiso denegado para editar actividad", { module: "actividades", action: "edit_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = await request.json()
    const activity = await updateActivity(id, {
      name: data.name,
      description: data.description,
      status: data.status,
    })
    logInfo("Actividad actualizada", { module: "actividades", action: "edit_activity", user: session.id, meta: { id } })
    return NextResponse.json(activity)
  } catch (error) {
    logError("Error al actualizar actividad", { module: "actividades", action: "edit_activity", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "actividades:delete")) {
    logWarn("Permiso denegado para eliminar actividad", { module: "actividades", action: "delete_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    await deleteActivity(id)
    logInfo("Actividad eliminada", { module: "actividades", action: "delete_activity", user: session.id, meta: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar actividad", { module: "actividades", action: "delete_activity", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
