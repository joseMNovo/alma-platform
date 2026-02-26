import { api } from '@/lib/api-client'

export interface AuthToken {
  id: number
  auth_user_id: number
  token_hash: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export async function createToken(data: {
  auth_user_id: number
  token_hash: string
  expires_at: Date
}): Promise<void> {
  await api.post('/auth/verification-tokens', {
    auth_user_id: data.auth_user_id,
    token_hash: data.token_hash,
    expires_at: data.expires_at.toISOString(),
  })
}

export async function findValidToken(token_hash: string): Promise<AuthToken | null> {
  try {
    return await api.get<AuthToken>(
      `/auth/verification-tokens/by-hash/${encodeURIComponent(token_hash)}`
    )
  } catch {
    return null
  }
}

export async function markUsed(id: number): Promise<void> {
  await api.put(`/auth/verification-tokens/${id}`, {})
}

export async function deleteExpiredByUser(auth_user_id: number): Promise<void> {
  await api.delete(`/auth/verification-tokens/expired/${auth_user_id}`)
}
