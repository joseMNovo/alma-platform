import { type NextRequest, NextResponse } from "next/server"
import { getVolunteers, getPendingTasks, savePendingTasks } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    const [volunteers, pending_tasks] = await Promise.all([
      getVolunteers(),
      getPendingTasks(),
    ])
    return NextResponse.json({ volunteers, pendientes: pending_tasks })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    const body = await request.json()

    if (body.pendientes !== undefined) {
      await savePendingTasks(body.pendientes)
    }

    return NextResponse.json({ success: true, message: "Datos actualizados exitosamente" })
  } catch (error) {
    console.error("Error updating data:", error)
    return NextResponse.json({ error: "Error al actualizar datos" }, { status: 500 })
  }
}
