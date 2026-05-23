import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await api.post('/participants/verify-email', body)
    return NextResponse.json(result)
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('400') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
