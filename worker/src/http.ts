import type { Context } from "hono"
import type { AppContext } from "./types"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = status,
  ) {
    super(message)
  }
}

export function success<T>(c: Context<AppContext>, data: T, status = 200): Response {
  return c.json({ code: 0, message: "success", data }, status as 200)
}

export function failure(c: Context<AppContext>, status: number, message: string, code = status): Response {
  return c.json({ code, message, data: null }, status as 400)
}

export function parsePositiveInt(value: string | undefined, fallback: number, max = 100): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

export function clientIp(c: Context<AppContext>): string {
  return c.req.header("CF-Connecting-IP") ?? ""
}

export function requireString(value: unknown, field: string, min = 1, max = 255): string {
  if (typeof value !== "string") throw new ApiError(400, `${field} must be a string`)
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    throw new ApiError(400, `${field} length must be between ${min} and ${max}`)
  }
  return normalized
}

export function optionalString(value: unknown, field: string, max = 2048): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  return requireString(value, field, 1, max)
}

export async function readJsonObject(c: Context<AppContext>): Promise<Record<string, unknown>> {
  const contentType = c.req.header("Content-Type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "Content-Type must be application/json")
  }
  const body: unknown = await c.req.json()
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "JSON body must be an object")
  }
  return body as Record<string, unknown>
}
