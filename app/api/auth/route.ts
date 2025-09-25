import { type NextRequest, NextResponse } from "next/server"
import { readData } from "@/lib/data-manager"
import { validateCredentials } from "@/lib/config"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    // Primero validar credenciales del archivo de configuración (solo email)
    const configValidation = validateCredentials(email, "")
    if (configValidation.valid) {
      return NextResponse.json({ user: configValidation.user })
    }
    
    // Si no es válido en config, buscar en data.json (voluntarios)
    const data = readData()
    const voluntario = data.voluntarios.find((v) => v.email === email)

    if (voluntario) {
      // Determinar rol basado en el campo administrador
      const rol = voluntario.administrador === true ? "admin" : "voluntario"
      
      // Crear objeto de usuario para voluntario
      const user = {
        id: voluntario.id,
        nombre: voluntario.nombre,
        email: voluntario.email,
        rol: rol,
        foto: voluntario.foto,
        telefono: voluntario.telefono,
        sexo: voluntario.sexo,
        edad: voluntario.edad,
        estado: voluntario.estado,
        especialidades: voluntario.especialidades,
        fechaRegistro: voluntario.fechaRegistro,
        administrador: voluntario.administrador || false
      }
      return NextResponse.json({ user })
    } else {
      return NextResponse.json({ error: "Email no válido" }, { status: 401 })
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
