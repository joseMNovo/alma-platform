import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await api.post('/emails/send', body)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('409') ? 409 : msg.includes('400') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
