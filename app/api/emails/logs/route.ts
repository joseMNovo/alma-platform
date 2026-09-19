import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { logError, logWarn } from '@/lib/logger'
import { getSessionUser } from '@/lib/serverAuth'
import { can } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  // El registro de envíos es la lista de mails de la gente de ALMA.
  const session = getSessionUser(req)
  if (!session || !can(session, "emails:view")) {
    logWarn("Lectura de logs de email denegada", { module: "emails", action: "logs_denied", user: session?.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const params = new URLSearchParams()
    if (searchParams.get('status')) params.set('status', searchParams.get('status')!)
    if (searchParams.get('template')) params.set('template', searchParams.get('template')!)
    if (searchParams.get('skip')) params.set('skip', searchParams.get('skip')!)
    if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!)
    const result = await api.get(`/emails/logs?${params.toString()}`)
    return NextResponse.json(result)
  } catch (error) {
    logError("Error al obtener logs de emails", { module: "emails", action: "list_logs", error })
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
