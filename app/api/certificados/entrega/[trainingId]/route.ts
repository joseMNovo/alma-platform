import { type NextRequest, NextResponse } from "next/server"
import { getDeliveryBoard } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * GET /api/certificados/entrega/[trainingId] — el tablero de entrega.
 *
 * Devuelve una fila por persona con TODO su estado junto: si tiene acceso,
 * cuánto contenido completó, si aprobó la evaluación y si ya tiene (y si ya
 * se le mandó) el certificado. El cruce lo hace el backend a propósito: si lo
 * armara la pantalla, serían cuatro pedidos y la regla de "aprobó pero
 * todavía no tiene certificado" quedaría escrita en un componente.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainingId: string }> },
) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { trainingId } = await params
    return NextResponse.json(await getDeliveryBoard(Number(trainingId)))
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Capacitación no encontrada" }, { status: 404 })
    }
    logError("Error al armar el tablero de entrega", {
      module: "certificados", action: "entrega", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
