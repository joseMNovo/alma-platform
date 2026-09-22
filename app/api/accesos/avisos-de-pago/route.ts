import { type NextRequest, NextResponse } from "next/server"
import {
  getPaymentClaims, createPaymentClaim, resolvePaymentClaim, getMyAccess, toUserType,
} from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/**
 * Avisos de pago: "ya pagué", con comprobante.
 *
 * No habilitan nada. Son una cola: un voluntario abre el comprobante y decide.
 * La plataforma nunca le cree al comprador; le cree a quien lo verificó.
 */

/** GET — la cola. Solo para quien administra accesos. */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const status = request.nextUrl.searchParams.get("status") || "pendiente"
    return NextResponse.json(await getPaymentClaims(status))
  } catch (error) {
    logError("Error al listar avisos de pago", { module: "accesos", action: "claims_list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** POST — lo manda quien compró, para sí mismo. */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json()

    /**
     * La persona se resuelve desde la SESIÓN, nunca desde el body. Si viniera
     * del navegador, cualquiera podría avisar un pago a nombre de otro y
     * conseguirle una habilitación que no pagó.
     */
    const acceso = await getMyAccess(toUserType(session.role), session.id)
    if (!acceso?.person_id) {
      logWarn("Aviso de pago sin persona asociada", { module: "accesos", action: "claim_denied", user: session.id })
      return NextResponse.json({ error: "Tu cuenta no está vinculada a una persona" }, { status: 409 })
    }

    const claim = await createPaymentClaim({
      person_id: acceso.person_id,
      concept_type: "capacitacion",
      concept_id: Number(body?.concept_id) || 0,
      concept_label: body?.concept_label ?? null,
      file_guid: body?.file_guid ?? null,
      message: body?.message ?? null,
    })

    logInfo("Aviso de pago recibido", {
      module: "accesos", action: "claim_create", user: session.id,
      meta: { claim_id: claim.id, recurso: claim.concept_id, con_comprobante: !!claim.file_guid },
    })
    return NextResponse.json(claim, { status: 201 })
  } catch (error: any) {
    logError("Error al registrar aviso de pago", { module: "accesos", action: "claim_create", user: session.id, error })
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 })
  }
}

/** PUT ?id=N&accion=confirmar|rechazar — lo resuelve un voluntario. */
export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:manage")) {
    logWarn("Resolución de aviso denegada", { module: "accesos", action: "claim_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const id = Number(request.nextUrl.searchParams.get("id"))
  const accion = request.nextUrl.searchParams.get("accion")
  if (!id || (accion !== "confirmar" && accion !== "rechazar")) {
    return NextResponse.json({ error: "Falta el id o la acción" }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    // Quién resolvió sale de la sesión: es el dato que después explica en la
    // auditoría por qué alguien tiene acceso.
    const claim = await resolvePaymentClaim(id, accion, { ...body, volunteer_id: session.id })
    logInfo(`Aviso de pago ${accion === "confirmar" ? "confirmado" : "rechazado"}`, {
      module: "accesos", action: `claim_${accion}`, user: session.id, meta: { claim_id: id },
    })
    return NextResponse.json(claim)
  } catch (error: any) {
    logError("Error al resolver aviso de pago", { module: "accesos", action: "claim_resolve", user: session.id, error })
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 })
  }
}
