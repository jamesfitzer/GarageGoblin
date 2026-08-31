import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
export const database = databaseUrl ? neon(databaseUrl) : null;

export type PersistedWorkspace = {
  activeChatId: string | null;
  chats: unknown[];
  briefings: unknown[];
};

export function isWorkspace(value: unknown): value is PersistedWorkspace {
  if (!value || typeof value !== "object") return false;
  const workspace = value as Record<string, unknown>;
  return (typeof workspace.activeChatId === "string" || workspace.activeChatId === null) &&
    Array.isArray(workspace.chats) && Array.isArray(workspace.briefings);
}

export async function ensureUser(userId: string) {
  if (!database) return;
  await database`
    INSERT INTO app_users (clerk_user_id)
    VALUES (${userId})
    ON CONFLICT (clerk_user_id)
    DO UPDATE SET updated_at = NOW()
  `;
}

export async function readWorkspace(userId: string) {
  if (!database) return null;
  const rows = await database`
    SELECT active_chat_id AS "activeChatId", chats, briefings
    FROM user_workspaces
    WHERE clerk_user_id = ${userId}
  `;
  if (!rows[0]) return null;
  return rows[0] as PersistedWorkspace;
}

export async function writeWorkspace(userId: string, workspace: PersistedWorkspace) {
  if (!database) return;
  await ensureUser(userId);
  await database`
    INSERT INTO user_workspaces (clerk_user_id, active_chat_id, chats, briefings, updated_at)
    VALUES (${userId}, ${workspace.activeChatId}, ${JSON.stringify(workspace.chats)}::jsonb, ${JSON.stringify(workspace.briefings)}::jsonb, NOW())
    ON CONFLICT (clerk_user_id)
    DO UPDATE SET
      active_chat_id = EXCLUDED.active_chat_id,
      chats = EXCLUDED.chats,
      briefings = EXCLUDED.briefings,
      updated_at = NOW()
  `;
}
