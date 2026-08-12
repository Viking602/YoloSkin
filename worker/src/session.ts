import type { Context, MiddlewareHandler } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { publicUser, isoAfter } from "./db"
import { randomToken, sha256 } from "./crypto"
import { ApiError } from "./http"
import type { AppContext, UserRow } from "./types"

const COOKIE_NAME = "yoloskin_session"

function sessionTtl(env: Cloudflare.Env): number {
  const parsed = Number.parseInt(env.SESSION_TTL_SECONDS, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 2_592_000
}

function bearerToken(c: Context<AppContext>): string | null {
  const authorization = c.req.header("Authorization")
  if (!authorization?.startsWith("Bearer ")) return null
  return authorization.slice(7).trim() || null
}

export async function createSession(c: Context<AppContext>, user: UserRow): Promise<string> {
  const token = randomToken()
  const tokenHash = await sha256(token)
  const ttl = sessionTtl(c.env)
  await c.env.DB.prepare("INSERT INTO sessions (token_hash, uid, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, user.uid, isoAfter(ttl))
    .run()
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: ttl,
  })
  c.set("sessionToken", token)
  return token
}

export async function destroySession(c: Context<AppContext>): Promise<void> {
  const token = getCookie(c, COOKIE_NAME) ?? bearerToken(c)
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run()
  deleteCookie(c, COOKIE_NAME, { path: "/" })
}

export const loadUser: MiddlewareHandler<AppContext> = async (c, next) => {
  const token = getCookie(c, COOKIE_NAME) ?? bearerToken(c)
  if (token) {
    const user = await c.env.DB.prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.uid = s.uid
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
      .bind(await sha256(token), new Date().toISOString())
      .first<UserRow>()
    if (user) {
      c.set("user", user)
      c.set("sessionToken", token)
    }
  }
  await next()
}

export const requireUser: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get("user")
  if (!user) throw new ApiError(401, "Authentication required")
  await next()
}

export const requireAdmin: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get("user")
  if (!user) throw new ApiError(401, "Authentication required")
  if (user.permission < 2) throw new ApiError(403, "Administrator permission required")
  await next()
}

export function currentUser(c: Context<AppContext>): ReturnType<typeof publicUser> {
  const user = c.get("user")
  if (!user) throw new ApiError(401, "Authentication required")
  return publicUser(user, true)
}
