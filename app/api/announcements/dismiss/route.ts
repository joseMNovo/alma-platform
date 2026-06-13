import { type NextRequest, NextResponse } from "next/server"
import { dismissAnnouncement } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logInfo, logError } from "@/lib/logger"

// POST /api/announcements/dismiss { id } → "no volver a mostrar" para el usuario logueado
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { id } = await request.json()
    const announcementId = Number(id)
    if (!announcementId) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    const userType = session.role === "participante" ? "participante" : "voluntario"
    await dismissAnnouncement(announcementId, userType, session.id)
    logInfo("Anuncio descartado", { module: "announcements", action: "dismiss", user: session.id, meta: { id: announcementId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al descartar anuncio", { module: "announcements", action: "dismiss", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
