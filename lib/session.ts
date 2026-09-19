import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

/**
 * Cómo se abre una sesión. Vive acá porque hay DOS puertas de entrada:
 * el login con PIN (`/api/auth`) y el link de verificación del mail
 * (`/api/participantes/verify-email`), que también deja adentro. Si cada una
 * armara su propia cookie, el día que cambie la duración o el `tv` una de las
 * dos se queda vieja sin que nadie lo note.
 */

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret"
const COOKIE_MAX_AGE_REMEMBER = 60 * 60 * 24 * 15 // 15 días
const TOKEN_VERSION = parseInt(process.env.APP_TOKEN_VERSION || "1")

export function responderConSesion(user: any, remember: boolean) {
  const response = NextResponse.json({ user })
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, is_admin: user.is_admin, tv: TOKEN_VERSION },
    JWT_SECRET,
    { expiresIn: remember ? "15d" : "1d" },
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
