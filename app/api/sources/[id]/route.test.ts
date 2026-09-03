import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getBlob: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@vercel/blob", () => ({ get: mocks.getBlob }));

import { GET } from "./route";

function getSource(id: string) {
  return GET(new Request(`http://localhost/api/sources/${id}`), { params: Promise.resolve({ id }) });
}

describe("GET /api/sources/[id] authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-a" });
    mocks.getBlob.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("test pdf"));
          controller.close();
        },
      }),
      blob: { contentType: "application/pdf", etag: "test-etag" },
    });
  });

  it("rejects unauthenticated source requests before Blob access", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await getSource("mk5-roadster-manual");

    expect(response.status).toBe(401);
    expect(mocks.getBlob).not.toHaveBeenCalled();
  });

  it("rejects source IDs outside the approved allowlist", async () => {
    const response = await getSource("not-an-approved-source");

    expect(response.status).toBe(404);
    expect(mocks.getBlob).not.toHaveBeenCalled();
  });

  it("serves an approved private source without shared caching", async () => {
    const response = await getSource("mk5-roadster-manual");

    expect(response.status).toBe(200);
    expect(mocks.getBlob).toHaveBeenCalledWith("sources/mk5-roadster-manual.pdf", { access: "private" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
  });
});
