import { NextRequest, NextResponse } from 'next/server'
import { setCalendarAssignment, removeCalendarAssignment } from '@/lib/data-manager'

export async function POST(req: NextRequest) {
  try {
    const { instance_id, role, volunteer_id } = await req.json()

    if (!instance_id || !role || !volunteer_id) {
      return NextResponse.json(
        { error: 'Se requieren: instance_id, role, volunteer_id' },
        { status: 400 }
      )
    }

    if (role !== 'coordinator' && role !== 'co_coordinator') {
      return NextResponse.json(
        { error: 'role debe ser coordinator o co_coordinator' },
        { status: 400 }
      )
    }

    await setCalendarAssignment(instance_id, role, volunteer_id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const instance_id = parseInt(searchParams.get('instance_id') || '')
    const role = searchParams.get('role') || ''

    if (!instance_id || !role) {
      return NextResponse.json(
        { error: 'Se requieren query params: instance_id, role' },
        { status: 400 }
      )
    }

    await removeCalendarAssignment(instance_id, role)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
