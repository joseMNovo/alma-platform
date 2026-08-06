import { type NextRequest, NextResponse } from "next/server"
import { getCertificateSample } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError } from "@/lib/logger"

/**
 * POST /api/certificados/muestra — PDF de ejemplo.
 *
 * Devuelve los BYTES del PDF tal como los arma el backend. Se le manda la
 * plantilla completa (no un id) para previsualizar lo que la persona está
 * escribiendo, sin obligarla a guardar primero.
 *
 * Esta ruta gana sobre /api/certificados/[id] porque en Next las rutas
 * estáticas resuelven antes que las dinámicas.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const upstream = await getCertificateSample(data)
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="certificado-muestra.pdf"',
        // Cambia con cada tecla que toca el que escribe la plantilla.
        "Cache-Control": "no-store",
        "Content-Length": String(body.byteLength),
      },
    })
  } catch (error) {
    logError("Error al generar el PDF de muestra", {
      module: "certificados", action: "sample", user: session.id, error,
    })
    return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 500 })
  }
}
