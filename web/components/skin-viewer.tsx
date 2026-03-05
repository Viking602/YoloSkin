"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { use } from "@daidr/minecraft-skin-renderer"
import { WebGLRendererPlugin } from "@daidr/minecraft-skin-renderer/webgl"
import { createSkinViewer } from "@daidr/minecraft-skin-renderer"
import type { SkinViewer as SkinViewerType } from "@daidr/minecraft-skin-renderer"
import { useI18n } from "@/lib/i18n/context"

// 注册 WebGL 渲染插件
use(WebGLRendererPlugin)

const DEFAULT_SKIN_URL = "/images/steve.png"

interface SkinViewerProps {
  skinUrl?: string | null
  capeUrl?: string | null
  className?: string
  background?: string
  isAnimating?: boolean
  autoRotate?: boolean
  zoom?: number
  onReady?: () => void
  onError?: (error: Error) => void
}

export function SkinViewer({
  skinUrl,
  capeUrl,
  className = "",
  background = "#ffffff",
  isAnimating = true,
  autoRotate = false,
  zoom = 60,
  onReady,
  onError,
}: SkinViewerProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<SkinViewerType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initViewer = useCallback(async () => {
    if (!canvasRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      // 如果已有 viewer，先销毁
      if (viewerRef.current) {
        viewerRef.current.dispose()
        viewerRef.current = null
      }

      // 创建新的 SkinViewer
      const viewer = await createSkinViewer({
        canvas: canvasRef.current,
        skin: skinUrl || DEFAULT_SKIN_URL,
        cape: capeUrl || undefined,
        enableRotate: true,
        enableZoom: true,
        autoRotate,
        zoom,
      })

      // 启动渲染循环
      viewer.startRenderLoop()

      // 播放动画
      if (isAnimating) {
        viewer.playAnimation("idle")
      }

      viewerRef.current = viewer
      setIsLoading(false)
      onReady?.()
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Failed to initialize viewer")
      setError(error.message)
      setIsLoading(false)
      onError?.(error)
    }
  }, [autoRotate, zoom, isAnimating, onReady, onError])

  // 初始化
  useEffect(() => {
    initViewer()

    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose()
        viewerRef.current = null
      }
    }
  }, [initViewer])

  // 更新皮肤
  useEffect(() => {
    const loadSkin = async () => {
      if (viewerRef.current) {
        const skinToLoad = skinUrl || DEFAULT_SKIN_URL
        try {
          await viewerRef.current.setSkin(skinToLoad)
        } catch {
          // 静默失败
        }
      }
    }
    loadSkin()
  }, [skinUrl])

  // 更新披风
  useEffect(() => {
    const loadCape = async () => {
      if (viewerRef.current) {
        try {
          if (capeUrl) {
            await viewerRef.current.setCape(capeUrl)
          }
        } catch {
          // 静默失败
        }
      }
    }
    loadCape()
  }, [capeUrl])

  // 更新动画状态
  useEffect(() => {
    if (viewerRef.current) {
      if (isAnimating) {
        viewerRef.current.playAnimation("idle")
      } else {
        viewerRef.current.stopAnimation()
      }
    }
  }, [isAnimating])

  // 更新自动旋转
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.setAutoRotate(autoRotate)
    }
  }, [autoRotate])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-secondary/50 ${className}`} style={{ background }}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">{t("common.loadFailed")}</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ width: "100%", height: "100%", background }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block"
        }}
      />
    </div>
  )
}
