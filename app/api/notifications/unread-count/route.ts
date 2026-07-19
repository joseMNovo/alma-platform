import { type NextRequest, NextResponse } from "next/server"
import { getUnreadCount } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

// GET /api/notifications/unread-count → conteo de no leídas (lo llama el polling)
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ unread: 0 })

  try {
    const userType = session.role === "participante" ? "participante" : "voluntario"
    const unread = await getUnreadCount(userType, session.id)
    return NextResponse.json({ unread })
  } catch (error) {
    // El badge no debe romper la app: ante fallo devolvemos 0.
    logError("Error al contar no leídas", { module: "notifications", action: "unread_count", user: session.id, error })
    return NextResponse.json({ unread: 0 })
  }
}
