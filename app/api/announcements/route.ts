import { type NextRequest, NextResponse } from "next/server"
import { getPendingAnnouncement } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

// GET /api/announcements → anuncio pendiente para el usuario logueado (o null)
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  // Sin sesión no mostramos nada (el popup es para usuarios autenticados)
  if (!session) return NextResponse.json(null)

  try {
    const userType = session.role === "participante" ? "participante" : "voluntario"
    const announcement = await getPendingAnnouncement(userType, session.id, session.role)
    return NextResponse.json(announcement ?? null)
  } catch (error) {
    // No bloqueamos la app por un fallo del popup: devolvemos null
    logError("Error al obtener anuncio pendiente", { module: "announcements", action: "pending", user: session.id, error })
    return NextResponse.json(null)
  }
}
