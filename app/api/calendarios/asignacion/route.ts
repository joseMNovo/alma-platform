import { NextRequest, NextResponse } from 'next/server'
import { setCalendarAssignment, removeCalendarAssignment } from '@/lib/data-manager'
import { logInfo, logWarn, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const { instance_id, role, volunteer_id } = await req.json()

    if (!instance_id || !role || !volunteer_id) {
      logWarn("Campos faltantes al asignar coordinador de calendario", { module: "calendarios", action: "assign" })
      return NextResponse.json(
        { error: 'Se requieren: instance_id, role, volunteer_id' },
        { status: 400 }
      )
    }

    if (role !== 'coordinator' && role !== 'co_coordinator') {
      logWarn("Rol inválido al asignar coordinador de calendario", { module: "calendarios", action: "assign", meta: { role } })
      return NextResponse.json(
        { error: 'role debe ser coordinator o co_coordinator' },
        { status: 400 }
      )
    }

    await setCalendarAssignment(instance_id, role, volunteer_id)
    logInfo("Asignación de calendario establecida", { module: "calendarios", action: "assign", meta: { instance_id, role, volunteer_id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    logError("Error al asignar coordinador de calendario", { module: "calendarios", action: "assign", error: err })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const instance_id = parseInt(searchParams.get('instance_id') || '')
    const role = searchParams.get('role') || ''

    if (!instance_id || !role) {
      logWarn("Campos faltantes al eliminar asignación de calendario", { module: "calendarios", action: "unassign" })
      return NextResponse.json(
        { error: 'Se requieren query params: instance_id, role' },
        { status: 400 }
      )
    }

    await removeCalendarAssignment(instance_id, role)
    logInfo("Asignación de calendario eliminada", { module: "calendarios", action: "unassign", meta: { instance_id, role } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    logError("Error al eliminar asignación de calendario", { module: "calendarios", action: "unassign", error: err })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
