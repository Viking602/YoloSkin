"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { api } from "@/lib/api"

export interface SiteSettings {
  siteName: string
  siteDescription: string
  siteUrl: string
  siteLogo: string | null
  favicon: string | null
  primaryColor: string
  footerText: string
  allowRegistration: boolean
  requireEmailVerification: boolean
}

const defaultSettings: SiteSettings = {
  siteName: "CraftSkin",
  siteDescription: "发现、下载和分享精美的 Minecraft 皮肤",
  siteUrl: "http://localhost:3000",
  siteLogo: null,
  favicon: null,
  primaryColor: "#2E7D32",
  footerText: "© 2024 CraftSkin. All rights reserved.",
  allowRegistration: true,
  requireEmailVerification: false,
}

interface SiteSettingsContextType {
  settings: SiteSettings
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>
  isLoading: boolean
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined)

const SETTINGS_STORAGE_KEY = "craftskin-site-settings"

function toContextSettings(data: {
  site_name: string
  site_description: string
  site_url: string
  logo_url: string | null
  favicon_url: string | null
  theme_color: string
  footer_text: string
  allow_register: boolean | null
  require_email_verification: boolean | null
}): SiteSettings {
  return {
    siteName: data.site_name,
    siteDescription: data.site_description,
    siteUrl: data.site_url,
    siteLogo: data.logo_url,
    favicon: data.favicon_url,
    primaryColor: data.theme_color,
    footerText: data.footer_text,
    allowRegistration: data.allow_register ?? true,
    requireEmailVerification: data.require_email_verification ?? false,
  }
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.getPublicSiteSettings()
        if (response.code === 0) {
          setSettings(toContextSettings({
            site_name: response.data.site_name,
            site_description: response.data.site_description,
            site_url: response.data.site_url,
            logo_url: response.data.logo_url,
            favicon_url: response.data.favicon_url,
            theme_color: response.data.theme_color,
            footer_text: response.data.footer_text,
            allow_register: response.data.allow_register,
            require_email_verification: response.data.require_email_verification,
          }))
          return
        }
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings)
            setSettings({ ...defaultSettings, ...parsed })
          } catch {
            setSettings(defaultSettings)
          }
        } else {
          setSettings(defaultSettings)
        }
      } catch {
        setSettings(defaultSettings)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", settings.primaryColor)
  }, [settings.primaryColor])

  useEffect(() => {
    if (typeof document === "undefined") return

    document.title = settings.siteName

    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute("content", settings.siteDescription)
    }

    if (settings.favicon) {
      const existing = document.querySelector('link[rel="icon"]')
      if (existing) {
        existing.setAttribute("href", settings.favicon)
      } else {
        const icon = document.createElement("link")
        icon.setAttribute("rel", "icon")
        icon.setAttribute("href", settings.favicon)
        document.head.appendChild(icon)
      }
    }
  }, [settings.siteName, settings.siteDescription, settings.favicon])

  const updateSettings = useCallback(async (newSettings: Partial<SiteSettings>) => {
    const nextSettings = { ...settings, ...newSettings }

    const response = await api.updateSiteSettings({
      site_name: nextSettings.siteName,
      site_description: nextSettings.siteDescription,
      site_url: nextSettings.siteUrl,
      logo_url: nextSettings.siteLogo,
      favicon_url: nextSettings.favicon,
      theme_color: nextSettings.primaryColor,
      footer_text: nextSettings.footerText,
      allow_register: nextSettings.allowRegistration,
      require_email_verification: nextSettings.requireEmailVerification,
    })

    if (response.code !== 0) {
      throw new Error(response.message || "保存站点设置失败")
    }

    const mapped = toContextSettings({
      site_name: response.data.site_name,
      site_description: response.data.site_description,
      site_url: response.data.site_url,
      logo_url: response.data.logo_url,
      favicon_url: response.data.favicon_url,
      theme_color: response.data.theme_color,
      footer_text: response.data.footer_text,
      allow_register: response.data.allow_register,
      require_email_verification: response.data.require_email_verification,
    })

    setSettings(mapped)
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(mapped))
  }, [settings])

  return (
    <SiteSettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext)
  if (context === undefined) {
    throw new Error("useSiteSettings must be used within a SiteSettingsProvider")
  }
  return context
}
