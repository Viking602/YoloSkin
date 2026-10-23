"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormBanner, PageHeader, PagePanel, PageStack } from "@/components/page-header"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"

export default function SettingsPage() {
  const { t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPassword.length < 8) return toast.error(t("settings.passwordTooShort"))
    if (newPassword !== confirmation) return toast.error(t("settings.passwordMismatch"))
    setSaving(true)
    try {
      const response = await api.changePassword(currentPassword, newPassword)
      if (response.code !== 0) return toast.error(response.message)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmation("")
      toast.success(t("settings.passwordUpdated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.errors.setPasswordFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageStack>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <PagePanel className="mx-auto w-full max-w-xl space-y-5">
        <div>
          <h2 className="panel-title">{t("settings.changePassword")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("settings.securityNote")}</p>
        </div>
        <form onSubmit={(event) => void save(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation">{t("settings.confirmNewPassword")}</Label>
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={8}
              required
            />
            {confirmation && newPassword !== confirmation ? (
              <FormBanner>{t("settings.passwordMismatch")}</FormBanner>
            ) : null}
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {saving ? t("settings.savingPassword") : t("settings.savePassword")}
          </Button>
        </form>
      </PagePanel>
    </PageStack>
  )
}
