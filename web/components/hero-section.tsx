"use client"

import { ArrowRight, Sparkles, Users, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/context"

export function HeroSection() {
  const { t } = useI18n()
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a2e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Floating Pixels */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-20 h-4 w-4 animate-pulse rounded-sm bg-primary/30" />
        <div className="absolute right-1/3 top-32 h-3 w-3 animate-pulse rounded-sm bg-accent/40" style={{ animationDelay: "0.5s" }} />
        <div className="absolute left-1/2 top-16 h-2 w-2 animate-pulse rounded-sm bg-primary/20" style={{ animationDelay: "1s" }} />
        <div className="absolute right-1/4 top-24 h-5 w-5 animate-pulse rounded-sm bg-accent/30" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 lg:px-8 lg:py-32">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            {t("hero.badge")}
          </div>

          {/* Heading */}
          <h1 className="mb-6 max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
            {t("hero.titlePrefix")}
            <span className="block text-primary">{t("hero.titleHighlight")}</span>
          </h1>

          {/* Description */}
          <p className="mb-10 max-w-2xl text-lg text-muted-foreground text-pretty">
            {t("hero.description1")}
            {t("hero.description2")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 px-8">
              {t("hero.browse")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 px-8 bg-transparent">
              {t("hero.upload")}
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-border pt-10 sm:gap-16">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                <Download className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                2.5M+
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t("hero.totalDownloads")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                <Users className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                50K+
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t("hero.activeUsers")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                <Sparkles className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                12K+
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t("hero.skinCount")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
