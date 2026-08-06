import { type NextRequest, NextResponse } from "next/server"
import { getSurveys, createSurvey } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { detalleDeValidacion } from "@/lib/api-errors"
import { logInfo, logError } from "@/lib/logger"

/**
 * Encuestas y evaluaciones — vista de ADMINISTRACIÓN.
 *
 * Todo lo de este archivo incluye las respuestas correctas, así que exige
 * `capacitaciones:manage`. Lo que ve quien responde vive en `de/[ownerType]/...`
 * y pasa por otro serializador del backend.
 */

/** GET /api/encuestas — listar (admin) */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    return NextResponse.json(
      await getSurveys({
        ownerType: url.searchParams.get("owner_type") || undefined,
        ownerId: url.searchParams.get("owner_id")
          ? Number(url.searchParams.get("owner_id"))
          : undefined,
        kind: url.searchParams.get("kind") || undefined,
      }),
    )
  } catch (error) {
    logError("Error al listar encuestas", {
      module: "encuestas", action: "list", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** POST /api/encuestas — crear (admin) */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.title?.trim()) {
      return NextResponse.json({ error: "Ponele un título a la encuesta" }, { status: 422 })
    }

    const survey = await createSurvey({
      ...data,
      title: data.title.trim(),
      created_by_volunteer_id: session.id || null,
    })

    logInfo("Encuesta creada", {
      module: "encuestas", action: "create", user: session.id,
      meta: { id: survey.id, owner: `${survey.owner_type}:${survey.owner_id}` },
    })
    return NextResponse.json(survey)
  } catch (error: any) {
    const message = String(error?.message ?? "")
    // 409: ya existe una encuesta de ese tipo para ese ítem.
    if (message.includes("409")) {
      return NextResponse.json(
        { error: "Esta capacitación ya tiene una evaluación. Editá la que existe." },
        { status: 409 },
      )
    }
    if (message.includes("422")) {
      return NextResponse.json({ error: detalleDeValidacion(message) }, { status: 422 })
    }
    logError("Error al crear la encuesta", {
      module: "encuestas", action: "create", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
