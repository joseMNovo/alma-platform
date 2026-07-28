import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import {
  getPersonaById, getVolunteerById, getParticipantProfile,
  getUserEnrollments, logActivityEvent, toUserType,
} from "@/lib/data-manager"
import { getSessionUser, getSessionPayload } from "@/lib/serverAuth"
import { config } from "@/lib/config"
import { logWarn, logError } from "@/lib/logger"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret"
const TOKEN_VERSION = parseInt(process.env.APP_TOKEN_VERSION || "1")
// Sesión impersonada: vida corta a propósito, sin importar el "recordarme"
// del admin — es un préstamo de identidad, no un login normal.
const IMPERSONATION_MAX_AGE = 60 * 60 * 4 // 4 horas

function setSessionCookie(response: NextResponse, payload: object, maxAgeSeconds?: number) {
  const token = jwt.sign({ ...payload, tv: TOKEN_VERSION }, JWT_SECRET, {
    expiresIn: maxAgeSeconds ?? 60 * 60 * 24,
  })
  response.cookies.set("alma_token", token, {
    httpOnly: true,
    sameSite: "strict",
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}),
    path: "/",
    secure: process.env.HTTPS_ENABLED === "true",
  })
  return response
}

/**
 * POST /api/admin/impersonate — un admin entra a la app COMO otra persona
 * (voluntario o participante), para ver exactamente lo que ve esa persona.
 *
 * Reglas duras:
 *  - Solo admin.
 *  - El destino tiene que tener email (es la identidad mínima que exigimos).
 *  - Nunca se puede impersonar a otro admin.
 *  - Si ya estabas impersonando y saltás a otra persona, `original_admin`
 *    sigue apuntando al admin de VERDAD (no al que estabas impersonando)
 *    para que "volver" nunca te deje a mitad de camino.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.role !== "admin") {
    logWarn("Intento de impersonar sin ser admin", { module: "admin", action: "impersonate_denied", user: session.id })
    return NextResponse.json({ error: "Solo un administrador puede hacer esto" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const personId = Number.parseInt(String(body.person_id ?? 0), 10)
    const targetType = body.target_type === "participante" ? "participante" : "voluntario"
    if (!personId) return NextResponse.json({ error: "Falta la persona" }, { status: 400 })

    const persona = await getPersonaById(personId)
    if (!persona) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    const personaEmail = persona.email?.trim()
    if (!personaEmail) {
      return NextResponse.json({ error: "Esa persona no tiene email cargado" }, { status: 422 })
    }

    let impersonatedUser: any

    if (targetType === "voluntario") {
      if (!persona.volunteer_id) {
        return NextResponse.json({ error: "Esa persona no tiene ficha de voluntario/a" }, { status: 422 })
      }
      const volunteer = await getVolunteerById(persona.volunteer_id)
      if (!volunteer) return NextResponse.json({ error: "Voluntario/a no encontrado" }, { status: 404 })
      if (volunteer.is_admin) {
        return NextResponse.json({ error: "No se puede impersonar a otro administrador" }, { status: 403 })
      }
      const enrollments = await getUserEnrollments(volunteer.id)
      impersonatedUser = {
        id: volunteer.id,
        name: volunteer.name,
        last_name: volunteer.last_name,
        email: volunteer.email,
        role: "voluntario",
        photo: volunteer.photo,
        phone: volunteer.phone,
        is_admin: false,
        enrollments,
      }
    } else {
      if (!persona.participant_id) {
        return NextResponse.json({ error: "Esa persona no tiene cuenta de participante" }, { status: 422 })
      }
      const profile = await getParticipantProfile(persona.participant_id)
      impersonatedUser = {
        id: persona.participant_id,
        name: profile?.name || persona.name || personaEmail.split("@")[0],
        last_name: profile?.last_name || persona.last_name || null,
        email: personaEmail,
        role: "participante",
        photo: null,
        phone: profile?.phone || persona.phone || null,
        is_admin: false,
        enrollments: { workshops: [], groups: [], activities: [] },
      }
    }

    // Si ya venía impersonando, el admin "de verdad" es el que ya estaba
    // guardado en el token — no el que se ve ahora en la sesión.
    const currentPayload = getSessionPayload(request)
    const originalAdmin = currentPayload?.original_admin ?? { id: session.id, email: session.email }

    if (impersonatedUser.id === originalAdmin.id && targetType === "voluntario") {
      return NextResponse.json({ error: "Ya sos vos" }, { status: 422 })
    }

    logWarn("Impersonación iniciada", {
      module: "admin", action: "impersonate_start", user: originalAdmin.id,
      meta: { admin_email: originalAdmin.email, target_type: targetType, target_id: impersonatedUser.id, target_email: impersonatedUser.email },
    })
    logActivityEvent({
      event_type: "login", module: "admin", action: "impersonate_start",
      user_type: toUserType("admin"), user_id: originalAdmin.id, role: "admin",
    }).catch(() => {})

    const response = NextResponse.json({
      user: { ...impersonatedUser, impersonating: true, original_admin: originalAdmin },
    })
    return setSessionCookie(
      response,
      {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        role: impersonatedUser.role,
        is_admin: false,
        imp: true,
        original_admin: originalAdmin,
      },
      IMPERSONATION_MAX_AGE,
    )
  } catch (error) {
    logError("Error al iniciar impersonación", { module: "admin", action: "impersonate_start", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

/** DELETE /api/admin/impersonate — vuelve a la sesión del admin real. */
export async function DELETE(request: NextRequest) {
  const payload = getSessionPayload(request)
  if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!payload.imp || !payload.original_admin) {
    return NextResponse.json({ error: "No estás impersonando a nadie" }, { status: 400 })
  }

  try {
    // El admin de entorno (ADMIN_EMAIL/ADMIN_PASSWORD del .env) no es una fila
    // de `voluntarios` — usa id=0 (ver lib/config.ts). No se puede reverificar
    // contra la DB porque no existe ahí; se reconstruye directo del env.
    let adminUser: any
    if (payload.original_admin.id === 0) {
      if (!config.admin.email || config.admin.email.toLowerCase() !== payload.original_admin.email.toLowerCase()) {
        return NextResponse.json({ error: "Tu cuenta ya no tiene permisos de administrador" }, { status: 403 })
      }
      adminUser = {
        id: 0, name: "Administrador", last_name: "", email: config.admin.email,
        role: "admin", photo: null, phone: null, is_admin: true,
        enrollments: { workshops: [], groups: [], activities: [] },
      }
    } else {
      // Se re-verifica que el admin siga siendo admin: si en el medio le
      // sacaron el rol, no le devolvemos una sesión de administrador.
      const admin = await getVolunteerById(payload.original_admin.id)
      if (!admin || !admin.is_admin) {
        logWarn("No se pudo volver de la impersonación: el admin original ya no es admin", {
          module: "admin", action: "impersonate_exit_denied", meta: { admin_id: payload.original_admin.id },
        })
        return NextResponse.json({ error: "Tu cuenta ya no tiene permisos de administrador" }, { status: 403 })
      }
      const enrollments = await getUserEnrollments(admin.id)
      adminUser = {
        id: admin.id,
        name: admin.name,
        last_name: admin.last_name,
        email: admin.email,
        role: "admin",
        photo: admin.photo,
        phone: admin.phone,
        is_admin: true,
        enrollments,
      }
    }

    logWarn("Impersonación finalizada", {
      module: "admin", action: "impersonate_exit", user: adminUser.id,
      meta: { was_target: payload.email, target_id: payload.id },
    })
    logActivityEvent({
      event_type: "login", module: "admin", action: "impersonate_exit",
      user_type: toUserType("admin"), user_id: adminUser.id, role: "admin",
    }).catch(() => {})

    const response = NextResponse.json({ user: adminUser })
    return setSessionCookie(response, { id: adminUser.id, email: adminUser.email, role: "admin", is_admin: true })
  } catch (error) {
    logError("Error al salir de la impersonación", { module: "admin", action: "impersonate_exit", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
