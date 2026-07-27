import { type NextRequest, NextResponse } from "next/server"
import { hashPassword } from "@/lib/utils/password"
import { api } from "@/lib/api-client"
import { logError } from "@/lib/logger"

interface RegisterResponse {
  id: number
  email: string
  role: string
  email_verified: boolean
  verification_sent_to?: string | null
}

/** PUT /api/registro — reenvía el mail de verificación. */
export async function PUT(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Falta el email" }, { status: 400 })

    // El backend responde siempre lo mismo exista o no la cuenta, para que
    // nadie pueda averiguar qué direcciones están registradas.
    await api.post("/register/participante/reenviar", { email })
    return NextResponse.json({ message: "Si la cuenta existe y está pendiente, te reenviamos el email." })
  } catch (error) {
    logError("Error al reenviar la verificación", { module: "registro", action: "resend_verification", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, pin, role } = await request.json()

    if (!email || !pin || !role) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    if (!/^\d{4}$/.test(String(pin))) {
      return NextResponse.json({ error: "El PIN debe ser exactamente 4 dígitos" }, { status: 400 })
    }

    // Solo participantes: el alta de voluntario/a va por /api/voluntarios/register,
    // que tiene su propio flujo (queda 'pendiente' hasta que un admin aprueba).
    if (role !== "participante") {
      return NextResponse.json(
        { error: "Para registrarte como voluntario/a usá el formulario de voluntarios" },
        { status: 400 },
      )
    }

    const pin_hash = await hashPassword(String(pin))

    // El PIN en claro nunca sale de acá: al backend viaja solo el hash bcrypt.
    const result = await api.post<RegisterResponse>(`/register/${role}`, {
      email,
      pin_hash,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    const message = error?.message ?? ""

    // Propagar errores del backend con su código de estado
    if (message.includes("409")) {
      // El backend distingue "ya tenés cuenta" de "ese mail es de un voluntario";
      // se propaga su texto porque le dice a la persona qué hacer.
      const match = message.match(/409:\s*(.+)$/)
      const detail = match ? match[1].replace(/^"|"$/g, "") : "El email ya está registrado"
      return NextResponse.json({ error: detail }, { status: 409 })
    }
    if (message.includes("400")) {
      // Intentar extraer el detail del backend
      const match = message.match(/400:\s*(.+)$/)
      const detail = match ? match[1] : "Token ALMA inválido"
      return NextResponse.json({ error: detail }, { status: 400 })
    }

    logError("Error en registro de participante", { module: "registro", action: "register_participant", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
