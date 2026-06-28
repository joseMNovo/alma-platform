import { type NextRequest, NextResponse } from "next/server"
import {
  getGroupHistories,
  createGroupHistory,
  type GroupHistoryFilters,
} from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** GET /api/grupos/historiales — lista el fichero de historiales (con búsqueda y filtro por grupo) */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:view")) {
    logWarn("Permiso denegado para ver historiales", { module: "group_histories", action: "list_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const groupIdRaw = url.searchParams.get("group_id")
    const filters: GroupHistoryFilters = {
      group_id: groupIdRaw ? Number.parseInt(groupIdRaw) : undefined,
      q: url.searchParams.get("q") || undefined,
    }
    const histories = await getGroupHistories(filters)
    return NextResponse.json(histories)
  } catch (error) {
    logError("Error al listar historiales", { module: "group_histories", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** POST /api/grupos/historiales — crea un historial de encuentro */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "historiales:create")) {
    logWarn("Permiso denegado para crear historial", { module: "group_histories", action: "create_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.group_id || !data.session_date || !data.summary?.trim()) {
      return NextResponse.json({ error: "Grupo, fecha y comentarios son obligatorios" }, { status: 422 })
    }
    // El creador siempre es el usuario logueado (no se confía en el body).
    const history = await createGroupHistory({
      group_id: data.group_id ?? null,
      group_name: data.group_name ?? null,
      title: data.title ?? null,
      session_date: data.session_date ?? null,
      coordinator_volunteer_id: data.coordinator_volunteer_id ?? session.id,
      summary: data.summary ?? null,
      created_by_volunteer_id: session.id,
      attendees: Array.isArray(data.attendees) ? data.attendees : [],
    })
    logInfo("Historial creado", { module: "group_histories", action: "create", user: session.id, meta: { id: history.id } })
    return NextResponse.json(history)
  } catch (error) {
    logError("Error al crear historial", { module: "group_histories", action: "create", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
