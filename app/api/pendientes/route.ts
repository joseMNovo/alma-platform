import { type NextRequest, NextResponse } from "next/server"
import { getPendingTasks, savePendingTasks } from "@/lib/data-manager"
import { logError } from "@/lib/logger"

export async function GET() {
  try {
    const tasks = await getPendingTasks()
    return NextResponse.json(tasks)
  } catch (error) {
    logError("Error al obtener pendientes", { module: "pendientes", action: "list", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tasks = await request.json()
    await savePendingTasks(tasks)
    return NextResponse.json({ success: true, message: "Pendientes actualizados exitosamente" })
  } catch (error) {
    logError("Error al actualizar pendientes", { module: "pendientes", action: "save_pendientes", error })
    return NextResponse.json({ error: "Error al actualizar pendientes" }, { status: 500 })
  }
}
