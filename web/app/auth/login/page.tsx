"use client"

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthCard } from "@/components/auth-card"
import { getCurrentUser, getOAuthProviders, getOAuthStartUrl, login } from "@/lib/api/services"
import { useAuth } from "@/lib/auth/context"
import { useI18n } from "@/lib/i18n/context"

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [identification, setIdentification] = useState("")
  const [password, setPassword] = useState("")
  const [keep, setKeep] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthEnabled, setOauthEnabled] = useState({ google: false, microsoft: false })
  const [oauthLoading, setOauthLoading] = useState(true)
  const { t } = useI18n()

  useEffect(() => {
    const loadOAuthStatus = async () => {
      setOauthLoading(true)
      try {
        const response = await getOAuthProviders()
        if (response.code === 0) {
          setOauthEnabled(response.data)
        }
      } finally {
        setOauthLoading(false)
      }
    }

    loadOAuthStatus()
  }, [])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get("oauth") === "success") {
      const finalizeOAuthLogin = async () => {
        const response = await getCurrentUser()
        if (response.code !== 0) {
          setError(response.message || t("common.error"))
          return
        }
        setAuth("cookie-session", response.data, true)
        router.replace("/user/players")
      }

      void finalizeOAuthLogin()
      return
    }

    const oauthToken = searchParams.get("oauth_token")
    const oauthUser = searchParams.get("oauth_user")
    const nextOauthError = searchParams.get("oauth_error")
    if (!oauthToken || !oauthUser) {
      if (nextOauthError) {
        setError(decodeURIComponent(nextOauthError))
      }
      return
    }

    try {
      const normalized = oauthUser.replace(/-/g, "+").replace(/_/g, "/")
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
      const decoded = atob(padded)
      const user = JSON.parse(decoded)
      setAuth(oauthToken, user, true)
      router.replace("/user/players")
    } catch {
      setError(t("common.error"))
    }
  }, [router, setAuth, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const trimmedIdentification = identification.trim()
      const response = await login(trimmedIdentification, password)

      if (response.code !== 0) {
        const message = response.message || t("auth.loginErrors.invalidCredentials")
        if (message === "Invalid email or password") {
          setError(t("auth.loginErrors.invalidCredentials"))
          return
        }
        setError(message)
        return
      }

      setAuth(response.data.token, response.data.user, keep)

      router.push("/user/players")
    } catch (err) {
      if (err instanceof Error && err.message.trim().length > 0) {
        if (err.message === "Invalid email or password") {
          setError(t("auth.loginErrors.invalidCredentials"))
          return
        }
        setError(err.message)
        return
      }
      setError(t("auth.loginErrors.invalidCredentials"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: "google" | "microsoft") => {
    if (!oauthEnabled[provider]) return

    const response = await getOAuthStartUrl(provider, "login")
    if (response.code !== 0 || !response.data.url) {
      setError(response.message || t("common.error"))
      return
    }
    window.location.href = response.data.url
  }

  return (
    <AuthCard title={t("auth.login")} description={t("auth.orLoginWith")}>
      {/* 第三方登录 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent border-border hover:bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => void handleOAuthLogin("google")}
          disabled={oauthLoading || !oauthEnabled.google}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("auth.providers.google")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent border-border hover:bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => void handleOAuthLogin("microsoft")}
          disabled={oauthLoading || !oauthEnabled.microsoft}
        >
          <svg className="w-4 h-4" viewBox="0 0 23 23">
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
          </svg>
          {t("auth.providers.microsoft")}
        </Button>
      </div>

      {!oauthLoading && (!oauthEnabled.google || !oauthEnabled.microsoft) && (
        <p className="mb-5 text-xs text-muted-foreground">
          {t("auth.oauthProviderDisabledHint")}
        </p>
      )}

      {/* 分隔线 */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/40" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-secondary/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-foreground/80 rounded-full border border-border/50">
            {t("auth.orLoginWith")}
          </span>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* 登录表单 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="identification" className="text-sm">{t("auth.email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="identification"
              type="text"
              placeholder={t("auth.emailPlaceholder")}
              value={identification}
              onChange={(e) => setIdentification(e.target.value)}
              className="pl-10 h-10 bg-background border-border rounded-lg"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm">{t("auth.password")}</Label>
            <Link
              href="/auth/forgot"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
                {t("auth.forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-10 bg-background border-border rounded-lg"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 py-1">
          <Checkbox
            id="keep"
            checked={keep}
            onCheckedChange={(checked) => setKeep(checked as boolean)}
            className="border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <label
            htmlFor="keep"
            className="text-sm font-medium text-foreground/80 cursor-pointer select-none"
          >
            {t("auth.rememberMe")}
          </label>
        </div>

        <Button type="submit" className="w-full h-10 rounded-lg" disabled={isLoading}>
          {isLoading ? t("common.loading") : t("auth.login")}
        </Button>
      </form>

      {/* 切换到注册 */}
      <p className="text-center mt-5 text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/auth/register" className="text-primary font-medium hover:underline">
          {t("auth.goRegister")}
        </Link>
      </p>
    </AuthCard>
  )
}
