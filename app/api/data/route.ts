import { type NextRequest, NextResponse } from "next/server"
import { readData } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const updatedData = await request.json()
    
    // Leer datos actuales
    const data = readData()
    
    // Actualizar datos específicos según lo que se envíe
    const newData = {
      ...data,
      ...updatedData
    }
    
    // Guardar datos
    const { writeData } = await import("@/lib/data-manager")
    writeData(newData)
    
    return NextResponse.json({ 
      success: true, 
      message: "Datos actualizados exitosamente" 
    })
  } catch (error) {
    console.error("Error updating data:", error)
    return NextResponse.json({ 
      error: "Error al actualizar datos" 
    }, { status: 500 })
  }
}
