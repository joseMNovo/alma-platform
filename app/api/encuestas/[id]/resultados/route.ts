import { type NextRequest, NextResponse } from "next/server"
import { getSurveyResults } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/** GET /api/encuestas/[id]/resultados — quiénes rindieron y cómo les fue (admin) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    return NextResponse.json(await getSurveyResults(Number(id)))
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 })
    }
    logError("Error al obtener los resultados", {
      module: "encuestas", action: "resultados", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
