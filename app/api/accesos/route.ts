import { type NextRequest, NextResponse } from "next/server"
import {
  getAccessMatrix, getResourceGrants, getPersonGrants,
  grantAccess, logActivityEvent, toUserType,
} from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/**
 * GET /api/accesos — las tres vistas del ABM, según los parámetros:
 *   ?module_key=capacitaciones                     → matriz personas × recursos
 *   ?module_key=capacitaciones&resource_id=7       → alumnos de ese recurso
 *   ?person_id=42                                  → habilitaciones de una persona
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const personId = url.searchParams.get("person_id")
    const moduleKey = url.searchParams.get("module_key")
    const resourceId = url.searchParams.get("resource_id")

    if (personId) {
      return NextResponse.json(await getPersonGrants(Number.parseInt(personId, 10)))
    }

    if (!moduleKey) {
      return NextResponse.json({ error: "Falta el módulo" }, { status: 400 })
    }

    if (resourceId !== null) {
      return NextResponse.json(
        await getResourceGrants(moduleKey, Number.parseInt(resourceId, 10), url.searchParams.get("only_live") !== "false"),
      )
    }

    return NextResponse.json(
      await getAccessMatrix(moduleKey, {
        search: url.searchParams.get("search") || undefined,
        onlyWithLogin: url.searchParams.get("only_with_login") === "true",
      }),
    )
  } catch (error) {
    logError("Error al consultar accesos", { module: "accesos", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/**
 * POST /api/accesos — habilitar a una persona.
 *
 * Si viene `payment`, la habilitación y el pago entran en la misma
 * transacción del backend: o quedan los dos, o no queda ninguno.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:manage")) {
    logWarn("Permiso denegado para habilitar acceso", {
      module: "accesos", action: "grant_denied", user: session.id,
    })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const personId = Number.parseInt(String(data.person_id ?? 0), 10)
    if (!personId) return NextResponse.json({ error: "Falta la persona" }, { status: 400 })
    if (!data.module_key?.trim()) return NextResponse.json({ error: "Falta el módulo" }, { status: 400 })

    if (data.payment && !(Number(data.payment.amount) > 0)) {
      return NextResponse.json({ error: "El monto del pago debe ser mayor a cero" }, { status: 422 })
    }

    const grant = await grantAccess({
      person_id: personId,
      module_key: data.module_key.trim(),
      resource_id: Number(data.resource_id) || 0,
      expires_at: data.expires_at || null,
      access_days: data.access_days ?? null,
      notes: data.notes?.trim() || null,
      actor_type: session.role === "admin" ? "admin" : "voluntario",
      actor_id: session.id || 0,
      payment: data.payment ?? null,
    })

    logInfo("Acceso habilitado", {
      module: "accesos", action: "grant", user: session.id,
      meta: {
        person_id: personId,
        module_key: data.module_key,
        resource_id: data.resource_id ?? 0,
        con_pago: Boolean(data.payment),
      },
    })
    logActivityEvent({ event_type: "create", module: "accesos", action: "grant", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json(grant)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    }
    logError("Error al habilitar acceso", { module: "accesos", action: "grant", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
