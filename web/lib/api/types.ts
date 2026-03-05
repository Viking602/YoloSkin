// API 响应通用类型
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  code: number
  message: string
  data: {
    items: T[]
    total: number
    page: number
    pageSize: number
  }
}

// 用户相关类型
export interface User {
  uid: number
  email: string
  nickname: string
  avatar: string | null
  score: number
  permission: number
  register_at: string
  last_sign_at: string | null
  verified: boolean
}

export interface CurrentUser extends User {
  is_admin: boolean
}

// 角色相关类型
export interface Player {
  pid: number
  player_name: string
  uuid: string
  tid_skin: number | null
  tid_cape: number | null
  created_at?: string
}

export interface CreatePlayerRequest {
  player_name: string
}

export interface UpdatePlayerRequest {
  player_name?: string
  tid_skin?: number | null
  tid_cape?: number | null
}

// 纹理相关类型
export interface Texture {
  tid: number
  name: string
  type: "skin" | "cape"
  hash: string
  size: number
  uploader: number
  public: boolean
  upload_at: string
  likes: number
}

export interface UploadTextureRequest {
  name: string
  type: "skin" | "cape"
  file: File
  public?: boolean
}

// 衣柜相关类型
export interface ClosetItem {
  tid: number
  name: string
  type: "skin" | "cape"
  hash: string
  url: string
  added_at: string
}

// 正版绑定相关类型
export interface PremiumBinding {
  uuid: string
  username: string
  bound_at: string
}

export interface BindPremiumRequest {
  microsoft_token: string
}

export interface OAuthProviders {
  google: boolean
  microsoft: boolean
}

export interface OAuthStartData {
  provider: string
  enabled: boolean
  url: string | null
}

// 审计日志类型
export interface AuditLog {
  id: number
  user_id: number
  user_email: string
  action: string
  ip: string
  user_agent: string
  created_at: string
  details?: Record<string, unknown>
}

// 站点设置类型
export interface SiteSettings {
  site_name: string
  site_description: string
  site_url: string
  logo_url: string | null
  favicon_url: string | null
  theme_color: string
  footer_text: string
  allow_register: boolean
  require_email_verification: boolean
  default_score: number
  score_per_storage: number
  score_per_closet_item: number
  score_per_player: number
}

export interface PublicSiteSettings {
  site_name: string
  site_description: string
  site_url: string
  logo_url: string | null
  favicon_url: string | null
  theme_color: string
  footer_text: string
  allow_register: boolean | null
  require_email_verification: boolean | null
}

export interface AdminOAuthSettings {
  google_client_id: string | null
  microsoft_client_id: string | null
  google_enabled: boolean
  microsoft_enabled: boolean
  has_google_client_secret: boolean
  has_microsoft_client_secret: boolean
  has_oauth_state_secret: boolean
}

export interface UpdateAdminOAuthSettingsRequest {
  google_client_id?: string
  google_client_secret?: string
  microsoft_client_id?: string
  microsoft_client_secret?: string
  oauth_state_secret?: string
}

export interface AdminUsersStats {
  total_users: number
  verified_users: number
  vip_users: number
  admin_users: number
}

export interface AdminEmailSettings {
  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_from_name: string | null
  smtp_from_email: string | null
  smtp_use_tls: boolean
  smtp_enabled: boolean
  has_smtp_password: boolean
  email_template_subject: string
  email_template_html: string
}

export interface UpdateAdminEmailSettingsRequest {
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
  smtp_password?: string
  smtp_from_name?: string
  smtp_from_email?: string
  smtp_use_tls?: boolean
  email_template_subject?: string
  email_template_html?: string
}

// 统计数据类型
export interface SiteStats {
  total_users: number
  total_players: number
  total_textures: number
  storage_used: number
}

export interface UserStats {
  players_count: number
  textures_count: number
  closet_count: number
  storage_used: number
}
