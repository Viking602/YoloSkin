"use client"

import { useEffect, useMemo, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PlayerSelect, type Player } from "@/components/player-select"
import { TextureUpload } from "@/components/texture-upload"
import { Button } from "@/components/ui/button"
import { Shirt, Crown } from "lucide-react"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type UploadResult = {
  tid: number
  hash: string
  url: string
}

export default function UploadPage() {
  const { t } = useI18n()
  const [players, setPlayers] = useState<Player[]>([])
  const [playersLoading, setPlayersLoading] = useState(true)
  const [textureName, setTextureName] = useState("")
  const [textureType, setTextureType] = useState<"skin" | "cape">("skin")
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [isApplying, setIsApplying] = useState(false)
  const [uploadedTexture, setUploadedTexture] = useState<UploadResult | null>(null)
  const [rateLimitError, setRateLimitError] = useState(false)

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

    fetchPlayers()
  }, [])

  const selectedPlayerId = useMemo(() => {
    if (!selectedPlayer) return null
    const value = Number(selectedPlayer)
    return Number.isNaN(value) ? null : value
  }, [selectedPlayer])

  const handleUpload = async (file: File) => {
    const response = await api.uploadTexture({
      name: textureName.trim() || file.name,
      type: textureType,
      file,
      public: false,
    })

    if (response.code !== 0) {
      if (response.message.includes("429")) {
        setRateLimitError(true)
      }
      throw new Error(response.message || t("upload.errors.uploadFailed"))
    }

    const result = {
      tid: response.data.tid,
      hash: response.data.hash,
      url: `/textures/${response.data.hash}`,
    }

    setUploadedTexture(result)
    return result
  }

  const handleApplyTexture = async () => {
    if (!uploadedTexture || !selectedPlayerId) return
    
    setIsApplying(true)
    try {
      const playerResponse = await api.getPlayer(selectedPlayerId)
      const currentPlayer = playerResponse.data
      await api.updatePlayer(selectedPlayerId, {
        tid_skin: textureType === "skin" ? uploadedTexture.tid : currentPlayer.tid_skin,
        tid_cape: textureType === "cape" ? uploadedTexture.tid : currentPlayer.tid_cape,
      })
      toast.success(t("common.success"))
    } catch {
      toast.error(t("upload.errors.applyFailed"))
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("upload.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("upload.description")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 上传表单 */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("upload.textureInfo")}</h2>
            
            <div className="space-y-2">
              <Label htmlFor="textureName">{t("upload.textureName")}</Label>
              <Input
                id="textureName"
                placeholder={t("upload.textureNamePlaceholder")}
                value={textureName}
                onChange={(e) => setTextureName(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("upload.textureType")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={textureType === "skin" ? "default" : "outline"}
                  className="gap-2 justify-start"
                  onClick={() => setTextureType("skin")}
                >
                  <Shirt className="w-4 h-4" />
                  {t("closet.skin")}
                </Button>
                <Button
                  type="button"
                  variant={textureType === "cape" ? "default" : "outline"}
                  className="gap-2 justify-start"
                  onClick={() => setTextureType("cape")}
                >
                  <Crown className="w-4 h-4" />
                  {t("closet.cape")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("upload.selectPlayer")}</Label>
              <PlayerSelect
                players={players}
                value={selectedPlayer}
                onValueChange={setSelectedPlayer}
                placeholder={t("upload.selectPlayerPlaceholder")}
                isLoading={playersLoading}
              />
              <p className="text-xs text-muted-foreground">
                {t("upload.applyHint")}
              </p>
            </div>
          </div>

          {/* 应用按钮 */}
          {uploadedTexture && selectedPlayer && (
            <Button
              className="w-full"
              onClick={handleApplyTexture}
              disabled={isApplying}
            >
              {isApplying ? t("upload.applying") : t(textureType === "skin" ? "upload.applySkin" : "upload.applyCape")}
            </Button>
          )}
        </div>

        {/* 上传区域 */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("upload.uploadFile")}</h2>
          <TextureUpload
            onUpload={handleUpload}
            rateLimitError={rateLimitError}
          />

          {/* 说明 */}
          <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
            <h3 className="text-sm font-medium text-foreground">{t("upload.notesTitle")}</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- {t("upload.notesSkinSize")}</li>
              <li>- {t("upload.notesCapeSize")}</li>
              <li>- {t("upload.notesFormat")}</li>
              <li>- {t("upload.notesLimit")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
