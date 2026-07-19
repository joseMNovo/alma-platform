import { type NextRequest, NextResponse } from "next/server"
import { getNotifications } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

// GET /api/notifications → notificaciones del usuario logueado (para la campanita)
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json([], { status: 200 })

  try {
    const userType = session.role === "participante" ? "participante" : "voluntario"
    const items = await getNotifications(userType, session.id)
    return NextResponse.json(items)
  } catch (error) {
    logError("Error al listar notificaciones", { module: "notifications", action: "list", user: session.id, error })
    return NextResponse.json([], { status: 200 })
  }
}
