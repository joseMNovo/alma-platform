import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    return NextResponse.json(data.voluntarios)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const voluntarioData = await request.json()
    const data = readData()
    
    const newVoluntario = {
      id: getNextId(data.voluntarios),
      nombre: voluntarioData.nombre,
      apellido: voluntarioData.apellido || undefined,
      edad: voluntarioData.edad ? Number.parseInt(voluntarioData.edad) : undefined,
      sexo: voluntarioData.sexo || undefined,
      foto: voluntarioData.foto || null,
      telefono: voluntarioData.telefono || undefined,
      email: voluntarioData.email || undefined,
      fechaRegistro: new Date().toISOString().split("T")[0],
      estado: "activo",
      especialidades: voluntarioData.especialidades || []
    }

    data.voluntarios.push(newVoluntario)
    writeData(data)
    
    return NextResponse.json(newVoluntario)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const voluntarioData = await request.json()
    const data = readData()

    const voluntarioIndex = data.voluntarios.findIndex((v) => v.id === id)
    if (voluntarioIndex === -1) {
      return NextResponse.json({ error: "Voluntario no encontrado" }, { status: 404 })
    }

    data.voluntarios[voluntarioIndex] = {
      ...data.voluntarios[voluntarioIndex],
      ...voluntarioData,
      edad: voluntarioData.edad ? Number.parseInt(voluntarioData.edad) : undefined,
    }

    writeData(data)
    return NextResponse.json(data.voluntarios[voluntarioIndex])
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = readData()

    const voluntarioIndex = data.voluntarios.findIndex((v) => v.id === id)
    if (voluntarioIndex === -1) {
      return NextResponse.json({ error: "Voluntario no encontrado" }, { status: 404 })
    }

    // Verificar si el voluntario está asignado a algún item del inventario
    const itemsAsignados = data.inventario.filter(item => item.voluntarioAsignado === id)
    if (itemsAsignados.length > 0) {
      return NextResponse.json({ 
        error: "No se puede eliminar el voluntario porque tiene items asignados en el inventario" 
      }, { status: 400 })
    }

    data.voluntarios.splice(voluntarioIndex, 1)
    writeData(data)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
