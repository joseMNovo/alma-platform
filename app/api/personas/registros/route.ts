import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { getPersonas, createPersona, type PersonaFilters } from "@/lib/data-manager"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** GET /api/personas/registros — lista la base de datos de personas (con filtros) */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "personas:view")) {
    logWarn("Permiso denegado para ver personas", { module: "personas", action: "list_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const filters: PersonaFilters = {
      name: url.searchParams.get("name") || undefined,
      last_name: url.searchParams.get("last_name") || undefined,
      cuit: url.searchParams.get("cuit") || undefined,
      city: url.searchParams.get("city") || undefined,
      province: url.searchParams.get("province") || undefined,
    }
    const personas = await getPersonas(filters)
    return NextResponse.json(personas)
  } catch (error) {
    logError("Error al listar personas", { module: "personas", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** POST /api/personas/registros — alta de una persona */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "personas:create")) {
    logWarn("Permiso denegado para crear persona", { module: "personas", action: "create_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.name?.trim() || !data.last_name?.trim()) {
      return NextResponse.json({ error: "Nombre y apellido son obligatorios" }, { status: 422 })
    }
    const persona = await createPersona(data)
    logInfo("Persona creada", { module: "personas", action: "create", user: session.id, meta: { id: persona.id } })
    return NextResponse.json(persona)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("409")) {
      return NextResponse.json({ error: "Ya existe una persona con ese email" }, { status: 409 })
    }
    logError("Error al crear persona", { module: "personas", action: "create", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
