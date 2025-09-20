import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    return NextResponse.json(data.inventario)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const itemData = await request.json()
    const data = readData()
    
    const newItem = {
      id: getNextId(data.inventario),
      ...itemData,
      fechaIngreso: new Date().toISOString().split("T")[0],
    }

    data.inventario.push(newItem)
    writeData(data)
    return NextResponse.json(newItem)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const itemData = await request.json()
    const data = readData()

    const itemIndex = data.inventario.findIndex((i) => i.id === id)
    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 })
    }

    data.inventario[itemIndex] = {
      ...data.inventario[itemIndex],
      ...itemData,
    }

    writeData(data)
    return NextResponse.json(data.inventario[itemIndex])
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = readData()

    const itemIndex = data.inventario.findIndex((i) => i.id === id)
    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 })
    }

    data.inventario.splice(itemIndex, 1)
    writeData(data)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
