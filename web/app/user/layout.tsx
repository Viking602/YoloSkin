"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronRight,
  Crown,
  FileText,
  Home,
  ImageIcon,
  Key,
  LogOut,
  Menu,
  Settings,
  Shirt,
  Upload,
  User,
  Users,
  X
} from "lucide-react"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { LanguageSwitch } from "@/components/language-switch"
import { ThemeToggle } from "@/components/theme-toggle"
import { useI18n } from "@/lib/i18n/context"
import { useSiteSettings } from "@/lib/site-settings/context"
import { useAuth } from "@/lib/auth/context"

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname().replace(/\/$/, "") || "/"
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { translations: t } = useI18n()
  const { settings } = useSiteSettings()
  const { user, isAdmin, isLoggedIn, isLoading, logout } = useAuth()

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.replace("/auth/login")
  }, [isLoading, isLoggedIn, router])

  const userLinks = [
    { href: "/user/players", label: t.userMenu.players, icon: Users },
    { href: "/user/upload", label: t.userMenu.upload, icon: Upload },
    { href: "/user/closet", label: t.userMenu.closet, icon: Shirt },
    { href: "/user/premium", label: t.userMenu.premium, icon: Crown },
    { href: "/user/settings", label: t.userMenu.accountSettings, icon: Key }
  ]
  const adminLinks = [
    { href: "/user/admin/users", label: t.adminMenu.users, icon: Users },
    {
      href: "/user/admin/textures",
      label: t.adminMenu.textures,
      icon: ImageIcon
    },
    {
      href: "/user/admin/auditLogs",
      label: t.adminMenu.auditLogs,
      icon: FileText
    },
    {
      href: "/user/admin/settings",
      label: t.adminMenu.siteSettings,
      icon: Settings
    }
  ]
  const currentPage = [...userLinks, ...(isAdmin ? adminLinks : [])].find(
    (link) => pathname === link.href
  )

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t.studio.toggleMenu}
            aria-expanded={isSidebarOpen}
            aria-controls="workspace-sidebar"
            onClick={() => setIsSidebarOpen((value) => !value)}
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </Button>
          <Link href="/">
            <Brand name={settings.siteName} />
          </Link>
          <nav
            className="hidden items-center gap-3 border-l border-border pl-7 text-xs text-muted-foreground md:flex"
            aria-label={t.nav.userCenter}
          >
            <span>{t.nav.userCenter}</span>
            <ChevronRight size={12} />
            <span className="text-foreground">
              {currentPage?.label ?? t.nav.userCenter}
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitch />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout()
              router.push("/auth/login")
            }}
          >
            <LogOut size={15} />
            <span>{t.common.logout}</span>
          </Button>
        </div>
      </header>
      <div className="workspace-body">
        <aside
          id="workspace-sidebar"
          className="workspace-sidebar"
          data-open={isSidebarOpen}
        >
          <div className="workspace-sidebar-head">
            <span className="studio-label">{t.studio.studioName}</span>
            <p>{t.studio.workspaceLabel}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <nav className="workspace-nav" aria-label={t.nav.userCenter}>
              {userLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <link.icon size={17} strokeWidth={1.7} />
                  <span>{link.label}</span>
                  {pathname === link.href && <span className="active-dot" />}
                </Link>
              ))}
            </nav>
            {isAdmin && (
              <>
                <p className="studio-label mb-3 mt-9 px-3">
                  {t.nav.siteManagement}
                </p>
                <nav
                  className="workspace-nav"
                  aria-label={t.nav.siteManagement}
                >
                  {adminLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={pathname === link.href ? "page" : undefined}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <link.icon size={17} strokeWidth={1.7} />
                      <span>{link.label}</span>
                      {pathname === link.href && (
                        <span className="active-dot" />
                      )}
                    </Link>
                  ))}
                </nav>
              </>
            )}
            <Link
              href="/"
              className="nav-link mt-8 flex items-center gap-3 px-3 py-3"
            >
              <Home size={16} />
              {t.nav.backToHome}
            </Link>
          </div>
          <div className="workspace-user">
            <span className="workspace-avatar">
              <User size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {user?.nickname || t.nav.userCenter}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {t.studio.accountLabel}
              </p>
            </div>
          </div>
        </aside>
        {isSidebarOpen && (
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 top-[76px] z-30 bg-foreground/20 backdrop-blur-[2px] lg:hidden"
            aria-label={t.common.cancel}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <main id="main-content" className="workspace-main">
          <div>
            {isLoading ? (
              <div
                className="space-y-4"
                role="status"
                aria-label={t.common.loading}
              >
                <div className="h-8 w-44 animate-pulse rounded bg-secondary" />
                <div className="h-48 animate-pulse rounded-xl bg-secondary" />
              </div>
            ) : isLoggedIn ? (
              children
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
