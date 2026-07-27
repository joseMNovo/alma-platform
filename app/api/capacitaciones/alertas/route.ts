import { type NextRequest, NextResponse } from "next/server"
import { getSharedAccountAlerts } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * GET /api/capacitaciones/alertas — posibles cuentas compartidas.
 *
 * Personas que reprodujeron desde muchas IPs distintas. Es SOLO informativo:
 * nunca se revoca por esto de forma automática. Las IPs móviles cambian todo
 * el tiempo y un falso positivo le cortaría el acceso a alguien que pagó.
 * La decisión la toma una persona mirando el caso.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:report")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const days = Number.parseInt(url.searchParams.get("days") || "7", 10)
    const minIps = Number.parseInt(url.searchParams.get("min_ips") || "4", 10)
    return NextResponse.json(await getSharedAccountAlerts(days, minIps))
  } catch (error) {
    logError("Error al obtener alertas", { module: "capacitaciones", action: "alerts", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
