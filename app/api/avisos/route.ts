import { type NextRequest, NextResponse } from "next/server"
import { api } from "@/lib/api-client"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

/**
 * GET /api/avisos — qué le mandó el sistema a quién (mails + campanitas).
 *
 * Solo admin: el listado nombra a cada destinatario y muestra el asunto de
 * cada mail, así que es la correspondencia de toda la asociación junta. Que
 * lo vea cualquier voluntario sería otra cosa, no un panel de control.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!session.is_admin) return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  try {
    const p = new URL(request.url).searchParams
    const query = new URLSearchParams()
    for (const clave of ["days", "limit", "canal", "solo_automaticos"]) {
      const valor = p.get(clave)
      if (valor) query.set(clave, valor)
    }
    return NextResponse.json(await api.get<any[]>(`/avisos/?${query.toString()}`))
  } catch (error) {
    logError("Error al listar avisos enviados", { module: "avisos", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
