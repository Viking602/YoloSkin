"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check, Upload, Users } from "lucide-react"
import { PlayerSelect, type Player } from "@/components/player-select"
import { ViewerPanel } from "@/components/viewer-panel"
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views"
import { Count, PageHeader, PagePanel, PageStack } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api, type Texture } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type TextureRow = Texture & { preview: string; texture: string }

export default function ClosetPage() {
  const { t } = useI18n()
  const [players, setPlayers] = useState<Player[]>([])
  const [textures, setTextures] = useState<TextureRow[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedSkinTid, setSelectedSkinTid] = useState<number | null>(null)
  const [selectedCapeTid, setSelectedCapeTid] = useState<number | null>(null)
  const [previewSkinUrl, setPreviewSkinUrl] = useState<string | null>(null)
  const [previewCapeUrl, setPreviewCapeUrl] = useState<string | null>(null)

  const selectedPlayerData = players.find((player) => String(player.pid) === selectedPlayer)
  const skins = textures.filter((texture) => texture.type === "skin")
  const capes = textures.filter((texture) => texture.type === "cape")
  const selectedSkin = skins.find((skin) => skin.tid === selectedSkinTid)
  const selectedCape = capes.find((cape) => cape.tid === selectedCapeTid)

  const fetchInitialData = async () => {
    setPageLoading(true)
    setPageError(false)
    try {
      const [playersResponse, texturesResponse] = await Promise.all([
        api.listPlayers(),
        api.listTextures({ page: 1, pageSize: 200 })
      ])
      setPlayers(playersResponse.data)
      setTextures(
        texturesResponse.data.items.map((item) => ({
          ...item,
          preview: `/textures/${item.hash}`,
          texture: `/textures/${item.hash}`
        }))
      )
    } catch {
      setPageError(true)
      toast.error(t("closet.errors.loadCloset"))
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    void fetchInitialData()
  }, [])

  useEffect(() => {
    if (!selectedPlayerData) {
      setSelectedSkinTid(null)
      setSelectedCapeTid(null)
      setPreviewSkinUrl(null)
      setPreviewCapeUrl(null)
      return
    }

    const loadPlayerTextures = async () => {
      try {
        const response = await api.getPlayer(selectedPlayerData.pid)
        const playerTexture = response.data
        setSelectedSkinTid(playerTexture.tid_skin || null)
        setSelectedCapeTid(playerTexture.tid_cape || null)
        const skin = textures.find((texture) => texture.tid === playerTexture.tid_skin)
        const cape = textures.find((texture) => texture.tid === playerTexture.tid_cape)
        setPreviewSkinUrl(skin?.texture || null)
        setPreviewCapeUrl(cape?.texture || null)
      } catch {
        toast.error(t("closet.errors.loadPlayerTextures"))
      }
    }

    void loadPlayerTextures()
  }, [selectedPlayerData, textures, t])

  const handleSelectSkin = (texture: TextureRow) => {
    setSelectedSkinTid(texture.tid)
    setPreviewSkinUrl(texture.texture)
  }

  const handleSelectCape = (texture: TextureRow) => {
    setSelectedCapeTid(texture.tid)
    setPreviewCapeUrl(texture.texture)
  }

  const handleUse = async () => {
    if (!selectedPlayerData) return
    try {
      setIsApplying(true)
      await api.updatePlayer(selectedPlayerData.pid, {
        tid_skin: selectedSkinTid,
        tid_cape: selectedCapeTid
      })
      toast.success(t("closet.applied"))
    } catch {
      toast.error(t("closet.errors.applyFailed"))
    } finally {
      setIsApplying(false)
    }
  }

  const handleReset = () => {
    if (!selectedPlayerData) return
    const load = async () => {
      try {
        const response = await api.getPlayer(selectedPlayerData.pid)
        setSelectedSkinTid(response.data.tid_skin || null)
        setSelectedCapeTid(response.data.tid_cape || null)
        const skin = textures.find((texture) => texture.tid === response.data.tid_skin)
        const cape = textures.find((texture) => texture.tid === response.data.tid_cape)
        setPreviewSkinUrl(skin?.texture || null)
        setPreviewCapeUrl(cape?.texture || null)
      } catch {
        toast.error(t("closet.errors.resetFailed"))
      }
    }
    void load()
  }

  const currentSkinIndex = skins.findIndex((skin) => skin.tid === selectedSkinTid)
  const handlePrevSkin = () => {
    if (currentSkinIndex > 0) {
      const skin = skins[currentSkinIndex - 1]
      if (skin) handleSelectSkin(skin)
    }
  }
  const handleNextSkin = () => {
    if (currentSkinIndex < skins.length - 1) {
      const skin = skins[currentSkinIndex + 1]
      if (skin) handleSelectSkin(skin)
    }
  }

  if (pageLoading) {
    return <LoadingState title={t("closet.title")} description={t("state.loading")} />
  }

  if (pageError) {
    return (
      <ErrorState
        title={t("closet.errors.loadCloset")}
        action={{ label: t("common.retry"), onClick: () => void fetchInitialData() }}
      />
    )
  }

  return (
    <PageStack>
      <PageHeader
        title={t("closet.title")}
        description={t("closet.description")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/user/players">
                <Users className="size-4" />
                {t("closet.switchPlayer")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/user/upload">
                <Upload className="size-4" />
                {t("closet.uploadSkinCta")}
              </Link>
            </Button>
          </>
        }
      />

      {players.length === 0 ? (
        <PagePanel>
          <EmptyState
            title={t("closet.emptyPlayers")}
            description={t("closet.emptyPlayersHint")}
            action={{ label: t("closet.createPlayer"), href: "/user/players" }}
          />
        </PagePanel>
      ) : (
        <div className="page-hero">
          <div>
            {!selectedPlayer ? (
              <PagePanel>
                <EmptyState
                  title={t("closet.choosePlayer")}
                  description={t("closet.choosePlayerHint")}
                />
              </PagePanel>
            ) : (
              <ViewerPanel
                skinUrl={previewSkinUrl}
                capeUrl={previewCapeUrl}
                isLoading={isApplying}
                playerName={selectedPlayerData?.player_name}
                skinName={selectedSkin?.name}
                capeName={selectedCape?.name}
                onUse={handleUse}
                onReset={handleReset}
                onPrev={handlePrevSkin}
                onNext={handleNextSkin}
                hasPrev={currentSkinIndex > 0}
                hasNext={currentSkinIndex < skins.length - 1}
              />
            )}
          </div>

          <div className="space-y-4">
            <PagePanel>
              <Label className="panel-title mb-3 block">{t("closet.selectPlayer")}</Label>
              <PlayerSelect
                players={players}
                value={selectedPlayer}
                onValueChange={setSelectedPlayer}
                placeholder={t("closet.selectPlayerPlaceholder")}
              />
            </PagePanel>

            {selectedPlayer ? (
              <PagePanel padded={false}>
                <Tabs defaultValue="skins" className="w-full gap-0">
                  <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b border-border bg-transparent p-0">
                    <TabsTrigger
                      value="skins"
                      className="rounded-none border-0 border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <Count value={skins.length} unit={t("units.skins")} />
                    </TabsTrigger>
                    <TabsTrigger
                      value="capes"
                      className="rounded-none border-0 border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <Count value={capes.length} unit={t("units.capes")} />
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="skins" className="mt-0">
                    <ScrollArea className="h-[280px]">
                      {skins.length === 0 ? (
                        <EmptyState
                          title={t("closet.noSkins")}
                          description={t("closet.emptySkinsHint")}
                          action={{ label: t("closet.goUpload"), href: "/user/upload" }}
                        />
                      ) : (
                        <div className="texture-grid p-3">
                          {skins.map((skin) => (
                            <button
                              key={skin.tid}
                              type="button"
                              onClick={() => handleSelectSkin(skin)}
                              className="texture-tile"
                              data-selected={selectedSkinTid === skin.tid}
                              aria-pressed={selectedSkinTid === skin.tid}
                              aria-label={skin.name}
                            >
                              <Image
                                src={skin.preview || "/placeholder.svg"}
                                alt={skin.name}
                                fill
                                className="object-cover"
                                style={{ imageRendering: "pixelated" }}
                              />
                              {selectedSkinTid === skin.tid && (
                                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="size-3" />
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="capes" className="mt-0">
                    <ScrollArea className="h-[280px]">
                      {capes.length === 0 ? (
                        <EmptyState
                          title={t("closet.noCapes")}
                          description={t("closet.goUpload")}
                          action={{ label: t("closet.goUpload"), href: "/user/upload" }}
                        />
                      ) : (
                        <div className="texture-grid p-3">
                          {capes.map((cape) => (
                            <button
                              key={cape.tid}
                              type="button"
                              onClick={() => handleSelectCape(cape)}
                              className="texture-tile"
                              data-selected={selectedCapeTid === cape.tid}
                              aria-pressed={selectedCapeTid === cape.tid}
                              aria-label={cape.name}
                            >
                              <Image
                                src={cape.preview || "/placeholder.svg"}
                                alt={cape.name}
                                fill
                                className="object-cover"
                                style={{ imageRendering: "pixelated" }}
                              />
                              {selectedCapeTid === cape.tid && (
                                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="size-3" />
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </PagePanel>
            ) : null}

            {selectedPlayer ? (
              <PagePanel>
                <h2 className="panel-title mb-3">{t("closet.currentSelection")}</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("closet.skin")}</dt>
                    <dd>{selectedSkin?.name || t("common.notSet")}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("closet.cape")}</dt>
                    <dd>{selectedCape?.name || t("common.notSet")}</dd>
                  </div>
                </dl>
              </PagePanel>
            ) : null}
          </div>
        </div>
      )}
    </PageStack>
  )
}
