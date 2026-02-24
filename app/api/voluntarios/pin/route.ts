import { type NextRequest, NextResponse } from "next/server"
import { setVolunteerPin } from "@/lib/data-manager"
import { hashPassword } from "@/lib/utils/password"

export async function POST(request: NextRequest) {
  try {
    const { id, pin } = await request.json()

    if (!id || !pin) {
      return NextResponse.json({ error: "id y pin son requeridos" }, { status: 400 })
    }

    if (!/^\d{4}$/.test(String(pin))) {
      return NextResponse.json({ error: "El PIN debe ser exactamente 4 dígitos numéricos" }, { status: 400 })
    }

    const hashedPin = await hashPassword(String(pin))
    await setVolunteerPin(Number(id), hashedPin)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error setting PIN:", error)
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
