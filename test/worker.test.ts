import { env, exports } from "cloudflare:workers"
import { createExecutionContext, createMessageBatch, getQueueResult } from "cloudflare:test"
import { describe, expect, it, vi } from "vitest"
import { encryptSecret, sha256 } from "../worker/src/crypto"
import { deliverPasswordResetEmail } from "../worker/src/services/email"
import { handlePasswordResetQueue } from "../worker/src/queue"
import type { PasswordResetQueueMessage } from "../worker/src/types"

interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

function sessionCookie(response: Response): string {
  const header = response.headers.get("Set-Cookie")
  if (!header) throw new Error("Expected session cookie")
  const cookie = header.split(";", 1)[0]
  if (!cookie) throw new Error("Expected cookie name and value")
  return cookie
}

function png64x64(): File {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, 64)
  view.setUint32(20, 64)
  return new File([bytes], "skin.png", { type: "image/png" })
}

describe("YoloSkin Worker", () => {
  it("reports Cloudflare bindings as healthy", async () => {
    const response = await exports.default.fetch("https://example.com/api/health")
    expect(response.status).toBe(200)
    const body = await response.json<ApiEnvelope<{ runtime: string; database: string; storage: string }>>()
    expect(body.data).toEqual(expect.objectContaining({ runtime: "cloudflare-workers", database: "d1", storage: "r2" }))
  })

  it("registers, authenticates, creates a player, and streams an R2 texture", async () => {
    const password = "correct horse battery staple"
    const register = await exports.default.fetch("https://example.com/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "worker-test@example.com", password, nickname: "Worker Test" }),
    })
    expect(register.status).toBe(201)
    const cookie = sessionCookie(register)

    const current = await exports.default.fetch("https://example.com/api/user", { headers: { Cookie: cookie } })
    expect(current.status).toBe(200)
    expect((await current.json<ApiEnvelope<{ email: string }>>()).data.email).toBe("worker-test@example.com")

    const playerResponse = await exports.default.fetch("https://example.com/api/user/players", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: "WorkerTest" }),
    })
    expect(playerResponse.status).toBe(201)

    const yggLogin = await exports.default.fetch("https://example.com/api/yggdrasil/authserver/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "worker-test@example.com", password, requestUser: true }),
    })
    expect(yggLogin.status).toBe(200)
    const yggSession = await yggLogin.json<{ accessToken: string; selectedProfile: { name: string } }>()
    expect(yggSession.selectedProfile.name).toBe("WorkerTest")
    const validation = await exports.default.fetch("https://example.com/api/yggdrasil/authserver/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: yggSession.accessToken }),
    })
    expect(validation.status).toBe(204)

    const form = new FormData()
    form.set("name", "Runtime skin")
    form.set("type", "skin")
    form.set("public", "true")
    form.set("file", png64x64())
    const upload = await exports.default.fetch("https://example.com/api/user/textures", {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    })
    expect(upload.status).toBe(201)
    const texture = (await upload.json<ApiEnvelope<{ hash: string }>>()).data
    expect(await env.TEXTURES.head(`textures/${texture.hash}.png`)).not.toBeNull()

    const download = await exports.default.fetch(`https://example.com/textures/${texture.hash}`)
    expect(download.status).toBe(200)
    expect(download.headers.get("Content-Type")).toBe("image/png")
    expect((await download.arrayBuffer()).byteLength).toBe(24)
  })

  it("rejects protected API access without a session", async () => {
    const response = await exports.default.fetch("https://example.com/api/user/players")
    expect(response.status).toBe(401)
    expect((await response.json<ApiEnvelope<null>>()).code).toBe(401)
  })

  it("issues password reset requests without revealing whether an account exists", async () => {
    const email = "forgot-flow@example.com"
    const register = await exports.default.fetch("https://example.com/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "forgot-flow-password", nickname: "Forgot Flow" }),
    })
    expect(register.status).toBe(201)

    const config = await exports.default.fetch("https://example.com/api/auth/password-reset/config")
    expect(config.status).toBe(200)
    expect((await config.json<ApiEnvelope<{ enabled: boolean }>>()).data.enabled).toBe(true)

    const requestReset = (address: string) => exports.default.fetch("https://example.com/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.10" },
      body: JSON.stringify({ email: address, turnstile_token: "test-turnstile-token" }),
    })
    const known = await requestReset(email)
    const unknown = await requestReset("unknown-account@example.com")
    expect(known.status).toBe(202)
    expect(unknown.status).toBe(202)
    expect((await known.json<ApiEnvelope<{ message: string }>>()).data.message)
      .toBe((await unknown.json<ApiEnvelope<{ message: string }>>()).data.message)

    const row = await env.DB.prepare(`
      SELECT p.delivery_id
      FROM password_reset_tokens p JOIN users u ON u.uid = p.uid
      WHERE u.email = ?
    `).bind(email).first<{ delivery_id: string }>()
    expect(row?.delivery_id).toBeTruthy()
  })

  it("sends password reset email through the native binding without exposing the token in queue data", async () => {
    const email = "email-delivery@example.com"
    await exports.default.fetch("https://example.com/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "email-delivery-password", nickname: "Email Delivery" }),
    })
    const user = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(email).first<{ uid: number }>()
    if (!user || !env.RESET_TOKEN_ENCRYPTION_KEY) throw new Error("Expected password reset test configuration")
    const token = "a".repeat(64)
    const encrypted = await encryptSecret(token, env.RESET_TOKEN_ENCRYPTION_KEY)
    const deliveryId = crypto.randomUUID()
    await env.DB.prepare(`
      INSERT INTO password_reset_tokens
        (uid, token_hash, delivery_id, token_ciphertext, token_iv, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.uid,
      await sha256(token),
      deliveryId,
      encrypted.ciphertext,
      encrypted.iv,
      new Date().toISOString(),
      new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    ).run()

    const send = vi.fn(async (_message: EmailMessageBuilder) => ({ messageId: "email-message-id" }))
    const testEnv = Object.assign(Object.create(env) as Cloudflare.Env, { EMAIL: { send } as SendEmail })
    await deliverPasswordResetEmail(testEnv, { type: "password_reset", uid: user.uid, deliveryId })
    expect(send).toHaveBeenCalledOnce()
    expect(send.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ to: email }))
    expect(send.mock.calls[0]?.[0].html).toContain("#token=")

    const delivered = await env.DB.prepare("SELECT delivered_at, token_ciphertext FROM password_reset_tokens WHERE uid = ?")
      .bind(user.uid)
      .first<{ delivered_at: string | null; token_ciphertext: string | null }>()
    expect(delivered?.delivered_at).toBeTruthy()
    expect(delivered?.token_ciphertext).toBeNull()
  })

  it("resets a password once and revokes browser and Yggdrasil sessions", async () => {
    const email = "reset-flow@example.com"
    const oldPassword = "old-reset-flow-password"
    const newPassword = "new-reset-flow-password"
    const register = await exports.default.fetch("https://example.com/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: oldPassword, nickname: "Reset Flow" }),
    })
    const cookie = sessionCookie(register)
    const player = await exports.default.fetch("https://example.com/api/user/players", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: "ResetFlow" }),
    })
    expect(player.status).toBe(201)
    const yggLogin = await exports.default.fetch("https://example.com/api/yggdrasil/authserver/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password: oldPassword }),
    })
    const yggSession = await yggLogin.json<{ accessToken: string }>()

    const user = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(email).first<{ uid: number }>()
    if (!user) throw new Error("Expected registered user")
    const token = "b".repeat(64)
    await env.DB.prepare(`
      INSERT INTO password_reset_tokens (uid, token_hash, delivery_id, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      user.uid,
      await sha256(token),
      crypto.randomUUID(),
      new Date().toISOString(),
      new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    ).run()

    const reset = () => exports.default.fetch("https://example.com/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.20", "User-Agent": "YoloSkin test" },
      body: JSON.stringify({ token, new_password: newPassword, turnstile_token: "test-turnstile-token" }),
    })
    expect((await reset()).status).toBe(200)
    expect((await reset()).status).toBe(400)
    expect((await exports.default.fetch("https://example.com/api/user", { headers: { Cookie: cookie } })).status).toBe(401)

    const yggValidation = await exports.default.fetch("https://example.com/api/yggdrasil/authserver/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: yggSession.accessToken }),
    })
    expect(yggValidation.status).toBe(403)

    const oldLogin = await exports.default.fetch("https://example.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: oldPassword }),
    })
    const newLogin = await exports.default.fetch("https://example.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: newPassword }),
    })
    expect(oldLogin.status).toBe(401)
    expect(newLogin.status).toBe(200)
    const audit = await env.DB.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE user_id = ? AND action = 'auth.password.reset'")
      .bind(user.uid)
      .first<{ count: number }>()
    expect(audit?.count).toBe(1)
  })

  it("marks failed password reset deliveries for Queue retry", async () => {
    const email = "queue-retry@example.com"
    await exports.default.fetch("https://example.com/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "queue-retry-password", nickname: "Queue Retry" }),
    })
    const user = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(email).first<{ uid: number }>()
    if (!user) throw new Error("Expected queue retry user")
    const deliveryId = crypto.randomUUID()
    await env.DB.prepare(`
      INSERT INTO password_reset_tokens
        (uid, token_hash, delivery_id, token_ciphertext, token_iv, created_at, expires_at)
      VALUES (?, ?, ?, 'invalid-ciphertext', 'invalid-iv', ?, ?)
    `).bind(
      user.uid,
      await sha256("c".repeat(64)),
      deliveryId,
      new Date().toISOString(),
      new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    ).run()
    const messageId = "password-reset-retry"
    const batch = createMessageBatch<PasswordResetQueueMessage>("yoloskin-password-reset", [{
      id: messageId,
      timestamp: new Date(),
      attempts: 1,
      body: { type: "password_reset", uid: user.uid, deliveryId },
    }])
    const context = createExecutionContext()
    await handlePasswordResetQueue(batch, env)
    const result = await getQueueResult(batch, context)
    expect(result.retryMessages).toEqual([expect.objectContaining({ msgId: messageId })])
    const row = await env.DB.prepare("SELECT attempts, last_error FROM password_reset_tokens WHERE uid = ?")
      .bind(user.uid)
      .first<{ attempts: number; last_error: string | null }>()
    expect(row?.attempts).toBe(1)
    expect(row?.last_error).toBeTruthy()
  })
})
