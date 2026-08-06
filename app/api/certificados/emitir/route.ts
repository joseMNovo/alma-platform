import { type NextRequest, NextResponse } from "next/server"
import { issueCertificate, issueCertificatesBulk } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { detalleDeValidacion } from "@/lib/api-errors"
import { logInfo, logError } from "@/lib/logger"

/**
 * POST /api/certificados/emitir — emisión a mano.
 *
 * Con `person_ids` (arreglo) emite a varios de una; con `person_id` emite a
 * uno. Es la vía para los cursos presenciales y para cualquier caso que la
 * emisión automática no cubra.
 *
 * Emitir de nuevo sobre alguien que ya tiene su certificado lo ACTUALIZA y
 * conserva el código: el link que ya circuló sigue funcionando.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()

    if (Array.isArray(data?.person_ids)) {
      if (!data.person_ids.length) {
        return NextResponse.json({ error: "No seleccionaste a nadie" }, { status: 422 })
      }
      if (!data.training_id) {
        return NextResponse.json({ error: "Falta la capacitación" }, { status: 422 })
      }

      const emitidos = await issueCertificatesBulk({
        person_ids: data.person_ids,
        training_id: data.training_id,
        issued_by_volunteer_id: session.id || null,
      })

      logInfo("Emisión masiva de certificados", {
        module: "certificados", action: "emitir_masivo", user: session.id,
        meta: { training_id: data.training_id, pedidos: data.person_ids.length, emitidos: emitidos.length },
      })
      return NextResponse.json(emitidos)
    }

    if (!data?.person_id) {
      return NextResponse.json({ error: "Falta la persona" }, { status: 422 })
    }

    const certificado = await issueCertificate({
      person_id: data.person_id,
      training_id: data.training_id ?? null,
      issued_by_volunteer_id: session.id || null,
    })

    logInfo("Certificado emitido", {
      module: "certificados", action: "emitir", user: session.id,
      meta: { code: certificado.code, person_id: data.person_id },
    })
    return NextResponse.json(certificado)
  } catch (error: any) {
    const message = String(error?.message ?? "")
    if (message.includes("404")) {
      return NextResponse.json({ error: "Capacitación no encontrada" }, { status: 404 })
    }
    if (message.includes("422")) {
      return NextResponse.json({ error: detalleDeValidacion(message) }, { status: 422 })
    }
    logError("Error al emitir certificados", {
      module: "certificados", action: "emitir", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
