import { Hono } from "hono"
import { getSettings } from "../db"
import { randomToken, sha256, verifyPassword } from "../crypto"
import { ApiError, readJsonObject, requireString } from "../http"
import type { AppContext, PlayerRow, TextureRow, UserRow } from "../types"

interface TokenRow {
  access_token_hash: string
  client_token: string
  uid: number
  pid: number
  expires_at: string
}

interface ProfileProperty {
  name: "textures"
  value: string
  signature?: string
}

export const yggdrasilRoutes = new Hono<AppContext>()

function profileSummary(player: PlayerRow): { id: string; name: string } {
  return { id: player.uuid.replaceAll("-", ""), name: player.player_name }
}

function encodeBase64(value: string | ArrayBuffer): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function pemBytes(pem: string): Uint8Array<ArrayBuffer> {
  const normalized = pem.replaceAll("\\n", "\n")
  const content = normalized.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, "")
  const binary = atob(content)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function signTextureValue(value: string, privateKeyPem: string | undefined): Promise<string | undefined> {
  if (!privateKeyPem) return undefined
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-1" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(value))
  return encodeBase64(signature)
}

async function playerByUuid(db: D1Database, uuid: string): Promise<PlayerRow | null> {
  return db.prepare("SELECT * FROM players WHERE replace(uuid, '-', '') = ?").bind(uuid.replaceAll("-", "")).first<PlayerRow>()
}

async function textureFor(db: D1Database, tid: number | null): Promise<TextureRow | null> {
  if (!tid) return null
  return db.prepare("SELECT * FROM textures WHERE tid = ?").bind(tid).first<TextureRow>()
}

async function fullProfile(
  env: Cloudflare.Env,
  origin: string,
  player: PlayerRow,
  signed: boolean,
): Promise<{ id: string; name: string; properties: ProfileProperty[] }> {
  const [skin, cape] = await Promise.all([textureFor(env.DB, player.tid_skin), textureFor(env.DB, player.tid_cape)])
  const textures: Record<string, { url: string; metadata?: { model: "slim" } }> = {}
  if (skin) textures.SKIN = { url: `${origin}/textures/${skin.hash}` }
  if (cape) textures.CAPE = { url: `${origin}/textures/${cape.hash}` }
  const payload = encodeBase64(JSON.stringify({
    timestamp: Date.now(),
    profileId: player.uuid.replaceAll("-", ""),
    profileName: player.player_name,
    textures,
  }))
  const property: ProfileProperty = { name: "textures", value: payload }
  if (signed) property.signature = await signTextureValue(payload, env.YGGDRASIL_PRIVATE_KEY)
  return { ...profileSummary(player), properties: [property] }
}

async function tokenRow(db: D1Database, accessToken: string): Promise<TokenRow | null> {
  return db.prepare("SELECT * FROM yggdrasil_tokens WHERE access_token_hash = ? AND expires_at > ?")
    .bind(await sha256(accessToken), new Date().toISOString())
    .first<TokenRow>()
}

async function userPlayers(db: D1Database, uid: number): Promise<PlayerRow[]> {
  const { results } = await db.prepare("SELECT * FROM players WHERE uid = ? ORDER BY pid").bind(uid).all<PlayerRow>()
  return results
}

function yggError(message: string, status = 403): Response {
  return Response.json({ error: "ForbiddenOperationException", errorMessage: message }, { status })
}

yggdrasilRoutes.post("/authserver/authenticate", async (c) => {
  const body = await readJsonObject(c)
  const username = requireString(body.username, "username", 1, 254)
  const password = requireString(body.password, "password", 8, 256)
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .bind(username)
    .first<UserRow>()
  if (!user || !(await verifyPassword(password, user.password_hash))) return yggError("Invalid credentials")
  const players = await userPlayers(c.env.DB, user.uid)
  if (players.length === 0) return yggError("No game profile is available")
  const selected = players[0]
  if (!selected) return yggError("No game profile is available")
  const accessToken = randomToken()
  const clientToken = typeof body.clientToken === "string" && body.clientToken ? body.clientToken : randomToken(16)
  await c.env.DB.prepare(
    "INSERT INTO yggdrasil_tokens (access_token_hash, client_token, uid, pid, expires_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(await sha256(accessToken), clientToken, user.uid, selected.pid, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
    .run()
  const response: Record<string, unknown> = {
    accessToken,
    clientToken,
    availableProfiles: players.map(profileSummary),
    selectedProfile: profileSummary(selected),
  }
  if (body.requestUser === true) response.user = { id: String(user.uid), properties: [] }
  return Response.json(response)
})

yggdrasilRoutes.post("/authserver/refresh", async (c) => {
  const body = await readJsonObject(c)
  const oldToken = requireString(body.accessToken, "accessToken", 32, 256)
  const current = await tokenRow(c.env.DB, oldToken)
  if (!current || (body.clientToken && body.clientToken !== current.client_token)) return yggError("Invalid token")
  let pid = current.pid
  if (body.selectedProfile && typeof body.selectedProfile === "object") {
    const requestedId = (body.selectedProfile as Record<string, unknown>).id
    if (typeof requestedId === "string") {
      const requested = await playerByUuid(c.env.DB, requestedId)
      if (!requested || requested.uid !== current.uid) return yggError("Invalid profile")
      pid = requested.pid
    }
  }
  const player = await c.env.DB.prepare("SELECT * FROM players WHERE pid = ?").bind(pid).first<PlayerRow>()
  if (!player) return yggError("Profile no longer exists")
  const newToken = randomToken()
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM yggdrasil_tokens WHERE access_token_hash = ?").bind(await sha256(oldToken)),
    c.env.DB.prepare(
      "INSERT INTO yggdrasil_tokens (access_token_hash, client_token, uid, pid, expires_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(await sha256(newToken), current.client_token, current.uid, pid, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
  ])
  return Response.json({ accessToken: newToken, clientToken: current.client_token, selectedProfile: profileSummary(player) })
})

yggdrasilRoutes.post("/authserver/validate", async (c) => {
  const body = await readJsonObject(c)
  if (typeof body.accessToken !== "string" || !(await tokenRow(c.env.DB, body.accessToken))) return new Response(null, { status: 403 })
  return new Response(null, { status: 204 })
})

yggdrasilRoutes.post("/authserver/invalidate", async (c) => {
  const body = await readJsonObject(c)
  if (typeof body.accessToken === "string") {
    await c.env.DB.prepare("DELETE FROM yggdrasil_tokens WHERE access_token_hash = ?").bind(await sha256(body.accessToken)).run()
  }
  return new Response(null, { status: 204 })
})

yggdrasilRoutes.post("/authserver/signout", async (c) => {
  const body = await readJsonObject(c)
  if (typeof body.username !== "string" || typeof body.password !== "string") return yggError("Invalid credentials")
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").bind(body.username).first<UserRow>()
  if (!user || !(await verifyPassword(body.password, user.password_hash))) return yggError("Invalid credentials")
  await c.env.DB.prepare("DELETE FROM yggdrasil_tokens WHERE uid = ?").bind(user.uid).run()
  return new Response(null, { status: 204 })
})

yggdrasilRoutes.post("/sessionserver/session/minecraft/join", async (c) => {
  const body = await readJsonObject(c)
  if (typeof body.accessToken !== "string" || typeof body.selectedProfile !== "string" || typeof body.serverId !== "string") {
    return yggError("Invalid join request")
  }
  const token = await tokenRow(c.env.DB, body.accessToken)
  if (!token) return yggError("Invalid token")
  const player = await c.env.DB.prepare("SELECT * FROM players WHERE pid = ?").bind(token.pid).first<PlayerRow>()
  if (!player || player.uuid.replaceAll("-", "") !== body.selectedProfile.replaceAll("-", "")) return yggError("Profile mismatch")
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM join_sessions WHERE created_at < ?").bind(new Date(Date.now() - 5 * 60 * 1000).toISOString()),
    c.env.DB.prepare("INSERT INTO join_sessions (profile_uuid, server_id, ip) VALUES (?, ?, ?)")
      .bind(player.uuid.replaceAll("-", ""), body.serverId, c.req.header("CF-Connecting-IP") ?? null),
  ])
  return new Response(null, { status: 204 })
})

yggdrasilRoutes.get("/sessionserver/session/minecraft/hasJoined", async (c) => {
  const username = c.req.query("username")
  const serverId = c.req.query("serverId")
  if (!username || !serverId) return new Response(null, { status: 400 })
  const player = await c.env.DB.prepare(
    `SELECT p.* FROM join_sessions j JOIN players p ON replace(p.uuid, '-', '') = j.profile_uuid
     WHERE p.player_name = ? COLLATE NOCASE AND j.server_id = ? AND j.created_at > ?
     ORDER BY j.created_at DESC LIMIT 1`,
  )
    .bind(username, serverId, new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .first<PlayerRow>()
  if (!player) return new Response(null, { status: 204 })
  return Response.json(await fullProfile(c.env, new URL(c.req.url).origin, player, true))
})

yggdrasilRoutes.get("/sessionserver/session/minecraft/profile/:uuid", async (c) => {
  const player = await playerByUuid(c.env.DB, c.req.param("uuid"))
  if (!player) return new Response(null, { status: 204 })
  return Response.json(await fullProfile(c.env, new URL(c.req.url).origin, player, c.req.query("unsigned") === "false"))
})

yggdrasilRoutes.get("/minecraftservices/publickeys", async (c) => {
  const publicKey = c.env.YGGDRASIL_PUBLIC_KEY?.replaceAll("\\n", "\n") ?? null
  const keys = publicKey ? [{ publicKey, signature: "" }] : []
  return Response.json({ profilePropertyKeys: keys, playerCertificateKeys: keys })
})

yggdrasilRoutes.post("/api/profiles/minecraft", async (c) => {
  const body: unknown = await c.req.json()
  if (!Array.isArray(body) || body.length > 100 || body.some((value) => typeof value !== "string")) {
    throw new ApiError(400, "Expected an array of at most 100 player names")
  }
  if (body.length === 0) return Response.json([])
  const names = body as string[]
  const placeholders = names.map(() => "?").join(",")
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM players WHERE player_name COLLATE NOCASE IN (${placeholders})`,
  )
    .bind(...names)
    .all<PlayerRow>()
  return Response.json(results.map(profileSummary))
})

yggdrasilRoutes.get("/", async (c) => {
  const settings = await getSettings(c.env.DB)
  return Response.json({
    meta: { serverName: settings.site_name, implementationName: "YoloSkin", implementationVersion: "1.0.0" },
    skinDomains: [new URL(c.req.url).hostname],
    signaturePublickey: c.env.YGGDRASIL_PUBLIC_KEY?.replaceAll("\\n", "\n") ?? "",
  })
})
