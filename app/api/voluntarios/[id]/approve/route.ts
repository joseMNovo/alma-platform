import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api-client'
import { getSessionUser } from '@/lib/serverAuth'
import { logInfo, logWarn, logError } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionUser(req)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!session.is_admin) {
    logWarn("Permiso denegado para aprobar voluntario", { module: "voluntarios", action: "approve_volunteer", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { id } = await params
    const result = await api.post(`/voluntarios/${id}/approve`)
    logInfo("Voluntario aprobado", { module: "voluntarios", action: "approve_volunteer", meta: { id } })
    return NextResponse.json(result)
  } catch (error) {
    const msg = String(error)
    const status = msg.includes('404') ? 404 : msg.includes('400') ? 400 : 500
    if (status === 404) {
      logWarn("Voluntario no encontrado al aprobar", { module: "voluntarios", action: "approve_volunteer" })
    } else if (status === 400) {
      logWarn("Solicitud inválida al aprobar voluntario", { module: "voluntarios", action: "approve_volunteer" })
    } else {
      logError("Error al aprobar voluntario", { module: "voluntarios", action: "approve_volunteer", error })
    }
    return NextResponse.json({ error: msg }, { status })
  }
}
