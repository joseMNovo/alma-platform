import { NextResponse } from "next/server"
import { readData } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = readData()
    
    // Crear el JSON con formato legible
    const jsonString = JSON.stringify(data, null, 2)
    
    // Crear respuesta con el archivo JSON
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="alma-data-${new Date().toISOString().split("T")[0]}.json"`
      }
    })
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json({ error: "Error al exportar los datos" }, { status: 500 })
  }
}
