import { ApiError } from "../http"
import { sha256 } from "../crypto"

interface TurnstileResult {
  success?: boolean
  action?: string
  hostname?: string
}

export async function verifyTurnstile(
  env: Cloudflare.Env,
  token: string,
  remoteIp: string,
  expectedAction: string,
): Promise<void> {
  if (String(env.APP_ENV) === "test" && env.TURNSTILE_TEST_BYPASS) {
    const [actual, expected] = await Promise.all([sha256(token), sha256(env.TURNSTILE_TEST_BYPASS)])
    if (crypto.subtle.timingSafeEqual(new TextEncoder().encode(actual), new TextEncoder().encode(expected))) return
    throw new ApiError(400, "Human verification failed")
  }
  if (!env.TURNSTILE_SECRET_KEY) throw new ApiError(503, "Password reset is not configured")

  const form = new FormData()
  form.set("secret", env.TURNSTILE_SECRET_KEY)
  form.set("response", token)
  form.set("idempotency_key", crypto.randomUUID())
  if (remoteIp) form.set("remoteip", remoteIp)

  let response: Response
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    })
  } catch {
    throw new ApiError(503, "Human verification is temporarily unavailable")
  }
  if (!response.ok) throw new ApiError(503, "Human verification is temporarily unavailable")

  const result: unknown = await response.json()
  if (!result || typeof result !== "object") throw new ApiError(400, "Human verification failed")
  const verification = result as TurnstileResult
  const expectedHostname = new URL(env.PUBLIC_BASE_URL).hostname
  if (
    verification.success !== true
    || verification.action !== expectedAction
    || (verification.hostname && verification.hostname !== expectedHostname)
  ) {
    throw new ApiError(400, "Human verification failed")
  }
}
