"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Crown, Shirt, Users } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PlayerSelect, type Player } from "@/components/player-select"
import { TextureUpload } from "@/components/texture-upload"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/state-views"
import { PageHeader, PagePanel, PageStack } from "@/components/page-header"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

const SkinViewer = dynamic(
  () => import("@/components/skin-viewer").then((mod) => mod.SkinViewer),
  {
    ssr: false,
    loading: () => <div className="skin-stage-loading" aria-hidden="true" />
  }
)

type UploadResult = {
  tid: number
  hash: string
  url: string
  type: "skin" | "cape"
}

export default function UploadPage() {
  const { t } = useI18n()
  const [players, setPlayers] = useState<Player[]>([])
  const [playersLoading, setPlayersLoading] = useState(true)
  const [textureName, setTextureName] = useState("")
  const [textureType, setTextureType] = useState<"skin" | "cape">("skin")
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [isApplying, setIsApplying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedTexture, setUploadedTexture] = useState<UploadResult | null>(null)
  const [rateLimitError, setRateLimitError] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlayers = async () => {
      setPlayersLoading(true)
      try {
        const response = await api.listPlayers()
        setPlayers(response.data)
      } catch {
        toast.error(t("upload.errors.loadPlayers"))
      } finally {
        setPlayersLoading(false)
      }
    }
    void fetchPlayers()
  }, [t])

  const selectedPlayerId = useMemo(() => {
    if (!selectedPlayer) return null
    const value = Number(selectedPlayer)
    return Number.isNaN(value) ? null : value
  }, [selectedPlayer])

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    setUploadedTexture(null)
    try {
      const response = await api.uploadTexture({
        name: textureName.trim() || file.name,
        type: textureType,
        file,
        public: false
      })

      if (response.code !== 0) {
        if (response.code === 429) setRateLimitError(true)
        throw new Error(response.message || t("upload.errors.uploadFailed"))
      }

      const result = {
        tid: response.data.tid,
        hash: response.data.hash,
        url: `/textures/${response.data.hash}`,
        type: response.data.type
      }
      setUploadedTexture(result)
      return result
    } finally {
      setIsUploading(false)
    }
  }

  const changeTextureType = (type: "skin" | "cape") => {
    if (type === textureType) return
    setUploadedTexture(null)
    setRateLimitError(false)
    setLocalPreview(null)
    setTextureType(type)
  }

  const handleApplyTexture = async () => {
    if (!uploadedTexture || uploadedTexture.type !== textureType || !selectedPlayerId) return
    setIsApplying(true)
    try {
      const playerResponse = await api.getPlayer(selectedPlayerId)
      if (playerResponse.code !== 0) throw new Error(playerResponse.message)
      const currentPlayer = playerResponse.data
      const response = await api.updatePlayer(selectedPlayerId, {
        tid_skin: textureType === "skin" ? uploadedTexture.tid : currentPlayer.tid_skin,
        tid_cape: textureType === "cape" ? uploadedTexture.tid : currentPlayer.tid_cape
      })
      if (response.code !== 0) throw new Error(response.message)
      toast.success(t("common.success"))
    } catch {
      toast.error(t("upload.errors.applyFailed"))
    } finally {
      setIsApplying(false)
    }
  }

  const previewUrl = uploadedTexture?.url || localPreview

  return (
    <PageStack>
      <PageHeader
        title={t("upload.title")}
        description={t("upload.description")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/user/closet">{t("nav.closet")}</Link>
          </Button>
        }
      />

      <div className="page-hero">
        <div className="skin-stage skin-stage-tall">
          <div className="skin-stage-top">
            <span className="studio-label">{t("upload.previewTitle")}</span>
            <span className="stage-live">
              <span />
              {textureType === "skin" ? t("closet.skin") : t("closet.cape")}
            </span>
          </div>
          <div className="skin-stage-canvas" role="img" aria-label={t("upload.previewTitle")}>
            <span className="stage-watermark" aria-hidden="true">
              YS.
            </span>
            <div className="stage-platform" aria-hidden="true" />
            {previewUrl ? (
              textureType === "skin" ? (
                <SkinViewer
                  skinUrl={previewUrl}
                  background="transparent"
                  zoom={42}
                  isAnimating
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8">
                  <img
                    src={previewUrl}
                    alt={textureName || t("closet.cape")}
                    className="max-h-full max-w-[180px]"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center px-8 text-center">
                <p className="max-w-[28ch] text-sm text-muted-foreground">
                  {t("upload.previewEmpty")}
                </p>
              </div>
            )}
          </div>
          <div className="stage-caption">
            <span className="stage-caption-line" />
            {t("studio.dragHint")}
          </div>
        </div>

        <div className="space-y-4">
          <PagePanel className="space-y-4">
            <h2 className="panel-title">{t("upload.textureInfo")}</h2>
            <div className="space-y-2">
              <Label htmlFor="textureName">{t("upload.textureName")}</Label>
              <Input
                id="textureName"
                placeholder={t("upload.textureNamePlaceholder")}
                value={textureName}
                onChange={(event) => setTextureName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("upload.textureType")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={textureType === "skin" ? "default" : "outline"}
                  className="justify-start"
                  disabled={isUploading || isApplying}
                  onClick={() => changeTextureType("skin")}
                >
                  <Shirt className="size-4" />
                  {t("closet.skin")}
                </Button>
                <Button
                  type="button"
                  variant={textureType === "cape" ? "default" : "outline"}
                  className="justify-start"
                  disabled={isUploading || isApplying}
                  onClick={() => changeTextureType("cape")}
                >
                  <Crown className="size-4" />
                  {t("closet.cape")}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("upload.selectPlayer")}</Label>
              {players.length === 0 && !playersLoading ? (
                <EmptyState
                  title={t("closet.emptyPlayers")}
                  description={t("upload.noPlayersHint")}
                  action={{ label: t("closet.createPlayer"), href: "/user/players" }}
                />
              ) : (
                <PlayerSelect
                  players={players}
                  value={selectedPlayer}
                  onValueChange={setSelectedPlayer}
                  placeholder={t("upload.selectPlayerPlaceholder")}
                  isLoading={playersLoading}
                />
              )}
              <p className="text-xs text-muted-foreground">{t("upload.applyHint")}</p>
            </div>
          </PagePanel>

          <PagePanel className="space-y-4">
            <h2 className="panel-title">{t("upload.uploadFile")}</h2>
            <TextureUpload
              key={textureType}
              onUpload={handleUpload}
              onReset={() => {
                setUploadedTexture(null)
                setLocalPreview(null)
              }}
              onFileChange={(_file, preview) => setLocalPreview(preview)}
              rateLimitError={rateLimitError}
            />
            {uploadedTexture?.type === textureType && selectedPlayer ? (
              <Button className="w-full" onClick={() => void handleApplyTexture()} disabled={isApplying}>
                {isApplying
                  ? t("upload.applying")
                  : t(textureType === "skin" ? "upload.applySkin" : "upload.applyCape")}
              </Button>
            ) : null}
            {uploadedTexture && !selectedPlayer ? (
              <Button variant="outline" className="w-full" asChild>
                <Link href="/user/players">
                  <Users className="size-4" />
                  {t("closet.createPlayer")}
                </Link>
              </Button>
            ) : null}
          </PagePanel>

          <PagePanel>
            <h3 className="panel-title mb-3">{t("upload.notesTitle")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("upload.notesSkinSize")}</li>
              <li>{t("upload.notesCapeSize")}</li>
              <li>{t("upload.notesFormat")}</li>
              <li>{t("upload.notesLimit")}</li>
            </ul>
          </PagePanel>
        </div>
      </div>
    </PageStack>
  )
}
