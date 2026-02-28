import { type NextRequest, NextResponse } from "next/server"
import { getAllData } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }
  try {
    const data = await getAllData()
    const jsonString = JSON.stringify(data, null, 2)

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="alma-data-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json({ error: "Error al exportar los datos" }, { status: 500 })
  }
}
