import { type NextRequest, NextResponse } from "next/server"
import { savePushSubscription } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError, logInfo } from "@/lib/logger"

// POST /api/push/subscribe → guarda la suscripción del dispositivo.
// La identidad (user_type, user_id) se toma de la sesión, no del body.
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  try {
    const { endpoint, keys, user_agent } = await request.json()
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 })
    }

    const userType = session.role === "participante" ? "participante" : "voluntario"
    await savePushSubscription({
      user_type: userType,
      user_id: session.id,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      user_agent,
    })
    logInfo("Suscripción push guardada", { module: "push", action: "subscribe", user: session.id })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al guardar suscripción push", { module: "push", action: "subscribe", user: session.id, error })
    return NextResponse.json({ error: "Error al suscribir" }, { status: 500 })
  }
}
