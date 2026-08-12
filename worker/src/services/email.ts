import { decryptSecret } from "../crypto"
import type { PasswordResetDeliveryRow, PasswordResetQueueMessage } from "../types"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function resetUrl(baseUrl: string, token: string): string {
  const url = new URL("/auth/reset/", baseUrl)
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("PUBLIC_BASE_URL must use HTTPS")
  url.hash = new URLSearchParams({ token }).toString()
  return url.toString()
}

export async function deliverPasswordResetEmail(
  env: Cloudflare.Env,
  job: PasswordResetQueueMessage,
): Promise<void> {
  if (!env.RESET_TOKEN_ENCRYPTION_KEY) throw new Error("RESET_TOKEN_ENCRYPTION_KEY is not configured")
  const row = await env.DB.prepare(`
    SELECT p.*, u.email, u.nickname
    FROM password_reset_tokens p
    JOIN users u ON u.uid = p.uid
    WHERE p.uid = ? AND p.delivery_id = ?
  `).bind(job.uid, job.deliveryId).first<PasswordResetDeliveryRow>()
  if (!row || row.delivered_at) return
  if (Date.parse(row.expires_at) <= Date.now()) {
    await env.DB.prepare("DELETE FROM password_reset_tokens WHERE uid = ? AND delivery_id = ?")
      .bind(job.uid, job.deliveryId)
      .run()
    return
  }
  if (!row.token_ciphertext || !row.token_iv) throw new Error("Password reset delivery payload is missing")

  try {
    const token = await decryptSecret(row.token_ciphertext, row.token_iv, env.RESET_TOKEN_ENCRYPTION_KEY)
    const link = resetUrl(env.PUBLIC_BASE_URL, token)
    const safeName = escapeHtml(row.nickname)
    const safeLink = escapeHtml(link)
    const sent = await env.EMAIL.send({
      to: row.email,
      from: { email: env.MAIL_FROM, name: "YoloSkin" },
      subject: "重置你的 YoloSkin 密码",
      text: `你好 ${row.nickname}，请在 20 分钟内使用以下链接重置密码：${link}\n\n如果不是你发起的请求，请忽略此邮件。`,
      html: `<p>你好 ${safeName}，</p><p>请在 20 分钟内点击下面的链接重置密码：</p><p><a href="${safeLink}">重置密码</a></p><p>如果不是你发起的请求，请忽略此邮件。</p>`,
      headers: { "X-YoloSkin-Delivery-ID": job.deliveryId },
    })
    await env.DB.prepare(`
      UPDATE password_reset_tokens
      SET delivered_at = ?, token_ciphertext = NULL, token_iv = NULL, attempts = attempts + 1, last_error = NULL
      WHERE uid = ? AND delivery_id = ?
    `).bind(new Date().toISOString(), job.uid, job.deliveryId).run()
    console.log(JSON.stringify({ message: "password reset email delivered", deliveryId: job.deliveryId, emailMessageId: sent.messageId }))
  } catch (error) {
    const reason = (error instanceof Error ? error.message : String(error)).slice(0, 500)
    await env.DB.prepare(`
      UPDATE password_reset_tokens SET attempts = attempts + 1, last_error = ?
      WHERE uid = ? AND delivery_id = ?
    `).bind(reason, job.uid, job.deliveryId).run()
    throw error
  }
}
