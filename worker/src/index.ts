import { Hono } from "hono"
import { secureHeaders } from "hono/secure-headers"
import { ApiError, failure } from "./http"
import { handlePasswordResetQueue } from "./queue"
import { loadUser } from "./session"
import type { AppContext } from "./types"
import type { PasswordResetQueueMessage } from "./types"
import { adminRoutes } from "./routes/admin"
import { authRoutes, userIdentityRoutes } from "./routes/auth"
import { closetRoutes } from "./routes/closet"
import { playerRoutes } from "./routes/players"
import { premiumRoutes } from "./routes/premium"
import { publicRoutes } from "./routes/public"
import { serveTexture, textureRoutes } from "./routes/textures"
import { yggdrasilRoutes } from "./routes/yggdrasil"

const app = new Hono<AppContext>()

app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }))
app.use("/api", loadUser)
app.use("/api/*", loadUser)

app.route("/api", publicRoutes)
app.route("/api/auth", authRoutes)
app.route("/api/user", userIdentityRoutes)
app.route("/api/user/players", playerRoutes)
app.route("/api/user/textures", textureRoutes)
app.route("/api/user/closet", closetRoutes)
app.route("/api/user/premium", premiumRoutes)
app.route("/api/admin", adminRoutes)
app.route("/api/yggdrasil", yggdrasilRoutes)

app.get("/textures/:hash", serveTexture)

app.notFound(async (c) => {
  if (new URL(c.req.url).pathname.startsWith("/api/")) return failure(c, 404, "API route not found")
  const asset = await c.env.ASSETS.fetch(c.req.raw)
  return new Response(asset.body, asset)
})

app.onError((error, c) => {
  if (error instanceof ApiError) return failure(c, error.status, error.message, error.code)
  console.error(JSON.stringify({
    message: "unhandled request error",
    path: new URL(c.req.url).pathname,
    method: c.req.method,
    error: error instanceof Error ? error.message : String(error),
  }))
  return failure(c, 500, "Internal server error")
})

async function cleanup(env: Cloudflare.Env): Promise<void> {
  const now = new Date().toISOString()
  const joinCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM password_reset_tokens WHERE expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM yggdrasil_tokens WHERE expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM join_sessions WHERE created_at <= ?").bind(joinCutoff),
  ])
}

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx)
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(cleanup(env))
  },
  queue(batch, env) {
    return handlePasswordResetQueue(batch, env)
  },
} satisfies ExportedHandler<Cloudflare.Env, PasswordResetQueueMessage>
