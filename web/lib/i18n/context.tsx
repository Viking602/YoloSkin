"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { type Locale, defaultLocale, locales } from "./config"
import zhCN from "./locales/zh-CN"
import en from "./locales/en"

const translations = {
  "zh-CN": zhCN,
  en: en,
} as const
type TranslationSchema = typeof zhCN

// 获取嵌套对象的值
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".")
  let current: unknown = obj
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return path
    }
    if (typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  
  return typeof current === "string" ? current : path
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  translations: TranslationSchema
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const LOCALE_STORAGE_KEY = "craftskin-locale"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 从 localStorage 读取语言设置
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale)
    } else {
      // 检测浏览器语言
      const browserLang = navigator.language
      if (browserLang.startsWith("zh")) {
        setLocaleState("zh-CN")
      } else {
        setLocaleState("en")
      }
    }
    setMounted(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
  }, [])

  const currentTranslations = translations[locale] as TranslationSchema
  
  const t = useCallback((key: string): string => {
    return getNestedValue(currentTranslations as unknown as Record<string, unknown>, key)
  }, [currentTranslations])

  // 防止 hydration 不匹配
  if (!mounted) {
    const defaultT = (key: string): string => {
      return getNestedValue(translations[defaultLocale] as unknown as Record<string, unknown>, key)
    }
    return (
      <I18nContext.Provider value={{ locale: defaultLocale, setLocale, t: defaultT, translations: translations[defaultLocale] as TranslationSchema }}>
        {children}
      </I18nContext.Provider>
    )
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, translations: currentTranslations }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

export function useTranslations() {
  const { t } = useI18n()
  return t
}
