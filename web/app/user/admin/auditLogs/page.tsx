"use client"

import { useEffect, useState } from "react"
import { RefreshCw, User, Shield, Upload, Key, LogIn, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { api, type AuditLog } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type AuditLogRow = AuditLog & { [key: string]: unknown }

const actionIcons: Record<string, typeof User> = {
  "user.login": LogIn,
  "user.logout": LogIn,
  "texture.upload": Upload,
  "texture.delete": Trash2,
  "player.create": User,
  "admin.user.update": Shield,
}

const actionLabels: Record<string, { labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "user.login": { labelKey: "auditActions.userLogin", variant: "default" },
  "user.logout": { labelKey: "auditActions.userLogout", variant: "secondary" },
  "texture.upload": { labelKey: "auditActions.textureUpload", variant: "default" },
  "texture.delete": { labelKey: "auditActions.textureDelete", variant: "destructive" },
  "player.create": { labelKey: "auditActions.playerCreate", variant: "default" },
  "admin.user.update": { labelKey: "auditActions.adminUserUpdate", variant: "destructive" },
}

export default function AdminAuditLogsPage() {
  const { t, locale } = useI18n()
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    handleRefresh()
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const response = await api.adminListAuditLogs()
      setLogs(response.data.items.map((item) => ({ ...item })))
    } catch {
      toast.error(t("common.loadFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const columns: Column<AuditLogRow>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      width: "80px",
    },
    {
      key: "user_id",
      header: t("adminAudit.userId"),
      sortable: true,
      width: "100px",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="font-medium text-foreground">{value ? (value as number) : "-"}</span>
        </div>
      ),
    },
    {
      key: "action",
      header: t("auditLogs.action"),
      render: (value) => {
        const action = actionLabels[value as string] || { labelKey: "auditActions.unknown", variant: "outline" as const }
        const Icon = actionIcons[value as string] || Key
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <Badge variant={action.variant}>{action.labelKey === "auditActions.unknown" ? String(value) : t(action.labelKey)}</Badge>
          </div>
        )
      },
    },
    {
      key: "details",
      header: t("auditLogs.details"),
      render: (value) => {
        const details = value as string
        if (!details) return <span className="text-muted-foreground">-</span>

        if (typeof details === "object") {
          const entries = Object.entries(details as Record<string, unknown>)
          if (entries.length === 0) return <span className="text-muted-foreground">-</span>
          return (
            <code className="text-xs bg-secondary px-2 py-1 rounded max-w-[200px] truncate block">
              {entries.map(([key, val]) => `${key}: ${String(val)}`).join(", ")}
            </code>
          )
        }

        try {
          const parsed = JSON.parse(details as string)
          const keys = Object.keys(parsed)
          if (keys.length === 0) return <span className="text-muted-foreground">-</span>
          return (
            <code className="text-xs bg-secondary px-2 py-1 rounded max-w-[200px] truncate block">
              {keys.map((k) => `${k}: ${parsed[k]}`).join(", ")}
            </code>
          )
        } catch {
          return <code className="text-xs bg-secondary px-2 py-1 rounded">{details as string}</code>
        }
      },
    },
    {
      key: "ip",
      header: t("auditLogs.ip"),
      render: (value) => (
        <code className="text-sm text-muted-foreground">{value as string}</code>
      ),
    },
    {
      key: "created_at",
      header: t("auditLogs.time"),
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value as string)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("auditLogs.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("adminAudit.description")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-2 bg-transparent"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">{logs.length}</div>
          <div className="text-sm text-muted-foreground">{t("adminAudit.total")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-primary">
            {logs.filter((l) => l.action.startsWith("user.")).length}
          </div>
          <div className="text-sm text-muted-foreground">{t("adminAudit.userOps")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-accent">
            {logs.filter((l) => l.action.startsWith("texture.")).length}
          </div>
          <div className="text-sm text-muted-foreground">{t("adminAudit.textureOps")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-destructive">
            {logs.filter((l) => l.action.startsWith("admin.")).length}
          </div>
          <div className="text-sm text-muted-foreground">{t("adminAudit.adminOps")}</div>
        </div>
      </div>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        onRetry={handleRefresh}
        emptyMessage={t("adminAudit.empty")}
        searchable
        searchPlaceholder={t("auditLogs.searchPlaceholder")}
        searchKeys={["action", "ip", "details"]}
      />
    </div>
  )
}
