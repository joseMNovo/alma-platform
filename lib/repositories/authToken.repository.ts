import { query } from "@/lib/db"

export interface AuthToken {
  id: number
  auth_user_id: number
  token_hash: string
  expires_at: Date
  used_at: Date | null
  created_at: Date
}

export async function createToken(data: {
  auth_user_id: number
  token_hash: string
  expires_at: Date
}): Promise<void> {
  await query(
    "INSERT INTO email_verification_tokens (auth_user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [data.auth_user_id, data.token_hash, data.expires_at]
  )
}

export async function findValidToken(token_hash: string): Promise<AuthToken | null> {
  const rows = await query<AuthToken>(
    "SELECT * FROM email_verification_tokens WHERE token_hash = ? LIMIT 1",
    [token_hash]
  )
  return rows[0] ?? null
}

export async function markUsed(id: number): Promise<void> {
  await query(
    "UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?",
    [id]
  )
}

export async function deleteExpiredByUser(auth_user_id: number): Promise<void> {
  await query(
    "DELETE FROM email_verification_tokens WHERE auth_user_id = ? AND (expires_at < NOW() OR used_at IS NOT NULL)",
    [auth_user_id]
  )
}
