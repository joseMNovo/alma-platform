import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/serverAuth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session || session.role !== 'participante') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await query(
      'SELECT type, item_id FROM participant_program_enrollments WHERE participant_id = ?',
      [session.id]
    ) as any[]

    return NextResponse.json({
      workshops: rows.filter(r => r.type === 'taller').map(r => r.item_id),
      groups: rows.filter(r => r.type === 'grupo').map(r => r.item_id),
      activities: rows.filter(r => r.type === 'actividad').map(r => r.item_id),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session || session.role !== 'participante') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { type, item_id } = await req.json()
  if (!type || !item_id) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  try {
    await query(
      'INSERT IGNORE INTO participant_program_enrollments (participant_id, type, item_id) VALUES (?, ?, ?)',
      [session.id, type, item_id]
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session || session.role !== 'participante') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { type, item_id } = await req.json()
  if (!type || !item_id) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  try {
    await query(
      'DELETE FROM participant_program_enrollments WHERE participant_id = ? AND type = ? AND item_id = ?',
      [session.id, type, item_id]
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
