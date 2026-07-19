import { type NextRequest, NextResponse } from "next/server"
import { logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

// POST /api/tracking → registra un evento de vista de módulo (click del usuario en el dashboard)
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    await logActivityEvent({
      event_type: "view",
      module: body.module ?? null,
      action: null,
      user_type: toUserType(session.role),
      user_id: session.id,
      role: session.role,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    // El tracking nunca debe romper la navegación: logueamos y devolvemos ok=false.
    logError("Error al registrar evento de vista", { module: "tracking", action: "log_view", user: session.id, error })
    return NextResponse.json({ success: false })
  }
}
