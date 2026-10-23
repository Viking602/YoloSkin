"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth/context"
import { getCurrentUser, getOAuthProviders, getOAuthStartUrl, login } from "@/lib/api/services"
import { FormBanner } from "@/components/page-header"
import { useI18n } from "@/lib/i18n/context"

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauth, setOauth] = useState({ google: false, microsoft: false })

  useEffect(() => {
    void getOAuthProviders().then((response) => {
      if (response.code === 0) setOauth(response.data)
    })
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get("oauth_error")
    if (oauthError) setError(oauthError)
    if (params.get("oauth") === "success") {
      void getCurrentUser().then((response) => {
        if (response.code !== 0) return setError(response.message)
        setAuth("cookie-session", response.data, true)
        router.replace("/user/players")
      })
    }
  }, [router, setAuth])

  const startOAuth = async (provider: "google" | "microsoft") => {
    const response = await getOAuthStartUrl(provider)
    if (response.code !== 0 || !response.data.url) return setError(response.message)
    window.location.href = response.data.url
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await login(email.trim(), password)
      if (response.code !== 0) {
        setError(response.code === 401 ? t("auth.loginErrors.invalidCredentials") : response.message || t("common.error"))
        return
      }
      setAuth("cookie-session", response.data.user, true)
      router.push("/user/players")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title={t("auth.login")} description={t("auth.loginDescription")}>
      {error && <div className="mb-4"><FormBanner>{error}</FormBanner></div>}
      {(oauth.google || oauth.microsoft) && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" disabled={!oauth.google} onClick={() => void startOAuth("google")}>Google</Button>
          <Button type="button" variant="outline" disabled={!oauth.microsoft} onClick={() => void startOAuth("microsoft")}>Microsoft</Button>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 pl-10" required />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><Label htmlFor="password">{t("auth.password")}</Label><Link href="/auth/forgot" className="text-xs font-medium text-primary hover:underline">{t("auth.forgotPassword")}</Link></div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 pl-10 pr-10" minLength={8} required />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? t("common.loading") : t("auth.login")}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")} <Link href="/auth/register" className="font-medium text-primary hover:underline">{t("auth.goRegister")}</Link>
      </p>
    </AuthCard>
  )
}
