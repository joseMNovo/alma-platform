import { type NextRequest, NextResponse } from "next/server"
import { deletePushSubscription } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

// POST /api/push/unsubscribe → borra la suscripción por su endpoint.
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  try {
    const { endpoint } = await request.json()
    if (!endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 })
    await deletePushSubscription(endpoint)
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar suscripción push", { module: "push", action: "unsubscribe", user: session.id, error })
    return NextResponse.json({ error: "Error al desuscribir" }, { status: 500 })
  }
}
