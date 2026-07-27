import { type NextRequest, NextResponse } from "next/server"
import { getAccessAudit } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * GET /api/accesos/auditoria — historia de habilitaciones y pagos.
 *
 * Append-only: acá se ve quién habilitó o revocó a quién y cuándo, incluso
 * si después el estado cambió. Es la tabla que resuelve la discusión el día
 * que hay una discusión.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const personId = url.searchParams.get("person_id")
    const limit = url.searchParams.get("limit")
    return NextResponse.json(
      await getAccessAudit({
        personId: personId ? Number.parseInt(personId, 10) : undefined,
        moduleKey: url.searchParams.get("module_key") || undefined,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
      }),
    )
  } catch (error) {
    logError("Error al obtener auditoría", { module: "accesos", action: "audit", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
