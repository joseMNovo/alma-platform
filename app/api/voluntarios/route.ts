import { type NextRequest, NextResponse } from "next/server"
import { getVolunteers, createVolunteer, updateVolunteer, deleteVolunteer, type InventoryItem } from "@/lib/data-manager"
import { api } from "@/lib/api-client"
import { getSessionUser } from "@/lib/serverAuth"
import { logInfo, logWarn, logError } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const id = searchParams.get("id")

    if (id) {
      const volunteer = await api.get<any>(`/voluntarios/${id}`)
      return NextResponse.json(volunteer)
    }

    if (status) {
      const volunteers = await api.get<any[]>(`/voluntarios/?status=${status}`)
      return NextResponse.json(volunteers)
    }

    const volunteers = await getVolunteers()
    return NextResponse.json(volunteers)
  } catch (error) {
    logError("Error al listar voluntarios", { module: "voluntarios", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!session.is_admin) {
    logWarn("Permiso denegado para crear voluntario", { module: "voluntarios", action: "create_volunteer", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()

    const volunteer = await createVolunteer({
      name: data.name,
      last_name: data.last_name || undefined,
      age: data.age ? Number.parseInt(data.age) : undefined,
      gender: data.gender || undefined,
      photo: data.photo || null,
      phone: data.phone || undefined,
      email: data.email || undefined,
      birth_date: data.birth_date || undefined,
      registration_date: new Date().toISOString().split("T")[0],
      status: "activo",
      specialties: data.specialties || [],
      is_admin: data.is_admin || false,
    })

    logInfo("Voluntario creado", { module: "voluntarios", action: "create_volunteer", meta: { id: (volunteer as any)?.id } })
    return NextResponse.json(volunteer)
  } catch (error) {
    logError("Error al crear voluntario", { module: "voluntarios", action: "create_volunteer", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")

    // Admin puede editar cualquier voluntario; un voluntario solo puede editarse a sí mismo
    if (!session.is_admin && session.id !== id) {
      logWarn("Permiso denegado para editar voluntario", { module: "voluntarios", action: "edit_volunteer", user: session.id, meta: { target_id: id } })
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const data = await request.json()

    // Solo admin puede cambiar is_admin
    if (!session.is_admin) delete data.is_admin

    const volunteer = await updateVolunteer(id, {
      ...data,
      age: data.age ? Number.parseInt(data.age) : data.age,
    })

    logInfo("Voluntario actualizado", { module: "voluntarios", action: "edit_volunteer", user: session.id, meta: { id } })
    return NextResponse.json(volunteer)
  } catch (error) {
    logError("Error al actualizar voluntario", { module: "voluntarios", action: "edit_volunteer", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!session.is_admin) {
    logWarn("Permiso denegado para eliminar voluntario", { module: "voluntarios", action: "delete_volunteer", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")

    // Check if volunteer is assigned to any inventory items
    const assigned = await api.get<InventoryItem[]>(`/inventario/?assigned_volunteer_id=${id}&limit=1`)
    if (assigned.length > 0) {
      logWarn("Intento de eliminar voluntario con items asignados en inventario", { module: "voluntarios", action: "delete_volunteer", meta: { id } })
      return NextResponse.json(
        { error: "No se puede eliminar el voluntario porque tiene items asignados en el inventario" },
        { status: 400 }
      )
    }

    await deleteVolunteer(id)
    logInfo("Voluntario eliminado", { module: "voluntarios", action: "delete_volunteer", meta: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar voluntario", { module: "voluntarios", action: "delete_volunteer", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
