import { NextResponse } from "next/server"
import { z } from "zod"
import { HttpError } from "@/lib/utils/httpError"
import { resendVerification } from "@/lib/services/auth.service"

const schema = z.object({
  email: z.string().email("Email inválido"),
})

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

    const result = await resendVerification(parsed.data.email)
    return NextResponse.json(result, { status: 200 })
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error("[POST /api/auth/resend-verification]", e)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
