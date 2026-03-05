"use client"

import React from "react"

import { useEffect, useRef, useState } from "react"
import { Settings, Upload, Trash2, Save, Loader2, Check, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useSiteSettings } from "@/lib/site-settings/context"
import { useI18n } from "@/lib/i18n/context"
import Image from "next/image"
import { toast } from "sonner"

const colorPresets = [
  { name: "Forest Green", value: "#2E7D32" },
  { name: "Ocean Blue", value: "#1565C0" },
  { name: "Royal Purple", value: "#6A1B9A" },
  { name: "Sunset Orange", value: "#E65100" },
  { name: "Cherry Red", value: "#C62828" },
  { name: "Midnight", value: "#263238" },
]

export default function SiteSettingsPage() {
  const { settings, updateSettings, isLoading } = useSiteSettings()
  const { translations: t } = useI18n()
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    siteLogo: settings.siteLogo,
    favicon: settings.favicon,
    primaryColor: settings.primaryColor,
    footerText: settings.footerText,
    allowRegistration: settings.allowRegistration,
    requireEmailVerification: settings.requireEmailVerification,
  })

  // 同步设置到表单
  useEffect(() => {
    setFormData({
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      siteLogo: settings.siteLogo,
      favicon: settings.favicon,
      primaryColor: settings.primaryColor,
      footerText: settings.footerText,
      allowRegistration: settings.allowRegistration,
      requireEmailVerification: settings.requireEmailVerification,
    })
  }, [settings])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData({ ...formData, siteLogo: event.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData({ ...formData, favicon: event.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(formData)
      setSaved(true)
      toast.success(t.common.success)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error(t.common.error)
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
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.siteSettings.title}</h1>
        <p className="text-muted-foreground mt-1">{t.siteSettings.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 基本信息 */}
        <div className="mc-card p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t.siteSettings.basicInfo}</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">{t.siteSettings.siteName}</Label>
              <Input
                id="siteName"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                placeholder={t.siteSettings.siteNamePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">{t.siteSettings.siteDescription}</Label>
              <Textarea
                id="siteDescription"
                value={formData.siteDescription}
                onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                placeholder={t.siteSettings.siteDescriptionPlaceholder}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.siteSettings.siteLogo}</Label>
              <p className="text-xs text-muted-foreground">{t.siteSettings.siteLogoHint}</p>
              <div className="flex items-center gap-4">
                {formData.siteLogo ? (
                  <div className="relative w-16 h-16 rounded-lg border-2 border-border overflow-hidden bg-muted">
                    <Image
                      src={formData.siteLogo || "/placeholder.svg"}
                      alt="Site Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {t.siteSettings.uploadLogo}
                  </Button>
                  {formData.siteLogo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, siteLogo: null })}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t.siteSettings.removeLogo}
                    </Button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.siteSettings.favicon}</Label>
              <p className="text-xs text-muted-foreground">{t.siteSettings.faviconHint}</p>
              <div className="flex items-center gap-4">
                {formData.favicon ? (
                  <div className="relative w-8 h-8 rounded border border-border overflow-hidden bg-muted">
                    <Image
                      src={formData.favicon || "/placeholder.svg"}
                      alt="Favicon"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded border border-dashed border-border flex items-center justify-center bg-muted">
                    <Upload className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => faviconInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t.siteSettings.uploadLogo}
                </Button>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/x-icon,image/ico"
                  className="hidden"
                  onChange={handleFaviconUpload}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 外观设置 */}
        <div className="space-y-6">
          <div className="mc-card p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">{t.siteSettings.appearance}</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.siteSettings.primaryColor}</Label>
                <div className="grid grid-cols-6 gap-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, primaryColor: color.value })}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        formData.primaryColor === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-8 p-0 border-0 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">{t.siteSettings.footerText}</Label>
                <Input
                  id="footerText"
                  value={formData.footerText}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  placeholder={t.siteSettings.footerTextPlaceholder}
                />
              </div>
            </div>
          </div>

          {/* 注册设置 */}
          <div className="mc-card p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">{t.siteSettings.registration}</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.siteSettings.allowRegistration}</Label>
                </div>
                <Switch
                  checked={formData.allowRegistration}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allowRegistration: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.siteSettings.requireEmailVerification}</Label>
                </div>
                <Switch
                  checked={formData.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requireEmailVerification: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t.siteSettings.saving}
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              {t.siteSettings.saved}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t.siteSettings.saveChanges}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
