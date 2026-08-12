import { Hono } from "hono"
import { audit } from "../db"
import { ApiError, readJsonObject, success } from "../http"
import { requireUser } from "../session"
import type { AppContext } from "../types"

export const closetRoutes = new Hono<AppContext>()
closetRoutes.use("*", requireUser)

closetRoutes.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.tid, t.name, t.type, t.hash, ci.added_at
     FROM closet_items ci JOIN textures t ON t.tid = ci.tid
     WHERE ci.uid = ? ORDER BY ci.added_at DESC`,
  )
    .bind(c.get("user").uid)
    .all<Record<string, unknown>>()
  return success(c, results.map((row) => ({ ...row, url: `/textures/${String(row.hash)}` })))
})

closetRoutes.post("/", async (c) => {
  const body = await readJsonObject(c)
  const tid = Number(body.tid)
  if (!Number.isSafeInteger(tid) || tid < 1) throw new ApiError(400, "tid must be a positive integer")
  const texture = await c.env.DB.prepare("SELECT tid, name, type, hash FROM textures WHERE tid = ? AND (is_public = 1 OR uploader = ?)")
    .bind(tid, c.get("user").uid)
    .first<Record<string, unknown>>()
  if (!texture) throw new ApiError(404, "Texture not found")
  await c.env.DB.prepare("INSERT OR IGNORE INTO closet_items (uid, tid) VALUES (?, ?)")
    .bind(c.get("user").uid, tid)
    .run()
  const added = await c.env.DB.prepare("SELECT added_at FROM closet_items WHERE uid = ? AND tid = ?")
    .bind(c.get("user").uid, tid)
    .first<{ added_at: string }>()
  await audit(c, c.get("user"), "closet.add", { tid })
  return success(c, { ...texture, url: `/textures/${String(texture.hash)}`, added_at: added?.added_at }, 201)
})

closetRoutes.delete("/:tid", async (c) => {
  const tid = Number(c.req.param("tid"))
  await c.env.DB.prepare("DELETE FROM closet_items WHERE uid = ? AND tid = ?").bind(c.get("user").uid, tid).run()
  await audit(c, c.get("user"), "closet.remove", { tid })
  return success(c, null)
})
