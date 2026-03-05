import type {
  User,
  CurrentUser,
  Player,
  Texture,
  ClosetItem,
  PremiumBinding,
  AuditLog,
  SiteSettings,
  SiteStats,
  UserStats,
} from "./types"

// 模拟延迟
export const delay = (ms: number = 500) => new Promise((resolve) => setTimeout(resolve, ms))

// 当前用户
export const mockCurrentUser: CurrentUser = {
  uid: 1,
  email: "admin@example.com",
  nickname: "Admin",
  avatar: null,
  score: 1000,
  permission: 2,
  register_at: "2024-01-01T00:00:00Z",
  last_sign_at: "2024-01-15T10:30:00Z",
  verified: true,
  is_admin: true,
}

// 用户列表
export const mockUsers: User[] = [
  {
    uid: 1,
    email: "admin@example.com",
    nickname: "Admin",
    avatar: null,
    score: 1000,
    permission: 2,
    register_at: "2024-01-01T00:00:00Z",
    last_sign_at: "2024-01-15T10:30:00Z",
    verified: true,
  },
  {
    uid: 2,
    email: "user@example.com",
    nickname: "TestUser",
    avatar: null,
    score: 500,
    permission: 0,
    register_at: "2024-01-05T00:00:00Z",
    last_sign_at: "2024-01-14T08:00:00Z",
    verified: true,
  },
  {
    uid: 3,
    email: "newuser@example.com",
    nickname: "NewUser",
    avatar: null,
    score: 100,
    permission: 0,
    register_at: "2024-01-10T00:00:00Z",
    last_sign_at: null,
    verified: false,
  },
]

// 角色列表
export const mockPlayers: Player[] = [
  {
    pid: 1,
    player_name: "Steve",
    uuid: "c06f89064c8a4911ab8d8b91b1e8cd7a",
    tid_skin: 101,
    tid_cape: null,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    pid: 2,
    player_name: "Alex",
    uuid: "6ab4317889f54d5a9f4c4a0e8b3f2d1c",
    tid_skin: 102,
    tid_cape: 201,
    created_at: "2024-01-02T00:00:00Z",
  },
]

// 纹理列表
export const mockTextures: Texture[] = [
  {
    tid: 101,
    name: "Steve 经典",
    type: "skin",
    hash: "abc123",
    size: 1024,
    uploader: 1,
    public: true,
    upload_at: "2024-01-01T00:00:00Z",
    likes: 150,
  },
  {
    tid: 102,
    name: "Alex 默认",
    type: "skin",
    hash: "def456",
    size: 1024,
    uploader: 1,
    public: true,
    upload_at: "2024-01-02T00:00:00Z",
    likes: 120,
  },
  {
    tid: 103,
    name: "自定义皮肤",
    type: "skin",
    hash: "ghi789",
    size: 2048,
    uploader: 1,
    public: false,
    upload_at: "2024-01-03T00:00:00Z",
    likes: 0,
  },
  {
    tid: 201,
    name: "蓝色披风",
    type: "cape",
    hash: "jkl012",
    size: 512,
    uploader: 1,
    public: true,
    upload_at: "2024-01-04T00:00:00Z",
    likes: 80,
  },
  {
    tid: 202,
    name: "红色披风",
    type: "cape",
    hash: "mno345",
    size: 512,
    uploader: 2,
    public: true,
    upload_at: "2024-01-05T00:00:00Z",
    likes: 60,
  },
]

// 衣柜物品
export const mockClosetItems: ClosetItem[] = [
  {
    tid: 101,
    name: "Steve 经典",
    type: "skin",
    hash: "abc123",
    url: "/images/steve.png",
    added_at: "2024-01-01T00:00:00Z",
  },
  {
    tid: 102,
    name: "Alex 默认",
    type: "skin",
    hash: "def456",
    url: "/images/steve.png",
    added_at: "2024-01-02T00:00:00Z",
  },
  {
    tid: 103,
    name: "自定义皮肤",
    type: "skin",
    hash: "ghi789",
    url: "/images/steve.png",
    added_at: "2024-01-03T00:00:00Z",
  },
  {
    tid: 104,
    name: "像素风皮肤",
    type: "skin",
    hash: "pqr678",
    url: "/images/steve.png",
    added_at: "2024-01-06T00:00:00Z",
  },
  {
    tid: 105,
    name: "武士皮肤",
    type: "skin",
    hash: "stu901",
    url: "/images/steve.png",
    added_at: "2024-01-07T00:00:00Z",
  },
]

// 正版绑定信息
export const mockPremiumBinding: PremiumBinding | null = null

// 审计日志
export const mockAuditLogs: AuditLog[] = [
  {
    id: 1,
    user_id: 1,
    user_email: "admin@example.com",
    action: "user.login",
    ip: "192.168.1.1",
    user_agent: "Mozilla/5.0",
    created_at: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    user_id: 1,
    user_email: "admin@example.com",
    action: "player.create",
    ip: "192.168.1.1",
    user_agent: "Mozilla/5.0",
    created_at: "2024-01-15T10:35:00Z",
    details: { player_name: "Steve" },
  },
  {
    id: 3,
    user_id: 2,
    user_email: "user@example.com",
    action: "texture.upload",
    ip: "192.168.1.2",
    user_agent: "Mozilla/5.0",
    created_at: "2024-01-14T15:20:00Z",
    details: { texture_name: "My Skin", type: "skin" },
  },
  {
    id: 4,
    user_id: 1,
    user_email: "admin@example.com",
    action: "user.settings.update",
    ip: "192.168.1.1",
    user_agent: "Mozilla/5.0",
    created_at: "2024-01-13T09:00:00Z",
  },
  {
    id: 5,
    user_id: 3,
    user_email: "newuser@example.com",
    action: "user.register",
    ip: "192.168.1.3",
    user_agent: "Mozilla/5.0",
    created_at: "2024-01-10T00:00:00Z",
  },
]

// 站点设置
export const mockSiteSettings: SiteSettings = {
  site_name: "CraftSkin",
  site_description: "发现、下载和分享精美的 Minecraft 皮肤",
  site_url: "https://craftskin.example.com",
  logo_url: null,
  favicon_url: null,
  theme_color: "#2E7D32",
  footer_text: "© 2024 CraftSkin. All rights reserved.",
  allow_register: true,
  require_email_verification: true,
  default_score: 100,
  score_per_storage: 1,
  score_per_closet_item: 10,
  score_per_player: 50,
}

// 站点统计
export const mockSiteStats: SiteStats = {
  total_users: 12580,
  total_players: 25640,
  total_textures: 89320,
  storage_used: 1024 * 1024 * 1024 * 50, // 50GB
}

// 用户统计
export const mockUserStats: UserStats = {
  players_count: 2,
  textures_count: 5,
  closet_count: 5,
  storage_used: 1024 * 5, // 5KB
}
