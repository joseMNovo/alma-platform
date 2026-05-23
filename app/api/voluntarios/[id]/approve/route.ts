import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await api.post(`/voluntarios/${id}/approve`)
    return NextResponse.json(result)
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('404') ? 404 : msg.includes('400') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
