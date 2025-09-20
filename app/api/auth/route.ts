import { type NextRequest, NextResponse } from "next/server"
import { readData } from "@/lib/data-manager"
import { validateCredentials } from "@/lib/config"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // Primero validar credenciales del archivo de configuración
    const configValidation = validateCredentials(email, password)
    if (configValidation.valid) {
      return NextResponse.json({ user: configValidation.user })
    }
    
    // Si no es válido en config, buscar en data.json (usuarios adicionales)
    const data = readData()
    const user = data.usuarios.find((u) => u.email === email && u.password === password)

    if (user) {
      const { password: _, ...userWithoutPassword } = user
      return NextResponse.json({ user: userWithoutPassword })
    } else {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const data = readData()
    const usuarios = data.usuarios.map(({ password, ...user }) => user)
    return NextResponse.json({ usuarios })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
