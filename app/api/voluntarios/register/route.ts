import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { logInfo, logWarn, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await api.post('/voluntarios/register', body)
    logInfo("Solicitud de registro de voluntario enviada", { module: "voluntarios", action: "register_request" })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('409') ? 409 : 500
    if (status === 409) {
      logWarn("Registro de voluntario rechazado: email duplicado", { module: "voluntarios", action: "register_request" })
    } else {
      logError("Error en solicitud de registro de voluntario", { module: "voluntarios", action: "register_request", error })
    }
    return NextResponse.json({ error: msg }, { status })
  }
}
