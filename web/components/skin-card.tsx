"use client"

import { useState } from "react"
import { Heart, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

interface SkinCardProps {
  name: string
  author: string
  likes: number
  downloads: number
  category: string
  isLiked?: boolean
}

export function SkinCard({ name, author, likes, downloads, category, isLiked = false }: SkinCardProps) {
  const { t } = useI18n()
  const [liked, setLiked] = useState(isLiked)
  const [likeCount, setLikeCount] = useState(likes)
  const [isHovered, setIsHovered] = useState(false)

  const handleLike = () => {
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
  }

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Skin Preview */}
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {/* Minecraft Character Preview */}
        <div className="flex h-full items-center justify-center">
          <div
            className={cn(
              "relative transition-transform duration-500",
              isHovered && "scale-110"
            )}
          >
            {/* Pixel Art Character Representation */}
            <svg viewBox="0 0 64 64" className="h-40 w-40" style={{ imageRendering: "pixelated" }}>
              {/* Head */}
              <rect x="20" y="4" width="24" height="24" fill="#5D4037" />
              <rect x="22" y="6" width="20" height="20" fill="#8D6E63" />
              {/* Eyes */}
              <rect x="26" y="12" width="4" height="4" fill="#1a1a1a" />
              <rect x="34" y="12" width="4" height="4" fill="#1a1a1a" />
              {/* Mouth */}
              <rect x="28" y="20" width="8" height="2" fill="#5D4037" />
              {/* Body */}
              <rect x="20" y="28" width="24" height="20" fill="#1E88E5" />
              <rect x="22" y="30" width="20" height="16" fill="#2196F3" />
              {/* Arms */}
              <rect x="8" y="28" width="12" height="20" fill="#8D6E63" />
              <rect x="44" y="28" width="12" height="20" fill="#8D6E63" />
              {/* Legs */}
              <rect x="20" y="48" width="10" height="14" fill="#424242" />
              <rect x="34" y="48" width="10" height="14" fill="#424242" />
            </svg>
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {category}
          </span>
        </div>

        {/* Quick Actions Overlay */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center gap-2 bg-background/60 backdrop-blur-sm transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Button size="sm" variant="secondary" className="gap-1.5">
            <Eye className="h-4 w-4" />
            {t("skinCard.preview")}
          </Button>
          <Button size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            {t("skinCard.download")}
          </Button>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
            <p className="text-sm text-muted-foreground">by {author}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleLike}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                liked ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )}
            />
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {likeCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {downloads.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
