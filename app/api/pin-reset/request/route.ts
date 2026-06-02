import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { logInfo, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user_type = body.user_type || 'unknown'
    const result = await api.post('/pin-reset/request', body)
    logInfo("Solicitud de restablecimiento de PIN enviada", { module: "pin_reset", action: "request_pin_reset", meta: { user_type } })
    return NextResponse.json(result)
  } catch (error) {
    logError("Error al procesar solicitud de restablecimiento de PIN", { module: "pin_reset", action: "request_pin_reset", error })
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
