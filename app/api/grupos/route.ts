import { type NextRequest, NextResponse } from "next/server"
import { getGroups, createGroup, updateGroup, deleteGroup } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

export async function GET() {
  try {
    const groups = await getGroups()
    return NextResponse.json(groups)
  } catch (error) {
    logError("Error al obtener grupos", { module: "grupos", action: "list" })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "grupos:create")) {
    logWarn("Permiso denegado para crear grupo", { module: "grupos", action: "create_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const group = await createGroup({
      name: data.name,
      description: data.description || undefined,
      coordinator: data.coordinator || undefined,
      day: data.day || undefined,
      schedule: data.schedule || undefined,
      status: data.status || "activo",
    })
    logInfo("Grupo creado", { module: "grupos", action: "create_group", user: session.id, meta: { id: group.id, name: group.name } })
    return NextResponse.json(group)
  } catch (error) {
    logError("Error al crear grupo", { module: "grupos", action: "create_group", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "grupos:edit")) {
    logWarn("Permiso denegado para editar grupo", { module: "grupos", action: "edit_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = await request.json()
    const group = await updateGroup(id, {
      name: data.name,
      description: data.description,
      coordinator: data.coordinator,
      day: data.day,
      schedule: data.schedule,
      participants: data.participants,
      status: data.status,
    })
    logInfo("Grupo actualizado", { module: "grupos", action: "edit_group", user: session.id, meta: { id } })
    return NextResponse.json(group)
  } catch (error) {
    logError("Error al actualizar grupo", { module: "grupos", action: "edit_group", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "grupos:delete")) {
    logWarn("Permiso denegado para eliminar grupo", { module: "grupos", action: "delete_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    await deleteGroup(id)
    logInfo("Grupo eliminado", { module: "grupos", action: "delete_group", user: session.id, meta: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar grupo", { module: "grupos", action: "delete_group", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
