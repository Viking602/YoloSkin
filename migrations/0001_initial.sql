PRAGMA foreign_keys = ON;

CREATE TABLE users (
  uid INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  permission INTEGER NOT NULL DEFAULT 0 CHECK (permission BETWEEN 0 AND 2),
  register_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_sign_at TEXT,
  verified INTEGER NOT NULL DEFAULT 1 CHECK (verified IN (0, 1)),
  oauth_provider TEXT,
  oauth_subject TEXT,
  UNIQUE (oauth_provider, oauth_subject)
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  uid INTEGER NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_uid ON sessions(uid);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE account_tokens (
  token_hash TEXT PRIMARY KEY,
  uid INTEGER NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('verify', 'reset')),
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_account_tokens_uid_kind ON account_tokens(uid, kind);

CREATE TABLE textures (
  tid INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('skin', 'cape')),
  hash TEXT NOT NULL,
  object_key TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  uploader INTEGER NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  upload_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  likes INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_textures_uploader ON textures(uploader, upload_at DESC);
CREATE INDEX idx_textures_public ON textures(is_public, upload_at DESC);
CREATE INDEX idx_textures_hash ON textures(hash);

CREATE TABLE players (
  pid INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  player_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  uuid TEXT NOT NULL UNIQUE,
  tid_skin INTEGER REFERENCES textures(tid) ON DELETE SET NULL,
  tid_cape INTEGER REFERENCES textures(tid) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_players_uid ON players(uid);

CREATE TABLE closet_items (
  uid INTEGER NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  tid INTEGER NOT NULL REFERENCES textures(tid) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (uid, tid)
);

CREATE TABLE premium_bindings (
  uid INTEGER PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  uuid TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  access_token TEXT,
  bound_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE yggdrasil_tokens (
  access_token_hash TEXT PRIMARY KEY,
  client_token TEXT NOT NULL,
  uid INTEGER NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  pid INTEGER NOT NULL REFERENCES players(pid) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_yggdrasil_tokens_uid ON yggdrasil_tokens(uid);

CREATE TABLE join_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_uuid TEXT NOT NULL,
  server_id TEXT NOT NULL,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_join_sessions_lookup ON join_sessions(server_id, profile_uuid, created_at DESC);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(uid) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  details TEXT
);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'YoloSkin',
  site_description TEXT NOT NULL DEFAULT 'Cloudflare-native Minecraft skin service',
  site_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  favicon_url TEXT,
  theme_color TEXT NOT NULL DEFAULT '#2E7D32',
  footer_text TEXT NOT NULL DEFAULT 'Powered by Cloudflare Workers, D1 and R2',
  allow_register INTEGER NOT NULL DEFAULT 1 CHECK (allow_register IN (0, 1)),
  require_email_verification INTEGER NOT NULL DEFAULT 0 CHECK (require_email_verification IN (0, 1)),
  default_score INTEGER NOT NULL DEFAULT 100,
  score_per_storage INTEGER NOT NULL DEFAULT 1,
  score_per_closet_item INTEGER NOT NULL DEFAULT 1,
  score_per_player INTEGER NOT NULL DEFAULT 1,
  google_client_id TEXT,
  microsoft_client_id TEXT
);

INSERT INTO site_settings (id) VALUES (1);
