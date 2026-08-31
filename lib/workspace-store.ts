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

export type QuotaResult = { allowed: true } | { allowed: false; period: "day" | "month" } | { allowed: false; period: "unavailable" };

export async function consumeLiveQuota(userId: string): Promise<QuotaResult> {
  if (!database) return { allowed: false, period: "unavailable" };
  await ensureUser(userId);
  await database`
    INSERT INTO usage_limits (clerk_user_id)
    VALUES (${userId})
    ON CONFLICT (clerk_user_id) DO NOTHING
  `;
  const rows = await database`
    UPDATE usage_limits
    SET
      daily_window = CURRENT_DATE,
      daily_count = CASE WHEN daily_window = CURRENT_DATE THEN daily_count + 1 ELSE 1 END,
      monthly_window = DATE_TRUNC('month', CURRENT_DATE)::date,
      monthly_count = CASE WHEN monthly_window = DATE_TRUNC('month', CURRENT_DATE)::date THEN monthly_count + 1 ELSE 1 END,
      updated_at = NOW()
    WHERE clerk_user_id = ${userId}
      AND (daily_window <> CURRENT_DATE OR daily_count < 10)
      AND (monthly_window <> DATE_TRUNC('month', CURRENT_DATE)::date OR monthly_count < 25)
    RETURNING daily_count AS "dailyCount", monthly_count AS "monthlyCount"
  `;
  if (rows[0]) return { allowed: true };

  const current = await database`
    SELECT daily_count AS "dailyCount", monthly_count AS "monthlyCount"
    FROM usage_limits
    WHERE clerk_user_id = ${userId}
  `;
  if (current[0]?.dailyCount >= 10) return { allowed: false, period: "day" };
  if (current[0]?.monthlyCount >= 25) return { allowed: false, period: "month" };
  return { allowed: false, period: "unavailable" };
}
