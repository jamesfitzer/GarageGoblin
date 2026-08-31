import { auth } from "@clerk/nextjs/server";
import { isWorkspace, readWorkspace, writeWorkspace, database } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!database) return Response.json({ error: "DATABASE_URL is missing." }, { status: 503 });

  try {
    const workspace = await readWorkspace(userId);
    if (!workspace) return Response.json({ workspace: null });
    return Response.json({ workspace });
  } catch {
    return Response.json({ error: "Garage workspace storage is unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!database) return Response.json({ error: "DATABASE_URL is missing." }, { status: 503 });

  try {
    const body = await request.json() as { workspace?: unknown };
    if (!isWorkspace(body.workspace) || JSON.stringify(body.workspace).length > 2_000_000) {
      return Response.json({ error: "Invalid or oversized workspace." }, { status: 400 });
    }
    await writeWorkspace(userId, body.workspace);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Garage workspace could not be saved." }, { status: 503 });
  }
}
