export interface UserRow {
  uid: number
  email: string
  password_hash: string
  nickname: string
  avatar: string | null
  score: number
  permission: number
  register_at: string
  last_sign_at: string | null
  verified: number
  oauth_provider: string | null
  oauth_subject: string | null
}

export interface PublicUser {
  uid: number
  email: string
  nickname: string
  avatar: string | null
  score: number
  permission: number
  register_at: string
  last_sign_at: string | null
  verified: boolean
  is_admin?: boolean
}

export interface TextureRow {
  tid: number
  name: string
  type: "skin" | "cape"
  hash: string
  object_key: string
  size: number
  uploader: number
  is_public: number
  upload_at: string
  likes: number
}

export interface PlayerRow {
  pid: number
  uid: number
  player_name: string
  uuid: string
  tid_skin: number | null
  tid_cape: number | null
  created_at: string
}

export interface SiteSettingsRow {
  id: number
  site_name: string
  site_description: string
  site_url: string
  logo_url: string | null
  favicon_url: string | null
  theme_color: string
  footer_text: string
  allow_register: number
  require_email_verification: number
  default_score: number
  score_per_storage: number
  score_per_closet_item: number
  score_per_player: number
  google_client_id: string | null
  microsoft_client_id: string | null
}

export interface PasswordResetRow {
  uid: number
  token_hash: string
  delivery_id: string
  token_ciphertext: string | null
  token_iv: string | null
  created_at: string
  expires_at: string
  delivered_at: string | null
  attempts: number
  last_error: string | null
}

export interface PasswordResetDeliveryRow extends PasswordResetRow {
  email: string
  nickname: string
}

export interface PasswordResetQueueMessage {
  type: "password_reset"
  uid: number
  deliveryId: string
}

export type AppVariables = {
  user: UserRow
  sessionToken: string
}

export type AppContext = {
  Bindings: Cloudflare.Env
  Variables: AppVariables
}
