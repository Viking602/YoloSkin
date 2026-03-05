"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Menu, X, Upload, User, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LanguageSwitch } from "@/components/language-switch"
import { useAuth } from "@/lib/auth/context"
import { useI18n } from "@/lib/i18n/context"
import { useSiteSettings } from "@/lib/site-settings/context"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { isLoggedIn, isAdmin } = useAuth()
  const { t } = useI18n()
  const { settings } = useSiteSettings()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">
              {settings.siteName.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-xl font-bold text-foreground">{settings.siteName}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center ml-8 lg:ml-10 gap-7 xl:gap-9">
          <Link href="/" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
            {t("nav.home")}
          </Link>
          <Link href="#skins" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("navbar.skins")}
          </Link>
          <Link href="#featured" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("navbar.featured")}
          </Link>
          {isLoggedIn && (
            <Link href="/user/players" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t("nav.userCenter")}
            </Link>
          )}
          {isAdmin && (
            <Link href="/user/admin/users" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t("nav.adminPanel")}
            </Link>
          )}
        </nav>

        {/* Search Bar */}
        <div className="hidden lg:block flex-1 max-w-lg mx-10 xl:mx-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("navbar.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 bg-secondary border-2 border-border rounded-xl"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitch />
          {isLoggedIn ? (
            <>
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <Link href="/user/upload">
                  <Upload className="h-4 w-4" />
                  {t("navbar.upload")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
                <Link href="/user/players">
                  <User className="h-4 w-4" />
                  {t("nav.userCenter")}
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="destructive" size="sm" className="gap-2" asChild>
                  <Link href="/user/admin/users">
                    <Shield className="h-4 w-4" />
                    {t("navbar.manage")}
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/register">{t("auth.register")}</Link>
              </Button>
              <Button size="sm" className="gap-2" asChild>
                <Link href="/auth/login">
                  <User className="h-4 w-4" />
                  {t("auth.login")}
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="space-y-4 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("navbar.searchPlaceholder")}
                className="w-full pl-10 bg-secondary"
              />
            </div>
            <nav className="flex flex-col gap-2">
              <Link 
                href="/" 
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("nav.home")}
              </Link>
              <Link 
                href="#skins" 
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("navbar.skins")}
              </Link>
              <Link 
                href="#featured" 
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("navbar.featured")}
              </Link>
              {isLoggedIn && (
                <>
                  <Link 
                    href="/user/players" 
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.userCenter")}
                  </Link>
                  <Link 
                    href="/user/upload" 
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("navbar.uploadTexture")}
                  </Link>
                </>
              )}
              {isAdmin && (
                  <Link 
                    href="/user/admin/users" 
                    className="rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                  {t("nav.adminPanel")}
                </Link>
              )}
            </nav>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <LanguageSwitch />
              <div className="flex gap-2">
                {isLoggedIn ? (
                  <Button size="sm" variant="outline" className="gap-2 bg-transparent" asChild>
                    <Link href="/user/players">
                      <User className="h-4 w-4" />
                      {t("nav.userCenter")}
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href="/auth/register">{t("auth.register")}</Link>
                    </Button>
                    <Button size="sm" className="gap-2" asChild>
                      <Link href="/auth/login">
                        <User className="h-4 w-4" />
                        {t("auth.login")}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
