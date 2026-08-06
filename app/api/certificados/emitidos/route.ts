import { type NextRequest, NextResponse } from "next/server"
import { api } from "@/lib/api-client"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"
import type { Certificate } from "@/lib/data-manager"

/**
 * GET /api/certificados/emitidos — historial de certificados entregados.
 *
 * Incluye los anulados: el historial muestra que existieron y que se dieron
 * de baja, no los hace desaparecer.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const trainingId = url.searchParams.get("training_id")
    const qs = trainingId ? `?training_id=${encodeURIComponent(trainingId)}` : ""
    return NextResponse.json(await api.get<Certificate[]>(`/certificados/emitidos${qs}`))
  } catch (error) {
    logError("Error al listar los certificados emitidos", {
      module: "certificados", action: "emitidos", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
