import { type NextRequest, NextResponse } from "next/server"
import { submitSurvey, toUserType, logActivityEvent } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logError } from "@/lib/logger"

/**
 * POST /api/encuestas/[id]/responder — entregar la evaluación.
 *
 * La identidad sale de la SESIÓN, no del cuerpo del pedido: si viniera del
 * cliente, cualquiera podría rendir a nombre de otro. Lo único que se manda
 * son las respuestas.
 *
 * La corrección pasa entera en el backend, y si aprueba, ahí mismo se emite
 * el certificado.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    const result = await submitSurvey(Number(id), {
      user_type: toUserType(session.role),
      user_id: session.id,
      answers: Array.isArray(body?.answers) ? body.answers : [],
    })

    logInfo("Evaluación entregada", {
      module: "encuestas", action: "responder", user: session.id,
      meta: { survey_id: id, score: result.score, passed: result.passed },
    })
    // "create": entregar una evaluación crea un intento. El tipo de evento
    // es un enum cerrado y no vale la pena ampliarlo por esto.
    logActivityEvent({
      event_type: "create", module: "encuestas", action: "responder",
      user_type: toUserType(session.role), user_id: session.id, role: session.role,
    }).catch(() => {})

    return NextResponse.json(result)
  } catch (error: any) {
    const message = String(error?.message ?? "")
    if (message.includes("404")) {
      return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 })
    }
    // 403: el backend rechaza rendir la evaluación de una capacitación a la
    // que esta persona no tiene acceso.
    if (message.includes("403")) {
      return NextResponse.json({ error: "No tenés acceso a esta capacitación." }, { status: 403 })
    }
    // 409: sin intentos, ya aprobada, o sin ficha de persona. El motivo del
    // backend es el que sirve mostrar.
    if (message.includes("409")) {
      const detalle = message.split("409:").pop()?.trim().replace(/^"|"$/g, "")
      return NextResponse.json(
        { error: detalle || "No podés rendir esta evaluación ahora" },
        { status: 409 },
      )
    }
    logError("Error al entregar la evaluación", {
      module: "encuestas", action: "responder", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
