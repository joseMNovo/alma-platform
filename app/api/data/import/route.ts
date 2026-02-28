import { type NextRequest, NextResponse } from "next/server"
import { importAllData } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }
  try {
    const importedData = await request.json()

    // Validate basic structure
    const requiredKeys = ["volunteers", "workshops", "groups", "activities", "payments", "inventory", "enrollments", "pending_tasks"]

    for (const key of requiredKeys) {
      if (!(key in importedData)) {
        return NextResponse.json(
          { error: `El archivo JSON no contiene la clave requerida: ${key}` },
          { status: 400 }
        )
      }
      if (!Array.isArray(importedData[key])) {
        return NextResponse.json(
          { error: `La clave '${key}' debe ser un array` },
          { status: 400 }
        )
      }
    }

    // Validate that at least one admin exists
    const hasAdminVolunteer = importedData.volunteers?.some(
      (v: any) => v.is_admin === true || v.is_admin === 1
    )

    if (!hasAdminVolunteer) {
      return NextResponse.json(
        { error: "Debe existir al menos un voluntario administrador" },
        { status: 400 }
      )
    }

    await importAllData(importedData)

    return NextResponse.json({ success: true, message: "Datos importados exitosamente" })
  } catch (error) {
    console.error("Error importing data:", error)
    return NextResponse.json(
      { error: "Error al procesar el archivo JSON. Verifica que sea válido." },
      { status: 500 }
    )
  }
}
