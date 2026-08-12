// Wrangler generates all configured bindings in worker-configuration.d.ts.
// These optional fields are remote secrets created with `wrangler secret put`.
declare namespace Cloudflare {
  interface Env {
    GOOGLE_CLIENT_SECRET?: string
    MICROSOFT_CLIENT_SECRET?: string
    OAUTH_STATE_SECRET?: string
    TURNSTILE_SECRET_KEY?: string
    TURNSTILE_TEST_BYPASS?: string
    RESET_TOKEN_ENCRYPTION_KEY?: string
    PASSWORD_RESET_RATE_KEY?: string
    YGGDRASIL_PRIVATE_KEY?: string
    YGGDRASIL_PUBLIC_KEY?: string
  }
}

interface SubtleCrypto {
  timingSafeEqual(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean
}
