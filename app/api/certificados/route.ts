import { type NextRequest, NextResponse } from "next/server"
import { getCertificateTemplates, createCertificateTemplate } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"
import { detalleDeValidacion } from "@/lib/api-errors"

/**
 * Plantillas de certificado. Es la redacción del PDF, así que el permiso es
 * el mismo que administrar capacitaciones: no lo toca un voluntario común.
 */

/** GET /api/certificados — listar plantillas */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    return NextResponse.json(await getCertificateTemplates())
  } catch (error) {
    logError("Error al listar plantillas de certificado", {
      module: "certificados", action: "list", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** POST /api/certificados — crear plantilla */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    logWarn("Permiso denegado para crear plantilla de certificado", {
      module: "certificados", action: "create_denied", user: session.id,
    })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.name?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 422 })
    }

    const template = await createCertificateTemplate({
      ...data,
      name: data.name.trim(),
      created_by_volunteer_id: session.id || null,
    })

    logInfo("Plantilla de certificado creada", {
      module: "certificados", action: "create", user: session.id,
      meta: { id: template.id, name: template.name },
    })
    return NextResponse.json(template)
  } catch (error: any) {
    const message = String(error?.message ?? "")
    // Mismo criterio que en el PUT: el motivo del backend es el que sirve.
    if (message.includes("422")) {
      return NextResponse.json({ error: detalleDeValidacion(message) }, { status: 422 })
    }
    logError("Error al crear plantilla de certificado", {
      module: "certificados", action: "create", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
