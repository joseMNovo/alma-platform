import { type NextRequest, NextResponse } from "next/server"
import { saveSurveyQuestions } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { detalleDeValidacion } from "@/lib/api-errors"
import { logInfo, logError } from "@/lib/logger"

/**
 * PUT /api/encuestas/[id]/preguntas — guarda el cuestionario COMPLETO.
 *
 * Se manda el arreglo entero y el backend resuelve qué crear, actualizar y
 * borrar. Con endpoints sueltos por pregunta, reordenar y editar en la misma
 * pantalla exigiría coordinar varias llamadas, y un corte a mitad de camino
 * dejaría el cuestionario a medias.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const questions = await request.json()
    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 422 })
    }

    const survey = await saveSurveyQuestions(Number(id), questions)
    logInfo("Preguntas guardadas", {
      module: "encuestas", action: "save_questions", user: session.id,
      meta: { id, preguntas: questions.length },
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
    logError("Error al guardar las preguntas", {
      module: "encuestas", action: "save_questions", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
