import { Hono } from "hono"
import { audit, publicTexture } from "../db"
import { sha256 } from "../crypto"
import { ApiError, parsePositiveInt, success } from "../http"
import { requireUser } from "../session"
import type { AppContext, TextureRow } from "../types"

const MAX_TEXTURE_BYTES = 2 * 1024 * 1024

export const textureRoutes = new Hono<AppContext>()
textureRoutes.use("*", requireUser)

function validatePng(buffer: ArrayBuffer, type: "skin" | "cape"): void {
  const bytes = new Uint8Array(buffer)
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) {
    throw new ApiError(400, "Texture must be a valid PNG image")
  }
  const view = new DataView(buffer)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  const valid = type === "skin" ? width === 64 && (height === 64 || height === 32) : width === 64 && height === 32
  if (!valid) throw new ApiError(400, type === "skin" ? "Skin PNG must be 64x64 or 64x32" : "Cape PNG must be 64x32")
}

export async function deleteTextureRecord(c: Parameters<typeof success>[0], texture: TextureRow): Promise<void> {
  await c.env.DB.prepare("DELETE FROM textures WHERE tid = ?").bind(texture.tid).run()
  const remaining = await c.env.DB.prepare("SELECT COUNT(*) AS total FROM textures WHERE object_key = ?")
    .bind(texture.object_key)
    .first<{ total: number }>()
  if (Number(remaining?.total ?? 0) === 0) c.executionCtx.waitUntil(c.env.TEXTURES.delete(texture.object_key))
}

textureRoutes.get("/", async (c) => {
  const page = parsePositiveInt(c.req.query("page"), 1, 100_000)
  const pageSize = parsePositiveInt(c.req.query("pageSize"), 20, 100)
  const type = c.req.query("type")
  if (type && type !== "skin" && type !== "cape") throw new ApiError(400, "type must be skin or cape")
  const where = type ? "uploader = ? AND type = ?" : "uploader = ?"
  const bindings = type ? [c.get("user").uid, type] : [c.get("user").uid]
  const batch = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT * FROM textures WHERE ${where} ORDER BY upload_at DESC LIMIT ? OFFSET ?`).bind(
      ...bindings,
      pageSize,
      (page - 1) * pageSize,
    ),
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM textures WHERE ${where}`).bind(...bindings),
  ])
  const rows = batch[0]
  const count = batch[1]
  if (!rows || !count) throw new Error("D1 texture pagination batch returned incomplete results")
  const items = (rows.results as unknown as TextureRow[]).map(publicTexture)
  const total = Number((count.results[0] as { total?: number } | undefined)?.total ?? 0)
  return c.json({ code: 0, message: "success", data: { items, total, page, pageSize } })
})

textureRoutes.get("/:tid", async (c) => {
  const texture = await c.env.DB.prepare("SELECT * FROM textures WHERE tid = ? AND uploader = ?")
    .bind(Number(c.req.param("tid")), c.get("user").uid)
    .first<TextureRow>()
  if (!texture) throw new ApiError(404, "Texture not found")
  return success(c, publicTexture(texture))
})

textureRoutes.post("/", async (c) => {
  const contentLength = Number(c.req.header("Content-Length") ?? 0)
  if (contentLength > MAX_TEXTURE_BYTES + 64 * 1024) throw new ApiError(413, "Texture upload is too large")
  const form = await c.req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) throw new ApiError(400, "file is required")
  if (file.size < 1 || file.size > MAX_TEXTURE_BYTES) throw new ApiError(413, "Texture must be at most 2 MiB")
  const typeValue = form.get("type")
  if (typeValue !== "skin" && typeValue !== "cape") throw new ApiError(400, "type must be skin or cape")
  const nameValue = form.get("name")
  const name = typeof nameValue === "string" ? nameValue.trim() : ""
  if (name.length < 1 || name.length > 128) throw new ApiError(400, "name length must be between 1 and 128")
  const buffer = await file.arrayBuffer()
  validatePng(buffer, typeValue)
  const hash = await sha256(buffer)
  const objectKey = `textures/${hash}.png`
  const objectAlreadyExists = await c.env.TEXTURES.head(objectKey)
  await c.env.TEXTURES.put(objectKey, buffer, {
    httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { uploader: String(c.get("user").uid), type: typeValue },
  })
  try {
    const texture = await c.env.DB.prepare(
      `INSERT INTO textures (name, type, hash, object_key, size, uploader, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    )
      .bind(name, typeValue, hash, objectKey, file.size, c.get("user").uid, form.get("public") === "true" ? 1 : 0)
      .first<TextureRow>()
    if (!texture) throw new Error("D1 did not return the uploaded texture")
    await audit(c, c.get("user"), "texture.upload", { tid: texture.tid, hash, type: typeValue })
    return success(c, publicTexture(texture), 201)
  } catch (error) {
    if (!objectAlreadyExists) await c.env.TEXTURES.delete(objectKey)
    throw error
  }
})

textureRoutes.delete("/:tid", async (c) => {
  const texture = await c.env.DB.prepare("SELECT * FROM textures WHERE tid = ? AND uploader = ?")
    .bind(Number(c.req.param("tid")), c.get("user").uid)
    .first<TextureRow>()
  if (!texture) throw new ApiError(404, "Texture not found")
  await deleteTextureRecord(c, texture)
  await audit(c, c.get("user"), "texture.delete", { tid: texture.tid, hash: texture.hash })
  return success(c, null)
})

export async function serveTexture(c: Parameters<typeof success>[0]): Promise<Response> {
  const hash = c.req.param("hash")
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) throw new ApiError(404, "Texture not found")
  const object = await c.env.TEXTURES.get(`textures/${hash}.png`)
  if (!object) throw new ApiError(404, "Texture not found")
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set("ETag", object.httpEtag)
  headers.set("Cache-Control", "public, max-age=31536000, immutable")
  return new Response(object.body, { headers })
}
