import { type NextRequest, NextResponse } from "next/server"
import { hashPassword } from "@/lib/utils/password"
import { api } from "@/lib/api-client"

interface RegisterResponse {
  id: number
  email: string
  role: string
}

export async function POST(request: NextRequest) {
  try {
    const { email, pin, alma_token, role } = await request.json()

    if (!email || !pin || !alma_token || !role) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    if (!/^\d{4}$/.test(String(pin))) {
      return NextResponse.json({ error: "El PIN debe ser exactamente 4 dígitos" }, { status: 400 })
    }

    if (!/^\d{6}$/.test(String(alma_token))) {
      return NextResponse.json({ error: "El Token ALMA debe tener 6 dígitos" }, { status: 400 })
    }

    if (role !== "voluntario" && role !== "participante") {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
    }

    const pin_hash = await hashPassword(String(pin))

    const result = await api.post<RegisterResponse>(`/register/${role}`, {
      email,
      pin_hash,
      alma_token,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    const message = error?.message ?? ""

    // Propagar errores del backend con su código de estado
    if (message.includes("409")) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 })
    }
    if (message.includes("400")) {
      // Intentar extraer el detail del backend
      const match = message.match(/400:\s*(.+)$/)
      const detail = match ? match[1] : "Token ALMA inválido"
      return NextResponse.json({ error: detail }, { status: 400 })
    }

    console.error("Error en /api/registro:", error)
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
