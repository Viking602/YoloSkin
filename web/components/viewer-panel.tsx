"use client"

import { useState, Suspense } from "react"
import { Loader2, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Move } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { useI18n } from "@/lib/i18n/context"

// 动态导入 SkinViewer 组件
const SkinViewer = dynamic(
  () => import("@/components/skin-viewer").then((mod) => mod.SkinViewer),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }
)

interface ViewerPanelProps {
  skinUrl?: string | null
  capeUrl?: string | null
  isLoading?: boolean
  playerName?: string
  onUse?: () => void
  onReset?: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

const BG_COLORS = [
  { color: "#ffffff", labelKey: "viewer.bgWhite" },
  { color: "#1a1a1a", labelKey: "viewer.bgBlack" },
  { color: "#6b7280", labelKey: "viewer.bgGray" },
]

export function ViewerPanel({
  skinUrl,
  capeUrl,
  isLoading = false,
  playerName,
  onUse,
  onReset,
  onPrev,
  onNext,
  hasPrev = true,
  hasNext = true,
}: ViewerPanelProps) {
  const { t } = useI18n()
  const [bgColor, setBgColor] = useState("#ffffff")
  const [isAnimating, setIsAnimating] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)

  const handleReset = () => {
    setIsAnimating(true)
    setAutoRotate(false)
    setBgColor("#ffffff")
    onReset?.()
  }

  if (isLoading) {
    return (
      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-medium">{t("viewer.preview")}</span>
        </div>
        <div className="h-[380px] flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground">{t("viewer.loading")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="font-medium text-foreground">{t("viewer.preview")}</span>
        <div className="flex items-center gap-1">
          {/* 自动旋转 */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg transition-colors ${
              autoRotate 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            title={autoRotate ? t("viewer.stopRotate") : t("viewer.autoRotate")}
          >
            <Move className="w-4 h-4" />
          </button>
          {/* 动画控制 */}
          <button
            onClick={() => setIsAnimating(!isAnimating)}
            className={`p-1.5 rounded-lg transition-colors ${
              isAnimating 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            title={isAnimating ? t("viewer.pauseAnimation") : t("viewer.playAnimation")}
          >
            {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          {/* 重置视角 */}
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title={t("common.reset")}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D 预览区域 */}
      <div className="h-[380px]">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-white">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        }>
          <SkinViewer 
            skinUrl={skinUrl} 
            capeUrl={capeUrl}
            className="w-full h-full"
            background={bgColor}
            isAnimating={isAnimating}
            autoRotate={autoRotate}
            zoom={60}
          />
        </Suspense>
      </div>

      {/* 底部控制栏 */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          {/* 背景色切换 */}
          <div className="flex items-center gap-2">
            {BG_COLORS.map((bg) => (
              <button
                key={bg.color}
                onClick={() => setBgColor(bg.color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  bgColor === bg.color 
                    ? "border-primary scale-110" 
                    : "border-border hover:border-muted-foreground"
                }`}
                style={{ backgroundColor: bg.color }}
                title={t(bg.labelKey)}
              />
            ))}
          </div>

          {/* 导航按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="icon"
              onClick={onPrev}
              disabled={!hasPrev}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onUse}
            className="rounded-lg"
          >
            {t("viewer.useTexture")}
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            className="rounded-lg bg-transparent"
          >
            {t("viewer.resetSelected")}
          </Button>
        </div>
      </div>
    </div>
  )
}
