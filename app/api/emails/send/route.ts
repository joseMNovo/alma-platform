import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { logInfo, logWarn, logError } from '@/lib/logger'
import { getSessionUser } from '@/lib/serverAuth'
import { can } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  // Despacha mails REALES con el remitente de ALMA. Sin este candado era un
  // relay abierto: cualquiera que supiera la ruta podía escribirle a quien
  // quisiera desde el dominio de la asociación.
  const session = getSessionUser(req)
  if (!session || !can(session, "emails:send")) {
    logWarn("Envío de email denegado por permisos", { module: "emails", action: "send_denied", user: session?.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

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
