import { type NextRequest, NextResponse } from "next/server"
import { broadcastNotification } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logInfo, logError } from "@/lib/logger"

// POST /api/notifications/broadcast → lanza una notificación a una audiencia.
// SOLO admin.
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (!session.is_admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 })

  try {
    const { title, body, audience, url, also_popup, volunteer_ids } = await request.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 })
    }

    const ids = Array.isArray(volunteer_ids)
      ? volunteer_ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n))
      : null

    const result = await broadcastNotification({
      title: title.trim(),
      body: (body || "").trim(),
      audience: audience || "voluntario",
      url: url || null,
      also_popup: !!also_popup,
      volunteer_ids: ids && ids.length > 0 ? ids : null,
    })
    logInfo("Broadcast lanzado", {
      module: "notifications",
      action: "broadcast",
      user: session.id,
      meta: {
        audience: audience || "voluntario",
        targeted: ids && ids.length > 0 ? ids.length : "audiencia",
        recipients: result.recipients,
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    logError("Error al lanzar broadcast", { module: "notifications", action: "broadcast", user: session.id, error })
    return NextResponse.json({ error: "Error al enviar la notificación" }, { status: 500 })
  }
}
