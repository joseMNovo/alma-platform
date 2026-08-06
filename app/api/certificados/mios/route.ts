import { type NextRequest, NextResponse } from "next/server"
import { getMyCertificates, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

/**
 * GET /api/certificados/mios — los certificados de quien pregunta.
 *
 * La identidad sale de la sesión, nunca de la URL: si viniera por parámetro,
 * cambiando un número se verían los certificados de otro.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    return NextResponse.json(
      await getMyCertificates(toUserType(session.role), session.id),
    )
  } catch (error) {
    logError("Error al listar mis certificados", {
      module: "certificados", action: "mios", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
