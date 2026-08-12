import { Hono } from "hono"
import { audit } from "../db"
import { ApiError, readJsonObject, requireString, success } from "../http"
import { requireUser } from "../session"
import type { AppContext } from "../types"

interface MinecraftProfile {
  id: string
  name: string
}

export const premiumRoutes = new Hono<AppContext>()
premiumRoutes.use("*", requireUser)

premiumRoutes.get("/", async (c) => {
  const binding = await c.env.DB.prepare("SELECT uuid, username, bound_at FROM premium_bindings WHERE uid = ?")
    .bind(c.get("user").uid)
    .first()
  return success(c, binding)
})

premiumRoutes.post("/", async (c) => {
  const body = await readJsonObject(c)
  const accessToken = requireString(body.microsoft_token, "microsoft_token", 20, 4096)
  const response = await fetch("https://api.minecraftservices.com/minecraft/profile", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  if (!response.ok) throw new ApiError(400, "Microsoft token does not grant access to a Minecraft profile")
  const profile: unknown = await response.json()
  if (!profile || typeof profile !== "object") throw new ApiError(502, "Minecraft profile response is invalid")
  const record = profile as Partial<MinecraftProfile>
  if (!record.id || !record.name) throw new ApiError(502, "Minecraft profile is missing id or name")
  const binding = await c.env.DB.prepare(
    `INSERT INTO premium_bindings (uid, uuid, username, access_token)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET uuid = excluded.uuid, username = excluded.username,
       access_token = excluded.access_token, bound_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     RETURNING uuid, username, bound_at`,
  )
    .bind(c.get("user").uid, record.id, record.name, accessToken)
    .first()
  await audit(c, c.get("user"), "premium.bind", { uuid: record.id, username: record.name })
  return success(c, binding)
})

premiumRoutes.delete("/", async (c) => {
  await c.env.DB.prepare("DELETE FROM premium_bindings WHERE uid = ?").bind(c.get("user").uid).run()
  await audit(c, c.get("user"), "premium.unbind")
  return success(c, null)
})

premiumRoutes.post("/sync", () => {
  throw new ApiError(501, "Automatic premium skin import is not implemented; upload the PNG through texture management")
})
