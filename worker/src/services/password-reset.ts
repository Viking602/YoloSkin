import { encryptSecret, hashPassword, randomToken, sha256, signHmac } from "../crypto"
import { ApiError } from "../http"
import type { PasswordResetQueueMessage, UserRow } from "../types"

const GENERIC_MESSAGE = "If the address is registered, a password reset email will arrive shortly"

function positiveSeconds(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function requireResetSecrets(env: Cloudflare.Env): { encryptionKey: string; rateKey: string } {
  if (!env.RESET_TOKEN_ENCRYPTION_KEY || !env.PASSWORD_RESET_RATE_KEY) {
    throw new ApiError(503, "Password reset is not configured")
  }
  return { encryptionKey: env.RESET_TOKEN_ENCRYPTION_KEY, rateKey: env.PASSWORD_RESET_RATE_KEY }
}

export function passwordResetPublicConfig(env: Cloudflare.Env): { enabled: boolean; turnstile_site_key: string } {
  const enabled = Boolean(
    env.TURNSTILE_SITE_KEY
    && env.TURNSTILE_SECRET_KEY
    && env.RESET_TOKEN_ENCRYPTION_KEY
    && env.PASSWORD_RESET_RATE_KEY,
  )
  return { enabled, turnstile_site_key: enabled ? env.TURNSTILE_SITE_KEY : "" }
}

export async function requestPasswordReset(
  env: Cloudflare.Env,
  email: string,
  remoteIp: string,
): Promise<{ message: string }> {
  const { encryptionKey, rateKey } = requireResetSecrets(env)
  const accountKey = await signHmac(email, rateKey)
  const [accountLimit, ipLimit] = await Promise.all([
    env.PASSWORD_RESET_ACCOUNT_LIMITER.limit({ key: accountKey }),
    env.PASSWORD_RESET_IP_LIMITER.limit({ key: remoteIp || "unknown" }),
  ])
  if (!accountLimit.success || !ipLimit.success) throw new ApiError(429, "Too many password reset requests")

  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .bind(email)
    .first<UserRow>()
  if (!user) return { message: GENERIC_MESSAGE }

  const existing = await env.DB.prepare("SELECT created_at FROM password_reset_tokens WHERE uid = ?")
    .bind(user.uid)
    .first<{ created_at: string }>()
  const cooldown = positiveSeconds(env.PASSWORD_RESET_COOLDOWN_SECONDS, 60) * 1000
  if (existing && Date.now() - Date.parse(existing.created_at) < cooldown) return { message: GENERIC_MESSAGE }

  const token = randomToken(32)
  const tokenHash = await sha256(token)
  const encrypted = await encryptSecret(token, encryptionKey)
  const deliveryId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + positiveSeconds(env.PASSWORD_RESET_TTL_SECONDS, 1200) * 1000).toISOString()

  await env.DB.prepare(`
    INSERT INTO password_reset_tokens
      (uid, token_hash, delivery_id, token_ciphertext, token_iv, created_at, expires_at, delivered_at, attempts, last_error)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, NULL)
    ON CONFLICT(uid) DO UPDATE SET
      token_hash = excluded.token_hash,
      delivery_id = excluded.delivery_id,
      token_ciphertext = excluded.token_ciphertext,
      token_iv = excluded.token_iv,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at,
      delivered_at = NULL,
      attempts = 0,
      last_error = NULL
  `).bind(user.uid, tokenHash, deliveryId, encrypted.ciphertext, encrypted.iv, createdAt, expiresAt).run()

  const message: PasswordResetQueueMessage = { type: "password_reset", uid: user.uid, deliveryId }
  try {
    await env.PASSWORD_RESET_QUEUE.send(message)
  } catch (error) {
    await env.DB.prepare("DELETE FROM password_reset_tokens WHERE uid = ? AND delivery_id = ?")
      .bind(user.uid, deliveryId)
      .run()
    console.error(JSON.stringify({
      message: "password reset queue publish failed",
      deliveryId,
      error: error instanceof Error ? error.message : String(error),
    }))
  }
  return { message: GENERIC_MESSAGE }
}

export async function consumePasswordReset(
  env: Cloudflare.Env,
  token: string,
  newPassword: string,
  requestMeta: { ip: string; userAgent: string },
): Promise<void> {
  const tokenHash = await sha256(token)
  const now = new Date().toISOString()
  const user = await env.DB.prepare(`
    SELECT u.uid, u.email
    FROM users u
    JOIN password_reset_tokens p ON p.uid = u.uid
    WHERE p.token_hash = ? AND p.expires_at > ?
  `).bind(tokenHash, now).first<{ uid: number; email: string }>()
  if (!user) throw new ApiError(400, "Password reset link is invalid or expired")

  const passwordHash = await hashPassword(newPassword)
  const results = await env.DB.batch([
    env.DB.prepare(`
      UPDATE users SET password_hash = ?
      WHERE uid = ? AND EXISTS (
        SELECT 1 FROM password_reset_tokens
        WHERE uid = ? AND token_hash = ? AND expires_at > ?
      )
    `).bind(passwordHash, user.uid, user.uid, tokenHash, now),
    env.DB.prepare(`
      DELETE FROM sessions WHERE uid = ? AND EXISTS (
        SELECT 1 FROM password_reset_tokens
        WHERE uid = ? AND token_hash = ? AND expires_at > ?
      )
    `).bind(user.uid, user.uid, tokenHash, now),
    env.DB.prepare(`
      DELETE FROM yggdrasil_tokens WHERE uid = ? AND EXISTS (
        SELECT 1 FROM password_reset_tokens
        WHERE uid = ? AND token_hash = ? AND expires_at > ?
      )
    `).bind(user.uid, user.uid, tokenHash, now),
    env.DB.prepare(`
      INSERT INTO audit_logs (user_id, user_email, action, ip, user_agent, details)
      SELECT ?, ?, 'auth.password.reset', ?, ?, NULL
      WHERE EXISTS (
        SELECT 1 FROM password_reset_tokens
        WHERE uid = ? AND token_hash = ? AND expires_at > ?
      )
    `).bind(user.uid, user.email, requestMeta.ip, requestMeta.userAgent, user.uid, tokenHash, now),
    env.DB.prepare("DELETE FROM password_reset_tokens WHERE uid = ? AND token_hash = ? AND expires_at > ?")
      .bind(user.uid, tokenHash, now),
  ])
  if (results[0]?.meta.changes !== 1) throw new ApiError(400, "Password reset link is invalid or expired")
}
