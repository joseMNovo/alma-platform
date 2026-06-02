import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { logInfo, logWarn, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await api.post('/pin-reset/confirm', body)
    logInfo("PIN restablecido exitosamente", { module: "pin_reset", action: "confirm_pin_reset" })
    return NextResponse.json(result)
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('400') ? 400 : 500
    if (status === 400) {
      logWarn("Confirmación de restablecimiento de PIN inválida o expirada", { module: "pin_reset", action: "confirm_pin_reset" })
    } else {
      logError("Error al confirmar restablecimiento de PIN", { module: "pin_reset", action: "confirm_pin_reset", error })
    }
    return NextResponse.json({ error: msg }, { status })
  }
}
