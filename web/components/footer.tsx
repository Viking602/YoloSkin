"use client"

import Link from "next/link"
import { Github } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { useSiteSettings } from "@/lib/site-settings/context"

export function Footer() {
  const { t } = useI18n()
  const { settings } = useSiteSettings()
  return (
    <footer className="border-t-2 border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary border-2 border-primary">
                <span className="text-sm font-bold text-primary-foreground">
                  {settings.siteName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-xl font-bold text-foreground">{settings.siteName}</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              {settings.siteDescription || t("footer.description")}
            </p>
            <div className="mt-4">
              <Link 
                href="#" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-4 w-4" />
                GitHub
              </Link>
            </div>
          </div>

          {/* 用户功能 */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">{t("footer.userFeatures")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/user/players" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("nav.players")}
                </Link>
              </li>
              <li>
                <Link href="/user/upload" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("nav.upload")}
                </Link>
              </li>
              <li>
                <Link href="/user/closet" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("nav.closet")}
                </Link>
              </li>
              <li>
                <Link href="/user/premium" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("nav.premium")}
                </Link>
              </li>
            </ul>
          </div>

          {/* 账户 */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">{t("footer.account")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/auth/login" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("auth.login")}
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("auth.register")}
                </Link>
              </li>
              <li>
                <Link href="/auth/forgot" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("auth.forgotPassword")}
                </Link>
              </li>
            </ul>
          </div>

          {/* 关于 */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">{t("footer.about")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("auth.terms")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("auth.privacy")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("footer.contact")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t-2 border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            {settings.footerText || t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  )
}
