import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { logInfo, logWarn, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await api.post('/emails/send', body)
    logInfo("Email enviado exitosamente", { module: "emails", action: "send_email", meta: { template: body.template } })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('409') ? 409 : msg.includes('400') ? 400 : 500
    if (status === 400) {
      logWarn("Solicitud de envío de email inválida", { module: "emails", action: "send_email" })
    } else {
      logError("Error al enviar email", { module: "emails", action: "send_email", error })
    }
    return NextResponse.json({ error: msg }, { status })
  }
}
