import { type NextRequest, NextResponse } from "next/server"
import { getWorkshops, createWorkshop, updateWorkshop, deleteWorkshop } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

export async function GET() {
  try {
    const workshops = await getWorkshops()
    return NextResponse.json(workshops)
  } catch (error) {
    logError("Error al obtener talleres", { module: "talleres", action: "list" })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "talleres:create")) {
    logWarn("Permiso denegado para crear taller", { module: "talleres", action: "create_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const workshop = await createWorkshop({
      name: data.name,
      description: data.description || undefined,
      instructor: data.instructor || undefined,
      date: data.date || undefined,
      schedule: data.schedule || undefined,
      capacity: Number.parseInt(data.capacity),
      cost: Number.parseInt(data.cost),
      status: data.status || "activo",
    })
    logInfo("Taller creado", { module: "talleres", action: "create_workshop", user: session.id, meta: { id: workshop.id, name: workshop.name } })
    return NextResponse.json(workshop)
  } catch (error) {
    logError("Error al crear taller", { module: "talleres", action: "create_workshop", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "talleres:edit")) {
    logWarn("Permiso denegado para editar taller", { module: "talleres", action: "edit_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = await request.json()
    const workshop = await updateWorkshop(id, {
      name: data.name,
      description: data.description,
      instructor: data.instructor,
      date: data.date,
      schedule: data.schedule,
      capacity: data.capacity !== undefined ? Number.parseInt(data.capacity) : undefined,
      cost: data.cost !== undefined ? Number.parseInt(data.cost) : undefined,
      enrolled: data.enrolled,
      status: data.status,
    })
    logInfo("Taller actualizado", { module: "talleres", action: "edit_workshop", user: session.id, meta: { id } })
    return NextResponse.json(workshop)
  } catch (error) {
    logError("Error al actualizar taller", { module: "talleres", action: "edit_workshop", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "talleres:delete")) {
    logWarn("Permiso denegado para eliminar taller", { module: "talleres", action: "delete_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    await deleteWorkshop(id)
    logInfo("Taller eliminado", { module: "talleres", action: "delete_workshop", user: session.id, meta: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar taller", { module: "talleres", action: "delete_workshop", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
