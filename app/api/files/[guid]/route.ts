import { type NextRequest, NextResponse } from "next/server"
import { getFileMeta, updateFileMeta, deleteFile, logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** GET /api/files/[guid] — metadata del archivo */
export async function GET(request: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { guid } = await params
  try {
    return NextResponse.json(await getFileMeta(guid))
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }
    logError("Error al obtener archivo", { module: "files", action: "get", user: session.id, error, meta: { guid } })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/files/[guid] — metadata (renombrar, reasignar dueño, reactivar) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "files:edit")) {
    logWarn("Permiso denegado para editar archivo", { module: "files", action: "edit_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { guid } = await params
  try {
    const data = await request.json()
    const file = await updateFileMeta(guid, {
      name: data.name?.trim(),
      purpose: data.purpose?.trim(),
      owner_type: data.owner_type ?? undefined,
      owner_id: data.owner_id ?? undefined,
      is_active: data.is_active,
    })
    logInfo("Archivo actualizado", { module: "files", action: "edit", user: session.id, meta: { guid } })
    return NextResponse.json(file)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }
    logError("Error al actualizar archivo", { module: "files", action: "edit", user: session.id, error, meta: { guid } })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/**
 * DELETE /api/files/[guid] — baja del archivo.
 *
 * Sin parámetros: baja lógica (el archivo queda en disco, se puede reactivar).
 * Con ?purge=true: borra el archivo físico. Es irreversible y solo admin, y
 * siempre nace de una acción explícita en el ABM — no hay limpieza automática.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { guid } = await params
  const purge = new URL(request.url).searchParams.get("purge") === "true"

  // La baja lógica la puede hacer cualquier no-participante; el borrado real, solo admin.
  const action = purge ? "files:delete" : "files:edit"
  if (!can(session, action)) {
    logWarn("Permiso denegado para eliminar archivo", {
      module: "files", action: "delete_denied", user: session.id, meta: { guid, purge },
    })
    return NextResponse.json(
      { error: purge ? "Solo un administrador puede eliminar archivos definitivamente" : "Sin permisos" },
      { status: 403 },
    )
  }

  try {
    await deleteFile(guid, { purge, volunteerId: session.id || undefined })
    logInfo(purge ? "Archivo eliminado definitivamente" : "Archivo dado de baja", {
      module: "files", action: purge ? "purge" : "deactivate", user: session.id, meta: { guid },
    })
    logActivityEvent({ event_type: "delete", module: "files", action: purge ? "purge" : "deactivate", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json({ success: true, purged: purge })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }
    logError("Error al eliminar archivo", { module: "files", action: "delete", user: session.id, error, meta: { guid } })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
