import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    return NextResponse.json(data.talleres)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tallerData = await request.json()
    const data = readData()
    
    const newTaller = {
      id: getNextId(data.talleres),
      ...tallerData,
      cupos: Number.parseInt(tallerData.cupos),
      costo: Number.parseInt(tallerData.costo),
      inscritos: 0,
    }

    data.talleres.push(newTaller)
    writeData(data)
    
    return NextResponse.json(newTaller)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const tallerData = await request.json()
    const data = readData()

    const tallerIndex = data.talleres.findIndex((t) => t.id === id)
    if (tallerIndex === -1) {
      return NextResponse.json({ error: "Taller no encontrado" }, { status: 404 })
    }

    data.talleres[tallerIndex] = {
      ...data.talleres[tallerIndex],
      ...tallerData,
      cupos: Number.parseInt(tallerData.cupos),
      costo: Number.parseInt(tallerData.costo),
    }

    writeData(data)
    return NextResponse.json(data.talleres[tallerIndex])
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = readData()

    const tallerIndex = data.talleres.findIndex((t) => t.id === id)
    if (tallerIndex === -1) {
      return NextResponse.json({ error: "Taller no encontrado" }, { status: 404 })
    }

    data.talleres.splice(tallerIndex, 1)
    writeData(data)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
