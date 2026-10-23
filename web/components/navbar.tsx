"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { LanguageSwitch } from "@/components/language-switch"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth/context"
import { useI18n } from "@/lib/i18n/context"
import { useSiteSettings } from "@/lib/site-settings/context"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isLoggedIn, isAdmin } = useAuth()
  const { t } = useI18n()
  const { settings } = useSiteSettings()
  const links = [
    { href: "/#workspace", label: t("studio.yourWorkspace") },
    { href: "/#how-it-works", label: t("studio.howItWorks") },
    { href: "/user/closet", label: t("nav.closet") },
    ...(isAdmin
      ? [{ href: "/user/admin/users", label: t("nav.adminPanel") }]
      : [])
  ]

  return (
    <header className="site-header">
      <div className="site-container flex h-20 items-center justify-between gap-8">
        <Link href="/" aria-label={settings.siteName || "YoloSkin"}>
          <Brand name={settings.siteName} />
        </Link>
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label={t("studio.mainNavigation")}
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitch />
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            {!isLoggedIn && (
              <Button variant="ghost" asChild>
                <Link href="/auth/login">{t("auth.login")}</Link>
              </Button>
            )}
            <Button asChild>
              <Link href={isLoggedIn ? "/user/players" : "/auth/register"}>
                {t(isLoggedIn ? "nav.userCenter" : "home.getStarted")}
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("studio.toggleMenu")}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((value) => !value)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <nav
          id="mobile-navigation"
          className="site-container grid gap-1 border-t border-border py-4 md:hidden"
          aria-label={t("studio.mainNavigation")}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-3 text-sm hover:bg-secondary"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex gap-2 border-t border-border pt-4">
            <Button variant="outline" asChild>
              <Link href={isLoggedIn ? "/user/players" : "/auth/login"}>
                {t(isLoggedIn ? "nav.userCenter" : "auth.login")}
              </Link>
            </Button>
            {!isLoggedIn && (
              <Button asChild>
                <Link href="/auth/register">{t("home.createAccount")}</Link>
              </Button>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
