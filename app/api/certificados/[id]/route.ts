import { type NextRequest, NextResponse } from "next/server"
import { updateCertificateTemplate, deleteCertificateTemplate } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logError } from "@/lib/logger"
import { detalleDeValidacion } from "@/lib/api-errors"

/** PUT /api/certificados/[id] — editar la redacción */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const templateId = Number.parseInt(id, 10)
    if (!templateId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    const data = await request.json()
    if (data.name !== undefined && !data.name?.trim()) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 422 })
    }

    const template = await updateCertificateTemplate(templateId, data)
    logInfo("Plantilla de certificado actualizada", {
      module: "certificados", action: "edit", user: session.id, meta: { id: templateId },
    })
    return NextResponse.json(template)
  } catch (error: any) {
    const message = String(error?.message ?? "")
    if (message.includes("404")) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }
    // El backend valida qué se puede imprimir (emojis, largos). Su mensaje es
    // el que hay que mostrar: un "error del servidor" no le dice nada a nadie.
    if (message.includes("422")) {
      return NextResponse.json({ error: detalleDeValidacion(message) }, { status: 422 })
    }
    logError("Error al actualizar plantilla de certificado", {
      module: "certificados", action: "edit", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/**
 * DELETE /api/certificados/[id] — borrar plantilla.
 * El backend devuelve 409 si es la predeterminada: siempre tiene que quedar
 * una, o la emisión se queda sin texto.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const templateId = Number.parseInt(id, 10)
    if (!templateId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    await deleteCertificateTemplate(templateId)
    logInfo("Plantilla de certificado eliminada", {
      module: "certificados", action: "delete", user: session.id, meta: { id: templateId },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message = String(error?.message ?? "")
    if (message.includes("404")) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }
    if (message.includes("409")) {
      return NextResponse.json(
        { error: "Es la plantilla predeterminada. Marcá otra antes de borrarla." },
        { status: 409 },
      )
    }
    logError("Error al eliminar plantilla de certificado", {
      module: "certificados", action: "delete", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
