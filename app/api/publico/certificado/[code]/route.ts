import { type NextRequest, NextResponse } from "next/server"
import { verifyCertificate } from "@/lib/data-manager"
import { logError } from "@/lib/logger"

/**
 * GET /api/publico/certificado/[code] — verificación PÚBLICA.
 *
 * Sin sesión a propósito: existe para que un tercero —un empleador, otra
 * institución— confirme que el certificado que le mostraron es real. Si
 * pidiera login, no serviría para nada.
 *
 * Devuelve nombre, capacitación y fecha. NUNCA el DNI: no hace falta para
 * verificar y es un dato sensible.
 *
 * Un código inexistente devuelve 200 con `valido: false`, no un 404: la
 * página tiene que poder decir "este certificado no es válido" sin parecer
 * que se rompió.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  try {
    const resultado = await verifyCertificate(code)
    return NextResponse.json(resultado, {
      // Se consulta poco y tiene que reflejar una anulación al instante.
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    logError("Error al verificar un certificado", {
      module: "certificados", action: "verificar", meta: { code }, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
