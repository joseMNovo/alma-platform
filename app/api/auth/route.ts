import { type NextRequest, NextResponse } from "next/server"
import {
  getVolunteers,
  getVolunteerByEmailForAuth,
  getUserEnrollments,
  getParticipantByEmailForAuth,
  getParticipantProfile,
} from "@/lib/data-manager"
import { validateAdminCredentials } from "@/lib/config"
import { verifyPassword } from "@/lib/utils/password"
import { logInfo, logWarn, logError } from "@/lib/logger"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function makeAuthResponse(user: any) {
  const response = NextResponse.json({ user })
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, is_admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: "30d" }
  )
  response.cookies.set("alma_token", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    //secure: process.env.NODE_ENV === "production",
    secure: process.env.HTTPS_ENABLED === "true",
  })
  return response
}

export async function POST(request: NextRequest) {
  const email_raw = ""
  try {
    const body = await request.json()
    const email: string = (body.email || "").trim().toLowerCase()
    const pin: string = (body.pin || "").trim()

    if (!email || !pin) {
      return NextResponse.json({ error: "Email y PIN son requeridos" }, { status: 400 })
    }

    // 1. Check against ADMIN_EMAIL / ADMIN_PASSWORD from .env
    const adminCheck = validateAdminCredentials(email, pin)
    if (adminCheck.valid) {
      logInfo("Inicio de sesión exitoso (admin env)", {
        module: "auth", action: "login_success", user: adminCheck.user?.id ?? "admin_env",
      })
      return makeAuthResponse(adminCheck.user)
    }
    // If it was the admin email but PIN was wrong → reject immediately
    const { config } = await import("@/lib/config")
    if (config.admin.email && email === config.admin.email.toLowerCase()) {
      logWarn("PIN incorrecto para admin env", { module: "auth", action: "login_failed", meta: { email } })
      return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 })
    }

    // 2. Look up volunteer by email in DB
    const volunteerResult = await getVolunteerByEmailForAuth(email)

    if (volunteerResult) {
      const { volunteer, pin_hash } = volunteerResult

      if (!pin_hash) {
        logWarn("Voluntario sin PIN configurado", { module: "auth", action: "login_failed", meta: { email } })
        return NextResponse.json(
          { error: "PIN no configurado. Contactá al administrador." },
          { status: 401 }
        )
      }

      const pinValid = await verifyPassword(pin, pin_hash)
      if (!pinValid) {
        logWarn("PIN incorrecto para voluntario", {
          module: "auth", action: "login_failed", user: volunteer.id, meta: { email },
        })
        return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 })
      }

      // Build volunteer user object
      const role = volunteer.is_admin ? "admin" : "voluntario"
      const enrollments = await getUserEnrollments(volunteer.id)

      const user = {
        id: volunteer.id,
        name: volunteer.name,
        last_name: volunteer.last_name,
        email: volunteer.email,
        role,
        photo: volunteer.photo,
        phone: volunteer.phone,
        gender: volunteer.gender,
        age: volunteer.age,
        status: volunteer.status,
        specialties: volunteer.specialties,
        registration_date: volunteer.registration_date,
        is_admin: volunteer.is_admin,
        enrollments,
      }

      logInfo("Inicio de sesión exitoso", { module: "auth", action: "login_success", user: volunteer.id, meta: { role } })
      return makeAuthResponse(user)
    }

    // 3. Look up participant by email in DB
    const participantResult = await getParticipantByEmailForAuth(email)

    if (participantResult) {
      const { participant, pin_hash } = participantResult

      if (!pin_hash) {
        logWarn("Participante sin PIN configurado", { module: "auth", action: "login_failed", meta: { email } })
        return NextResponse.json(
          { error: "PIN no configurado. Contactá al administrador." },
          { status: 401 }
        )
      }

      const pinValid = await verifyPassword(pin, pin_hash)
      if (!pinValid) {
        logWarn("PIN incorrecto para participante", {
          module: "auth", action: "login_failed", user: participant.id, meta: { email },
        })
        return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 })
      }

      // Fetch profile to populate name in header
      const profile = await getParticipantProfile(participant.id)

      const user = {
        id: participant.id,
        name: profile?.name || email.split("@")[0],
        last_name: profile?.last_name || null,
        email: participant.email,
        role: "participante",
        photo: null,
        phone: profile?.phone || null,
        is_admin: false,
        enrollments: { workshops: [], groups: [], activities: [] },
      }

      logInfo("Inicio de sesión exitoso", { module: "auth", action: "login_success", user: participant.id, meta: { role: "participante" } })
      return makeAuthResponse(user)
    }

    // 4. Not found in any table
    logWarn("Email no registrado", { module: "auth", action: "login_failed", meta: { email } })
    return NextResponse.json({ error: "Email no registrado" }, { status: 401 })

  } catch (error) {
    logError("Error inesperado en autenticación", { module: "auth", action: "login_error", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const volunteers = await getVolunteers()
    return NextResponse.json({ volunteers })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
