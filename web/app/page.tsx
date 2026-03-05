"use client"

import Link from "next/link"
import { Users, Upload, ShirtIcon, Shield, LogIn, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth/context"
import { useI18n } from "@/lib/i18n/context"

// 像素风草方块
function GrassBlock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <rect x="0" y="0" width="64" height="16" fill="#5D8C3E"/>
      <rect x="0" y="4" width="8" height="8" fill="#4A7A2E"/>
      <rect x="16" y="0" width="8" height="8" fill="#6B9C4A"/>
      <rect x="32" y="4" width="8" height="8" fill="#4A7A2E"/>
      <rect x="48" y="0" width="8" height="8" fill="#6B9C4A"/>
      <rect x="8" y="8" width="8" height="8" fill="#6B9C4A"/>
      <rect x="40" y="8" width="8" height="8" fill="#4A7A2E"/>
      <rect x="0" y="16" width="64" height="48" fill="#8B6914"/>
      <rect x="8" y="24" width="8" height="8" fill="#7A5A12"/>
      <rect x="24" y="32" width="8" height="8" fill="#9C7A1C"/>
      <rect x="40" y="24" width="8" height="8" fill="#7A5A12"/>
      <rect x="16" y="44" width="8" height="8" fill="#9C7A1C"/>
      <rect x="48" y="40" width="8" height="8" fill="#7A5A12"/>
      <rect x="0" y="36" width="8" height="8" fill="#9C7A1C"/>
      <rect x="56" y="28" width="8" height="8" fill="#7A5A12"/>
    </svg>
  )
}

// 像素风人物
function PixelCharacter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 128" className={className} fill="none">
      {/* 头部 */}
      <rect x="16" y="0" width="32" height="32" fill="#D4A574"/>
      <rect x="20" y="8" width="8" height="8" fill="#4A3728"/>
      <rect x="36" y="8" width="8" height="8" fill="#4A3728"/>
      <rect x="24" y="20" width="16" height="4" fill="#C49464"/>
      {/* 头发 */}
      <rect x="16" y="0" width="32" height="8" fill="#4A3728"/>
      <rect x="16" y="8" width="4" height="8" fill="#4A3728"/>
      <rect x="44" y="8" width="4" height="8" fill="#4A3728"/>
      {/* 身体 */}
      <rect x="12" y="32" width="40" height="40" fill="#2E7D32"/>
      <rect x="20" y="40" width="8" height="8" fill="#1B5E20"/>
      <rect x="36" y="40" width="8" height="8" fill="#1B5E20"/>
      <rect x="28" y="56" width="8" height="8" fill="#1B5E20"/>
      {/* 手臂 */}
      <rect x="0" y="32" width="12" height="32" fill="#D4A574"/>
      <rect x="52" y="32" width="12" height="32" fill="#D4A574"/>
      {/* 腿 */}
      <rect x="16" y="72" width="14" height="32" fill="#1565C0"/>
      <rect x="34" y="72" width="14" height="32" fill="#1565C0"/>
      {/* 鞋 */}
      <rect x="16" y="104" width="14" height="8" fill="#424242"/>
      <rect x="34" y="104" width="14" height="8" fill="#424242"/>
    </svg>
  )
}

const quickActions = [
  {
    icon: Users,
    titleKey: "home.quick.playersTitle",
    descriptionKey: "home.quick.playersDesc",
    href: "/user/players",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  {
    icon: Upload,
    titleKey: "home.quick.uploadTitle",
    descriptionKey: "home.quick.uploadDesc",
    href: "/user/upload",
    color: "bg-accent/10 text-accent border-accent/20",
  },
  {
    icon: ShirtIcon,
    titleKey: "home.quick.closetTitle",
    descriptionKey: "home.quick.closetDesc",
    href: "/user/closet",
    color: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  },
  {
    icon: Shield,
    titleKey: "home.quick.premiumTitle",
    descriptionKey: "home.quick.premiumDesc",
    href: "/user/premium",
    color: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
]

export default function Home() {
  const { isLoggedIn } = useAuth()
  const { t } = useI18n()

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b-2 border-border">
        {/* 像素网格背景装饰 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10">
            <GrassBlock className="w-16 h-16" />
          </div>
          <div className="absolute top-20 right-20">
            <GrassBlock className="w-12 h-12" />
          </div>
          <div className="absolute bottom-10 left-1/4">
            <GrassBlock className="w-10 h-10" />
          </div>
          <div className="absolute bottom-20 right-1/3">
            <GrassBlock className="w-14 h-14" />
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {t("home.badge")}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                <span className="text-primary">CraftSkin</span>
                <br />
                {t("home.titleSuffix")}
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl">
                {t("home.description")}
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {isLoggedIn ? (
                  <>
                    <Button size="lg" className="gap-2" asChild>
                      <Link href="/user/players">
                        {t("home.enterUserCenter")}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="gap-2 bg-transparent" asChild>
                      <Link href="/user/closet">
                        <ShirtIcon className="w-4 h-4" />
                        {t("home.browseCloset")}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" className="gap-2" asChild>
                      <Link href="/auth/login">
                        <LogIn className="w-4 h-4" />
                        {t("home.loginAccount")}
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="gap-2 bg-transparent" asChild>
                      <Link href="/auth/register">
                        {t("home.createAccount")}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* 像素角色展示 */}
            <div className="relative flex items-center justify-center">
              <div className="relative">
                {/* 背景光晕 */}
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75" />
                <div className="relative">
                  <PixelCharacter className="w-40 h-80 lg:w-48 lg:h-96 drop-shadow-2xl" />
                </div>
                {/* 装饰方块 */}
                <div className="absolute -top-4 -right-8 animate-bounce" style={{ animationDelay: "0.2s" }}>
                  <GrassBlock className="w-12 h-12" />
                </div>
                <div className="absolute -bottom-4 -left-8 animate-bounce" style={{ animationDelay: "0.5s" }}>
                  <GrassBlock className="w-10 h-10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 未登录提示 */}
      {!isLoggedIn && (
        <div className="bg-warning/10 border-b-2 border-warning/20">
          <div className="mx-auto max-w-7xl px-4 py-3 lg:px-8">
            <p className="text-sm text-center text-warning font-medium">
              {t("home.loginHint")}
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t("home.quickTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("home.quickDesc")}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group mc-card p-6 transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-lg border-2 ${action.color} flex items-center justify-center mb-4`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {t(action.titleKey)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(action.descriptionKey)}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {t("common.goTo")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 功能介绍 */}
      <section className="py-16 lg:py-24 bg-card border-y-2 border-border">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-lg bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{t("home.feature.uploadTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("home.feature.uploadDesc")}
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-lg bg-accent/10 border-2 border-accent/20 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{t("home.feature.multiPlayerTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("home.feature.multiPlayerDesc")}
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-lg bg-chart-3/10 border-2 border-chart-3/20 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-chart-3" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{t("home.feature.premiumTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("home.feature.premiumDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
