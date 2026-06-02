import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { logInfo, logWarn, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await api.post('/participants/verify-email', body)
    logInfo("Email de participante verificado exitosamente", { module: "participantes", action: "verify_email" })
    return NextResponse.json(result)
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('400') ? 400 : 500
    if (status === 400) {
      logWarn("Verificación de email de participante inválida o expirada", { module: "participantes", action: "verify_email" })
    } else {
      logError("Error al verificar email de participante", { module: "participantes", action: "verify_email", error })
    }
    return NextResponse.json({ error: msg }, { status })
  }
}
