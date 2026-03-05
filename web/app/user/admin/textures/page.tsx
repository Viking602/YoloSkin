"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Eye, EyeOff, Copy, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { api, type Texture } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type TextureRow = Texture & { [key: string]: unknown }

export default function AdminTexturesPage() {
  const { t, locale } = useI18n()
  const [textures, setTextures] = useState<TextureRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  useEffect(() => {
    handleRefresh()
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const response = await api.adminListTextures()
      setTextures(response.data.items.map((item) => ({ ...item })))
    } catch {
      toast.error(t("common.loadFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  const columns: Column<TextureRow>[] = [
    {
      key: "tid",
      header: "TID",
      sortable: true,
      width: "80px",
    },
    {
      key: "name",
      header: t("texturesAdmin.name"),
      sortable: true,
      render: (_, row) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: "type",
      header: t("texturesAdmin.type"),
      render: (value) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
            value === "skin"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "bg-purple-600/20 text-purple-400 border border-purple-500/30"
          }`}
        >
            {value === "skin" ? t("closet.skin") : t("closet.cape")}
        </span>
      ),
    },
    {
      key: "hash",
      header: "Hash",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-secondary px-2 py-1 rounded">
            {row.hash.slice(0, 8)}...{row.hash.slice(-8)}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleCopyHash(row.hash)}
          >
            {copiedHash === row.hash ? (
              <CheckCircle className="w-3 h-3 text-primary" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      ),
    },
    {
      key: "size",
      header: t("texturesAdmin.size"),
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatSize(value as number)}
        </span>
      ),
    },
    {
      key: "public",
      header: t("texturesAdmin.public"),
      render: (value) =>
        value ? (
          <div className="flex items-center gap-1 text-primary">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{t("common.yes")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm">{t("common.no")}</span>
          </div>
        ),
    },
    {
      key: "upload_at",
      header: t("texturesAdmin.uploadAt"),
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
          <h1 className="text-2xl font-bold text-foreground">{t("texturesAdmin.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("texturesAdmin.description")}
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
          <div className="text-2xl font-bold text-foreground">{textures.length}</div>
          <div className="text-sm text-muted-foreground">{t("adminTextures.total")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-primary">
            {textures.filter((t) => t.type === "skin").length}
          </div>
          <div className="text-sm text-muted-foreground">{t("closet.skin")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-accent">
            {textures.filter((t) => t.type === "cape").length}
          </div>
          <div className="text-sm text-muted-foreground">{t("closet.cape")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">
            {formatSize(textures.reduce((sum, t) => sum + t.size, 0))}
          </div>
          <div className="text-sm text-muted-foreground">{t("adminTextures.totalSize")}</div>
        </div>
      </div>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={textures}
        isLoading={isLoading}
        onRetry={handleRefresh}
        emptyMessage={t("adminTextures.empty")}
        searchable
        searchPlaceholder={t("texturesAdmin.searchPlaceholder")}
        searchKeys={["name", "hash"]}
      />
    </div>
  )
}
