import { type NextRequest, NextResponse } from "next/server"
import { getInscripciones } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * GET /api/calendarios/inscripciones — listado de anotados por evento, para la
 * sub-pestaña "Inscripciones" de Espacios. Cada fila = una persona en un
 * encuentro puntual. Es la vista que reemplaza al viejo "número de inscriptos".
 *
 * Solo staff (no participante): es información de gestión.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "calendar:edit")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    return NextResponse.json(
      await getInscripciones({
        type: url.searchParams.get("type") || undefined,
        date_from: url.searchParams.get("date_from") || undefined,
        date_to: url.searchParams.get("date_to") || undefined,
      }),
    )
  } catch (error) {
    logError("Error al listar inscripciones", { module: "calendarios", action: "inscripciones", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
