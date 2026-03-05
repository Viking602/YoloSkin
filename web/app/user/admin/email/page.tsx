"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Mail, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type EmailForm = {
  smtpHost: string
  smtpPort: string
  smtpUsername: string
  smtpPassword: string
  smtpFromName: string
  smtpFromEmail: string
  smtpUseTls: boolean
  emailTemplateSubject: string
  emailTemplateHtml: string
}

export default function AdminEmailSettingsPage() {
  const { t } = useI18n()
  const inputClassName = "h-11 rounded-lg border-2 border-border bg-input"
  const textareaClassName = "rounded-xl border-2 border-border bg-input font-mono text-xs"
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSmtpPassword, setHasSmtpPassword] = useState(false)
  const [smtpEnabled, setSmtpEnabled] = useState(false)

  const [form, setForm] = useState<EmailForm>({
    smtpHost: "",
    smtpPort: "587",
    smtpUsername: "",
    smtpPassword: "",
    smtpFromName: "",
    smtpFromEmail: "",
    smtpUseTls: true,
    emailTemplateSubject: "",
    emailTemplateHtml: "",
  })

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await api.getAdminEmailSettings()
        if (response.code !== 0) {
          toast.error(response.message || t("emailSettings.loadFailed"))
          return
        }

        setHasSmtpPassword(response.data.has_smtp_password)
        setSmtpEnabled(response.data.smtp_enabled)
        setForm({
          smtpHost: response.data.smtp_host ?? "",
          smtpPort: String(response.data.smtp_port ?? 587),
          smtpUsername: response.data.smtp_username ?? "",
          smtpPassword: "",
          smtpFromName: response.data.smtp_from_name ?? "",
          smtpFromEmail: response.data.smtp_from_email ?? "",
          smtpUseTls: response.data.smtp_use_tls,
          emailTemplateSubject: response.data.email_template_subject,
          emailTemplateHtml: response.data.email_template_html,
        })
      } catch {
        toast.error(t("emailSettings.loadFailed"))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [t])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await api.updateAdminEmailSettings({
        smtp_host: form.smtpHost,
        smtp_port: Number.isNaN(Number(form.smtpPort)) ? undefined : Number(form.smtpPort),
        smtp_username: form.smtpUsername,
        smtp_password: form.smtpPassword,
        smtp_from_name: form.smtpFromName,
        smtp_from_email: form.smtpFromEmail,
        smtp_use_tls: form.smtpUseTls,
        email_template_subject: form.emailTemplateSubject,
        email_template_html: form.emailTemplateHtml,
      })

      if (response.code !== 0) {
        toast.error(response.message || t("emailSettings.saveFailed"))
        return
      }

      setHasSmtpPassword(response.data.has_smtp_password)
      setSmtpEnabled(response.data.smtp_enabled)
      setForm((prev) => ({ ...prev, smtpPassword: "" }))
      toast.success(t("emailSettings.saved"))
    } catch {
      toast.error(t("emailSettings.saveFailed"))
    } finally {
      setIsSaving(false)
    }
  }

  const previewHtml = useMemo(() => {
    if (!form.emailTemplateHtml.trim()) {
      return ""
    }

    return form.emailTemplateHtml.replace(
      /\{\{\s*content\s*\}\}/g,
      t("emailSettings.previewSampleContent")
    )
  }, [form.emailTemplateHtml, t])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("emailSettings.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("emailSettings.description")}</p>
      </div>

      <div className="mc-card space-y-6 p-6">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">{t("emailSettings.smtpConfig")}</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtpHost">{t("emailSettings.smtpHost")}</Label>
            <Input
              id="smtpHost"
              value={form.smtpHost}
              onChange={(e) => setForm((prev) => ({ ...prev, smtpHost: e.target.value }))}
              placeholder="smtp.example.com"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpPort">{t("emailSettings.smtpPort")}</Label>
            <Input
              id="smtpPort"
              value={form.smtpPort}
              onChange={(e) => setForm((prev) => ({ ...prev, smtpPort: e.target.value }))}
              placeholder="587"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpUsername">{t("emailSettings.smtpUsername")}</Label>
            <Input
              id="smtpUsername"
              value={form.smtpUsername}
              onChange={(e) => setForm((prev) => ({ ...prev, smtpUsername: e.target.value }))}
              placeholder="mailer@example.com"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpPassword">{t("emailSettings.smtpPassword")}</Label>
            <Input
              id="smtpPassword"
              type="password"
              value={form.smtpPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, smtpPassword: e.target.value }))}
              placeholder={t("emailSettings.smtpPasswordPlaceholder")}
              className={inputClassName}
            />
            <p className="text-xs text-muted-foreground">
              {hasSmtpPassword ? t("emailSettings.passwordConfigured") : t("emailSettings.passwordMissing")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpFromName">{t("emailSettings.smtpFromName")}</Label>
            <Input
              id="smtpFromName"
              value={form.smtpFromName}
              onChange={(e) => setForm((prev) => ({ ...prev, smtpFromName: e.target.value }))}
              placeholder="CraftSkin"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpFromEmail">{t("emailSettings.smtpFromEmail")}</Label>
            <Input
              id="smtpFromEmail"
              value={form.smtpFromEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, smtpFromEmail: e.target.value }))}
              placeholder="no-reply@example.com"
              className={inputClassName}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{t("emailSettings.smtpUseTls")}</p>
            <p className="text-xs text-muted-foreground">
              {smtpEnabled ? t("emailSettings.smtpEnabled") : t("emailSettings.smtpDisabled")}
            </p>
          </div>
          <Switch
            checked={form.smtpUseTls}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, smtpUseTls: checked }))}
          />
        </div>
      </div>

      <div className="mc-card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{t("emailSettings.templateConfig")}</h2>

        <div className="space-y-2">
          <Label htmlFor="emailTemplateSubject">{t("emailSettings.templateSubject")}</Label>
          <Input
            id="emailTemplateSubject"
            value={form.emailTemplateSubject}
            onChange={(e) => setForm((prev) => ({ ...prev, emailTemplateSubject: e.target.value }))}
            placeholder="【CraftSkin】账户通知"
            className={inputClassName}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emailTemplateHtml">{t("emailSettings.templateHtml")}</Label>
            <Textarea
              id="emailTemplateHtml"
              value={form.emailTemplateHtml}
              onChange={(e) => setForm((prev) => ({ ...prev, emailTemplateHtml: e.target.value }))}
              rows={14}
              className={textareaClassName}
            />
            <p className="text-xs text-muted-foreground">{t("emailSettings.templateHint")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("emailSettings.templatePreview")}</Label>
            <div className="overflow-hidden rounded-xl border-2 border-border bg-card">
              {previewHtml ? (
                <iframe
                  title={t("emailSettings.templatePreview")}
                  srcDoc={previewHtml}
                  sandbox=""
                  className="h-[356px] w-full bg-white"
                />
              ) : (
                <div className="flex h-[356px] items-center justify-center text-sm text-muted-foreground">
                  {t("emailSettings.templatePreviewEmpty")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? t("emailSettings.saving") : t("emailSettings.save")}
        </Button>
      </div>
    </div>
  )
}
