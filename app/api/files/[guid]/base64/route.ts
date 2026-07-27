import { type NextRequest, NextResponse } from "next/server"
import { getFileBase64 } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

/**
 * GET /api/files/[guid]/base64 — el archivo como texto base64 dentro de un JSON.
 *
 * Para mostrar imágenes usar /raw: se cachea en el navegador y viaja 33% más
 * liviano. Esta variante existe para los casos donde hace falta el contenido
 * embebido (generar un PDF en el cliente, adjuntarlo a un email, etc.).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { guid } = await params
  try {
    return NextResponse.json(await getFileBase64(guid))
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }
    logError("Error al obtener archivo en base64", { module: "files", action: "base64", user: session.id, error, meta: { guid } })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
