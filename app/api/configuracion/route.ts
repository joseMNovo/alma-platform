import { type NextRequest, NextResponse } from "next/server"
import { getSettings, setSetting } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logError } from "@/lib/logger"

/**
 * Ajustes generales de la organización (tabla app_settings).
 *
 * Hoy el único es el link de pago de capacitaciones, así que el permiso es el
 * de administrarlas. Si algún día entran ajustes de otros módulos, esto pasa
 * a pedir un permiso propio.
 */

/** GET /api/configuracion — todos los ajustes */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    return NextResponse.json(await getSettings())
  } catch (error) {
    logError("Error al leer la configuración", {
      module: "configuracion", action: "list", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** PUT /api/configuracion — guarda un ajuste: { key, value } */
export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { key, value } = await request.json()
    if (!key) return NextResponse.json({ error: "Falta la clave del ajuste" }, { status: 422 })

    const result = await setSetting(key, value ?? null, session.id || null)
    logInfo("Ajuste actualizado", {
      module: "configuracion", action: "set", user: session.id, meta: { key },
    })
    return NextResponse.json(result)
  } catch (error: any) {
    const message = String(error?.message ?? "")
    // El backend valida que el link empiece con http(s) y que la clave exista.
    if (message.includes("422")) {
      const detail = message.split("422:").pop()?.trim().replace(/^"|"$/g, "")
      return NextResponse.json({ error: detail || "Valor inválido" }, { status: 422 })
    }
    logError("Error al guardar el ajuste", {
      module: "configuracion", action: "set", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
