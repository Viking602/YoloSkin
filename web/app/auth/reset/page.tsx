"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react"
import { AuthCard } from "@/components/auth-card"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getPasswordResetConfig, resetPassword } from "@/lib/api/services"
import { useI18n } from "@/lib/i18n/context"

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const [token, setToken] = useState("")
  const [siteKey, setSiteKey] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [resetKey, setResetKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""
    setToken(fragmentToken)
    if (!fragmentToken) setError(t("auth.resetInvalid.content"))
    void getPasswordResetConfig().then((response) => {
      if (response.code !== 0 || !response.data.enabled) return setError(t("auth.passwordResetUnavailable"))
      setSiteKey(response.data.turnstile_site_key)
    }).catch(() => setError(t("auth.passwordResetUnavailable")))
  }, [t])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return setError(t("auth.resetErrors.passwordWeak"))
    if (password !== confirmation) return setError(t("auth.resetErrors.passwordMismatch"))
    if (!turnstileToken) return setError(t("auth.humanVerificationRequired"))
    setLoading(true)
    setError(null)
    try {
      const response = await resetPassword(token, password, turnstileToken)
      if (response.code !== 0) {
        setError(response.message || t("auth.resetErrors.expired"))
        setTurnstileToken("")
        setResetKey((value) => value + 1)
        return
      }
      history.replaceState(null, "", window.location.pathname)
      setComplete(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("auth.resetErrors.expired"))
      setTurnstileToken("")
      setResetKey((value) => value + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title={complete ? t("auth.resetSuccess.title") : t("auth.resetPassword")} description={complete ? t("auth.resetSuccess.description") : t("auth.resetPage.description")}>
      {complete ? (
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <p className="text-sm text-muted-foreground">{t("auth.resetSuccess.content")}</p>
          <Button asChild className="w-full"><Link href="/auth/login">{t("auth.goLogin")}</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5"><Label htmlFor="newPassword">{t("auth.resetPage.newPassword")}</Label><div className="relative"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="newPassword" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" minLength={8} required /></div></div>
          <div className="space-y-1.5"><Label htmlFor="confirmation">{t("auth.confirmPassword")}</Label><Input id="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required /></div>
          {siteKey && <TurnstileWidget siteKey={siteKey} action="password_reset_submit" resetKey={resetKey} onToken={setTurnstileToken} />}
          <Button type="submit" className="w-full" disabled={loading || !token || !siteKey}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? t("auth.resetting") : t("auth.resetPassword")}</Button>
          {!token && <p className="text-center text-sm"><Link href="/auth/forgot" className="font-medium text-primary hover:underline">{t("auth.resetInvalid.retry")}</Link></p>}
        </form>
      )}
    </AuthCard>
  )
}
