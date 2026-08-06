import { type NextRequest, NextResponse } from "next/server"
import { checkTrainingVideo } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * POST /api/capacitaciones/check-video — valida el link antes de guardarlo.
 *
 * Detecta el error operativo más probable del módulo: subir el video como
 * «Privado». Los privados no se pueden insertar y la persona vería un cuadro
 * negro. De paso trae el título para autocompletar el formulario.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { url } = await request.json()
    if (!url?.trim()) return NextResponse.json({ error: "Pegá el link del video" }, { status: 422 })
    return NextResponse.json(await checkTrainingVideo(url.trim()))
  } catch (error) {
    logError("Error al verificar el video", { module: "capacitaciones", action: "check_video", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
