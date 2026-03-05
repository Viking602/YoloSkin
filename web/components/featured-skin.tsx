"use client"

import { useState } from "react"
import { Download, Heart, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

const featuredSkins = [
  {
    id: 1,
    nameKey: "featured.items.cyberpunk.name",
    author: "PixelMaster",
    descriptionKey: "featured.items.cyberpunk.description",
    likes: 4820,
    downloads: 12500,
    headColor: "#00D4FF",
    bodyColor: "#FF00FF",
    accentColor: "#FFE600",
  },
  {
    id: 2,
    nameKey: "featured.items.samurai.name",
    author: "SakuraCraft",
    descriptionKey: "featured.items.samurai.description",
    likes: 3650,
    downloads: 9800,
    headColor: "#FFB7C5",
    bodyColor: "#8B0000",
    accentColor: "#FFD700",
  },
  {
    id: 3,
    nameKey: "featured.items.explorer.name",
    author: "SpaceBuilder",
    descriptionKey: "featured.items.explorer.description",
    likes: 5200,
    downloads: 15600,
    headColor: "#FFFFFF",
    bodyColor: "#1E3A5F",
    accentColor: "#FF6B35",
  },
]

export function FeaturedSkin() {
  const { t } = useI18n()
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentSkin = featuredSkins[currentIndex]

  const nextSkin = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredSkins.length)
  }

  const prevSkin = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredSkins.length) % featuredSkins.length)
  }

  return (
    <section id="featured" className="border-b border-border bg-card py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t("featured.title")}</h2>
            <p className="mt-2 text-muted-foreground">{t("featured.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevSkin}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextSkin}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Skin Preview */}
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary lg:aspect-[4/3]">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Large Character Preview */}
              <svg viewBox="0 0 64 64" className="h-64 w-64 lg:h-80 lg:w-80 transition-all duration-500" style={{ imageRendering: "pixelated" }}>
                {/* Head */}
                <rect x="16" y="0" width="32" height="32" fill={currentSkin.headColor} />
                <rect x="18" y="2" width="28" height="28" fill={currentSkin.headColor} opacity="0.8" />
                {/* Eyes */}
                <rect x="22" y="12" width="6" height="6" fill="#1a1a1a" />
                <rect x="36" y="12" width="6" height="6" fill="#1a1a1a" />
                <rect x="24" y="14" width="2" height="2" fill="#FFFFFF" />
                <rect x="38" y="14" width="2" height="2" fill="#FFFFFF" />
                {/* Mouth */}
                <rect x="26" y="22" width="12" height="2" fill="#1a1a1a" />
                {/* Body */}
                <rect x="16" y="32" width="32" height="24" fill={currentSkin.bodyColor} />
                <rect x="18" y="34" width="28" height="20" fill={currentSkin.bodyColor} opacity="0.9" />
                {/* Accent Details */}
                <rect x="20" y="36" width="8" height="2" fill={currentSkin.accentColor} />
                <rect x="36" y="36" width="8" height="2" fill={currentSkin.accentColor} />
                {/* Arms */}
                <rect x="4" y="32" width="12" height="24" fill={currentSkin.headColor} />
                <rect x="48" y="32" width="12" height="24" fill={currentSkin.headColor} />
                {/* Legs */}
                <rect x="16" y="56" width="14" height="8" fill={currentSkin.bodyColor} opacity="0.7" />
                <rect x="34" y="56" width="14" height="8" fill={currentSkin.bodyColor} opacity="0.7" />
              </svg>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/80 to-transparent" />
            
            {/* Navigation Dots */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {featuredSkins.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    index === currentIndex ? "w-6 bg-primary" : "bg-muted-foreground/50 hover:bg-muted-foreground"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Skin Info */}
          <div className="flex flex-col justify-center">
            <span className="mb-3 inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {t("featured.badge")}
            </span>
            <h3 className="mb-3 text-3xl font-bold text-foreground lg:text-4xl">{t(currentSkin.nameKey)}</h3>
            <p className="mb-2 text-muted-foreground">
              by <span className="text-foreground">{currentSkin.author}</span>
            </p>
            <p className="mb-8 text-lg text-muted-foreground">{t(currentSkin.descriptionKey)}</p>

            <div className="mb-8 flex gap-6">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-foreground">{currentSkin.likes.toLocaleString()}</span>
                <span className="text-muted-foreground">{t("featured.likes")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">{currentSkin.downloads.toLocaleString()}</span>
                <span className="text-muted-foreground">{t("featured.downloads")}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button size="lg" className="gap-2">
                <Download className="h-4 w-4" />
                {t("featured.downloadSkin")}
              </Button>
              <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                <Eye className="h-4 w-4" />
                {t("featured.preview3d")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
