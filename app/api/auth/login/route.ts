import { NextResponse } from "next/server"
import { z } from "zod"
import { HttpError } from "@/lib/utils/httpError"
import { login } from "@/lib/services/auth.service"

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
})

function getRequestMeta(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const ua = req.headers.get("user-agent") ?? "unknown"
  return { ip, ua }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data
    const { ip, ua } = getRequestMeta(req)

    const result = await login(email, password, ip, ua)
    return NextResponse.json(result, { status: 200 })
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error("[POST /api/auth/login]", e)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
