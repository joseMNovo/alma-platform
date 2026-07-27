import { type NextRequest, NextResponse } from "next/server"
import { getPublicTraining } from "@/lib/data-manager"
import { logError } from "@/lib/logger"

/**
 * GET /api/publico/capacitacion/[slug] — datos de la landing PÚBLICA.
 *
 * Sin sesión a propósito: es el link que ALMA comparte en redes.
 *
 * El backend devuelve todos los ítems con locked=true y sin `video_ref`, así
 * que se puede mostrar el temario completo sin filtrar una sola línea de
 * contenido. Solo capacitaciones en estado "publicada".
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    const training = await getPublicTraining(slug)
    return NextResponse.json(training, {
      // Se cachea unos minutos: es una página de difusión, no cambia seguido.
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Capacitación no encontrada" }, { status: 404 })
    }
    logError("Error en la landing pública", { module: "capacitaciones", action: "public_landing", error, meta: { slug } })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
