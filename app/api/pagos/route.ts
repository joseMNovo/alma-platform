import { type NextRequest, NextResponse } from "next/server"
import { getPayments, createPayment, updatePayment, deletePayment } from "@/lib/data-manager"

export async function GET() {
  try {
    const payments = await getPayments()
    return NextResponse.json(payments)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const payment = await createPayment({
      user_id: Number.parseInt(data.user_id),
      concept: data.concept,
      amount: Number.parseInt(data.amount),
      due_date: data.due_date,
      payment_method: data.payment_method || null,
      status: data.status || "pendiente",
    })

    return NextResponse.json(payment)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = await request.json()

    const payment = await updatePayment(id, {
      user_id: data.user_id !== undefined ? Number.parseInt(data.user_id) : undefined,
      concept: data.concept,
      amount: data.amount !== undefined ? Number.parseInt(data.amount) : undefined,
      due_date: data.due_date,
      payment_method: data.payment_method,
      status: data.status,
      payment_date: data.payment_date,
    })

    return NextResponse.json(payment)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")

    await deletePayment(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
