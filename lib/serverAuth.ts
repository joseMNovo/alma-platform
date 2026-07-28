import { type NextRequest } from "next/server"
import jwt from "jsonwebtoken"

export interface SessionUser {
  id: number
  email: string
  role: string
  is_admin: boolean
}

/** Cuando el token es de una sesión impersonada, quién es el admin real
 *  detrás — para el banner de aviso y para poder volver. */
export interface OriginalAdmin {
  id: number
  email: string
}

export interface SessionPayload extends SessionUser {
  imp?: boolean
  original_admin?: OriginalAdmin
}

/**
 * Reads the httpOnly 'alma_token' JWT cookie from the request and verifies it.
 * Returns the session user payload, or null if missing/invalid.
 */
const MIN_TOKEN_VERSION = parseInt(process.env.APP_TOKEN_VERSION || "1")

export function getSessionUser(request: NextRequest): SessionUser | null {
  const payload = getSessionPayload(request)
  if (!payload) return null
  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    is_admin: payload.is_admin,
  }
}

/** Igual que getSessionUser, pero sin recortar los campos extra de
 *  impersonación (imp / original_admin) — los necesita el endpoint que
 *  deshace la impersonación para saber a quién volver. */
export function getSessionPayload(request: NextRequest): SessionPayload | null {
  try {
    const token = request.cookies.get("alma_token")?.value
    if (!token) return null

    const secret = process.env.JWT_SECRET
    if (!secret) return null

    const payload = jwt.verify(token, secret) as any

    // Rechazar tokens emitidos antes de la versión mínima requerida
    if ((payload.tv ?? 0) < MIN_TOKEN_VERSION) return null

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      is_admin: payload.is_admin,
      imp: payload.imp,
      original_admin: payload.original_admin,
    }
  } catch {
    return null
  }
}
