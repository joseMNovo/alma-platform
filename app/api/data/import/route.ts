import { type NextRequest, NextResponse } from "next/server"
import { writeData } from "@/lib/data-manager"

export async function POST(request: NextRequest) {
  try {
    const importedData = await request.json()
    
    // Validar estructura básica del JSON
    const requiredKeys = ["usuarios", "talleres", "grupos", "actividades", "pagos", "inventario", "voluntarios", "inscripciones", "pendientes"]
    
    for (const key of requiredKeys) {
      if (!(key in importedData)) {
        return NextResponse.json({ 
          error: `El archivo JSON no contiene la clave requerida: ${key}` 
        }, { status: 400 })
      }
      
      if (!Array.isArray(importedData[key])) {
        return NextResponse.json({ 
          error: `La clave '${key}' debe ser un array` 
        }, { status: 400 })
      }
    }

    // Validar estructura de usuarios
    if (importedData.usuarios.length > 0) {
      const user = importedData.usuarios[0]
      if (!user.id || !user.nombre || !user.email || !user.rol) {
        return NextResponse.json({ 
          error: "Los usuarios deben tener id, nombre, email y rol" 
        }, { status: 400 })
      }
    }

    // Validar que al menos haya un administrador (en usuarios o voluntarios)
    const hasAdminUser = importedData.usuarios.some((user: any) => user.rol === "admin")
    const hasAdminVoluntario = importedData.voluntarios?.some((voluntario: any) => voluntario.administrador === true)
    
    if (!hasAdminUser && !hasAdminVoluntario) {
      return NextResponse.json({ 
        error: "Debe existir al menos un usuario administrador en usuarios o un voluntario administrador" 
      }, { status: 400 })
    }

    // Si todo está bien, escribir los datos
    writeData(importedData)
    
    return NextResponse.json({ 
      success: true, 
      message: "Datos importados exitosamente" 
    })
    
  } catch (error) {
    console.error("Error importing data:", error)
    return NextResponse.json({ 
      error: "Error al procesar el archivo JSON. Verifica que sea válido." 
    }, { status: 500 })
  }
}
