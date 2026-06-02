import { type NextRequest, NextResponse } from "next/server"
import { getPayments, createPayment, updatePayment, deletePayment } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logInfo, logWarn, logError } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    const payments = await getPayments()
    return NextResponse.json(payments)
  } catch (error) {
    logError("Error al listar pagos", { module: "pagos", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    logWarn("Permiso denegado para crear pago", { module: "pagos", action: "create_pago", user: session.id })
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }
  try {
    const data = await request.json()

    const payment = await createPayment({
      user_id: Number.parseInt(data.user_id),
      concept: data.concept,
      amount: Number.parseFloat(data.amount),
      due_date: data.due_date,
      payment_method: data.payment_method || null,
      status: data.status || "pendiente",
    })

    logInfo("Pago creado", { module: "pagos", action: "create_pago", user: session.id, meta: { id: (payment as any)?.id } })
    return NextResponse.json(payment)
  } catch (error) {
    logError("Error al crear pago", { module: "pagos", action: "create_pago", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    logWarn("Permiso denegado para editar pago", { module: "pagos", action: "edit_pago", user: session.id })
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = await request.json()

    const payment = await updatePayment(id, {
      user_id: data.user_id !== undefined ? Number.parseInt(data.user_id) : undefined,
      concept: data.concept,
      amount: data.amount !== undefined ? Number.parseFloat(data.amount) : undefined,
      due_date: data.due_date,
      payment_method: data.payment_method,
      status: data.status,
      payment_date: data.payment_date,
    })

    logInfo("Pago actualizado", { module: "pagos", action: "edit_pago", user: session.id, meta: { id } })
    return NextResponse.json(payment)
  } catch (error) {
    logError("Error al actualizar pago", { module: "pagos", action: "edit_pago", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    logWarn("Permiso denegado para eliminar pago", { module: "pagos", action: "delete_pago", user: session.id })
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")

    await deletePayment(id)
    logInfo("Pago eliminado", { module: "pagos", action: "delete_pago", user: session.id, meta: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar pago", { module: "pagos", action: "delete_pago", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
