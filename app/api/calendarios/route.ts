import { NextRequest, NextResponse } from 'next/server'
import {
  getCalendarInstances,
  createCalendarInstance,
  updateCalendarInstance,
  deleteCalendarInstance,
  setCalendarAssignment,
  removeCalendarAssignment,
} from '@/lib/data-manager'
import { getSessionUser } from '@/lib/serverAuth'
import { can } from '@/lib/permissions'
import { logInfo, logWarn, logError } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    // If 'month' param is omitted, pass null to fetch entire year (used for wizard conflict detection)
    const monthParam = searchParams.get('month')
    const month = monthParam !== null ? parseInt(monthParam) : null
    const type = searchParams.get('type') || undefined
    const volunteerParam = searchParams.get('volunteer_id')
    const volunteer_id = volunteerParam ? parseInt(volunteerParam) : undefined

    const instances = await getCalendarInstances(year, month, { type, volunteer_id })
    return NextResponse.json(instances)
  } catch (err: any) {
    logError('Error al obtener instancias de calendario', { module: 'calendar', action: 'list', error: err })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!can(session, 'calendar:create')) {
    logWarn('Permiso denegado para crear evento de calendario', { module: 'calendar', action: 'create_denied', user: session.id })
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { coordinator_id, co_coordinator_id, ...instanceData } = body

    const instance = await createCalendarInstance(instanceData)

    if (coordinator_id) {
      await setCalendarAssignment(instance.id, 'coordinator', coordinator_id)
    }
    if (co_coordinator_id) {
      await setCalendarAssignment(instance.id, 'co_coordinator', co_coordinator_id)
    }

    // Re-fetch with assignments if any were set
    if (coordinator_id || co_coordinator_id) {
      const date = new Date(instance.date + 'T12:00:00')
      const updated = await getCalendarInstances(date.getFullYear(), date.getMonth() + 1)
      const found = updated.find(i => i.id === instance.id)
      logInfo('Evento de calendario creado', { module: 'calendar', action: 'create_event', user: session.id, meta: { id: instance.id, date: instance.date } })
      return NextResponse.json(found || instance, { status: 201 })
    }

    logInfo('Evento de calendario creado', { module: 'calendar', action: 'create_event', user: session.id, meta: { id: instance.id, date: instance.date } })
    return NextResponse.json(instance, { status: 201 })
  } catch (err: any) {
    logError('Error al crear evento de calendario', { module: 'calendar', action: 'create_event', user: session?.id, error: err })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!can(session, 'calendar:edit')) {
    logWarn('Permiso denegado para editar evento de calendario', { module: 'calendar', action: 'edit_denied', user: session.id })
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const { coordinator_id, co_coordinator_id, ...instanceData } = body

    const instance = await updateCalendarInstance(id, instanceData)

    // Handle assignment updates: empty string = remove, number = set
    if (coordinator_id !== undefined) {
      const volId = parseInt(coordinator_id)
      if (!isNaN(volId) && volId > 0) {
        await setCalendarAssignment(id, 'coordinator', volId)
      } else {
        await removeCalendarAssignment(id, 'coordinator')
      }
    }
    if (co_coordinator_id !== undefined) {
      const volId = parseInt(co_coordinator_id)
      if (!isNaN(volId) && volId > 0) {
        await setCalendarAssignment(id, 'co_coordinator', volId)
      } else {
        await removeCalendarAssignment(id, 'co_coordinator')
      }
    }

    // Re-fetch with updated assignments
    const date = new Date(instance.date + 'T12:00:00')
    const updated = await getCalendarInstances(date.getFullYear(), date.getMonth() + 1)
    const found = updated.find(i => i.id === instance.id)
    logInfo('Evento de calendario actualizado', { module: 'calendar', action: 'edit_event', user: session.id, meta: { id } })
    return NextResponse.json(found || instance)
  } catch (err: any) {
    logError('Error al actualizar evento de calendario', { module: 'calendar', action: 'edit_event', user: session?.id, error: err })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // Calendar DELETE is admin-only (consistent with grupos/talleres delete restriction)
  if (!can(session, 'calendar:delete')) {
    logWarn('Permiso denegado para eliminar evento de calendario', { module: 'calendar', action: 'delete_denied', user: session.id })
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await deleteCalendarInstance(id)
    logInfo('Evento de calendario eliminado', { module: 'calendar', action: 'delete_event', user: session.id, meta: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    logError('Error al eliminar evento de calendario', { module: 'calendar', action: 'delete_event', user: session?.id, error: err })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
