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

    // El backend rechaza por dos motivos distintos —ya es voluntario/a, o ya
    // tiene cuenta de participante— y el segundo trae instrucciones de qué
    // hacer. Si devolviéramos el texto crudo del error ("API POST ... → 409:
    // ..."), esa explicación no llegaría nunca a la pantalla.
    const detalle = msg.split(/→ \d+:\s*/)[1]?.trim()

    if (status === 409) {
      logWarn("Registro de voluntario rechazado", { module: "voluntarios", action: "register_request", meta: { detalle } })
      return NextResponse.json({ error: detalle || "El email ya está registrado" }, { status })
    }

    logError("Error en solicitud de registro de voluntario", { module: "voluntarios", action: "register_request", error })
    return NextResponse.json({ error: msg }, { status })
  }
}
