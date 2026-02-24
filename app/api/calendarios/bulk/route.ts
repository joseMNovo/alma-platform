import { NextRequest, NextResponse } from 'next/server'
import {
  countCalendarInstancesBulk,
  deleteCalendarInstancesBulk,
  BulkDeleteFilters,
} from '@/lib/data-manager'
import { getSessionUser } from '@/lib/serverAuth'
import { can } from '@/lib/permissions'

// GET: preview count — admin only
export async function GET(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!can(session, 'calendar:delete')) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope') as BulkDeleteFilters['scope']
    if (!['month', 'type', 'series', 'all'].includes(scope)) {
      return NextResponse.json({ error: 'scope inválido' }, { status: 400 })
    }

    const filters: BulkDeleteFilters = { scope }

    if (scope === 'month') {
      const year = parseInt(searchParams.get('year') || '')
      const month = parseInt(searchParams.get('month') || '')
      if (!year || !month) return NextResponse.json({ count: 0 })
      filters.year = year
      filters.month = month
    } else if (scope === 'type') {
      const type = searchParams.get('type') || ''
      if (!type) return NextResponse.json({ count: 0 })
      filters.type = type
    } else if (scope === 'series') {
      const type = searchParams.get('type') || ''
      if (!type) return NextResponse.json({ count: 0 })
      filters.type = type
      const sourceIdParam = searchParams.get('source_id')
      filters.source_id = sourceIdParam === 'null' ? null : (sourceIdParam ? parseInt(sourceIdParam) : null)
    }

    const count = await countCalendarInstancesBulk(filters)
    return NextResponse.json({ count })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: bulk delete — admin only
export async function DELETE(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!can(session, 'calendar:delete')) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await req.json()
    const { scope, year, month, type, source_id } = body

    if (!['month', 'type', 'series', 'all'].includes(scope)) {
      return NextResponse.json({ error: 'scope inválido' }, { status: 400 })
    }

    const filters: BulkDeleteFilters = { scope }
    if (scope === 'month') { filters.year = year; filters.month = month }
    if (scope === 'type' || scope === 'series') { filters.type = type }
    if (scope === 'series') { filters.source_id = source_id ?? null }

    const result = await deleteCalendarInstancesBulk(filters)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
