import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { updatePersona, deletePersona } from "@/lib/data-manager"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** PUT /api/personas/registros/[id] — modificación de una persona */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "personas:edit")) {
    logWarn("Permiso denegado para editar persona", { module: "personas", action: "edit_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const personaId = Number.parseInt(id, 10)
    if (!personaId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    const data = await request.json()
    if (!data.name?.trim() || !data.last_name?.trim()) {
      return NextResponse.json({ error: "Nombre y apellido son obligatorios" }, { status: 422 })
    }

    const persona = await updatePersona(personaId, data)
    logInfo("Persona actualizada", { module: "personas", action: "edit", user: session.id, meta: { id: personaId } })
    return NextResponse.json(persona)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("409")) {
      return NextResponse.json({ error: "Ya existe una persona con ese email" }, { status: 409 })
    }
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    }
    logError("Error al actualizar persona", { module: "personas", action: "edit", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** DELETE /api/personas/registros/[id] — baja de una persona (admin) */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "personas:delete")) {
    logWarn("Permiso denegado para eliminar persona", { module: "personas", action: "delete_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const personaId = Number.parseInt(id, 10)
    if (!personaId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    await deletePersona(personaId)
    logInfo("Persona eliminada", { module: "personas", action: "delete", user: session.id, meta: { id: personaId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    }
    logError("Error al eliminar persona", { module: "personas", action: "delete", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
