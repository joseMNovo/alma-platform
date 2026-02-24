import { NextResponse } from "next/server"
import { HttpError } from "@/lib/utils/httpError"
import { verifyEmailToken } from "@/lib/services/token.service"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 })
    }

    await verifyEmailToken(token)
    return NextResponse.json({ message: "Cuenta verificada exitosamente" }, { status: 200 })
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error("[GET /api/auth/verify-email]", e)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
