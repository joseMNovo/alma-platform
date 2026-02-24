import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/serverAuth"
import { getPersonasCounts } from "@/lib/data-manager"

/**
 * GET /api/personas
 * Returns counts of active volunteers and active participants.
 * Accessible by voluntarios and admins only.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (session.role === "participante") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const counts = await getPersonasCounts()
    return NextResponse.json(counts)
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
