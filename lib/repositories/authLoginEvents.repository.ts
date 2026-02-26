import { api } from '@/lib/api-client'

export async function logEvent(data: {
  auth_user_id: number | null
  email: string
  success: boolean
  failure_reason?: string
  ip_address: string
  user_agent: string
}): Promise<void> {
  await api.post('/auth/login-events', {
    auth_user_id: data.auth_user_id,
    email: data.email,
    success: data.success,
    failure_reason: data.failure_reason ?? null,
    ip_address: data.ip_address,
    user_agent: data.user_agent,
  })
}
