"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import { AuthCard } from "@/components/auth-card"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getPasswordResetConfig, requestPasswordReset } from "@/lib/api/services"
import { useI18n } from "@/lib/i18n/context"

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [siteKey, setSiteKey] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [resetKey, setResetKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getPasswordResetConfig().then((response) => {
      if (response.code !== 0 || !response.data.enabled) {
        setError(t("auth.passwordResetUnavailable"))
        return
      }
      setSiteKey(response.data.turnstile_site_key)
    }).catch(() => setError(t("auth.passwordResetUnavailable")))
  }, [t])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!turnstileToken) return setError(t("auth.humanVerificationRequired"))
    setLoading(true)
    setError(null)
    try {
      const response = await requestPasswordReset(email.trim(), turnstileToken)
      if (response.code !== 0) {
        setError(response.message || t("auth.forgotErrors.failed"))
        setTurnstileToken("")
        setResetKey((value) => value + 1)
        return
      }
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("auth.forgotErrors.failed"))
      setTurnstileToken("")
      setResetKey((value) => value + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title={t("auth.forgotPage.title")} description={t("auth.forgotPage.description")}>
      {sent ? (
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <div><h2 className="font-semibold">{t("auth.forgotSuccess.title")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("auth.passwordResetGenericMessage")}</p></div>
          <p className="text-xs text-muted-foreground">{t("auth.forgotSuccess.checkSpam")}</p>
          <Button asChild className="w-full"><Link href="/auth/login">{t("auth.backToLogin")}</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" required />
            </div>
          </div>
          {siteKey && <TurnstileWidget siteKey={siteKey} action="password_reset_request" resetKey={resetKey} onToken={setTurnstileToken} />}
          <Button type="submit" className="w-full" disabled={loading || !siteKey}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? t("auth.sending") : t("auth.sendResetLink")}
          </Button>
          <p className="text-center text-sm text-muted-foreground"><Link href="/auth/login" className="font-medium text-primary hover:underline">{t("auth.backToLogin")}</Link></p>
        </form>
      )}
    </AuthCard>
  )
}
