import jwt from "jsonwebtoken"
import { HttpError } from "@/lib/utils/httpError"
import { hashPassword, verifyPassword } from "@/lib/utils/password"
import {
  findByEmail,
  createAuthUser,
  updateLastLogin,
} from "@/lib/repositories/auth.repository"
import { logEvent } from "@/lib/repositories/authLoginEvents.repository"
import { issueVerificationToken } from "@/lib/services/token.service"
import { sendVerificationEmail } from "@/lib/services/mail.service"

function buildVerifyUrl(rawToken: string): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000"
  return `${base}/api/auth/verify-email?token=${rawToken}`
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET not configured")
  return secret
}

export async function register(
  email: string,
  password: string,
  isVolunteer: boolean,
  _ip: string,
  _ua: string
): Promise<{ message: string }> {
  const existing = await findByEmail(email)
  if (existing) {
    throw new HttpError(409, "Ya existe una cuenta con ese email")
  }

  const password_hash = await hashPassword(password)
  const user = await createAuthUser({ email, password_hash, is_volunteer: isVolunteer })

  const rawToken = await issueVerificationToken(user.id)
  const verifyUrl = buildVerifyUrl(rawToken)

  await sendVerificationEmail(email, verifyUrl)

  return { message: "Registro exitoso. Verificá tu email para activar tu cuenta." }
}

export async function login(
  email: string,
  password: string,
  ip: string,
  ua: string
): Promise<{ token: string; user: { id: number; email: string; is_volunteer: number } }> {
  const user = await findByEmail(email)

  if (!user) {
    await logEvent({ auth_user_id: null, email, success: false, failure_reason: "user_not_found", ip_address: ip, user_agent: ua })
    throw new HttpError(401, "Credenciales inválidas")
  }

  if (!user.is_active) {
    await logEvent({ auth_user_id: user.id, email, success: false, failure_reason: "inactive_user", ip_address: ip, user_agent: ua })
    throw new HttpError(403, "Cuenta desactivada. Contactá al administrador.")
  }

  const passwordOk = await verifyPassword(password, user.password_hash)
  if (!passwordOk) {
    await logEvent({ auth_user_id: user.id, email, success: false, failure_reason: "invalid_password", ip_address: ip, user_agent: ua })
    throw new HttpError(401, "Credenciales inválidas")
  }

  if (!user.email_verified) {
    await logEvent({ auth_user_id: user.id, email, success: false, failure_reason: "unverified_email", ip_address: ip, user_agent: ua })
    throw new HttpError(403, "Cuenta no verificada. Revisá tu email.")
  }

  await updateLastLogin(user.id, ip, ua)
  await logEvent({ auth_user_id: user.id, email, success: true, ip_address: ip, user_agent: ua })

  const secret = getJwtSecret()
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    secret,
    { expiresIn: "15m" }
  )

  return {
    token,
    user: { id: user.id, email: user.email, is_volunteer: user.is_volunteer },
  }
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  const user = await findByEmail(email)

  if (!user) {
    throw new HttpError(404, "No existe una cuenta con ese email")
  }

  if (user.email_verified) {
    throw new HttpError(400, "La cuenta ya está verificada")
  }

  const rawToken = await issueVerificationToken(user.id)
  const verifyUrl = buildVerifyUrl(rawToken)
  await sendVerificationEmail(email, verifyUrl)

  return { message: "Email de verificación reenviado" }
}
