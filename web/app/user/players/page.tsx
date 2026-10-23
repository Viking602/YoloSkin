"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
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
  DialogTrigger
} from "@/components/ui/dialog"
import { DataTable, type Column } from "@/components/data-table"
import { CopyButton } from "@/components/copy-button"
import { PageHeader, PagePanel, PageStack } from "@/components/page-header"
import { api, type Player } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type PlayerRow = Player & { [key: string]: unknown }

export default function PlayersPage() {
  const { translations: t } = useI18n()
  const { t: translate } = useI18n()
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

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
    void fetchPlayers()
  }, [fetchPlayers])

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
      toast.success(t.common.success)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    } finally {
      setIsCreating(false)
    }
  }

  const columns: Column<PlayerRow>[] = [
    {
      key: "pid",
      header: "PID",
      sortable: true,
      width: "80px"
    },
    {
      key: "player_name",
      header: t.players.playerName,
      sortable: true,
      render: (_, row) => (
        <span className="font-medium text-foreground">{row.player_name}</span>
      )
    },
    {
      key: "uuid",
      header: t.players.uuid,
      render: (_, row) => (
        <div className="flex min-w-0 items-center gap-2">
          <code className="max-w-[14rem] truncate rounded-lg border border-border bg-muted px-2 py-1 font-mono text-xs">
            {row.uuid}
          </code>
          <CopyButton value={row.uuid} label={translate("common.copyUuid")} />
        </div>
      )
    },
    {
      key: "tid_skin",
      header: t.players.skinTid,
      render: (value) =>
        value ? (
          <span className="badge-skin">{t.common.set}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t.common.notSet}</span>
        )
    },
    {
      key: "tid_cape",
      header: t.players.capeTid,
      render: (value) =>
        value ? (
          <span className="badge-cape">{t.common.set}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t.common.notSet}</span>
        )
    }
  ]

  return (
    <PageStack>
      <PageHeader
        title={t.players.title}
        description={t.players.description}
        actions={
          <>
            <Button variant="outline" onClick={() => void fetchPlayers()} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              {t.common.refresh}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {t.players.create}
                </Button>
              </DialogTrigger>
              <DialogContent className="page-panel">
                <DialogHeader>
                  <DialogTitle>{t.players.createNew}</DialogTitle>
                  <DialogDescription>{t.players.createDescription}</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="playerName">{t.players.playerName}</Label>
                  <Input
                    id="playerName"
                    placeholder={t.players.namePlaceholder}
                    value={newPlayerName}
                    onChange={(event) => setNewPlayerName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && newPlayerName.trim()) void handleCreate()
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{t.players.nameHint}</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button onClick={() => void handleCreate()} disabled={isCreating || !newPlayerName.trim()}>
                    {isCreating ? t.common.creating : t.common.create}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="stat-card">
          <strong className="tabular-nums">{players.length}</strong>
          <span>{translate("units.players")}</span>
        </div>
        <div className="stat-card">
          <strong className="tabular-nums">
            {players.filter((player) => player.tid_skin).length}
          </strong>
          <span>{t.players.skinTid}</span>
        </div>
        <div className="stat-card">
          <strong className="tabular-nums">
            {players.filter((player) => player.tid_cape).length}
          </strong>
          <span>{t.players.capeTid}</span>
        </div>
      </div>

      <PagePanel>
        <DataTable
          columns={columns}
          data={players}
          isLoading={isLoading}
          onRetry={() => void fetchPlayers()}
          emptyMessage={t.players.empty}
          emptyAction={{
            label: t.players.createFirst,
            onClick: () => setIsCreateDialogOpen(true)
          }}
          searchable
          searchPlaceholder={t.players.searchPlaceholder}
          searchKeys={["player_name", "uuid"]}
        />
      </PagePanel>
    </PageStack>
  )
}
