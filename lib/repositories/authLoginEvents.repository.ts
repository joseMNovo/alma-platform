import { query } from "@/lib/db"

export async function logEvent(data: {
  auth_user_id: number | null
  email: string
  success: boolean
  failure_reason?: string
  ip_address: string
  user_agent: string
}): Promise<void> {
  await query(
    `INSERT INTO auth_login_events (auth_user_id, email, success, failure_reason, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.auth_user_id,
      data.email,
      data.success ? 1 : 0,
      data.failure_reason ?? null,
      data.ip_address,
      data.user_agent,
    ]
  )
}
