import { type NextRequest, NextResponse } from "next/server"
import { getFileRaw, getPublicTrainings } from "@/lib/data-manager"
import { logError } from "@/lib/logger"

/**
 * GET /api/capacitaciones/portada/[guid] — portada de una capacitación, PÚBLICA.
 *
 * Existe porque /api/files/[guid]/raw exige sesión, y la vidriera (/academia y
 * las landings /capacitacion/<slug>) la mira gente sin cuenta: con aquella ruta
 * las portadas salían rotas para el visitante, que es justo a quien queremos
 * convencer.
 *
 * No es "el ABM de archivos sin login": solo sirve un guid si es la portada de
 * una capacitación PUBLICADA. Cualquier otro archivo del sistema (fotos de
 * personas, adjuntos) devuelve 404 por más que se adivine el guid.
 *
 * La usan también las vistas internas: así hay UNA sola URL de portada y no
 * dos que se pueden desincronizar. No se pierde nada — es contenido que ya
 * está publicado.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const { guid } = await params

  try {
    const trainings = await getPublicTrainings()
    const isPublicCover = trainings.some((t) => t.cover_file_guid === guid)

    if (!isPublicCover) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }

    const upstream = await getFileRaw(guid)
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/octet-stream",
        // public (no private como el ABM): es una portada de difusión, y que
        // la cachee el CDN/Nginx es justamente lo que queremos. El guid es
        // inmutable: cambiar la portada genera otro guid.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(body.byteLength),
      },
    })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }
    logError("Error al servir la portada de una capacitación", {
      module: "capacitaciones", action: "cover", meta: { guid }, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
