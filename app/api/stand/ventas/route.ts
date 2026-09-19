import { type NextRequest, NextResponse } from "next/server"
import { getStandSales, createStandSale, voidStandSale, logActivityEvent, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** Ventas del puesto. El precio lo pone el backend desde la base: acá solo
 *  viajan qué producto y cuántos. */

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:sell")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit")) || 50
    return NextResponse.json(await getStandSales(limit))
  } catch (error) {
    logError("Error al listar ventas del stand", { module: "stand", action: "list_sales", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:sell")) {
    logWarn("Venta de stand denegada", { module: "stand", action: "sale_denied", user: session?.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const body = await request.json()
    // Quién cobró sale de la sesión, no del body: si lo mandara la pantalla,
    // cualquiera podría anotar la venta a nombre de otro.
    const venta = await createStandSale({ ...body, sold_by_volunteer_id: session.id })
    logInfo("Venta de stand registrada", {
      module: "stand", action: "create_sale", user: session.id,
      meta: { id: venta.id, total: venta.total, medio: venta.payment_method },
    })
    logActivityEvent({
      event_type: "create", module: "puesto-venta", action: "create_sale",
      user_type: toUserType(session.role), user_id: session.id, role: session.role,
    }).catch(() => {})
    return NextResponse.json(venta, { status: 201 })
  } catch (error: any) {
    logError("Error al registrar venta del stand", { module: "stand", action: "create_sale", user: session.id, error })
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 })
  }
}

/** PUT ?id=N → anula la venta. No se borra: la caja tiene que poder explicar
 *  por qué un número cambió. */
export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:sell")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  const id = Number(request.nextUrl.searchParams.get("id"))
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 })
  try {
    const venta = await voidStandSale(id)
    logWarn("Venta de stand anulada", { module: "stand", action: "void_sale", user: session.id, meta: { id } })
    return NextResponse.json(venta)
  } catch (error) {
    logError("Error al anular venta del stand", { module: "stand", action: "void_sale", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
