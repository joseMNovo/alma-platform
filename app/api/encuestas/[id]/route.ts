import { type NextRequest, NextResponse } from "next/server"
import { getSurvey, updateSurvey, deleteSurvey } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { detalleDeValidacion } from "@/lib/api-errors"
import { logInfo, logError } from "@/lib/logger"

function noAutorizado(session: any) {
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  return null
}

/** GET /api/encuestas/[id] — detalle con respuestas correctas (admin) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  const rechazo = noAutorizado(session)
  if (rechazo) return rechazo

  try {
    const { id } = await params
    return NextResponse.json(await getSurvey(Number(id)))
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 })
    }
    logError("Error al obtener la encuesta", { module: "encuestas", action: "get", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/encuestas/[id] — editar ajustes (admin) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  const rechazo = noAutorizado(session)
  if (rechazo) return rechazo

  try {
    const { id } = await params
    const data = await request.json()
    const survey = await updateSurvey(Number(id), data)

    logInfo("Encuesta actualizada", {
      module: "encuestas", action: "edit", user: session!.id, meta: { id },
    })
    return NextResponse.json(survey)
  } catch (error: any) {
    const message = String(error?.message ?? "")
    if (message.includes("404")) {
      return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 })
    }
    if (message.includes("422")) {
      return NextResponse.json({ error: detalleDeValidacion(message) }, { status: 422 })
    }
    logError("Error al actualizar la encuesta", { module: "encuestas", action: "edit", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/**
 * DELETE /api/encuestas/[id] — borrar (admin).
 * El backend devuelve 409 si ya la rindió alguien: borrarla perdería el
 * registro de quiénes aprobaron.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  const rechazo = noAutorizado(session)
  if (rechazo) return rechazo

  try {
    const { id } = await params
    await deleteSurvey(Number(id))
    logInfo("Encuesta eliminada", {
      module: "encuestas", action: "delete", user: session!.id, meta: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message = String(error?.message ?? "")
    if (message.includes("404")) {
      return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 })
    }
    if (message.includes("409")) {
      return NextResponse.json(
        {
          error:
            "Ya hay gente que la rindió. Despublicala en vez de borrarla: borrarla perdería el registro de quiénes aprobaron.",
        },
        { status: 409 },
      )
    }
    logError("Error al eliminar la encuesta", { module: "encuestas", action: "delete", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
