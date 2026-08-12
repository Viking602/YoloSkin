import { Hono } from "hono"
import { audit } from "../db"
import { ApiError, readJsonObject, requireString, success } from "../http"
import { requireUser } from "../session"
import type { AppContext, PlayerRow } from "../types"

export const playerRoutes = new Hono<AppContext>()
playerRoutes.use("*", requireUser)

function validatePlayerName(value: unknown): string {
  const name = requireString(value, "player_name", 3, 16)
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new ApiError(400, "Player name may only contain letters, numbers and underscores")
  return name
}

async function ownedPlayer(c: Parameters<typeof success>[0], pid: number): Promise<PlayerRow> {
  const player = await c.env.DB.prepare("SELECT * FROM players WHERE pid = ? AND uid = ?")
    .bind(pid, c.get("user").uid)
    .first<PlayerRow>()
  if (!player) throw new ApiError(404, "Player not found")
  return player
}

playerRoutes.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM players WHERE uid = ? ORDER BY created_at DESC")
    .bind(c.get("user").uid)
    .all<PlayerRow>()
  return success(c, results)
})

playerRoutes.post("/", async (c) => {
  const body = await readJsonObject(c)
  const playerName = validatePlayerName(body.player_name)
  try {
    const player = await c.env.DB.prepare(
      "INSERT INTO players (uid, player_name, uuid) VALUES (?, ?, ?) RETURNING *",
    )
      .bind(c.get("user").uid, playerName, crypto.randomUUID().replaceAll("-", ""))
      .first<PlayerRow>()
    if (!player) throw new Error("D1 did not return the new player")
    await audit(c, c.get("user"), "player.create", { pid: player.pid, player_name: player.player_name })
    return success(c, player, 201)
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) throw new ApiError(409, "Player name already exists")
    throw error
  }
})

playerRoutes.get("/:pid", async (c) => success(c, await ownedPlayer(c, Number(c.req.param("pid")))))

playerRoutes.put("/:pid", async (c) => {
  const pid = Number(c.req.param("pid"))
  await ownedPlayer(c, pid)
  const body = await readJsonObject(c)
  const updates: string[] = []
  const values: unknown[] = []
  if (body.player_name !== undefined) {
    updates.push("player_name = ?")
    values.push(validatePlayerName(body.player_name))
  }
  for (const [field, expectedType] of [["tid_skin", "skin"], ["tid_cape", "cape"]] as const) {
    if (body[field] === undefined) continue
    if (body[field] === null) {
      updates.push(`${field} = NULL`)
      continue
    }
    const tid = Number(body[field])
    if (!Number.isSafeInteger(tid) || tid < 1) throw new ApiError(400, `${field} must be a texture id or null`)
    const texture = await c.env.DB.prepare("SELECT tid FROM textures WHERE tid = ? AND uploader = ? AND type = ?")
      .bind(tid, c.get("user").uid, expectedType)
      .first()
    if (!texture) throw new ApiError(400, `${field} does not reference an owned ${expectedType}`)
    updates.push(`${field} = ?`)
    values.push(tid)
  }
  if (updates.length === 0) throw new ApiError(400, "No supported fields to update")
  values.push(pid, c.get("user").uid)
  try {
    const player = await c.env.DB.prepare(
      `UPDATE players SET ${updates.join(", ")} WHERE pid = ? AND uid = ? RETURNING *`,
    )
      .bind(...values)
      .first<PlayerRow>()
    if (!player) throw new ApiError(404, "Player not found")
    await audit(c, c.get("user"), "player.update", { pid, fields: updates.map((value) => value.split(" ")[0]) })
    return success(c, player)
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) throw new ApiError(409, "Player name already exists")
    throw error
  }
})

playerRoutes.delete("/:pid", async (c) => {
  const pid = Number(c.req.param("pid"))
  const player = await ownedPlayer(c, pid)
  await c.env.DB.prepare("DELETE FROM players WHERE pid = ? AND uid = ?").bind(pid, c.get("user").uid).run()
  await audit(c, c.get("user"), "player.delete", { pid, player_name: player.player_name })
  return success(c, null)
})
