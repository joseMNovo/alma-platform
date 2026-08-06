import { type NextRequest, NextResponse } from "next/server"
import { getCertificatePdf } from "@/lib/data-manager"
import { logError } from "@/lib/logger"

/**
 * GET /api/publico/certificado/[code]/pdf — el PDF del certificado.
 *
 * PÚBLICO por diseño: es lo que hace que el link del mail funcione solo, sin
 * pedirle a la persona que se loguee para bajar algo que es suyo.
 *
 * El código es aleatorio entre 32^8 combinaciones, así que no se puede llegar
 * probando. Pero quien tenga el código puede descargarlo — si algún día hace
 * falta que sea privado, se le suma el chequeo de sesión acá y listo.
 *
 * El PDF no existe como archivo: el backend lo dibuja en el momento a partir
 * del texto que quedó congelado al emitir.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  try {
    const upstream = await getCertificatePdf(code)
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificado-${code.toLowerCase()}.pdf"`,
        "Cache-Control": "no-store",
        "Content-Length": String(body.byteLength),
      },
    })
  } catch (error: any) {
    const message = String(error?.message ?? "")
    if (message.includes("404")) {
      return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 })
    }
    if (message.includes("409")) {
      return NextResponse.json({ error: "Este certificado fue anulado" }, { status: 409 })
    }
    logError("Error al generar el PDF del certificado", {
      module: "certificados", action: "pdf", meta: { code }, error,
    })
    return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 500 })
  }
}
