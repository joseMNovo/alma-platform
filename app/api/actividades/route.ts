import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    return NextResponse.json(data.actividades)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const actividadData = await request.json()
    const data = readData()
    
    const newActividad = {
      id: getNextId(data.actividades),
      ...actividadData,
      cupos: Number.parseInt(actividadData.cupos),
      costo: actividadData.gratuita ? 0 : Number.parseInt(actividadData.costo),
      inscritos: 0,
    }

    data.actividades.push(newActividad)
    writeData(data)
    return NextResponse.json(newActividad)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const actividadData = await request.json()
    const data = readData()

    const actividadIndex = data.actividades.findIndex((a) => a.id === id)
    if (actividadIndex === -1) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 })
    }

    data.actividades[actividadIndex] = {
      ...data.actividades[actividadIndex],
      ...actividadData,
      cupos: Number.parseInt(actividadData.cupos),
      costo: actividadData.gratuita ? 0 : Number.parseInt(actividadData.costo),
    }

    writeData(data)
    return NextResponse.json(data.actividades[actividadIndex])
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = readData()

    const actividadIndex = data.actividades.findIndex((a) => a.id === id)
    if (actividadIndex === -1) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 })
    }

    data.actividades.splice(actividadIndex, 1)
    writeData(data)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
