import { type NextRequest, NextResponse } from "next/server"
import { getPendingTasks, savePendingTasks } from "@/lib/data-manager"

export async function GET() {
  try {
    const tasks = await getPendingTasks()
    return NextResponse.json(tasks)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tasks = await request.json()
    await savePendingTasks(tasks)
    return NextResponse.json({ success: true, message: "Pendientes actualizados exitosamente" })
  } catch (error) {
    console.error("Error updating pendientes:", error)
    return NextResponse.json({ error: "Error al actualizar pendientes" }, { status: 500 })
  }
}
