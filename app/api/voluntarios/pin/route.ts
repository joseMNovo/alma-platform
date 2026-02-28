import { type NextRequest, NextResponse } from "next/server"
import { setVolunteerPin } from "@/lib/data-manager"
import { hashPassword } from "@/lib/utils/password"
import { getSessionUser } from "@/lib/serverAuth"

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }
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
