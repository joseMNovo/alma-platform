import { type NextRequest, NextResponse } from "next/server"
import { uploadFile, getFiles, logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** GET /api/files — metadata de archivos, filtrable por uso y dueño */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const url = new URL(request.url)
    const ownerId = url.searchParams.get("owner_id")
    const files = await getFiles({
      purpose: url.searchParams.get("purpose") || undefined,
      owner_type: url.searchParams.get("owner_type") || undefined,
      owner_id: ownerId ? Number.parseInt(ownerId, 10) : undefined,
      include_inactive: url.searchParams.get("include_inactive") === "true",
    })
    return NextResponse.json(files)
  } catch (error) {
    logError("Error al listar archivos", { module: "files", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** POST /api/files — subida en base64. El backend valida tipo real, tamaño y optimiza. */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "files:upload")) {
    logWarn("Permiso denegado para subir archivo", { module: "files", action: "upload_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.name?.trim() || !data.purpose?.trim() || !data.data_base64) {
      return NextResponse.json({ error: "Faltan datos del archivo" }, { status: 422 })
    }

    const file = await uploadFile({
      name: data.name.trim(),
      mime_type: data.mime_type || "",
      purpose: data.purpose.trim(),
      data_base64: data.data_base64,
      owner_type: data.owner_type?.trim() || null,
      owner_id: data.owner_id ?? null,
      // El admin por env tiene id 0 y no existe en `voluntarios` → se guarda NULL.
      uploaded_by_volunteer_id: session.id || null,
    })

    logInfo("Archivo subido", {
      module: "files", action: "upload", user: session.id,
      meta: { guid: file.guid, purpose: file.purpose, kb: Math.round(file.size_bytes / 1024) },
    })
    logActivityEvent({ event_type: "create", module: "files", action: "upload", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json(file)
  } catch (error: any) {
    const message = String(error?.message ?? "")
    // El 422 del backend trae el motivo real (tipo no permitido, supera el máximo…)
    if (message.includes("422")) {
      const detail = message.split("422:").pop()?.trim().replace(/^"|"$/g, "")
      return NextResponse.json({ error: detail || "El archivo no es válido" }, { status: 422 })
    }
    logError("Error al subir archivo", { module: "files", action: "upload", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
