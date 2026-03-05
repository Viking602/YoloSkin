"use client"

import { useEffect, useState } from "react"
import { KeyRound, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type OAuthFormState = {
  googleClientId: string
  googleClientSecret: string
  microsoftClientId: string
  microsoftClientSecret: string
  oauthStateSecret: string
}

type SecretTouchedState = {
  googleClientSecret: boolean
  microsoftClientSecret: boolean
  oauthStateSecret: boolean
}

export default function OAuthSettingsPage() {
  const { t } = useI18n()
  const inputClassName = "h-11 rounded-lg border-2 border-border bg-input"
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<OAuthFormState>({
    googleClientId: "",
    googleClientSecret: "",
    microsoftClientId: "",
    microsoftClientSecret: "",
    oauthStateSecret: "",
  })
  const [touched, setTouched] = useState<SecretTouchedState>({
    googleClientSecret: false,
    microsoftClientSecret: false,
    oauthStateSecret: false,
  })
  const [secretStatus, setSecretStatus] = useState({
    hasGoogleClientSecret: false,
    hasMicrosoftClientSecret: false,
    hasOauthStateSecret: false,
  })

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await api.getAdminOAuthSettings()
        if (response.code !== 0) {
          toast.error(response.message || t("oauthAdmin.loadFailed"))
          return
        }

        setForm({
          googleClientId: response.data.google_client_id ?? "",
          googleClientSecret: "",
          microsoftClientId: response.data.microsoft_client_id ?? "",
          microsoftClientSecret: "",
          oauthStateSecret: "",
        })
        setTouched({
          googleClientSecret: false,
          microsoftClientSecret: false,
          oauthStateSecret: false,
        })
        setSecretStatus({
          hasGoogleClientSecret: response.data.has_google_client_secret,
          hasMicrosoftClientSecret: response.data.has_microsoft_client_secret,
          hasOauthStateSecret: response.data.has_oauth_state_secret,
        })
      } catch {
        toast.error(t("oauthAdmin.loadFailed"))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [t])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = {
        google_client_id: form.googleClientId,
        microsoft_client_id: form.microsoftClientId,
        ...(touched.googleClientSecret ? { google_client_secret: form.googleClientSecret } : {}),
        ...(touched.microsoftClientSecret ? { microsoft_client_secret: form.microsoftClientSecret } : {}),
        ...(touched.oauthStateSecret ? { oauth_state_secret: form.oauthStateSecret } : {}),
      }
      const response = await api.updateAdminOAuthSettings(payload)

      if (response.code !== 0) {
        toast.error(response.message || t("oauthAdmin.saveFailed"))
        return
      }

      setTouched({
        googleClientSecret: false,
        microsoftClientSecret: false,
        oauthStateSecret: false,
      })
      setSecretStatus({
        hasGoogleClientSecret: response.data.has_google_client_secret,
        hasMicrosoftClientSecret: response.data.has_microsoft_client_secret,
        hasOauthStateSecret: response.data.has_oauth_state_secret,
      })
      setForm((prev) => ({
        ...prev,
        googleClientSecret: "",
        microsoftClientSecret: "",
        oauthStateSecret: "",
      }))
      toast.success(t("oauthAdmin.saved"))
    } catch {
      toast.error(t("oauthAdmin.saveFailed"))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("oauthAdmin.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("oauthAdmin.description")}</p>
      </div>

      <div className="mc-card p-6 space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{t("oauthAdmin.providers")}</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="googleClientId">{t("oauthAdmin.googleClientId")}</Label>
            <Input
              id="googleClientId"
              value={form.googleClientId}
              onChange={(e) => setForm((prev) => ({ ...prev, googleClientId: e.target.value }))}
              placeholder={t("oauthAdmin.googleClientIdPlaceholder")}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="googleClientSecret">{t("oauthAdmin.googleClientSecret")}</Label>
            <Input
              id="googleClientSecret"
              value={form.googleClientSecret}
              onChange={(e) => {
                setTouched((prev) => ({ ...prev, googleClientSecret: true }))
                setForm((prev) => ({ ...prev, googleClientSecret: e.target.value }))
              }}
              placeholder={t("oauthAdmin.googleClientSecretPlaceholder")}
              className={inputClassName}
            />
            <p className="text-xs text-muted-foreground">
              {secretStatus.hasGoogleClientSecret ? t("oauthAdmin.secretConfigured") : t("oauthAdmin.secretMissing")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="microsoftClientId">{t("oauthAdmin.microsoftClientId")}</Label>
            <Input
              id="microsoftClientId"
              value={form.microsoftClientId}
              onChange={(e) => setForm((prev) => ({ ...prev, microsoftClientId: e.target.value }))}
              placeholder={t("oauthAdmin.microsoftClientIdPlaceholder")}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="microsoftClientSecret">{t("oauthAdmin.microsoftClientSecret")}</Label>
            <Input
              id="microsoftClientSecret"
              value={form.microsoftClientSecret}
              onChange={(e) => {
                setTouched((prev) => ({ ...prev, microsoftClientSecret: true }))
                setForm((prev) => ({ ...prev, microsoftClientSecret: e.target.value }))
              }}
              placeholder={t("oauthAdmin.microsoftClientSecretPlaceholder")}
              className={inputClassName}
            />
            <p className="text-xs text-muted-foreground">
              {secretStatus.hasMicrosoftClientSecret ? t("oauthAdmin.secretConfigured") : t("oauthAdmin.secretMissing")}
            </p>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="oauthStateSecret">{t("oauthAdmin.oauthStateSecret")}</Label>
            <Input
              id="oauthStateSecret"
              value={form.oauthStateSecret}
              onChange={(e) => {
                setTouched((prev) => ({ ...prev, oauthStateSecret: true }))
                setForm((prev) => ({ ...prev, oauthStateSecret: e.target.value }))
              }}
              placeholder={t("oauthAdmin.oauthStateSecretPlaceholder")}
              className={inputClassName}
            />
            <p className="text-xs text-muted-foreground">
              {secretStatus.hasOauthStateSecret ? t("oauthAdmin.secretConfigured") : t("oauthAdmin.secretMissing")}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{t("oauthAdmin.securityHint")}</p>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isSaving ? t("oauthAdmin.saving") : t("oauthAdmin.save")}
          </Button>
        </div>
      </div>
    </div>
  )
}
