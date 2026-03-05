"use client"

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Users,
  Upload,
  Shirt,
  Crown,
  Key,
  Menu,
  X,
  Home,
  LogOut,
  ChevronRight,
  Shield,
  ImageIcon,
  FileText,
  Settings,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitch } from "@/components/language-switch"
import { useI18n } from "@/lib/i18n/context"
import { useSiteSettings } from "@/lib/site-settings/context"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/context"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { translations: t } = useI18n()
  const { settings } = useSiteSettings()
  const { isAdmin, isLoggedIn, isLoading, logout } = useAuth()

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/auth/login")
    }
  }, [isLoading, isLoggedIn, router])

  // 普通用户菜单
  const userLinks = [
    { href: "/user/players", label: t.userMenu.players, icon: Users, description: t.userMenu.playersDesc },
    { href: "/user/upload", label: t.userMenu.upload, icon: Upload, description: t.userMenu.uploadDesc },
    { href: "/user/closet", label: t.userMenu.closet, icon: Shirt, description: t.userMenu.closetDesc },
    { href: "/user/premium", label: t.userMenu.premium, icon: Crown, description: t.userMenu.premiumDesc },
    { href: "/user/settings", label: t.userMenu.accountSettings, icon: Key, description: t.userMenu.accountSettingsDesc },
  ]

  // 管理员菜单
  const adminLinks = [
    { href: "/user/admin/users", label: t.adminMenu.users, icon: Users, description: t.adminMenu.usersDesc },
    { href: "/user/admin/textures", label: t.adminMenu.textures, icon: ImageIcon, description: t.adminMenu.texturesDesc },
    { href: "/user/admin/auditLogs", label: t.adminMenu.auditLogs, icon: FileText, description: t.adminMenu.auditLogsDesc },
    { href: "/user/admin/settings", label: t.adminMenu.siteSettings, icon: Settings, description: t.adminMenu.siteSettingsDesc },
    { href: "/user/admin/oauth", label: t.adminMenu.oauth, icon: Key, description: t.adminMenu.oauthDesc },
    { href: "/user/admin/email", label: t.adminMenu.email, icon: Mail, description: t.adminMenu.emailDesc },
  ]

  const allLinks = [...userLinks, ...(isAdmin ? adminLinks : [])]
  const currentPage = allLinks.find((link) => pathname === link.href)
  const isAdminPage = pathname.startsWith("/user/admin")

  return (
    <div className="min-h-screen bg-background">
      {/* 顶栏 */}
      <header className="sticky top-0 z-50 w-full border-b-2 border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/" className="flex items-center gap-2">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border-2",
                isAdminPage ? "bg-destructive border-destructive" : "bg-primary border-primary"
              )}>
                <span className={cn(
                  "text-sm font-bold",
                  isAdminPage ? "text-destructive-foreground" : "text-primary-foreground"
                )}>
                  {settings.siteName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:inline">{settings.siteName}</span>
            </Link>

            {/* 面包屑 */}
            <nav className="hidden lg:flex items-center gap-1.5 text-sm ml-4 pl-4 border-l border-border">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                {t.common.home}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className={isAdminPage ? "text-destructive font-medium" : "text-muted-foreground"}>
                {isAdminPage ? t.nav.siteManagement : t.nav.userCenter}
              </span>
              {currentPage && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-foreground font-medium">{currentPage.label}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-destructive"
              onClick={async () => {
                await logout()
                router.push("/auth/login")
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t.common.logout}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r-2 border-border bg-card pt-16 transition-transform lg:translate-x-0 lg:static lg:pt-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
            {/* 可滚动区域 */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* 用户信息卡片 */}
              <div className="mc-card p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{t.nav.userCenter}</div>
                    <div className="text-xs text-muted-foreground">{t.userMenu.playersDesc}</div>
                  </div>
                </div>
              </div>

              {/* 用户菜单 */}
              <nav className="space-y-1">
                {userLinks.map((link) => {
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all border-2",
                        isActive
                          ? "bg-card text-foreground border-border shadow-[0_8px_20px_rgba(15,23,42,0.10)]"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent hover:border-border"
                      )}
                    >
                      <link.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "")} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{link.label}</div>
                        <div className={cn(
                          "text-xs truncate",
                          "text-muted-foreground"
                        )}>
                          {link.description}
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0 text-primary" />}
                    </Link>
                  )
                })}
              </nav>

              {/* 管理员菜单 */}
              {isAdmin && (
                <>
                  <div className="mt-6 mb-3 flex items-center gap-2 px-1">
                    <Shield className="w-4 h-4 text-destructive" />
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wider">{t.nav.siteManagement}</span>
                  </div>
                  <nav className="space-y-1">
                    {adminLinks.map((link) => {
                      const isActive = pathname === link.href
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all border-2",
                            isActive
                              ? "bg-card text-foreground border-destructive/30 shadow-[0_8px_20px_rgba(220,38,38,0.10)]"
                              : "text-muted-foreground hover:bg-destructive/10 hover:text-foreground border-transparent hover:border-destructive/30"
                          )}
                        >
                          <link.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-destructive" : "")} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{link.label}</div>
                            <div className={cn(
                              "text-xs truncate",
                              "text-muted-foreground"
                            )}>
                              {link.description}
                            </div>
                          </div>
                          {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0 text-destructive" />}
                        </Link>
                      )
                    })}
                  </nav>
                </>
              )}
            </div>

            {/* 固定在底部的返回首页 */}
            <div className="flex-shrink-0 border-t-2 border-border p-4 bg-card">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border-2 border-transparent hover:border-border"
              >
                <Home className="h-4 w-4" />
                {t.nav.backToHome}
              </Link>
            </div>
          </div>
        </aside>

        {/* 遮罩层 */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* 主内容 */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
