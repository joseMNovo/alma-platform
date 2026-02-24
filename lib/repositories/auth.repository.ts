import { query } from "@/lib/db"

export interface AuthUser {
  id: number
  volunteer_id: number | null
  email: string
  password_hash: string
  is_volunteer: number
  email_verified: number
  is_active: number
  last_login_at: Date | null
  last_login_ip: string | null
  last_login_user_agent: string | null
  created_at: Date
  updated_at: Date
}

export async function findByEmail(email: string): Promise<AuthUser | null> {
  const rows = await query<AuthUser>(
    "SELECT * FROM auth_users WHERE email = ? LIMIT 1",
    [email]
  )
  return rows[0] ?? null
}

export async function createAuthUser(data: {
  email: string
  password_hash: string
  is_volunteer: boolean
}): Promise<AuthUser> {
  const result = await query<any>(
    "INSERT INTO auth_users (email, password_hash, is_volunteer) VALUES (?, ?, ?)",
    [data.email, data.password_hash, data.is_volunteer ? 1 : 0]
  )
  const insertId = (result as any).insertId ?? result[0]?.insertId
  const rows = await query<AuthUser>(
    "SELECT * FROM auth_users WHERE id = ? LIMIT 1",
    [insertId]
  )
  return rows[0]
}

export async function setVerified(id: number): Promise<void> {
  await query("UPDATE auth_users SET email_verified = 1 WHERE id = ?", [id])
}

export async function updateLastLogin(
  id: number,
  ip: string,
  ua: string
): Promise<void> {
  await query(
    "UPDATE auth_users SET last_login_at = NOW(), last_login_ip = ?, last_login_user_agent = ? WHERE id = ?",
    [ip, ua, id]
  )
}
