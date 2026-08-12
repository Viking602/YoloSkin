import type {
  AdminUsersStats,
  ApiResponse,
  AuditLog,
  BindPremiumRequest,
  ClosetItem,
  CreatePlayerRequest,
  CurrentUser,
  OAuthProviders,
  OAuthStartData,
  PasswordResetConfig,
  PaginatedResponse,
  Player,
  PremiumBinding,
  PublicSiteSettings,
  SiteSettings,
  SiteStats,
  Texture,
  UpdatePlayerRequest,
  UploadTextureRequest,
  User,
  UserStats,
} from "./types"

const API = "/api"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: "same-origin", ...init })
  const contentType = response.headers.get("Content-Type") ?? ""
  if (!contentType.includes("application/json")) throw new Error(`API returned ${response.status} without JSON`)
  return response.json() as Promise<T>
}

function json(method: "POST" | "PUT", body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
}

export const login = (email: string, password: string) =>
  request<ApiResponse<{ token: string; user: CurrentUser }>>("/auth/login", json("POST", { email, password }))

export const register = (email: string, password: string, nickname: string) =>
  request<ApiResponse<{ token: string; user: CurrentUser }>>("/auth/register", json("POST", { email, password, nickname }))

export const getPasswordResetConfig = () => request<ApiResponse<PasswordResetConfig>>("/auth/password-reset/config")
export const requestPasswordReset = (email: string, turnstileToken: string) =>
  request<ApiResponse<{ message: string }>>("/auth/forgot", json("POST", { email, turnstile_token: turnstileToken }))
export const resetPassword = (token: string, newPassword: string, turnstileToken: string) =>
  request<ApiResponse<null>>("/auth/reset", json("POST", { token, new_password: newPassword, turnstile_token: turnstileToken }))

export const logout = () => request<ApiResponse<null>>("/auth/logout", { method: "POST" })
export const getCurrentUser = () => request<ApiResponse<CurrentUser>>("/user")
export const changePassword = (currentPassword: string, newPassword: string) =>
  request<ApiResponse<null>>("/user/password", json("PUT", { current_password: currentPassword, new_password: newPassword }))

export const getOAuthProviders = () => request<ApiResponse<OAuthProviders>>("/auth/oauth/providers")
export const getOAuthStartUrl = (provider: "google" | "microsoft") =>
  request<ApiResponse<OAuthStartData>>(`/auth/oauth/${provider}/start?intent=login`)

export const listPlayers = () => request<ApiResponse<Player[]>>("/user/players")
export const getPlayer = (pid: number) => request<ApiResponse<Player>>(`/user/players/${pid}`)
export const createPlayer = (data: CreatePlayerRequest) => request<ApiResponse<Player>>("/user/players", json("POST", data))
export const updatePlayer = (pid: number, data: UpdatePlayerRequest) =>
  request<ApiResponse<Player>>(`/user/players/${pid}`, json("PUT", data))
export const deletePlayer = (pid: number) => request<ApiResponse<null>>(`/user/players/${pid}`, { method: "DELETE" })

export async function listTextures(params?: { type?: "skin" | "cape"; page?: number; pageSize?: number }): Promise<PaginatedResponse<Texture>> {
  const query = new URLSearchParams()
  if (params?.type) query.set("type", params.type)
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))
  return request(`/user/textures?${query}`)
}

export const getTexture = (tid: number) => request<ApiResponse<Texture>>(`/user/textures/${tid}`)

export function uploadTexture(data: UploadTextureRequest): Promise<ApiResponse<Texture>> {
  const form = new FormData()
  form.set("name", data.name)
  form.set("type", data.type)
  form.set("file", data.file)
  if (data.public !== undefined) form.set("public", String(data.public))
  return request("/user/textures", { method: "POST", body: form })
}

export const deleteTexture = (tid: number) => request<ApiResponse<null>>(`/user/textures/${tid}`, { method: "DELETE" })
export const listClosetItems = () => request<ApiResponse<ClosetItem[]>>("/user/closet")
export const addToCloset = (tid: number) => request<ApiResponse<ClosetItem>>("/user/closet", json("POST", { tid }))
export const removeFromCloset = (tid: number) => request<ApiResponse<null>>(`/user/closet/${tid}`, { method: "DELETE" })

export const getPremiumBinding = () => request<ApiResponse<PremiumBinding | null>>("/user/premium")
export const bindPremium = (data: BindPremiumRequest) => request<ApiResponse<PremiumBinding>>("/user/premium", json("POST", data))
export const unbindPremium = () => request<ApiResponse<null>>("/user/premium", { method: "DELETE" })

export async function adminListUsers(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<User>> {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))
  if (params?.search) query.set("search", params.search)
  return request(`/admin/users?${query}`)
}

export const adminUsersStats = () => request<ApiResponse<AdminUsersStats>>("/admin/users/stats")
export const adminUpdateUser = (uid: number, data: Partial<User>) => request<ApiResponse<User>>(`/admin/users/${uid}`, json("PUT", data))
export const adminDeleteUser = (uid: number) => request<ApiResponse<null>>(`/admin/users/${uid}`, { method: "DELETE" })

export async function adminListTextures(params?: { page?: number; pageSize?: number; type?: "skin" | "cape" }): Promise<PaginatedResponse<Texture>> {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))
  if (params?.type) query.set("type", params.type)
  return request(`/admin/textures?${query}`)
}

export const adminDeleteTexture = (tid: number) => request<ApiResponse<null>>(`/admin/textures/${tid}`, { method: "DELETE" })

export async function adminListAuditLogs(params?: { page?: number; pageSize?: number; action?: string }): Promise<PaginatedResponse<AuditLog>> {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))
  if (params?.action) query.set("action", params.action)
  return request(`/admin/audit-logs?${query}`)
}

export const getSiteSettings = () => request<ApiResponse<SiteSettings>>("/admin/settings")
export const getPublicSiteSettings = () => request<ApiResponse<PublicSiteSettings>>("/site-settings")
export const updateSiteSettings = (data: Partial<SiteSettings>) => request<ApiResponse<SiteSettings>>("/admin/settings", json("PUT", data))
export const getSiteStats = () => request<ApiResponse<SiteStats>>("/stats")
export const getUserStats = () => request<ApiResponse<UserStats>>("/user/stats")
