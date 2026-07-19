import { type NextRequest, NextResponse } from "next/server"
import { markNotificationsRead } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

// POST /api/notifications/mark-read → marca leída una (?id=) o todas.
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  try {
    const idParam = request.nextUrl.searchParams.get("id")
    const id = idParam ? Number(idParam) : undefined
    const userType = session.role === "participante" ? "participante" : "voluntario"
    await markNotificationsRead(userType, session.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al marcar leídas", { module: "notifications", action: "mark_read", user: session.id, error })
    return NextResponse.json({ error: "Error al marcar leídas" }, { status: 500 })
  }
}
