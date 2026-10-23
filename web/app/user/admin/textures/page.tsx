"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { api, type Texture } from "@/lib/api"
import { CopyButton } from "@/components/copy-button"
import { Count, PageHeader, PagePanel, PageStack } from "@/components/page-header"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type TextureRow = Texture & { [key: string]: unknown }

export default function AdminTexturesPage() {
  const { t, locale } = useI18n()
  const [textures, setTextures] = useState<TextureRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
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
        <span className={value === "skin" ? "badge-skin" : "badge-cape"}>
          {value === "skin" ? t("closet.skin") : t("closet.cape")}
        </span>
      ),
    },
    {
      key: "hash",
      header: "Hash",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <code className="rounded bg-secondary px-2 py-1 text-xs">
            {row.hash.slice(0, 8)}-{row.hash.slice(-8)}
          </code>
          <CopyButton value={row.hash} label={t("common.copyHash")} />
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
    <PageStack>
      <PageHeader
        title={t("texturesAdmin.title")}
        description={t("texturesAdmin.description")}
        actions={
          <Button variant="outline" onClick={() => void handleRefresh()} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
        }
      />
      <div className="stat-grid">
        <div className="stat-card">
          <strong>
            <Count value={textures.length} unit={t("units.textures")} />
          </strong>
          <span>{t("adminTextures.total")}</span>
        </div>
        <div className="stat-card">
          <strong>
            <Count value={textures.filter((item) => item.type === "skin").length} unit={t("units.skins")} />
          </strong>
          <span>{t("closet.skin")}</span>
        </div>
        <div className="stat-card">
          <strong>
            <Count value={textures.filter((item) => item.type === "cape").length} unit={t("units.capes")} />
          </strong>
          <span>{t("closet.cape")}</span>
        </div>
        <div className="stat-card">
          <strong>{formatSize(textures.reduce((sum, item) => sum + item.size, 0))}</strong>
          <span>{t("adminTextures.totalSize")}</span>
        </div>
      </div>
      <PagePanel>
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
      </PagePanel>
    </PageStack>
  )
}
