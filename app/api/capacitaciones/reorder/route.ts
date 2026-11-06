import { type NextRequest, NextResponse } from "next/server"
import { reorderTrainings } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logError } from "@/lib/logger"

/**
 * PUT /api/capacitaciones/reorder — acomodar la vidriera (admin).
 *
 * El orden que se guarda es el que ve TODO el mundo, incluida la landing
 * pública de /academia, así que es un cambio de cara al afuera y no una
 * preferencia de quien lo toca. Por eso pide `capacitaciones:manage` y no
 * alcanza con estar logueado.
 */
export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const order = Array.isArray(body?.order) ? body.order : null

    // Se valida acá y no solo en el backend: un `order` con texto adentro
    // llegaría como id inválido y volvería un 422 sin explicación.
    if (!order || order.some((id: unknown) => !Number.isInteger(id))) {
      return NextResponse.json({ error: "Orden inválido" }, { status: 400 })
    }

    const trainings = await reorderTrainings(order)
    logInfo("Capacitaciones reordenadas", {
      module: "capacitaciones", action: "reorder", user: session.id,
      meta: { cuantas: order.length },
    })
    return NextResponse.json(trainings)
  } catch (error) {
    logError("Error al reordenar capacitaciones", {
      module: "capacitaciones", action: "reorder", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
