import { NextRequest, NextResponse } from 'next/server'
import { generateCalendarInstances, createCalendarInstance } from '@/lib/data-manager'
import { getSessionUser } from '@/lib/serverAuth'
import { can } from '@/lib/permissions'
import { logInfo, logWarn, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!can(session, 'calendar:generate')) {
    logWarn('Permiso denegado para generar calendario', {
      module: 'calendar', action: 'generate_denied', user: session.id,
    })
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const body = await req.json()

    // ── Modo "custom": lista de instancias generadas en el frontend ──────────
    if (body.mode === 'custom') {
      const items: Array<{
        date: string
        type: string
        source_id?: number | null
        start_time: string
        end_time: string
      }> = body.instances || []

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'Se requiere al menos una instancia' }, { status: 400 })
      }

      const created = []
      for (const item of items) {
        if (!item.date || !item.type || !item.start_time || !item.end_time) continue
        const inst = await createCalendarInstance({
          type: item.type,
          date: item.date,
          start_time: item.start_time,
          end_time: item.end_time,
          source_id: item.source_id ?? null,
          notes: null,
          status: 'programado',
        })
        created.push(inst)
      }

      logInfo('Generación personalizada de calendario confirmada', {
        module: 'calendar',
        action: 'generate_activity',
        user: session.id,
        meta: { count: created.length, mode: 'custom' },
      })

      return NextResponse.json({ created: created.length, instances: created }, { status: 201 })
    }

    // ── Modo "alternating" (ALMA Clásico) — comportamiento existente ─────────
    if (!body.start_date || !body.end_date || !body.first_type) {
      return NextResponse.json(
        { error: 'Se requieren: start_date, end_date, first_type' },
        { status: 400 }
      )
    }

    const result = await generateCalendarInstances({
      start_date: body.start_date,
      end_date: body.end_date,
      first_type: body.first_type,
      start_time: body.start_time,
      interval_days: body.interval_days,
      source_group_id: body.source_group_id || null,
      source_workshop_id: body.source_workshop_id || null,
    })

    logInfo('Generación ALMA Clásico de calendario confirmada', {
      module: 'calendar',
      action: 'generate_activity',
      user: session.id,
      meta: {
        count: result.created,
        mode: 'alternating',
        start_date: body.start_date,
        end_date: body.end_date,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    logError('Error al generar instancias de calendario', {
      module: 'calendar', action: 'generate_activity', user: session.id, error: err,
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
