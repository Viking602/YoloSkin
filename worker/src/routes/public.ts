import { Hono } from "hono"
import { getSettings } from "../db"
import { ApiError, success } from "../http"
import type { AppContext } from "../types"

export const publicRoutes = new Hono<AppContext>()

publicRoutes.get("/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>()
  return success(c, {
    status: row?.ok === 1 ? "ok" : "degraded",
    runtime: "cloudflare-workers",
    database: "d1",
    storage: "r2",
    timestamp: new Date().toISOString(),
  })
})

publicRoutes.get("/site-settings", async (c) => {
  const settings = await getSettings(c.env.DB)
  return success(c, {
    site_name: settings.site_name,
    site_description: settings.site_description,
    site_url: settings.site_url || c.env.PUBLIC_BASE_URL,
    logo_url: settings.logo_url,
    favicon_url: settings.favicon_url,
    theme_color: settings.theme_color,
    footer_text: settings.footer_text,
    allow_register: settings.allow_register === 1,
    require_email_verification: settings.require_email_verification === 1,
  })
})

publicRoutes.get("/stats", async (c) => {
  const batch = await c.env.DB.batch([
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM users"),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM players"),
    c.env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(size), 0) AS storage FROM textures"),
  ])
  const users = batch[0]
  const players = batch[1]
  const textures = batch[2]
  if (!users || !players || !textures) throw new Error("D1 public stats batch returned incomplete results")
  return success(c, {
    total_users: Number((users.results[0] as { total?: number } | undefined)?.total ?? 0),
    total_players: Number((players.results[0] as { total?: number } | undefined)?.total ?? 0),
    total_textures: Number((textures.results[0] as { total?: number } | undefined)?.total ?? 0),
    storage_used: Number((textures.results[0] as { storage?: number } | undefined)?.storage ?? 0),
  })
})

publicRoutes.get("/user/stats", async (c) => {
  const user = c.get("user")
  if (!user) throw new ApiError(401, "Authentication required")
  const batch = await c.env.DB.batch([
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM players WHERE uid = ?").bind(user.uid),
    c.env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(size), 0) AS storage FROM textures WHERE uploader = ?").bind(user.uid),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM closet_items WHERE uid = ?").bind(user.uid),
  ])
  const players = batch[0]
  const textures = batch[1]
  const closet = batch[2]
  if (!players || !textures || !closet) throw new Error("D1 user stats batch returned incomplete results")
  return success(c, {
    players_count: Number((players.results[0] as { total?: number } | undefined)?.total ?? 0),
    textures_count: Number((textures.results[0] as { total?: number } | undefined)?.total ?? 0),
    closet_count: Number((closet.results[0] as { total?: number } | undefined)?.total ?? 0),
    storage_used: Number((textures.results[0] as { storage?: number } | undefined)?.storage ?? 0),
  })
})
