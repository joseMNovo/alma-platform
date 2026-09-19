import { type NextRequest, NextResponse } from "next/server"
import { getStandSummary } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/** Caja del puesto: recaudación total, efectivo vs transferencia y el
 *  desglose por producto. Todo calculado sobre las ventas no anuladas. */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:sell")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    return NextResponse.json(await getStandSummary())
  } catch (error) {
    logError("Error al obtener la caja del stand", { module: "stand", action: "summary", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
