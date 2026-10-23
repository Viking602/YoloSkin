"use client"

import { useEffect, useState } from "react"
import { RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { api, type User } from "@/lib/api"
import { PageHeader, PagePanel, PageStack } from "@/components/page-header"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type UserRow = User & { [key: string]: unknown }

const permissionLabels = {
  0: { labelKey: "users.permissionUser", variant: "secondary" },
  1: { labelKey: "adminUsers.vip", variant: "default" },
  2: { labelKey: "users.permissionAdmin", variant: "destructive" },
} satisfies Record<number, { labelKey: string; variant: "default" | "secondary" | "destructive" }>

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
        const permission = Number(value)
        const perm = permission === 1 || permission === 2 ? permissionLabels[permission] : permissionLabels[0]
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
    <PageStack>
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
        actions={
          <Button variant="outline" onClick={() => void handleRefresh()} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
        }
      />
      <div className="stat-grid">
        <div className="stat-card">
          <strong className="tabular-nums">{stats.total_users}</strong>
          <span>{t("adminUsers.totalUsers")}</span>
        </div>
        <div className="stat-card">
          <strong className="tabular-nums">{stats.verified_users}</strong>
          <span>{t("users.verified")}</span>
        </div>
        <div className="stat-card">
          <strong className="tabular-nums">{stats.vip_users}</strong>
          <span>{t("adminUsers.vipUsers")}</span>
        </div>
        <div className="stat-card">
          <strong className="tabular-nums">{stats.admin_users}</strong>
          <span>{t("adminUsers.adminUsers")}</span>
        </div>
      </div>
      <PagePanel>
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
      </PagePanel>
    </PageStack>
  )
}
