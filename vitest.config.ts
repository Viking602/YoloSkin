import path from "node:path"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin"
import { defineConfig } from "vitest/config"

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"))
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            APP_ENV: "test",
            TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
            TURNSTILE_SECRET_KEY: "test-turnstile-secret",
            TURNSTILE_TEST_BYPASS: "test-turnstile-token",
            RESET_TOKEN_ENCRYPTION_KEY: "test-reset-encryption-key-with-at-least-32-bytes",
            PASSWORD_RESET_RATE_KEY: "test-password-reset-rate-key",
            MAIL_FROM: "noreply@example.com",
          },
        },
      }),
    ],
    test: {
      setupFiles: ["./test/setup.ts"],
    },
  }
})
