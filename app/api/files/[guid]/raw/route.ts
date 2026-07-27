import { type NextRequest, NextResponse } from "next/server"
import { getFileRaw } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

/**
 * GET /api/files/[guid]/raw — los BYTES del archivo.
 *
 * Es lo que consume un <img src="/api/files/<guid>/raw">. Se pasan tal cual
 * vienen del backend, con su Content-Type y su Cache-Control: como el guid es
 * inmutable, el navegador lo baja una sola vez y después lo sirve de cache.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { guid } = await params

  try {
    const upstream = await getFileRaw(guid)
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/octet-stream",
        // private: es contenido de la plataforma, no debe quedar en caches compartidas.
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Length": String(body.byteLength),
      },
    })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }
    logError("Error al servir archivo", { module: "files", action: "raw", user: session.id, error, meta: { guid } })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
