import { api } from '@/lib/api-client'

export interface AuthSession {
  id: number
  auth_user_id: number
  session_token_hash: string
  expires_at: string
  revoked_at: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export async function createSession(data: {
  auth_user_id: number
  session_token_hash: string
  expires_at: Date
  ip_address: string
  user_agent: string
}): Promise<void> {
  await api.post('/auth/sessions', {
    auth_user_id: data.auth_user_id,
    session_token_hash: data.session_token_hash,
    expires_at: data.expires_at.toISOString(),
    ip_address: data.ip_address,
    user_agent: data.user_agent,
  })
}

export async function revokeSession(session_token_hash: string): Promise<void> {
  await api.put(`/auth/sessions/revoke-by-hash/${encodeURIComponent(session_token_hash)}`, {})
}

export async function findActiveSession(session_token_hash: string): Promise<AuthSession | null> {
  try {
    const session = await api.get<AuthSession>(
      `/auth/sessions/by-hash/${encodeURIComponent(session_token_hash)}`
    )
    if (!session) return null

    const now = new Date()
    if (session.revoked_at) return null
    if (new Date(session.expires_at) <= now) return null

    return session
  } catch {
    return null
  }
}
