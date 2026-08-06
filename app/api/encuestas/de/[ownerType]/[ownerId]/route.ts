import { type NextRequest, NextResponse } from "next/server"
import { getSurveyForOwner, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * GET /api/encuestas/de/[ownerType]/[ownerId] — la evaluación de un ítem,
 * lista para rendir.
 *
 * Esta es la ruta del ALUMNO. El backend la sirve con otro serializador que
 * NO incluye `is_correct`: si las respuestas correctas llegaran al navegador,
 * cualquiera las lee en las herramientas de desarrollo.
 *
 * Devuelve null cuando el ítem no tiene evaluación o está en borrador — no es
 * un error, es que no hay nada que rendir.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ownerType: string; ownerId: string }> },
) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { ownerType, ownerId } = await params
    const url = new URL(request.url)

    const survey = await getSurveyForOwner(
      ownerType,
      Number(ownerId),
      toUserType(session.role),
      session.id,
      url.searchParams.get("kind") || "evaluacion",
    )
    return NextResponse.json(survey)
  } catch (error) {
    logError("Error al obtener la evaluación", {
      module: "encuestas", action: "de_owner", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
