"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, RefreshCw, Copy, CheckCircle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DataTable, type Column } from "@/components/data-table"
import { api, type Player } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type PlayerRow = Player & { [key: string]: unknown }

export default function PlayersPage() {
  const { translations: t } = useI18n()
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await api.listPlayers()
      setPlayers(response.data.map((item) => ({ ...item })))
    } catch {
      toast.error(t.common.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handleRefresh = () => {
    fetchPlayers()
  }

  const handleCreate = async () => {
    if (!newPlayerName.trim()) return
    setIsCreating(true)
    try {
      const response = await api.createPlayer({ player_name: newPlayerName })
      if (response.code !== 0) {
        toast.error(response.message || t.common.error)
        return
      }
      setPlayers([...players, { ...response.data }])
      setNewPlayerName("")
      setIsCreateDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyUuid = async (uuid: string) => {
    await navigator.clipboard.writeText(uuid)
    setCopiedUuid(uuid)
    setTimeout(() => setCopiedUuid(null), 2000)
  }

  const columns: Column<PlayerRow>[] = [
    {
      key: "pid",
      header: "PID",
      sortable: true,
      width: "80px",
    },
    {
      key: "player_name",
      header: t.players.playerName,
      sortable: true,
      render: (_, row) => (
        <span className="font-medium text-foreground">{row.player_name}</span>
      ),
    },
    {
      key: "uuid",
      header: "UUID",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded-lg border border-border font-mono">
            {row.uuid.slice(0, 8)}...{row.uuid.slice(-8)}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleCopyUuid(row.uuid)}
          >
            {copiedUuid === row.uuid ? (
              <CheckCircle className="w-3 h-3 text-primary" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      ),
    },
    {
      key: "tid_skin",
      header: t.players.skinTid,
      render: (value) =>
        value ? (
          <span className="badge-skin">{t.common.set}</span>
        ) : (
          <span className="text-muted-foreground text-sm">{t.common.notSet}</span>
        ),
    },
    {
      key: "tid_cape",
      header: t.players.capeTid,
      render: (value) =>
        value ? (
          <span className="badge-cape">{t.common.set}</span>
        ) : (
          <span className="text-muted-foreground text-sm">{t.common.notSet}</span>
        ),
    },
  ]

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.nav.players}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t.players.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2 bg-transparent border-2 h-10 px-4"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {t.common.refresh}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-10 px-4">
                <Plus className="w-4 h-4" />
                {t.players.create}
              </Button>
            </DialogTrigger>
            <DialogContent className="mc-card">
              <DialogHeader>
                <DialogTitle>{t.players.createNew}</DialogTitle>
                <DialogDescription>
                  {t.players.createDescription}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="playerName">{t.players.playerName}</Label>
                  <Input
                    id="playerName"
                    placeholder={t.players.namePlaceholder}
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="bg-input border-2 border-border rounded-lg h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.players.nameHint}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="bg-transparent border-2"
                >
                  {t.common.cancel}
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || !newPlayerName.trim()}>
                  {isCreating ? t.common.creating : t.common.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 创建角色卡片 */}
      <div className="mc-card p-8">
        <h3 className="font-semibold text-foreground text-lg mb-5">{t.players.quickCreate}</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder={t.players.namePlaceholder}
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="bg-input border-2 border-border rounded-lg h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newPlayerName.trim()) {
                  handleCreate()
                }
              }}
            />
          </div>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || !newPlayerName.trim()}
            className="gap-2 h-11 px-6"
          >
            <Plus className="w-4 h-4" />
            {isCreating ? t.common.creating : t.players.create}
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="mc-card overflow-hidden p-6">
        <DataTable
          columns={columns}
          data={players}
          isLoading={isLoading}
          onRetry={handleRefresh}
          emptyMessage={t.players.empty}
          emptyAction={{
            label: t.players.createFirst,
            onClick: () => setIsCreateDialogOpen(true),
          }}
          searchable
          searchPlaceholder={t.players.searchPlaceholder}
          searchKeys={["player_name", "uuid"]}
        />
      </div>
    </div>
  )
}
