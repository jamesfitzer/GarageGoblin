import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSource } from "@/lib/sources";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = getSource(id);
  if (!source) return new Response("Source not found.", { status: 404 });

  const file = await readFile(path.join(process.cwd(), "sources", source.filename));
  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${source.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
