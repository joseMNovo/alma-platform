import { type NextRequest, NextResponse } from "next/server"
import { getMyAccess, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

/**
 * GET /api/accesos/mios — habilitaciones vigentes del usuario logueado.
 *
 * El dashboard la llama al montar para saber qué pestañas mostrar. Es SOLO
 * para pintar la UI: cada endpoint vuelve a verificar el acceso del lado del
 * servidor. Si alguien falsea esta respuesta no gana nada.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    return NextResponse.json(await getMyAccess(toUserType(session.role), session.id))
  } catch (error) {
    logError("Error al obtener mis accesos", { module: "accesos", action: "mios", user: session.id, error })
    // Ante un fallo se devuelve vacío: la UI cae a lo que da el rol,
    // que es el comportamiento seguro (nunca de más).
    return NextResponse.json({ person_id: null, grants: [] })
  }
}
