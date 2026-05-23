import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const params = new URLSearchParams()
    if (searchParams.get('status')) params.set('status', searchParams.get('status')!)
    if (searchParams.get('template')) params.set('template', searchParams.get('template')!)
    if (searchParams.get('skip')) params.set('skip', searchParams.get('skip')!)
    if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!)
    const result = await api.get(`/emails/logs?${params.toString()}`)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
