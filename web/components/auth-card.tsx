"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Brand } from "@/components/brand"
import { SkinStage } from "@/components/skin-stage"
import { LanguageSwitch } from "@/components/language-switch"
import { ThemeToggle } from "@/components/theme-toggle"
import { useI18n } from "@/lib/i18n/context"

interface AuthCardProps {
  children: ReactNode
  title: string
  description: string
}

export function AuthCard({ children, title, description }: AuthCardProps) {
  const { t } = useI18n()
  return (
    <div className="auth-shell">
      <header className="auth-header">
        <Link href="/">
          <Brand />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitch />
          <ThemeToggle />
          <Link href="/" className="nav-link flex items-center gap-2">
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">{t("common.backHome")}</span>
          </Link>
        </div>
      </header>
      <main id="main-content" className="auth-main">
        <aside className="auth-aside">
          <span className="studio-label">{t("studio.authEyebrow")}</span>
          <h2>{t("studio.authTitle")}</h2>
          <p>{t("studio.authDescription")}</p>
          <SkinStage compact />
        </aside>
        <div className="auth-form-panel">
          <div className="auth-form-heading">
            <span className="pixel-dot" />
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          <p className="auth-form-note">{t("studio.authNote")}</p>
        </div>
      </main>
      <footer className="auth-footer">
        <span>© 2026 YoloSkin</span>
        <div className="flex gap-5">
          <Link href="/terms">{t("auth.terms")}</Link>
          <Link href="/privacy">{t("auth.privacy")}</Link>
        </div>
      </footer>
    </div>
  )
}
