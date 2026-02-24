import { generateRawToken, hashToken } from "@/lib/utils/crypto"
import { HttpError } from "@/lib/utils/httpError"
import {
  createToken,
  findValidToken,
  markUsed,
  deleteExpiredByUser,
} from "@/lib/repositories/authToken.repository"
import { setVerified } from "@/lib/repositories/auth.repository"

function getTTLHours(): number {
  const raw = process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS
  const parsed = parseInt(raw ?? "24", 10)
  return isNaN(parsed) ? 24 : parsed
}

export async function issueVerificationToken(userId: number): Promise<string> {
  await deleteExpiredByUser(userId)

  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)

  const ttlHours = getTTLHours()
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

  await createToken({ auth_user_id: userId, token_hash: tokenHash, expires_at: expiresAt })

  return rawToken
}

export async function verifyEmailToken(rawToken: string): Promise<number> {
  const tokenHash = hashToken(rawToken)
  const record = await findValidToken(tokenHash)

  if (!record) {
    throw new HttpError(400, "Token inválido o no encontrado")
  }

  if (record.used_at !== null) {
    throw new HttpError(400, "Este token ya fue utilizado")
  }

  const now = new Date()
  if (new Date(record.expires_at) < now) {
    throw new HttpError(400, "El token ha expirado")
  }

  await markUsed(record.id)
  await setVerified(record.auth_user_id)

  return record.auth_user_id
}
