"use client"

import { useEffect, useState } from "react"
import { RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { api, type User } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type UserRow = User & { [key: string]: unknown }

const permissionLabels: Record<number, { labelKey: string; variant: "default" | "secondary" | "destructive" }> = {
  0: { labelKey: "users.permissionUser", variant: "secondary" },
  1: { labelKey: "adminUsers.vip", variant: "default" },
  2: { labelKey: "users.permissionAdmin", variant: "destructive" },
}

export default function AdminUsersPage() {
  const { t, locale } = useI18n()
  const [users, setUsers] = useState<UserRow[]>([])
  const [stats, setStats] = useState({
    total_users: 0,
    verified_users: 0,
    vip_users: 0,
    admin_users: 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    handleRefresh()
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const [usersResponse, statsResponse] = await Promise.all([
        api.adminListUsers(),
        api.adminUsersStats(),
      ])

      setUsers(usersResponse.data.items.map((item) => ({ ...item })))
      setStats({
        total_users: statsResponse.data.total_users,
        verified_users: statsResponse.data.verified_users,
        vip_users: statsResponse.data.vip_users,
        admin_users: statsResponse.data.admin_users,
      })
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

  const columns: Column<UserRow>[] = [
    {
      key: "uid",
      header: "UID",
      sortable: true,
      width: "80px",
    },
    {
      key: "email",
      header: t("users.email"),
      sortable: true,
      render: (_, row) => (
        <span className="font-medium text-foreground">{row.email}</span>
      ),
    },
    {
      key: "nickname",
      header: t("users.nickname"),
      sortable: true,
    },
    {
      key: "permission",
      header: t("users.permission"),
      render: (value) => {
        const perm = permissionLabels[value as number] || permissionLabels[0]
        return <Badge variant={perm.variant}>{t(perm.labelKey)}</Badge>
      },
    },
    {
      key: "verified",
      header: t("users.verified"),
      render: (value) =>
        value ? (
          <div className="flex items-center gap-1 text-primary">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{t("common.yes")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">{t("common.no")}</span>
          </div>
        ),
    },
    {
      key: "register_at",
      header: t("users.registerAt"),
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
          <h1 className="text-2xl font-bold text-foreground">{t("users.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("users.description")}
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
          <div className="text-2xl font-bold text-foreground">{stats.total_users}</div>
          <div className="text-sm text-muted-foreground">{t("adminUsers.totalUsers")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-primary">{stats.verified_users}</div>
          <div className="text-sm text-muted-foreground">{t("users.verified")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-accent">{stats.vip_users}</div>
          <div className="text-sm text-muted-foreground">{t("adminUsers.vipUsers")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-destructive">{stats.admin_users}</div>
          <div className="text-sm text-muted-foreground">{t("adminUsers.adminUsers")}</div>
        </div>
      </div>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        onRetry={handleRefresh}
        emptyMessage={t("adminUsers.empty")}
        searchable
        searchPlaceholder={t("users.searchPlaceholder")}
        searchKeys={["email", "nickname"]}
      />
    </div>
  )
}
