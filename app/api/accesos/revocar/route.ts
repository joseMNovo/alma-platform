import { type NextRequest, NextResponse } from "next/server"
import { revokeAccess, grantAccessBulk, logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logError } from "@/lib/logger"

/**
 * POST /api/accesos/revocar — quita el acceso (baja lógica).
 *
 * La fila queda como registro de que la habilitación existió, y los pagos NO
 * se tocan: la plata entró igual.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const personId = Number.parseInt(String(data.person_id ?? 0), 10)
    if (!personId || !data.module_key?.trim()) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    await revokeAccess({
      person_id: personId,
      module_key: data.module_key.trim(),
      resource_id: Number(data.resource_id) || 0,
      notes: data.notes?.trim() || null,
      actor_type: session.role === "admin" ? "admin" : "voluntario",
      actor_id: session.id || 0,
    })

    logInfo("Acceso revocado", {
      module: "accesos", action: "revoke", user: session.id,
      meta: { person_id: personId, module_key: data.module_key, resource_id: data.resource_id ?? 0 },
    })
    logActivityEvent({ event_type: "delete", module: "accesos", action: "revoke", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "La persona no tenía esa habilitación" }, { status: 404 })
    }
    logError("Error al revocar acceso", { module: "accesos", action: "revoke", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/accesos/revocar — habilitación masiva (mismo permiso, todo o nada) */
export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!Array.isArray(data.person_ids) || data.person_ids.length === 0) {
      return NextResponse.json({ error: "Seleccioná al menos una persona" }, { status: 422 })
    }
    if (!data.module_key?.trim()) return NextResponse.json({ error: "Falta el módulo" }, { status: 400 })

    const grants = await grantAccessBulk({
      person_ids: data.person_ids.map(Number),
      module_key: data.module_key.trim(),
      resource_id: Number(data.resource_id) || 0,
      expires_at: data.expires_at || null,
      access_days: data.access_days ?? null,
      notes: data.notes?.trim() || null,
      actor_type: session.role === "admin" ? "admin" : "voluntario",
      actor_id: session.id || 0,
    })

    logInfo("Habilitación masiva", {
      module: "accesos", action: "grant_bulk", user: session.id,
      meta: { cantidad: grants.length, module_key: data.module_key },
    })
    return NextResponse.json(grants)
  } catch (error) {
    logError("Error en habilitación masiva", { module: "accesos", action: "grant_bulk", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
