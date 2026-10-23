"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Move, Pause, Play, RotateCcw } from "lucide-react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/context"

const SkinViewer = dynamic(
  () => import("@/components/skin-viewer").then((mod) => mod.SkinViewer),
  {
    ssr: false,
    loading: () => <div className="skin-stage-loading" aria-hidden="true" />
  }
)

interface ViewerPanelProps {
  skinUrl?: string | null
  capeUrl?: string | null
  isLoading?: boolean
  playerName?: string
  skinName?: string
  capeName?: string
  onUse?: () => void
  onReset?: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

const BG_COLORS = [
  { color: "transparent", swatch: "#eef2e7", labelKey: "viewer.bgStudio" },
  { color: "#ffffff", swatch: "#ffffff", labelKey: "viewer.bgWhite" },
  { color: "#1a1a1a", swatch: "#1a1a1a", labelKey: "viewer.bgBlack" },
  { color: "#6b7280", swatch: "#6b7280", labelKey: "viewer.bgGray" }
]

export function ViewerPanel({
  skinUrl,
  capeUrl,
  isLoading = false,
  playerName,
  skinName,
  capeName,
  onUse,
  onReset,
  onPrev,
  onNext,
  hasPrev = true,
  hasNext = true
}: ViewerPanelProps) {
  const { t } = useI18n()
  const [bgColor, setBgColor] = useState("transparent")
  const [isAnimating, setIsAnimating] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)

  const handleReset = () => {
    setIsAnimating(true)
    setAutoRotate(false)
    setBgColor("transparent")
    onReset?.()
  }

  return (
    <div className="skin-stage skin-stage-tall">
      <div className="skin-stage-top">
        <div className="min-w-0">
          <span className="studio-label">{t("closet.previewHero")}</span>
          <p className="mt-1 truncate text-sm font-semibold">
            {playerName || t("viewer.preview")}
          </p>
        </div>
        <span className="stage-live">
          <span />
          {t("studio.livePreview")}
        </span>
      </div>
      <div
        className="skin-stage-canvas"
        role="img"
        aria-label={t("studio.previewDescription")}
      >
        <span className="stage-watermark" aria-hidden="true">
          YS.
        </span>
        <div className="stage-platform" aria-hidden="true" />
        {isLoading ? (
          <div className="skin-stage-loading" role="status" aria-label={t("viewer.loading")} />
        ) : (
          <SkinViewer
            skinUrl={skinUrl}
            capeUrl={capeUrl}
            className="h-full w-full"
            background={bgColor}
            isAnimating={isAnimating}
            autoRotate={autoRotate}
            zoom={42}
          />
        )}
      </div>
      <div className="skin-stage-bottom">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {skinName || t("common.notSet")}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {t("closet.cape")}: {capeName || t("common.notSet")}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <button
            type="button"
            className="stage-control"
            aria-pressed={autoRotate}
            onClick={() => setAutoRotate((value) => !value)}
          >
            <Move size={15} />
            {t(autoRotate ? "viewer.stopRotate" : "viewer.autoRotate")}
          </button>
          <button
            type="button"
            className="stage-control"
            aria-pressed={isAnimating}
            onClick={() => setIsAnimating((value) => !value)}
          >
            {isAnimating ? <Pause size={15} /> : <Play size={15} />}
            {t(isAnimating ? "viewer.pauseAnimation" : "viewer.playAnimation")}
          </button>
          <button type="button" className="stage-control" onClick={handleReset}>
            <RotateCcw size={15} />
            {t("viewer.resetView")}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
        <div className="flex items-center gap-2" role="group" aria-label={t("viewer.background")}>
          {BG_COLORS.map((bg) => (
            <button
              key={bg.labelKey}
              type="button"
              className="bg-swatch"
              data-selected={bgColor === bg.color}
              style={{ backgroundColor: bg.swatch }}
              aria-label={t(bg.labelKey)}
              title={t(bg.labelKey)}
              onClick={() => setBgColor(bg.color)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev}>
            <ChevronLeft className="size-4" />
            {t("viewer.previousSkin")}
          </Button>
          <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
            {t("viewer.nextSkin")}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="stage-actions">
        <Button onClick={onUse} disabled={isLoading}>
          {t("viewer.useTexture")}
        </Button>
        <Button variant="outline" onClick={onReset} disabled={isLoading}>
          {t("viewer.resetSelected")}
        </Button>
      </div>
      <div className="stage-caption">
        <span className="stage-caption-line" />
        {t("studio.dragHint")}
      </div>
    </div>
  )
}
