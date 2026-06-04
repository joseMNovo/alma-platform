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
const COOKIE_MAX_AGE_REMEMBER = 60 * 60 * 24 * 15 // 15 days

// ── Rate limiting en memoria ────────────────────────────────────────────────
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000   // ventana de 15 min
const BLOCK_MS  = 15 * 60 * 1000   // bloqueo de 15 min tras agotar intentos

interface RateLimitRecord { count: number; firstAttempt: number; blockedUntil?: number }
const _loginAttempts = new Map<string, RateLimitRecord>()

function _rlKey(req: NextRequest, email: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
           || req.headers.get("x-real-ip")
           || "unknown"
  return `${ip}:${email}`
}

function _checkRL(key: string): { blocked: boolean; retryAfterMs: number } {
  const now = Date.now()
  const r = _loginAttempts.get(key)
  if (!r) return { blocked: false, retryAfterMs: 0 }
  if (r.blockedUntil && now < r.blockedUntil) return { blocked: true, retryAfterMs: r.blockedUntil - now }
  if (now - r.firstAttempt > WINDOW_MS) { _loginAttempts.delete(key); return { blocked: false, retryAfterMs: 0 } }
  return { blocked: false, retryAfterMs: 0 }
}

function _recordFail(key: string) {
  const now = Date.now()
  const r = _loginAttempts.get(key)
  if (!r || now - r.firstAttempt > WINDOW_MS) {
    _loginAttempts.set(key, { count: 1, firstAttempt: now })
  } else {
    r.count++
    if (r.count >= MAX_ATTEMPTS) r.blockedUntil = now + BLOCK_MS
    _loginAttempts.set(key, r)
  }
}

function _clearRL(key: string) { _loginAttempts.delete(key) }

const TOKEN_VERSION = parseInt(process.env.APP_TOKEN_VERSION || "1")

function makeAuthResponse(user: any, remember: boolean) {
  const response = NextResponse.json({ user })
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, is_admin: user.is_admin, tv: TOKEN_VERSION },
    JWT_SECRET,
    { expiresIn: remember ? "15d" : "1d" }
  )
  response.cookies.set("alma_token", token, {
    httpOnly: true,
    sameSite: "strict",
    ...(remember ? { maxAge: COOKIE_MAX_AGE_REMEMBER } : {}),
    path: "/",
    secure: process.env.HTTPS_ENABLED === "true",
  })
  return response
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email: string = (body.email || "").trim().toLowerCase()
    const pin: string = (body.pin || "").trim()
    const remember: boolean = body.remember !== false // default true

    if (!email || !pin) {
      return NextResponse.json({ error: "Email y PIN son requeridos" }, { status: 400 })
    }

    // Rate limit check
    const rlKey = _rlKey(request, email)
    const { blocked, retryAfterMs } = _checkRL(rlKey)
    if (blocked) {
      const mins = Math.ceil(retryAfterMs / 60000)
      logWarn("Login bloqueado por exceso de intentos", { module: "auth", action: "rate_limited", meta: { email } })
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Intentá de nuevo en ${mins} minuto${mins !== 1 ? "s" : ""}.` },
        { status: 429 }
      )
    }

    // 1. Check against ADMIN_EMAIL / ADMIN_PASSWORD from .env
    const adminCheck = validateAdminCredentials(email, pin)
    if (adminCheck.valid) {
      _clearRL(rlKey)
      logInfo("Inicio de sesión exitoso (admin env)", {
        module: "auth", action: "login_success", user: adminCheck.user?.id ?? "admin_env",
      })
      return makeAuthResponse(adminCheck.user, remember)
    }
    // If it was the admin email but PIN was wrong → reject immediately
    const { config } = await import("@/lib/config")
    if (config.admin.email && email === config.admin.email.toLowerCase()) {
      logWarn("PIN incorrecto para admin env", { module: "auth", action: "login_failed", meta: { email } })
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
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
        _recordFail(rlKey)
        logWarn("PIN incorrecto para voluntario", {
          module: "auth", action: "login_failed", user: volunteer.id, meta: { email },
        })
        return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
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
        birth_date: volunteer.birth_date,
        status: volunteer.status,
        specialties: volunteer.specialties,
        registration_date: volunteer.registration_date,
        is_admin: volunteer.is_admin,
        enrollments,
      }

      _clearRL(rlKey)
      logInfo("Inicio de sesión exitoso", { module: "auth", action: "login_success", user: volunteer.id, meta: { role, remember } })
      return makeAuthResponse(user, remember)
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
        _recordFail(rlKey)
        logWarn("PIN incorrecto para participante", {
          module: "auth", action: "login_failed", user: participant.id, meta: { email },
        })
        return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
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

      _clearRL(rlKey)
      logInfo("Inicio de sesión exitoso", { module: "auth", action: "login_success", user: participant.id, meta: { role: "participante", remember } })
      return makeAuthResponse(user, remember)
    }

    // 4. Not found in any table
    _recordFail(rlKey)
    logWarn("Email no registrado", { module: "auth", action: "login_failed", meta: { email } })
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })

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
