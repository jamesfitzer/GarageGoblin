import { get } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { getSource } from "@/lib/sources";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Authentication required.", { status: 401 });

  const { id } = await params;
  const source = getSource(id);
  if (!source) return new Response("Source not found.", { status: 404 });

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return new Response("Blob storage is not configured.", { status: 503 });

  try {
    const blob = await get(`sources/${source.id}.pdf`, { access: "private" });
    if (!blob || blob.statusCode !== 200) return new Response("Source not found.", { status: 404 });
    return new Response(blob.stream, {
      headers: {
        "Content-Type": blob.blob.contentType || "application/pdf",
        "Content-Disposition": `inline; filename="${source.filename}"`,
        "Cache-Control": "private, no-store",
        ETag: blob.blob.etag,
      },
    });
  } catch {
    return new Response("Source storage is unavailable.", { status: 503 });
  }
}
