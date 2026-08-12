DROP TABLE account_tokens;

CREATE TABLE password_reset_tokens (
  uid INTEGER PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  delivery_id TEXT NOT NULL UNIQUE,
  token_ciphertext TEXT,
  token_iv TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  delivered_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX idx_password_reset_expires
ON password_reset_tokens(expires_at);
