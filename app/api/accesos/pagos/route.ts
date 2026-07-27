import { type NextRequest, NextResponse } from "next/server"
import { getPersonPayments, createPersonPayment, deletePersonPayment, getPersonPaymentsSummary, logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/**
 * GET /api/accesos/pagos — listado de ingresos, o ?summary=true para el total
 * agrupado por concepto (capacitación, cuota de socio, donación).
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const year = url.searchParams.get("year")
    const conceptType = url.searchParams.get("concept_type") || undefined

    if (url.searchParams.get("summary") === "true") {
      return NextResponse.json(
        await getPersonPaymentsSummary({ year: year ? Number.parseInt(year, 10) : undefined, conceptType }),
      )
    }

    const personId = url.searchParams.get("person_id")
    const conceptId = url.searchParams.get("concept_id")
    return NextResponse.json(
      await getPersonPayments({
        personId: personId ? Number.parseInt(personId, 10) : undefined,
        conceptType,
        conceptId: conceptId ? Number.parseInt(conceptId, 10) : undefined,
        year: year ? Number.parseInt(year, 10) : undefined,
      }),
    )
  } catch (error) {
    logError("Error al listar pagos", { module: "accesos", action: "payments", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/**
 * POST /api/accesos/pagos — registra un ingreso suelto, sin habilitar nada.
 * Sirve para la cuota de socio, una donación, o el pago de alguien que
 * todavía no se habilitó.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const personId = Number.parseInt(String(data.person_id ?? 0), 10)
    if (!personId) return NextResponse.json({ error: "Falta la persona" }, { status: 400 })
    if (!(Number(data.amount) > 0)) {
      return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 422 })
    }
    if (!data.concept_type?.trim()) {
      return NextResponse.json({ error: "Falta el concepto" }, { status: 422 })
    }

    const payment = await createPersonPayment({
      ...data,
      person_id: personId,
      concept_type: data.concept_type.trim(),
      registered_by_volunteer_id: session.id || null,
    })

    logInfo("Pago registrado", {
      module: "accesos", action: "payment", user: session.id,
      meta: { person_id: personId, concepto: data.concept_type, monto: Number(data.amount) },
    })
    logActivityEvent({ event_type: "create", module: "accesos", action: "payment", user_type: toUserType(session.role), user_id: session.id, role: session.role }).catch(() => {})
    return NextResponse.json(payment)
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    }
    logError("Error al registrar pago", { module: "accesos", action: "payment", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/**
 * DELETE /api/accesos/pagos?id=N — corrige un pago mal cargado.
 * Queda registrado en la auditoría: un ingreso no desaparece sin rastro.
 */
export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "accesos:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const paymentId = Number.parseInt(new URL(request.url).searchParams.get("id") || "0", 10)
    if (!paymentId) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await deletePersonPayment(paymentId, session.id || undefined)
    logWarn("Pago eliminado", {
      module: "accesos", action: "payment_deleted", user: session.id, meta: { payment_id: paymentId },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }
    logError("Error al eliminar pago", { module: "accesos", action: "payment_deleted", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
