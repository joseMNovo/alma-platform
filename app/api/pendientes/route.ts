import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    return NextResponse.json(data.pendientes || [])
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const newPendientes = await request.json()
    
    // Leer datos actuales
    const data = readData()
    
    // Actualizar pendientes
    const updatedData = {
      ...data,
      pendientes: newPendientes
    }
    
    // Guardar datos
    writeData(updatedData)
    
    return NextResponse.json({ 
      success: true, 
      message: "Pendientes actualizados exitosamente" 
    })
  } catch (error) {
    console.error("Error updating pendientes:", error)
    return NextResponse.json({ 
      error: "Error al actualizar pendientes" 
    }, { status: 500 })
  }
}
