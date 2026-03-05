"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { PlayerSelect, type Player } from "@/components/player-select"
import { ViewerPanel } from "@/components/viewer-panel"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check } from "lucide-react"
import { api, type Texture } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type TextureRow = Texture & { preview: string; texture: string }

export default function ClosetPage() {
  const { t } = useI18n()
  const [players, setPlayers] = useState<Player[]>([])
  const [textures, setTextures] = useState<TextureRow[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSkinTid, setSelectedSkinTid] = useState<number | null>(null)
  const [selectedCapeTid, setSelectedCapeTid] = useState<number | null>(null)
  const [previewSkinUrl, setPreviewSkinUrl] = useState<string | null>(null)
  const [previewCapeUrl, setPreviewCapeUrl] = useState<string | null>(null)

  const selectedPlayerData = players.find((p) => String(p.pid) === selectedPlayer)
  const skins = textures.filter((t) => t.type === "skin")
  const capes = textures.filter((t) => t.type === "cape")

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      try {
        const [playersResponse, texturesResponse] = await Promise.all([
          api.listPlayers(),
          api.listTextures({ page: 1, pageSize: 200 }),
        ])

        setPlayers(playersResponse.data)
        setTextures(
          texturesResponse.data.items.map((item) => ({
            ...item,
            preview: `/textures/${item.hash}`,
            texture: `/textures/${item.hash}`,
          }))
        )
      } catch {
        toast.error(t("closet.errors.loadCloset"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // 加载玩家当前纹理
  useEffect(() => {
    if (!selectedPlayerData) {
      setSelectedSkinTid(null)
      setSelectedCapeTid(null)
      setPreviewSkinUrl(null)
      setPreviewCapeUrl(null)
      return
    }

    const loadPlayerTextures = async () => {
      setIsLoading(true)
      try {
        const response = await api.getPlayer(selectedPlayerData.pid)
        const playerTexture = response.data
        setSelectedSkinTid(playerTexture.tid_skin || null)
        setSelectedCapeTid(playerTexture.tid_cape || null)

        const skin = textures.find((t) => t.tid === playerTexture.tid_skin)
        const cape = textures.find((t) => t.tid === playerTexture.tid_cape)
        setPreviewSkinUrl(skin?.texture || null)
        setPreviewCapeUrl(cape?.texture || null)
      } catch {
        toast.error(t("closet.errors.loadPlayerTextures"))
      } finally {
        setIsLoading(false)
      }
    }

    loadPlayerTextures()
  }, [selectedPlayerData, textures])

  // 选择皮肤进行预览
  const handleSelectSkin = (texture: TextureRow) => {
    setSelectedSkinTid(texture.tid)
    setPreviewSkinUrl(texture.texture)
  }

  // 选择披风进行预览
  const handleSelectCape = (texture: TextureRow) => {
    setSelectedCapeTid(texture.tid)
    setPreviewCapeUrl(texture.texture)
  }

  // 应用当前选择到玩家
  const handleUse = async () => {
    if (!selectedPlayerData) return
    try {
      setIsLoading(true)
      await api.updatePlayer(selectedPlayerData.pid, {
        tid_skin: selectedSkinTid,
        tid_cape: selectedCapeTid,
      })
    } catch {
      toast.error(t("closet.errors.applyFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  // 重置选择
  const handleReset = () => {
    if (!selectedPlayerData) return

    const load = async () => {
      try {
        setIsLoading(true)
        const response = await api.getPlayer(selectedPlayerData.pid)
        setSelectedSkinTid(response.data.tid_skin || null)
        setSelectedCapeTid(response.data.tid_cape || null)
        const skin = textures.find((t) => t.tid === response.data.tid_skin)
        const cape = textures.find((t) => t.tid === response.data.tid_cape)
        setPreviewSkinUrl(skin?.texture || null)
        setPreviewCapeUrl(cape?.texture || null)
      } catch {
        toast.error(t("closet.errors.resetFailed"))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }

  // 切换到上一个/下一个皮肤
  const currentSkinIndex = skins.findIndex((s) => s.tid === selectedSkinTid)
  const handlePrevSkin = () => {
    if (currentSkinIndex > 0) {
      handleSelectSkin(skins[currentSkinIndex - 1])
    }
  }
  const handleNextSkin = () => {
    if (currentSkinIndex < skins.length - 1) {
      handleSelectSkin(skins[currentSkinIndex + 1])
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("closet.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("closet.description")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] max-w-4xl">
        {/* 左侧选择器 */}
        <div className="space-y-4">
          {/* 玩家选择 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <Label className="text-sm font-medium mb-3 block">{t("closet.selectPlayer")}</Label>
            <PlayerSelect
              players={players}
              value={selectedPlayer}
              onValueChange={setSelectedPlayer}
              placeholder={t("closet.selectPlayerPlaceholder")}
            />
          </div>

          {/* 皮肤/披风选择 */}
          {selectedPlayer && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Tabs defaultValue="skins" className="w-full flex flex-col gap-0">
                <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-2 border-b border-border">
                  <TabsTrigger 
                    value="skins" 
                    className="rounded-none bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4 text-muted-foreground data-[state=active]:text-foreground font-medium"
                  >
                    {t("closet.skin")} ({skins.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="capes"
                    className="rounded-none bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4 text-muted-foreground data-[state=active]:text-foreground font-medium"
                  >
                    {t("closet.cape")} ({capes.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="skins" className="mt-0">
                  <ScrollArea className="h-[280px]">
                    <div className="grid grid-cols-3 gap-2 p-3">
                      {skins.map((skin) => (
                        <button
                          key={skin.tid}
                          onClick={() => handleSelectSkin(skin)}
                          className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105 ${
                            selectedSkinTid === skin.tid
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <Image
                            src={skin.preview || "/placeholder.svg"}
                            alt={skin.name}
                            fill
                            className="object-cover pixelated"
                            style={{ imageRendering: "pixelated" }}
                          />
                          {selectedSkinTid === skin.tid && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="capes" className="mt-0">
                  <ScrollArea className="h-[280px]">
                    {capes.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 p-3">
                        {capes.map((cape) => (
                          <button
                            key={cape.tid}
                            onClick={() => handleSelectCape(cape)}
                            className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105 ${
                              selectedCapeTid === cape.tid
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border hover:border-muted-foreground"
                            }`}
                          >
                            <Image
                              src={cape.preview || "/placeholder.svg"}
                              alt={cape.name}
                              fill
                              className="object-cover"
                              style={{ imageRendering: "pixelated" }}
                            />
                            {selectedCapeTid === cape.tid && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <p className="text-muted-foreground text-sm">{t("closet.noCape")}</p>
                        <p className="text-muted-foreground/70 text-xs mt-1">
                          {t("closet.goUpload")}
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* 当前选择信息 */}
          {selectedPlayer && selectedSkinTid && (
            <div className="rounded-xl bg-secondary/50 p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">{t("closet.currentSelection")}</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("closet.skin")}</span>
                  <span className="text-foreground">
                    {skins.find((s) => s.tid === selectedSkinTid)?.name || t("common.notSet")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("closet.cape")}</span>
                  <span className="text-foreground">
                    {capes.find((c) => c.tid === selectedCapeTid)?.name || t("common.notSet")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧预览 */}
        <div>
          {!selectedPlayer ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <svg viewBox="0 0 64 64" className="w-10 h-10 opacity-30">
                  <rect x="16" y="4" width="32" height="32" fill="currentColor" />
                  <rect x="16" y="36" width="32" height="20" fill="currentColor" />
                </svg>
              </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t("closet.choosePlayer")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t("closet.choosePlayerHint")}
                </p>
            </div>
          ) : (
            <ViewerPanel
              skinUrl={previewSkinUrl}
              capeUrl={previewCapeUrl}
              isLoading={isLoading}
              playerName={selectedPlayerData?.player_name}
              onUse={handleUse}
              onReset={handleReset}
              onPrev={handlePrevSkin}
              onNext={handleNextSkin}
              hasPrev={currentSkinIndex > 0}
              hasNext={currentSkinIndex < skins.length - 1}
            />
          )}
        </div>
      </div>
    </div>
  )
}
