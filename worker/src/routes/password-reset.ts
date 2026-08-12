import { Hono } from "hono"
import { clientIp, requireString, readJsonObject, success } from "../http"
import { consumePasswordReset, passwordResetPublicConfig, requestPasswordReset } from "../services/password-reset"
import { verifyTurnstile } from "../services/turnstile"
import type { AppContext } from "../types"

export const passwordResetRoutes = new Hono<AppContext>()

passwordResetRoutes.get("/password-reset/config", (c) => success(c, passwordResetPublicConfig(c.env)))

passwordResetRoutes.post("/forgot", async (c) => {
  const body = await readJsonObject(c)
  const email = requireString(body.email, "email", 3, 254).toLowerCase()
  const turnstileToken = requireString(body.turnstile_token, "turnstile_token", 1, 2048)
  const ip = clientIp(c)
  await verifyTurnstile(c.env, turnstileToken, ip, "password_reset_request")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return success(c, {
    message: "If the address is registered, a password reset email will arrive shortly",
  }, 202)
  return success(c, await requestPasswordReset(c.env, email, ip), 202)
})

passwordResetRoutes.post("/reset", async (c) => {
  const body = await readJsonObject(c)
  const token = requireString(body.token, "token", 32, 256)
  const newPassword = requireString(body.new_password, "new_password", 8, 256)
  const turnstileToken = requireString(body.turnstile_token, "turnstile_token", 1, 2048)
  const ip = clientIp(c)
  await verifyTurnstile(c.env, turnstileToken, ip, "password_reset_submit")
  await consumePasswordReset(c.env, token, newPassword, {
    ip,
    userAgent: c.req.header("User-Agent") ?? "",
  })
  return success(c, null)
})
