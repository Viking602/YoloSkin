import { Hono } from "hono"
import { audit, getSettings, publicTexture, publicUser } from "../db"
import { ApiError, optionalString, parsePositiveInt, readJsonObject, success } from "../http"
import { requireAdmin } from "../session"
import { deleteTextureRecord } from "./textures"
import type { AppContext, SiteSettingsRow, TextureRow, UserRow } from "../types"

export const adminRoutes = new Hono<AppContext>()
adminRoutes.use("*", requireAdmin)

function pageParams(c: Parameters<typeof success>[0]): { page: number; pageSize: number; offset: number } {
  const page = parsePositiveInt(c.req.query("page"), 1, 100_000)
  const pageSize = parsePositiveInt(c.req.query("pageSize"), 20, 100)
  return { page, pageSize, offset: (page - 1) * pageSize }
}

adminRoutes.get("/users", async (c) => {
  const { page, pageSize, offset } = pageParams(c)
  const search = c.req.query("search")?.trim()
  const where = search ? "WHERE email LIKE ? OR nickname LIKE ?" : ""
  const bindings = search ? [`%${search}%`, `%${search}%`] : []
  const batch = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT * FROM users ${where} ORDER BY register_at DESC LIMIT ? OFFSET ?`).bind(...bindings, pageSize, offset),
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM users ${where}`).bind(...bindings),
  ])
  const rows = batch[0]
  const count = batch[1]
  if (!rows || !count) throw new Error("D1 user pagination batch returned incomplete results")
  return c.json({
    code: 0,
    message: "success",
    data: {
      items: (rows.results as unknown as UserRow[]).map((row) => publicUser(row)),
      total: Number((count.results[0] as { total?: number } | undefined)?.total ?? 0),
      page,
      pageSize,
    },
  })
})

adminRoutes.get("/users/stats", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total_users,
      SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS verified_users,
      SUM(CASE WHEN permission >= 1 THEN 1 ELSE 0 END) AS vip_users,
      SUM(CASE WHEN permission >= 2 THEN 1 ELSE 0 END) AS admin_users
     FROM users`,
  ).first<Record<string, number>>()
  return success(c, {
    total_users: Number(row?.total_users ?? 0),
    verified_users: Number(row?.verified_users ?? 0),
    vip_users: Number(row?.vip_users ?? 0),
    admin_users: Number(row?.admin_users ?? 0),
  })
})

adminRoutes.put("/users/:uid", async (c) => {
  const uid = Number(c.req.param("uid"))
  const body = await readJsonObject(c)
  const updates: string[] = []
  const values: unknown[] = []
  for (const field of ["nickname", "avatar"] as const) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(optionalString(body[field], field, field === "nickname" ? 64 : 2048))
    }
  }
  for (const field of ["score", "permission"] as const) {
    if (body[field] !== undefined) {
      const value = Number(body[field])
      if (!Number.isSafeInteger(value) || value < 0 || (field === "permission" && value > 2)) {
        throw new ApiError(400, `${field} is out of range`)
      }
      updates.push(`${field} = ?`)
      values.push(value)
    }
  }
  if (body.verified !== undefined) {
    updates.push("verified = ?")
    values.push(body.verified ? 1 : 0)
  }
  if (updates.length === 0) throw new ApiError(400, "No supported fields to update")
  values.push(uid)
  const row = await c.env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE uid = ? RETURNING *`)
    .bind(...values)
    .first<UserRow>()
  if (!row) throw new ApiError(404, "User not found")
  await audit(c, c.get("user"), "admin.user.update", { uid, fields: updates.map((value) => value.split(" ")[0]) })
  return success(c, publicUser(row))
})

adminRoutes.delete("/users/:uid", async (c) => {
  const uid = Number(c.req.param("uid"))
  if (uid === c.get("user").uid) throw new ApiError(400, "You cannot delete your own account")
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first<UserRow>()
  if (!user) throw new ApiError(404, "User not found")
  const objects = await c.env.DB.prepare("SELECT DISTINCT object_key FROM textures WHERE uploader = ?").bind(uid).all<{ object_key: string }>()
  await c.env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(uid).run()
  for (const item of objects.results) {
    const row = await c.env.DB.prepare("SELECT 1 FROM textures WHERE object_key = ? LIMIT 1").bind(item.object_key).first()
    if (!row) c.executionCtx.waitUntil(c.env.TEXTURES.delete(item.object_key))
  }
  await audit(c, c.get("user"), "admin.user.delete", { uid, email: user.email })
  return success(c, null)
})

adminRoutes.get("/textures", async (c) => {
  const { page, pageSize, offset } = pageParams(c)
  const type = c.req.query("type")
  if (type && type !== "skin" && type !== "cape") throw new ApiError(400, "type must be skin or cape")
  const where = type ? "WHERE type = ?" : ""
  const bindings = type ? [type] : []
  const batch = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT * FROM textures ${where} ORDER BY upload_at DESC LIMIT ? OFFSET ?`).bind(...bindings, pageSize, offset),
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM textures ${where}`).bind(...bindings),
  ])
  const rows = batch[0]
  const count = batch[1]
  if (!rows || !count) throw new Error("D1 texture pagination batch returned incomplete results")
  return c.json({
    code: 0,
    message: "success",
    data: {
      items: (rows.results as unknown as TextureRow[]).map(publicTexture),
      total: Number((count.results[0] as { total?: number } | undefined)?.total ?? 0),
      page,
      pageSize,
    },
  })
})

adminRoutes.delete("/textures/:tid", async (c) => {
  const texture = await c.env.DB.prepare("SELECT * FROM textures WHERE tid = ?")
    .bind(Number(c.req.param("tid")))
    .first<TextureRow>()
  if (!texture) throw new ApiError(404, "Texture not found")
  await deleteTextureRecord(c, texture)
  await audit(c, c.get("user"), "admin.texture.delete", { tid: texture.tid, hash: texture.hash })
  return success(c, null)
})

adminRoutes.get("/audit-logs", async (c) => {
  const { page, pageSize, offset } = pageParams(c)
  const action = c.req.query("action")?.trim()
  const where = action ? "WHERE action LIKE ?" : ""
  const bindings = action ? [`%${action}%`] : []
  const batch = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...bindings, pageSize, offset),
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM audit_logs ${where}`).bind(...bindings),
  ])
  const rows = batch[0]
  const count = batch[1]
  if (!rows || !count) throw new Error("D1 audit pagination batch returned incomplete results")
  const items = rows.results.map((value) => {
    const row = value as Record<string, unknown>
    return { ...row, details: typeof row.details === "string" ? JSON.parse(row.details) : null }
  })
  return c.json({ code: 0, message: "success", data: { items, total: Number((count.results[0] as { total?: number } | undefined)?.total ?? 0), page, pageSize } })
})

function privateSettings(settings: SiteSettingsRow): Record<string, unknown> {
  return {
    site_name: settings.site_name,
    site_description: settings.site_description,
    site_url: settings.site_url,
    logo_url: settings.logo_url,
    favicon_url: settings.favicon_url,
    theme_color: settings.theme_color,
    footer_text: settings.footer_text,
    allow_register: settings.allow_register === 1,
    require_email_verification: settings.require_email_verification === 1,
    default_score: settings.default_score,
    score_per_storage: settings.score_per_storage,
    score_per_closet_item: settings.score_per_closet_item,
    score_per_player: settings.score_per_player,
  }
}

adminRoutes.get("/settings", async (c) => success(c, privateSettings(await getSettings(c.env.DB))))

adminRoutes.put("/settings", async (c) => {
  const body = await readJsonObject(c)
  const allowed = [
    "site_name", "site_description", "site_url", "logo_url", "favicon_url", "theme_color", "footer_text",
    "allow_register", "require_email_verification", "default_score", "score_per_storage", "score_per_closet_item", "score_per_player",
  ] as const
  const updates: string[] = []
  const values: unknown[] = []
  for (const field of allowed) {
    if (body[field] === undefined) continue
    updates.push(`${field} = ?`)
    if (field === "allow_register" || field === "require_email_verification") values.push(body[field] ? 1 : 0)
    else values.push(body[field])
  }
  if (updates.length === 0) throw new ApiError(400, "No supported fields to update")
  await c.env.DB.prepare(`UPDATE site_settings SET ${updates.join(", ")} WHERE id = 1`).bind(...values).run()
  await audit(c, c.get("user"), "admin.settings.update", { fields: allowed.filter((field) => body[field] !== undefined) })
  return success(c, privateSettings(await getSettings(c.env.DB)))
})

adminRoutes.get("/oauth-settings", async (c) => {
  const settings = await getSettings(c.env.DB)
  return success(c, {
    google_client_id: settings.google_client_id,
    microsoft_client_id: settings.microsoft_client_id,
    google_enabled: Boolean(settings.google_client_id && c.env.GOOGLE_CLIENT_SECRET),
    microsoft_enabled: Boolean(settings.microsoft_client_id && c.env.MICROSOFT_CLIENT_SECRET),
    has_google_client_secret: Boolean(c.env.GOOGLE_CLIENT_SECRET),
    has_microsoft_client_secret: Boolean(c.env.MICROSOFT_CLIENT_SECRET),
    has_oauth_state_secret: Boolean(c.env.OAUTH_STATE_SECRET),
  })
})

adminRoutes.put("/oauth-settings", async (c) => {
  const body = await readJsonObject(c)
  if (body.google_client_secret || body.microsoft_client_secret || body.oauth_state_secret) {
    throw new ApiError(400, "OAuth secrets must be configured with wrangler secret put")
  }
  const google = optionalString(body.google_client_id, "google_client_id", 512)
  const microsoft = optionalString(body.microsoft_client_id, "microsoft_client_id", 512)
  await c.env.DB.prepare(
    "UPDATE site_settings SET google_client_id = COALESCE(?, google_client_id), microsoft_client_id = COALESCE(?, microsoft_client_id) WHERE id = 1",
  )
    .bind(google, microsoft)
    .run()
  await audit(c, c.get("user"), "admin.oauth-settings.update")
  const settings = await getSettings(c.env.DB)
  return success(c, {
    google_client_id: settings.google_client_id,
    microsoft_client_id: settings.microsoft_client_id,
    google_enabled: Boolean(settings.google_client_id && c.env.GOOGLE_CLIENT_SECRET),
    microsoft_enabled: Boolean(settings.microsoft_client_id && c.env.MICROSOFT_CLIENT_SECRET),
    has_google_client_secret: Boolean(c.env.GOOGLE_CLIENT_SECRET),
    has_microsoft_client_secret: Boolean(c.env.MICROSOFT_CLIENT_SECRET),
    has_oauth_state_secret: Boolean(c.env.OAUTH_STATE_SECRET),
  })
})
