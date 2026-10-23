"use client"

import { useEffect, useState } from "react"
import { Loader2, Unlink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingState } from "@/components/state-views"
import { CopyButton } from "@/components/copy-button"
import { PageHeader, PagePanel, PageStack } from "@/components/page-header"
import { api, type PremiumBinding } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"

export default function PremiumPage() {
  const { t } = useI18n()
  const [binding, setBinding] = useState<PremiumBinding | null>(null)
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void api
      .getPremiumBinding()
      .then((response) => {
        if (response.code === 0) setBinding(response.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const bind = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await api.bindPremium({ microsoft_token: token.trim() })
      if (response.code !== 0) return toast.error(response.message || t("premium.errors.bindFailed"))
      setBinding(response.data)
      setToken("")
      toast.success(t("premium.bindSuccess"))
    } finally {
      setSaving(false)
    }
  }

  const unbind = async () => {
    setSaving(true)
    try {
      const response = await api.unbindPremium()
      if (response.code !== 0) return toast.error(response.message || t("premium.errors.unbindFailed"))
      setBinding(null)
      toast.success(t("premium.unbindSuccess"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingState title={t("premium.title")} />
  }

  return (
    <PageStack>
      <PageHeader title={t("premium.title")} description={t("premium.description")} />
      {binding ? (
        <PagePanel className="mx-auto w-full max-w-xl space-y-5">
          <div>
            <p className="studio-label">{t("premium.boundPlayer")}</p>
            <p className="mt-2 text-xl font-semibold">{binding.username}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-lg border border-border bg-muted px-2 py-1 font-mono text-xs">
                {binding.uuid}
              </code>
              <CopyButton value={binding.uuid} label={t("common.copyUuid")} />
            </div>
            {binding.bound_at ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("premium.boundAt")}: {binding.bound_at}
              </p>
            ) : null}
          </div>
          <Button variant="outline" onClick={() => void unbind()} disabled={saving}>
            <Unlink className="size-4" />
            {t("premium.unbind")}
          </Button>
        </PagePanel>
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-4 lg:grid-cols-[1fr_0.9fr]">
          <PagePanel className="space-y-5">
            <div>
              <h2 className="panel-title">{t("premium.notBound")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("premium.notBoundDesc")}</p>
            </div>
            <form onSubmit={(event) => void bind(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minecraftToken">{t("premium.tokenLabel")}</Label>
                <Input
                  id="minecraftToken"
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  minLength={20}
                  required
                />
                <p className="text-xs text-muted-foreground">{t("premium.tokenHint")}</p>
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("premium.bindAction")}
              </Button>
            </form>
          </PagePanel>
          <PagePanel>
            <h2 className="panel-title">{t("premium.benefits")}</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>{t("premium.benefit1")}</li>
              <li>{t("premium.benefit2")}</li>
              <li>{t("premium.benefit3")}</li>
            </ul>
          </PagePanel>
        </div>
      )}
    </PageStack>
  )
}
