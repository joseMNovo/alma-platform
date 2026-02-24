import { type NextRequest } from "next/server"
import jwt from "jsonwebtoken"

export interface SessionUser {
  id: number
  email: string
  role: string
  is_admin: boolean
}

/**
 * Reads the httpOnly 'alma_token' JWT cookie from the request and verifies it.
 * Returns the session user payload, or null if missing/invalid.
 */
export function getSessionUser(request: NextRequest): SessionUser | null {
  try {
    const token = request.cookies.get("alma_token")?.value
    if (!token) return null

    const secret = process.env.JWT_SECRET
    if (!secret) return null

    const payload = jwt.verify(token, secret) as any
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      is_admin: payload.is_admin,
    }
  } catch {
    return null
  }
}
