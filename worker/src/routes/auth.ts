import { Hono } from "hono"
import { audit, getSettings, publicUser } from "../db"
import { hashPassword, randomToken, sha256, signHmac, verifyHmac, verifyPassword } from "../crypto"
import { ApiError, readJsonObject, requireString, success } from "../http"
import { createSession, currentUser, destroySession, requireUser } from "../session"
import type { AppContext, UserRow } from "../types"
import { passwordResetRoutes } from "./password-reset"

export const authRoutes = new Hono<AppContext>()

authRoutes.post("/login", async (c) => {
  const body = await readJsonObject(c)
  const email = requireString(body.email, "email", 3, 254).toLowerCase()
  const password = requireString(body.password, "password", 8, 256)
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").bind(email).first<UserRow>()
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new ApiError(401, "Invalid email or password")
  }
  if (user.verified !== 1) throw new ApiError(403, "Email address is not verified")
  await c.env.DB.prepare("UPDATE users SET last_sign_at = ? WHERE uid = ?")
    .bind(new Date().toISOString(), user.uid)
    .run()
  const token = await createSession(c, user)
  await audit(c, user, "auth.login")
  return success(c, { token, user: publicUser(user, true) })
})

authRoutes.post("/register", async (c) => {
  const settings = await getSettings(c.env.DB)
  if (settings.allow_register !== 1) throw new ApiError(403, "Registration is disabled")
  if (settings.require_email_verification === 1) {
    throw new ApiError(503, "Email verification is not enabled for this Cloudflare deployment")
  }
  const body = await readJsonObject(c)
  const email = requireString(body.email, "email", 3, 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Invalid email address")
  const password = requireString(body.password, "password", 8, 256)
  const nickname = requireString(body.nickname, "nickname", 1, 64)
  const passwordHash = await hashPassword(password)
  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO users (email, password_hash, nickname, score, verified) VALUES (?, ?, ?, ?, 1) RETURNING *",
    )
      .bind(email, passwordHash, nickname, settings.default_score)
      .first<UserRow>()
    if (!result) throw new Error("D1 did not return the registered user")
    const token = await createSession(c, result)
    await audit(c, result, "auth.register")
    return success(c, { token, user: publicUser(result, true) }, 201)
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) throw new ApiError(409, "Email already registered")
    throw error
  }
})

authRoutes.post("/logout", async (c) => {
  const user = c.get("user") ?? null
  await destroySession(c)
  await audit(c, user, "auth.logout")
  return success(c, null)
})

authRoutes.get("/oauth/providers", async (c) => {
  const settings = await getSettings(c.env.DB)
  return success(c, {
    google: Boolean(settings.google_client_id && c.env.GOOGLE_CLIENT_SECRET && c.env.OAUTH_STATE_SECRET),
    microsoft: Boolean(settings.microsoft_client_id && c.env.MICROSOFT_CLIENT_SECRET && c.env.OAUTH_STATE_SECRET),
  })
})

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function decodeBase64Url(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4))
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

authRoutes.get("/oauth/:provider/start", async (c) => {
  const provider = c.req.param("provider")
  if (provider !== "google" && provider !== "microsoft") throw new ApiError(404, "OAuth provider not found")
  if (c.req.query("intent") && c.req.query("intent") !== "login") throw new ApiError(400, "Only OAuth login is supported")
  const settings = await getSettings(c.env.DB)
  const clientId = provider === "google" ? settings.google_client_id : settings.microsoft_client_id
  const clientSecret = provider === "google" ? c.env.GOOGLE_CLIENT_SECRET : c.env.MICROSOFT_CLIENT_SECRET
  if (!clientId || !clientSecret || !c.env.OAUTH_STATE_SECRET) throw new ApiError(503, `${provider} OAuth is not configured`)
  const payload = base64Url(JSON.stringify({ provider, expiresAt: Date.now() + 10 * 60 * 1000 }))
  const state = `${payload}.${await signHmac(payload, c.env.OAUTH_STATE_SECRET)}`
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/oauth/${provider}/callback`
  const authorize = new URL(provider === "google"
    ? "https://accounts.google.com/o/oauth2/v2/auth"
    : "https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
  authorize.searchParams.set("client_id", clientId)
  authorize.searchParams.set("redirect_uri", redirectUri)
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("scope", provider === "google" ? "openid email profile" : "openid email profile User.Read")
  authorize.searchParams.set("state", state)
  return success(c, { provider, enabled: true, url: authorize.toString() })
})

authRoutes.get("/oauth/:provider/callback", async (c) => {
  const provider = c.req.param("provider")
  const code = c.req.query("code")
  const state = c.req.query("state")
  const loginUrl = new URL("/auth/login/", c.req.url)
  try {
    if ((provider !== "google" && provider !== "microsoft") || !code || !state || !c.env.OAUTH_STATE_SECRET) {
      throw new ApiError(400, "Invalid OAuth callback")
    }
    const separator = state.lastIndexOf(".")
    if (separator < 1) throw new ApiError(400, "Invalid OAuth state")
    const payload = state.slice(0, separator)
    const signature = state.slice(separator + 1)
    if (!(await verifyHmac(payload, signature, c.env.OAUTH_STATE_SECRET))) throw new ApiError(400, "Invalid OAuth state signature")
    const parsed: unknown = JSON.parse(decodeBase64Url(payload))
    if (!parsed || typeof parsed !== "object") throw new ApiError(400, "Invalid OAuth state payload")
    const stateData = parsed as { provider?: string; expiresAt?: number }
    if (stateData.provider !== provider || !stateData.expiresAt || stateData.expiresAt < Date.now()) throw new ApiError(400, "OAuth state expired")

    const settings = await getSettings(c.env.DB)
    const clientId = provider === "google" ? settings.google_client_id : settings.microsoft_client_id
    const clientSecret = provider === "google" ? c.env.GOOGLE_CLIENT_SECRET : c.env.MICROSOFT_CLIENT_SECRET
    if (!clientId || !clientSecret) throw new ApiError(503, `${provider} OAuth is not configured`)
    const redirectUri = `${new URL(c.req.url).origin}/api/auth/oauth/${provider}/callback`
    const tokenResponse = await fetch(provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    })
    if (!tokenResponse.ok) throw new ApiError(502, "OAuth token exchange failed")
    const tokenBody: unknown = await tokenResponse.json()
    const accessToken = tokenBody && typeof tokenBody === "object" ? (tokenBody as { access_token?: unknown }).access_token : null
    if (typeof accessToken !== "string") throw new ApiError(502, "OAuth provider did not return an access token")
    const profileResponse = await fetch(provider === "google"
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : "https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } })
    if (!profileResponse.ok) throw new ApiError(502, "OAuth profile request failed")
    const profile: unknown = await profileResponse.json()
    if (!profile || typeof profile !== "object") throw new ApiError(502, "OAuth profile response is invalid")
    const value = profile as Record<string, unknown>
    const subject = provider === "google" ? value.sub : value.id
    const email = provider === "google" ? value.email : (value.mail ?? value.userPrincipalName)
    const nickname = provider === "google" ? (value.name ?? email) : (value.displayName ?? email)
    if (typeof subject !== "string" || typeof email !== "string" || typeof nickname !== "string") {
      throw new ApiError(502, "OAuth profile is missing identity fields")
    }
    let user = await c.env.DB.prepare("SELECT * FROM users WHERE oauth_provider = ? AND oauth_subject = ?")
      .bind(provider, subject)
      .first<UserRow>()
    if (!user) {
      user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").bind(email).first<UserRow>()
      if (user) {
        user = await c.env.DB.prepare("UPDATE users SET oauth_provider = ?, oauth_subject = ?, verified = 1 WHERE uid = ? RETURNING *")
          .bind(provider, subject, user.uid)
          .first<UserRow>()
      } else {
        user = await c.env.DB.prepare(
          "INSERT INTO users (email, password_hash, nickname, verified, oauth_provider, oauth_subject) VALUES (?, ?, ?, 1, ?, ?) RETURNING *",
        )
          .bind(email.toLowerCase(), await hashPassword(randomToken()), nickname.slice(0, 64), provider, subject)
          .first<UserRow>()
      }
    }
    if (!user) throw new Error("D1 did not return the OAuth user")
    await createSession(c, user)
    await audit(c, user, "auth.oauth.login", { provider })
    loginUrl.searchParams.set("oauth", "success")
  } catch (error) {
    loginUrl.searchParams.set("oauth_error", error instanceof Error ? error.message : "OAuth login failed")
  }
  return c.redirect(loginUrl.toString())
})

authRoutes.route("/", passwordResetRoutes)

authRoutes.post("/verify", () => {
  throw new ApiError(501, "Email verification is not configured")
})

export const userIdentityRoutes = new Hono<AppContext>()
userIdentityRoutes.get("/", requireUser, (c) => success(c, currentUser(c)))

userIdentityRoutes.put("/password", requireUser, async (c) => {
  const body = await readJsonObject(c)
  const currentPassword = requireString(body.current_password, "current_password", 8, 256)
  const newPassword = requireString(body.new_password, "new_password", 8, 256)
  const user = c.get("user")
  if (!(await verifyPassword(currentPassword, user.password_hash))) throw new ApiError(400, "Current password is incorrect")
  await c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE uid = ?")
    .bind(await hashPassword(newPassword), user.uid)
    .run()
  const currentToken = await sha256(c.get("sessionToken"))
  await c.env.DB.prepare("DELETE FROM sessions WHERE uid = ? AND token_hash <> ?").bind(user.uid, currentToken).run()
  await audit(c, user, "auth.password.update")
  return success(c, null)
})
