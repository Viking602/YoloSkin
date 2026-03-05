"use client"

import { useEffect, useState } from "react"
import { Crown, RefreshCw, CheckCircle, Shield, Gamepad2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type BindStatus = "idle" | "loading" | "success" | "error"
type BoundAccount = {
  username: string
  uuid: string
  boundAt: string
} | null

export default function PremiumPage() {
  const { t } = useI18n()
  const [bindStatus, setBindStatus] = useState<BindStatus>("idle")
  const [syncStatus, setSyncStatus] = useState<BindStatus>("idle")
  const [boundAccount, setBoundAccount] = useState<BoundAccount>(null)
  const [oauthEnabled, setOauthEnabled] = useState({ google: false, microsoft: false })

  useEffect(() => {
    const loadBinding = async () => {
      try {
        const [response, providerResponse] = await Promise.all([
          api.getPremiumBinding(),
          api.getOAuthProviders(),
        ])
        if (response.code === 0 && response.data) {
          setBoundAccount({
            username: response.data.username,
            uuid: response.data.uuid,
            boundAt: response.data.bound_at,
          })
        }

        if (providerResponse.code === 0) {
          setOauthEnabled(providerResponse.data)
        }
      } catch {
        toast.error(t("premium.errors.loadFailed"))
      }
    }

    loadBinding()
  }, [t])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("bind") === "success") {
      setBindStatus("success")
    }
    const oauthError = params.get("oauth_error")
    if (oauthError) {
      setBindStatus("error")
      toast.error(decodeURIComponent(oauthError))
    }
  }, [])

  const handleMicrosoftLogin = async () => {
    if (!oauthEnabled.microsoft) return

    setBindStatus("loading")

    try {
      const response = await api.getOAuthStartUrl("microsoft", "bind_premium")
      if (response.code !== 0 || !response.data.url) {
        setBindStatus("error")
        toast.error(response.message || t("premium.errors.bindFailed"))
        return
      }
      window.location.href = response.data.url
    } catch (err) {
      setBindStatus("error")
      toast.error(err instanceof Error && err.message ? err.message : t("premium.errors.oauthLoginFailed"))
    }
  }

  const handleUnbind = async () => {
    setBindStatus("loading")
    try {
      const response = await api.unbindPremium()
      if (response.code !== 0) {
        setBindStatus("error")
        toast.error(response.message || t("premium.errors.unbindFailed"))
        return
      }
      setBoundAccount(null)
      setBindStatus("idle")
    } catch (err) {
      setBindStatus("error")
      toast.error(err instanceof Error && err.message ? err.message : t("premium.errors.unbindFailed"))
    }
  }

  const handleSync = async () => {
    setSyncStatus("loading")

    try {
      const response = await api.syncPremiumSkin()
      if (response.code !== 0) {
        setSyncStatus("error")
        toast.error(response.message || t("premium.errors.syncFailed"))
        return
      }
      setSyncStatus("success")
      toast.success(t("premium.syncSuccess"))
      setTimeout(() => setSyncStatus("idle"), 3000)
    } catch (err) {
      setSyncStatus("error")
      toast.error(err instanceof Error && err.message ? err.message : t("premium.errors.syncFailed"))
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
          <h1 className="text-2xl font-bold text-foreground">{t("premium.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("premium.description")}
          </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 绑定状态卡片 */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h2 className="text-lg font-semibold text-foreground">{t("premium.microsoftAccount")}</h2>
                <p className="text-sm text-muted-foreground">
                  {boundAccount ? t("premium.bound") : t("premium.loginToBind")}
                </p>
              </div>
            </div>

          {boundAccount ? (
            <>
              {/* 已绑定状态 */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{boundAccount.username}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{boundAccount.uuid}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("premium.boundAt")}：{boundAccount.boundAt}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSync}
                  disabled={syncStatus === "loading"}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === "loading" ? "animate-spin" : ""}`} />
                  {syncStatus === "loading" ? t("premium.syncing") : t("premium.syncSkin")}
                </Button>
                <Button
                  onClick={handleUnbind}
                  variant="outline"
                  disabled={bindStatus === "loading"}
                  className="bg-transparent"
                >
                  {t("premium.unbind")}
                </Button>
              </div>

              {syncStatus === "success" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{t("premium.syncSuccess")}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 未绑定状态 */}
              <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>{t("premium.secureOauth")}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("premium.oauthDescription")}
                </p>
              </div>

              <Button
                onClick={handleMicrosoftLogin}
                disabled={bindStatus === "loading" || !oauthEnabled.microsoft}
                className="w-full h-11 gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bindStatus === "loading" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t("premium.loggingIn")}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
                    </svg>
                    {t("premium.bindWithMicrosoft")}
                  </>
                )}
              </Button>
              {!oauthEnabled.microsoft && (
                <p className="text-xs text-muted-foreground text-center">
                  {t("premium.microsoftDisabledHint")}
                </p>
              )}
            </>
          )}
        </div>

        {/* 功能说明 */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <div>
               <h2 className="text-lg font-semibold text-foreground">{t("premium.benefits")}</h2>
               <p className="text-sm text-muted-foreground">{t("premium.benefitsDesc")}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                 <h4 className="text-sm font-medium text-foreground">{t("premium.benefitSyncTitle")}</h4>
                 <p className="text-sm text-muted-foreground mt-0.5">
                   {t("premium.benefitSyncDesc")}
                 </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                 <h4 className="text-sm font-medium text-foreground">{t("premium.benefitBadgeTitle")}</h4>
                 <p className="text-sm text-muted-foreground mt-0.5">
                   {t("premium.benefitBadgeDesc")}
                 </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                 <h4 className="text-sm font-medium text-foreground">{t("premium.benefitStorageTitle")}</h4>
                 <p className="text-sm text-muted-foreground mt-0.5">
                   {t("premium.benefitStorageDesc")}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 常见问题 */}
      <div className="rounded-xl border border-border bg-card p-6">
         <h3 className="text-lg font-semibold text-foreground mb-4">{t("premium.faqTitle")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
             <h4 className="text-sm font-medium text-foreground">{t("premium.faq1Title")}</h4>
             <p className="text-sm text-muted-foreground">
               {t("premium.faq1Desc")}
             </p>
          </div>
          <div className="space-y-1">
             <h4 className="text-sm font-medium text-foreground">{t("premium.faq2Title")}</h4>
             <p className="text-sm text-muted-foreground">
               {t("premium.faq2Desc")}
             </p>
          </div>
          <div className="space-y-1">
             <h4 className="text-sm font-medium text-foreground">{t("premium.faq3Title")}</h4>
             <p className="text-sm text-muted-foreground">
               {t("premium.faq3Desc")}
             </p>
          </div>
          <div className="space-y-1">
             <h4 className="text-sm font-medium text-foreground">{t("premium.faq4Title")}</h4>
             <p className="text-sm text-muted-foreground">
               {t("premium.faq4Desc")}
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
