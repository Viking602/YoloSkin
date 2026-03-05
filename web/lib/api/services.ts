/**
 * API 服务层
 * 
 * 所有 API 调用都在这里定义，目前使用 mock 数据。
 * 后端对接时，只需要将 mock 实现替换为真实的 fetch/axios 调用即可。
 * 
 * 命名规范：
 * - get* - 获取单个资源
 * - list* - 获取资源列表
 * - create* - 创建资源
 * - update* - 更新资源
 * - delete* - 删除资源
 */

import type {
  ApiResponse,
  PaginatedResponse,
  CurrentUser,
  User,
  Player,
  CreatePlayerRequest,
  UpdatePlayerRequest,
  Texture,
  UploadTextureRequest,
  ClosetItem,
  PremiumBinding,
  BindPremiumRequest,
  OAuthProviders,
  OAuthStartData,
  AuditLog,
  SiteSettings,
  PublicSiteSettings,
  AdminOAuthSettings,
  UpdateAdminOAuthSettingsRequest,
  AdminUsersStats,
  AdminEmailSettings,
  UpdateAdminEmailSettingsRequest,
  SiteStats,
  UserStats,
} from "./types"

import {
  delay,
  mockCurrentUser,
  mockUsers,
  mockPlayers,
  mockTextures,
  mockClosetItems,
  mockPremiumBinding,
  mockAuditLogs,
  mockSiteSettings,
  mockSiteStats,
  mockUserStats,
} from "./mock-data"

// ============================================
// 配置
// ============================================

const USE_MOCK = false // 切换为 false 使用真实 API
const API_BASE_URL = "/api" // 真实 API 基础路径
function withAuth(headers: HeadersInit = {}): HeadersInit {
  return headers
}

// ============================================
// 认证相关 API
// ============================================

export async function login(email: string, password: string): Promise<ApiResponse<{ token: string; user: CurrentUser }>> {
  if (USE_MOCK) {
    await delay()
    if (email === "admin@example.com" && password === "password") {
      return { code: 0, message: "success", data: { token: "mock-token", user: mockCurrentUser } }
    }
    throw new Error("邮箱或密码错误")
  }
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}

export async function register(email: string, password: string, nickname: string): Promise<ApiResponse<{ token: string; user: CurrentUser }>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: { token: "mock-token", user: { ...mockCurrentUser, email, nickname, is_admin: false } } }
  }
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, nickname }),
  })
  return res.json()
}

export async function forgotPassword(email: string): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay(300)
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/auth/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  return res.json()
}

export async function verifyEmail(token: string): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay(300)
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  return res.json()
}

export async function resetPassword(token: string, password: string): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay(300)
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/auth/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
  return res.json()
}

export async function getOAuthProviders(): Promise<ApiResponse<OAuthProviders>> {
  if (USE_MOCK) {
    await delay(200)
    return { code: 0, message: "success", data: { google: true, microsoft: true } }
  }
  const res = await fetch(`${API_BASE_URL}/auth/oauth/providers`)
  return res.json()
}

export async function getOAuthStartUrl(provider: "google" | "microsoft", intent: "login" | "bind_premium" = "login"): Promise<ApiResponse<OAuthStartData>> {
  if (USE_MOCK) {
    await delay(200)
    return {
      code: 0,
      message: "success",
      data: {
        provider,
        enabled: true,
        url: `/auth/login?mock_oauth=${provider}`,
      },
    }
  }
  const res = await fetch(`${API_BASE_URL}/auth/oauth/${provider}/start?intent=${intent}`, {
    headers: withAuth(),
  })
  return res.json()
}

export async function logout(): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay(200)
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", headers: withAuth() })
  return res.json()
}

export async function getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
  if (USE_MOCK) {
    await delay(300)
    return { code: 0, message: "success", data: mockCurrentUser }
  }
  const res = await fetch(`${API_BASE_URL}/user`, { headers: withAuth() })
  return res.json()
}

// ============================================
// 角色管理 API
// ============================================

let playersData = [...mockPlayers]

export async function listPlayers(): Promise<ApiResponse<Player[]>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: playersData }
  }
  const res = await fetch(`${API_BASE_URL}/user/players`, { headers: withAuth() })
  return res.json()
}

export async function getPlayer(pid: number): Promise<ApiResponse<Player>> {
  if (USE_MOCK) {
    await delay(300)
    const player = playersData.find((p) => p.pid === pid)
    if (!player) throw new Error("角色不存在")
    return { code: 0, message: "success", data: player }
  }
  const res = await fetch(`${API_BASE_URL}/user/players/${pid}`, { headers: withAuth() })
  return res.json()
}

export async function createPlayer(data: CreatePlayerRequest): Promise<ApiResponse<Player>> {
  if (USE_MOCK) {
    await delay()
    const normalized = data.player_name.trim().toLowerCase()
    const existed = playersData.some((p) => p.player_name.trim().toLowerCase() === normalized)
    if (existed) {
      return {
        code: 409,
        message: "Player name already exists",
        data: null as never,
      }
    }
    const newPlayer: Player = {
      pid: Math.max(...playersData.map((p) => p.pid), 0) + 1,
      player_name: data.player_name.trim(),
      uuid: crypto.randomUUID().replace(/-/g, ""),
      tid_skin: null,
      tid_cape: null,
      created_at: new Date().toISOString(),
    }
    playersData = [...playersData, newPlayer]
    return { code: 0, message: "success", data: newPlayer }
  }
  const res = await fetch(`${API_BASE_URL}/user/players`, {
    method: "POST",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updatePlayer(pid: number, data: UpdatePlayerRequest): Promise<ApiResponse<Player>> {
  if (USE_MOCK) {
    await delay()
    const index = playersData.findIndex((p) => p.pid === pid)
    if (index === -1) throw new Error("角色不存在")
    playersData[index] = { ...playersData[index], ...data }
    return { code: 0, message: "success", data: playersData[index] }
  }
  const res = await fetch(`${API_BASE_URL}/user/players/${pid}`, {
    method: "PUT",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deletePlayer(pid: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay()
    playersData = playersData.filter((p) => p.pid !== pid)
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/user/players/${pid}`, { method: "DELETE", headers: withAuth() })
  return res.json()
}

// ============================================
// 纹理管理 API
// ============================================

export async function listTextures(params?: { type?: "skin" | "cape"; page?: number; pageSize?: number }): Promise<PaginatedResponse<Texture>> {
  if (USE_MOCK) {
    await delay()
    let filtered = mockTextures
    if (params?.type) {
      filtered = filtered.filter((t) => t.type === params.type)
    }
    return {
      code: 0,
      message: "success",
      data: {
        items: filtered,
        total: filtered.length,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
      },
    }
  }
  const searchParams = new URLSearchParams()
  if (params?.type) searchParams.set("type", params.type)
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize))
  const res = await fetch(`${API_BASE_URL}/user/textures?${searchParams}`, { headers: withAuth() })
  return res.json()
}

export async function getTexture(tid: number): Promise<ApiResponse<Texture>> {
  if (USE_MOCK) {
    await delay(300)
    const texture = mockTextures.find((t) => t.tid === tid)
    if (!texture) throw new Error("纹理不存在")
    return { code: 0, message: "success", data: texture }
  }
  const res = await fetch(`${API_BASE_URL}/user/textures/${tid}`, { headers: withAuth() })
  return res.json()
}

export async function uploadTexture(data: UploadTextureRequest): Promise<ApiResponse<Texture>> {
  if (USE_MOCK) {
    await delay(1500) // 模拟上传延迟
    const newTexture: Texture = {
      tid: Math.max(...mockTextures.map((t) => t.tid), 0) + 1,
      name: data.name,
      type: data.type,
      hash: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      size: data.file.size,
      uploader: mockCurrentUser.uid,
      public: data.public ?? false,
      upload_at: new Date().toISOString(),
      likes: 0,
    }
    return { code: 0, message: "success", data: newTexture }
  }
  const formData = new FormData()
  formData.append("name", data.name)
  formData.append("type", data.type)
  formData.append("file", data.file)
  if (data.public !== undefined) formData.append("public", String(data.public))
  const res = await fetch(`${API_BASE_URL}/user/textures`, { method: "POST", headers: withAuth(), body: formData })
  return res.json()
}

export async function deleteTexture(tid: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/user/textures/${tid}`, { method: "DELETE", headers: withAuth() })
  return res.json()
}

// ============================================
// 衣柜 API
// ============================================

export async function listClosetItems(): Promise<ApiResponse<ClosetItem[]>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: mockClosetItems }
  }
  const res = await fetch(`${API_BASE_URL}/user/closet`, { headers: withAuth() })
  return res.json()
}

export async function addToCloset(tid: number): Promise<ApiResponse<ClosetItem>> {
  if (USE_MOCK) {
    await delay()
    const texture = mockTextures.find((t) => t.tid === tid)
    if (!texture) throw new Error("纹理不存在")
    const item: ClosetItem = {
      tid: texture.tid,
      name: texture.name,
      type: texture.type,
      hash: texture.hash,
      url: "/images/steve.png",
      added_at: new Date().toISOString(),
    }
    return { code: 0, message: "success", data: item }
  }
  const res = await fetch(`${API_BASE_URL}/user/closet`, {
    method: "POST",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ tid }),
  })
  return res.json()
}

export async function removeFromCloset(tid: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/user/closet/${tid}`, { method: "DELETE", headers: withAuth() })
  return res.json()
}

// ============================================
// 正版绑定 API
// ============================================

export async function getPremiumBinding(): Promise<ApiResponse<PremiumBinding | null>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: mockPremiumBinding }
  }
  const res = await fetch(`${API_BASE_URL}/user/premium`, { headers: withAuth() })
  return res.json()
}

export async function bindPremium(data: BindPremiumRequest): Promise<ApiResponse<PremiumBinding>> {
  if (USE_MOCK) {
    await delay(1000)
    return {
      code: 0,
      message: "success",
      data: {
        uuid: "c06f8906-4c8a-4911-ab8d-8b91b1e8cd7a",
        username: "Steve",
        bound_at: new Date().toISOString(),
      },
    }
  }
  const res = await fetch(`${API_BASE_URL}/user/premium`, {
    method: "POST",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function unbindPremium(): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/user/premium`, { method: "DELETE", headers: withAuth() })
  return res.json()
}

export async function syncPremiumSkin(): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay(1500)
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/user/premium/sync`, { method: "POST", headers: withAuth() })
  return res.json()
}

// ============================================
// 管理员 API - 用户管理
// ============================================

export async function adminListUsers(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<User>> {
  if (USE_MOCK) {
    await delay()
    let filtered = mockUsers
    if (params?.search) {
      const search = params.search.toLowerCase()
      filtered = filtered.filter(
        (u) => u.email.toLowerCase().includes(search) || u.nickname.toLowerCase().includes(search)
      )
    }
    return {
      code: 0,
      message: "success",
      data: {
        items: filtered,
        total: filtered.length,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
      },
    }
  }
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize))
  if (params?.search) searchParams.set("search", params.search)
  const res = await fetch(`${API_BASE_URL}/admin/users?${searchParams}`, { headers: withAuth() })
  return res.json()
}

export async function adminUsersStats(): Promise<ApiResponse<AdminUsersStats>> {
  if (USE_MOCK) {
    await delay(200)
    return {
      code: 0,
      message: "success",
      data: {
        total_users: mockUsers.length,
        verified_users: mockUsers.filter((u) => Boolean(u.verified)).length,
        vip_users: mockUsers.filter((u) => (u.permission ?? 0) >= 1).length,
        admin_users: mockUsers.filter((u) => (u.permission ?? 0) >= 2).length,
      },
    }
  }

  const res = await fetch(`${API_BASE_URL}/admin/users/stats`, { headers: withAuth() })
  return res.json()
}

export async function adminUpdateUser(uid: number, data: Partial<User>): Promise<ApiResponse<User>> {
  if (USE_MOCK) {
    await delay()
    const user = mockUsers.find((u) => u.uid === uid)
    if (!user) throw new Error("用户不存在")
    return { code: 0, message: "success", data: { ...user, ...data } }
  }
  const res = await fetch(`${API_BASE_URL}/admin/users/${uid}`, {
    method: "PUT",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function adminDeleteUser(uid: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/admin/users/${uid}`, { method: "DELETE", headers: withAuth() })
  return res.json()
}

// ============================================
// 管理员 API - 纹理管理
// ============================================

export async function adminListTextures(params?: { page?: number; pageSize?: number; type?: "skin" | "cape" }): Promise<PaginatedResponse<Texture>> {
  if (USE_MOCK) {
    await delay()
    let filtered = mockTextures
    if (params?.type) {
      filtered = filtered.filter((t) => t.type === params.type)
    }
    return {
      code: 0,
      message: "success",
      data: {
        items: filtered,
        total: filtered.length,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
      },
    }
  }
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize))
  if (params?.type) searchParams.set("type", params.type)
  const res = await fetch(`${API_BASE_URL}/admin/textures?${searchParams}`, { headers: withAuth() })
  return res.json()
}

export async function adminDeleteTexture(tid: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await delay()
    return { code: 0, message: "success", data: null }
  }
  const res = await fetch(`${API_BASE_URL}/admin/textures/${tid}`, { method: "DELETE", headers: withAuth() })
  return res.json()
}

// ============================================
// 管理员 API - 审计日志
// ============================================

export async function adminListAuditLogs(params?: { page?: number; pageSize?: number; action?: string }): Promise<PaginatedResponse<AuditLog>> {
  if (USE_MOCK) {
    await delay()
    let filtered = mockAuditLogs
    if (params?.action) {
      filtered = filtered.filter((l) => l.action.includes(params.action!))
    }
    return {
      code: 0,
      message: "success",
      data: {
        items: filtered,
        total: filtered.length,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
      },
    }
  }
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize))
  if (params?.action) searchParams.set("action", params.action)
  const res = await fetch(`${API_BASE_URL}/admin/audit-logs?${searchParams}`, { headers: withAuth() })
  return res.json()
}

// ============================================
// 管理员 API - 站点设置
// ============================================

export async function getSiteSettings(): Promise<ApiResponse<SiteSettings>> {
  if (USE_MOCK) {
    await delay(300)
    return { code: 0, message: "success", data: mockSiteSettings }
  }
  const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers: withAuth() })
  return res.json()
}

export async function getPublicSiteSettings(): Promise<ApiResponse<PublicSiteSettings>> {
  if (USE_MOCK) {
    await delay(300)
    return {
      code: 0,
      message: "success",
      data: {
        site_name: mockSiteSettings.site_name,
        site_description: mockSiteSettings.site_description,
        site_url: mockSiteSettings.site_url,
        logo_url: mockSiteSettings.logo_url,
        favicon_url: mockSiteSettings.favicon_url,
        theme_color: mockSiteSettings.theme_color,
        footer_text: mockSiteSettings.footer_text,
        allow_register: mockSiteSettings.allow_register,
        require_email_verification: mockSiteSettings.require_email_verification,
      },
    }
  }

  const res = await fetch(`${API_BASE_URL}/site-settings`)
  return res.json()
}

export async function updateSiteSettings(data: Partial<SiteSettings>): Promise<ApiResponse<SiteSettings>> {
  if (USE_MOCK) {
    await delay()
    Object.assign(mockSiteSettings, data)
    return { code: 0, message: "success", data: mockSiteSettings }
  }
  const res = await fetch(`${API_BASE_URL}/admin/settings`, {
    method: "PUT",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getAdminOAuthSettings(): Promise<ApiResponse<AdminOAuthSettings>> {
  if (USE_MOCK) {
    await delay(300)
    return {
      code: 0,
      message: "success",
      data: {
        google_client_id: null,
        microsoft_client_id: null,
        google_enabled: false,
        microsoft_enabled: false,
        has_google_client_secret: false,
        has_microsoft_client_secret: false,
        has_oauth_state_secret: false,
      },
    }
  }

  const res = await fetch(`${API_BASE_URL}/admin/oauth-settings`, { headers: withAuth() })
  return res.json()
}

export async function updateAdminOAuthSettings(
  data: UpdateAdminOAuthSettingsRequest
): Promise<ApiResponse<AdminOAuthSettings>> {
  if (USE_MOCK) {
    await delay(300)
    return {
      code: 0,
      message: "success",
      data: {
        google_client_id: data.google_client_id ?? null,
        microsoft_client_id: data.microsoft_client_id ?? null,
        google_enabled: Boolean(data.google_client_id || data.google_client_secret),
        microsoft_enabled: Boolean(data.microsoft_client_id || data.microsoft_client_secret),
        has_google_client_secret: Boolean(data.google_client_secret),
        has_microsoft_client_secret: Boolean(data.microsoft_client_secret),
        has_oauth_state_secret: Boolean(data.oauth_state_secret),
      },
    }
  }

  const res = await fetch(`${API_BASE_URL}/admin/oauth-settings`, {
    method: "PUT",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getAdminEmailSettings(): Promise<ApiResponse<AdminEmailSettings>> {
  if (USE_MOCK) {
    await delay(300)
    return {
      code: 0,
      message: "success",
      data: {
        smtp_host: null,
        smtp_port: 587,
        smtp_username: null,
        smtp_from_name: "CraftSkin",
        smtp_from_email: null,
        smtp_use_tls: true,
        smtp_enabled: false,
        has_smtp_password: false,
        email_template_subject: "【CraftSkin】账户通知",
        email_template_html:
          "<!DOCTYPE html><html><body style=\"font-family:Arial,sans-serif;background:#f3f4f6;padding:20px;\"><div style=\"max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;\"><div style=\"background:#2E7D32;color:#fff;padding:16px 20px;font-size:18px;font-weight:700;\">CraftSkin</div><div style=\"padding:24px 20px;color:#1f2937;line-height:1.7;\">{{content}}</div><div style=\"padding:12px 20px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;\">此邮件由系统自动发送，请勿直接回复。</div></div></body></html>",
      },
    }
  }

  const res = await fetch(`${API_BASE_URL}/admin/email-settings`, { headers: withAuth() })
  return res.json()
}

export async function updateAdminEmailSettings(
  data: UpdateAdminEmailSettingsRequest
): Promise<ApiResponse<AdminEmailSettings>> {
  if (USE_MOCK) {
    await delay(300)
    return {
      code: 0,
      message: "success",
      data: {
        smtp_host: data.smtp_host ?? null,
        smtp_port: data.smtp_port ?? 587,
        smtp_username: data.smtp_username ?? null,
        smtp_from_name: data.smtp_from_name ?? "CraftSkin",
        smtp_from_email: data.smtp_from_email ?? null,
        smtp_use_tls: data.smtp_use_tls ?? true,
        smtp_enabled: Boolean(data.smtp_host && data.smtp_username && data.smtp_from_email && data.smtp_password),
        has_smtp_password: Boolean(data.smtp_password),
        email_template_subject: data.email_template_subject ?? "【CraftSkin】账户通知",
        email_template_html: data.email_template_html ?? "",
      },
    }
  }

  const res = await fetch(`${API_BASE_URL}/admin/email-settings`, {
    method: "PUT",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })
  return res.json()
}

// ============================================
// 统计 API
// ============================================

export async function getSiteStats(): Promise<ApiResponse<SiteStats>> {
  if (USE_MOCK) {
    await delay(300)
    return { code: 0, message: "success", data: mockSiteStats }
  }
  const res = await fetch(`${API_BASE_URL}/stats`)
  return res.json()
}

export async function getUserStats(): Promise<ApiResponse<UserStats>> {
  if (USE_MOCK) {
    await delay(300)
    return { code: 0, message: "success", data: mockUserStats }
  }
  const res = await fetch(`${API_BASE_URL}/user/stats`, { headers: withAuth() })
  return res.json()
}
