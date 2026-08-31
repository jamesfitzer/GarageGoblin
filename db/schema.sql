CREATE TABLE IF NOT EXISTS app_users (
  clerk_user_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_workspaces (
  clerk_user_id TEXT PRIMARY KEY REFERENCES app_users(clerk_user_id) ON DELETE CASCADE,
  active_chat_id TEXT,
  chats JSONB NOT NULL DEFAULT '[]'::jsonb,
  briefings JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_workspaces_updated_at_idx ON user_workspaces(updated_at);
