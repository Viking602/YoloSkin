"use client"

import type { ChangeEvent, DragEvent } from "react"

import { useState, useCallback, useRef } from "react"
import { Upload, X, CheckCircle, Copy, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

interface UploadResult {
  tid: number
  hash: string
  url: string
}

interface TextureUploadProps {
  onUpload: (file: File) => Promise<UploadResult>
  onReset?: () => void
  onFileChange?: (file: File | null, previewUrl: string | null) => void
  accept?: string
  maxSize?: number // in MB
  disabled?: boolean
  rateLimitError?: boolean
}

export function TextureUpload({
  onUpload,
  onReset,
  onFileChange,
  accept = "image/png",
  maxSize = 2,
  disabled = false,
  rateLimitError = false,
}: TextureUploadProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (!file.type.match(accept.replace("*", ".*"))) {
      return t("textureUpload.errors.pngOnly")
    }
    if (file.size > maxSize * 1024 * 1024) {
      return `${t("textureUpload.errors.maxSizePrefix")} ${maxSize}MB`
    }
    return null
  }

  const handleFile = useCallback((file: File) => {
    if (disabled || isUploading) return
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setFile(file)
    onReset?.()
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const nextPreview = e.target?.result as string
      setPreview(nextPreview)
      onFileChange?.(file, nextPreview)
    }
    reader.readAsDataURL(file)
  }, [accept, maxSize, onReset, onFileChange, t, disabled, isUploading])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }, [handleFile])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setProgress(0)
    setError(null)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const uploadResult = await onUpload(file)
      setResult(uploadResult)
      setProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("textureUpload.errors.uploadFailed"))
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
    }
  }

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleReset = () => {
    onReset?.()
    onFileChange?.(null, null)
    if (inputRef.current) inputRef.current.value = ""
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setProgress(0)
  }

  if (rateLimitError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">{t("textureUpload.rateLimitTitle")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("textureUpload.rateLimitDesc")}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="rounded-lg border border-primary/50 bg-primary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground mb-3">{t("textureUpload.successTitle")}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2 p-2 rounded bg-secondary">
                <span className="text-muted-foreground">TID</span>
                <div className="flex items-center gap-2">
                  <code className="text-foreground">{result.tid}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => handleCopy(String(result.tid), "tid")}
                    aria-label={t("common.copyTid")}
                  >
                    {copied === "tid" ? (
                      <CheckCircle className="w-3 h-3 text-primary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copied === "tid" ? t("common.copied") : t("common.copy")}</span>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded bg-secondary">
                <span className="text-muted-foreground">Hash</span>
                <div className="flex items-center gap-2">
                  <code className="text-foreground truncate max-w-[200px]">{result.hash}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => handleCopy(result.hash, "hash")}
                    aria-label={t("common.copyHash")}
                  >
                    {copied === "hash" ? (
                      <CheckCircle className="w-3 h-3 text-primary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copied === "hash" ? t("common.copied") : t("common.copy")}</span>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded bg-secondary">
                <span className="text-muted-foreground">URL</span>
                <div className="flex items-center gap-2">
                  <code className="text-foreground truncate max-w-[200px]">{result.url}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => handleCopy(result.url, "url")}
                    aria-label={t("common.copyUrl")}
                  >
                    {copied === "url" ? (
                      <CheckCircle className="w-3 h-3 text-primary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copied === "url" ? t("common.copied") : t("common.copy")}</span>
                  </Button>
                </div>
              </div>
            </div>
            <Button variant="outline" className="mt-4 bg-transparent" onClick={handleReset}>
              {t("textureUpload.uploadNew")}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed bg-background/60 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="flex flex-col items-center justify-center py-12 px-4">
          {preview ? (
            <div className="relative">
              <img
                src={preview || "/placeholder.svg"}
                alt={file?.name || t("upload.previewTitle")}
                className="w-32 h-32 object-contain rounded-lg bg-secondary"
                style={{ imageRendering: "pixelated" }}
              />
              <Button
                variant="destructive"
                disabled={isUploading}
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                aria-label={t("common.reset")}
                onClick={(e) => {
                  e.stopPropagation()
                  handleReset()
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">
                {t("textureUpload.dragOrClick")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("textureUpload.pngLimit")} {maxSize}MB
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          {error}
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {t("textureUpload.uploading")} {progress}{t("units.percent")}
          </p>
        </div>
      )}

      {file && !isUploading && !result && (
        <Button onClick={handleUpload} className="w-full" disabled={disabled}>
          <Upload className="w-4 h-4 mr-2" />
          {t("textureUpload.uploadTexture")}
        </Button>
      )}
    </div>
  )
}
