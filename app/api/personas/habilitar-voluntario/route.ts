import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { enrollVolunteerFromDb, type VolunteerEnrollPayload } from "@/lib/data-manager"
import { logInfo, logWarn, logError } from "@/lib/logger"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST /api/personas/habilitar-voluntario
 *  Da de alta una persona (existente o nueva) como voluntario/a pendiente de aprobación. */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "personas:create")) {
    logWarn("Permiso denegado para habilitar voluntario", { module: "personas", action: "enroll_volunteer_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 422 })
    }
    if (!body.email?.trim() || !EMAIL_RE.test(body.email.trim())) {
      return NextResponse.json({ error: "Se requiere un email válido para el voluntario" }, { status: 422 })
    }

    const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null)

    const payload: VolunteerEnrollPayload = {
      name: body.name.trim(),
      last_name: clean(body.last_name),
      email: body.email.trim(),
      phone: clean(body.phone),
      birth_date: clean(body.birth_date),
      gender: clean(body.gender),
      age: typeof body.age === "number" ? body.age : null,
      persona_id: typeof body.persona_id === "number" ? body.persona_id : null,
      registered_by_name: clean(body.registered_by_name),
    }

    const voluntario = await enrollVolunteerFromDb(payload)
    logInfo("Voluntario habilitado desde personas", { module: "personas", action: "enroll_volunteer", user: session.id, meta: { id: voluntario?.id, persona_id: payload.persona_id } })
    return NextResponse.json(voluntario)
  } catch (error: any) {
    const msg = String(error?.message ?? "")
    if (msg.includes("409")) {
      return NextResponse.json({ error: "Ya existe un voluntario con ese email o la persona ya está vinculada" }, { status: 409 })
    }
    if (msg.includes("404")) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    }
    logError("Error al habilitar voluntario", { module: "personas", action: "enroll_volunteer", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
