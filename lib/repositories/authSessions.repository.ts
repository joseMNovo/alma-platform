import { query } from "@/lib/db"

export interface AuthSession {
  id: number
  auth_user_id: number
  session_token_hash: string
  expires_at: Date
  revoked_at: Date | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export async function createSession(data: {
  auth_user_id: number
  session_token_hash: string
  expires_at: Date
  ip_address: string
  user_agent: string
}): Promise<void> {
  await query(
    `INSERT INTO auth_sessions (auth_user_id, session_token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.auth_user_id,
      data.session_token_hash,
      data.expires_at,
      data.ip_address,
      data.user_agent,
    ]
  )
}

export async function revokeSession(session_token_hash: string): Promise<void> {
  await query(
    "UPDATE auth_sessions SET revoked_at = NOW() WHERE session_token_hash = ?",
    [session_token_hash]
  )
}

export async function findActiveSession(
  session_token_hash: string
): Promise<AuthSession | null> {
  const rows = await query<AuthSession>(
    `SELECT * FROM auth_sessions
     WHERE session_token_hash = ?
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [session_token_hash]
  )
  return rows[0] ?? null
}
