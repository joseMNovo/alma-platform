import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await api.post('/pin-reset/request', body)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
