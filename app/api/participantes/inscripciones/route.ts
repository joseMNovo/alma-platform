import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/serverAuth'
import { api } from '@/lib/api-client'

interface BackendEnrollment {
  id: number
  participant_id: number
  type: string
  item_id: number
  enrolled_at?: string | null
}

export async function GET(req: NextRequest) {
  const session = getSessionUser(req)
  if (!session || session.role !== 'participante') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await api.get<BackendEnrollment[]>(`/participants/${session.id}/enrollments`)

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
    await api.post<BackendEnrollment>(`/participants/${session.id}/enrollments`, {
      participant_id: session.id,
      type,
      item_id,
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    // Ignore duplicate enrollment errors (integrity constraint)
    if (err.message?.includes('409') || err.message?.includes('already') || err.message?.includes('Integrity')) {
      return NextResponse.json({ ok: true })
    }
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
    const rows = await api.get<BackendEnrollment[]>(`/participants/${session.id}/enrollments`)
    const enrollment = rows.find(r => r.type === type && r.item_id === item_id)
    if (!enrollment) {
      return NextResponse.json({ ok: true })
    }
    await api.delete(`/participants/${session.id}/enrollments/${enrollment.id}`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
