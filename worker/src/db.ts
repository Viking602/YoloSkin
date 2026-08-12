import type { Context } from "hono"
import type { AppContext, PublicUser, SiteSettingsRow, TextureRow, UserRow } from "./types"
import { clientIp } from "./http"

export function publicUser(row: UserRow, includeAdmin = false): PublicUser {
  const user: PublicUser = {
    uid: row.uid,
    email: row.email,
    nickname: row.nickname,
    avatar: row.avatar,
    score: row.score,
    permission: row.permission,
    register_at: row.register_at,
    last_sign_at: row.last_sign_at,
    verified: row.verified === 1,
  }
  if (includeAdmin) user.is_admin = row.permission >= 2
  return user
}

export function publicTexture(row: TextureRow): Record<string, unknown> {
  return {
    tid: row.tid,
    name: row.name,
    type: row.type,
    hash: row.hash,
    size: row.size,
    uploader: row.uploader,
    public: row.is_public === 1,
    upload_at: row.upload_at,
    likes: row.likes,
  }
}

export async function getSettings(db: D1Database): Promise<SiteSettingsRow> {
  const row = await db.prepare("SELECT * FROM site_settings WHERE id = 1").first<SiteSettingsRow>()
  if (!row) throw new Error("site_settings seed row is missing; apply D1 migrations")
  return row
}

export async function audit(
  c: Context<AppContext>,
  user: Pick<UserRow, "uid" | "email"> | null,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await c.env.DB.prepare(
    "INSERT INTO audit_logs (user_id, user_email, action, ip, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      user?.uid ?? null,
      user?.email ?? "anonymous",
      action,
      clientIp(c),
      c.req.header("User-Agent") ?? "",
      details ? JSON.stringify(details) : null,
    )
    .run()
}

export function isoAfter(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString()
}
