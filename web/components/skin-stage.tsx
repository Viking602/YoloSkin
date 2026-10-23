"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Move, Pause, Play } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"

const SkinViewer = dynamic(
  () => import("@/components/skin-viewer").then((module) => module.SkinViewer),
  {
    ssr: false,
    loading: () => <div className="skin-stage-loading" aria-hidden="true" />
  }
)

export function SkinStage({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const [isAnimating, setIsAnimating] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setIsAnimating(false)
  }, [])

  return (
    <div className={cn("skin-stage", compact && "skin-stage-compact")}>
      <div className="skin-stage-top">
        <span className="studio-label">{t("studio.studioName")}</span>
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
        <SkinViewer
          background="transparent"
          zoom={compact ? 38 : 34}
          isAnimating={isAnimating}
          autoRotate={autoRotate}
        />
      </div>
      <div className="skin-stage-bottom">
        <div className="flex items-center gap-3">
          <img src="/images/steve.png" alt="" className="stage-texture" />
          <div>
            <p className="text-sm font-semibold">Steve</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {t("studio.demoTextureMeta")}
            </p>
          </div>
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
        </div>
      </div>
      <div className="stage-caption">
        <span className="stage-caption-line" />
        {t("studio.dragHint")}
      </div>
    </div>
  )
}
