import { api } from '@/lib/api-client'

export interface AuthUser {
  id: number
  volunteer_id: number | null
  email: string
  password_hash: string
  is_volunteer: number
  email_verified: number
  is_active: number
  last_login_at: string | null
  last_login_ip: string | null
  last_login_user_agent: string | null
  created_at: string
  updated_at: string
}

export async function findByEmail(email: string): Promise<AuthUser | null> {
  try {
    return await api.get<AuthUser>(`/auth/users/by-email/${encodeURIComponent(email)}`)
  } catch {
    return null
  }
}

export async function createAuthUser(data: {
  email: string
  password_hash: string
  is_volunteer: boolean
}): Promise<AuthUser> {
  return api.post<AuthUser>('/auth/users', {
    email: data.email,
    password_hash: data.password_hash,
    is_volunteer: data.is_volunteer,
  })
}

export async function setVerified(id: number): Promise<void> {
  await api.put(`/auth/users/${id}`, { email_verified: true })
}

export async function updateLastLogin(id: number, ip: string, ua: string): Promise<void> {
  await api.put(`/auth/users/${id}`, {
    last_login_at: new Date().toISOString(),
    last_login_ip: ip,
    last_login_user_agent: ua,
  })
}
