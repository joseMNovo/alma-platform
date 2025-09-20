import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    return NextResponse.json(data.grupos)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const grupoData = await request.json()
    const data = readData()
    
    const newGrupo = {
      id: getNextId(data.grupos),
      ...grupoData,
      participantes: 0,
    }

    data.grupos.push(newGrupo)
    writeData(data)
    return NextResponse.json(newGrupo)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const grupoData = await request.json()
    const data = readData()

    const grupoIndex = data.grupos.findIndex((g) => g.id === id)
    if (grupoIndex === -1) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })
    }

    data.grupos[grupoIndex] = {
      ...data.grupos[grupoIndex],
      ...grupoData,
    }

    writeData(data)
    return NextResponse.json(data.grupos[grupoIndex])
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = readData()

    const grupoIndex = data.grupos.findIndex((g) => g.id === id)
    if (grupoIndex === -1) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })
    }

    data.grupos.splice(grupoIndex, 1)
    writeData(data)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
