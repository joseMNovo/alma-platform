import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    return NextResponse.json(data.pagos)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pagoData = await request.json()
    const data = readData()
    
    const newPago = {
      id: getNextId(data.pagos),
      ...pagoData,
      fechaPago: null,
    }

    data.pagos.push(newPago)
    writeData(data)
    return NextResponse.json(newPago)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const pagoData = await request.json()
    const data = readData()

    const pagoIndex = data.pagos.findIndex((p) => p.id === id)
    if (pagoIndex === -1) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }

    data.pagos[pagoIndex] = {
      ...data.pagos[pagoIndex],
      ...pagoData,
    }

    writeData(data)
    return NextResponse.json(data.pagos[pagoIndex])
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = readData()

    const pagoIndex = data.pagos.findIndex((p) => p.id === id)
    if (pagoIndex === -1) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }

    data.pagos.splice(pagoIndex, 1)
    writeData(data)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
