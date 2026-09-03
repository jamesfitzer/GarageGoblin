import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isWorkspace: vi.fn(),
  readWorkspace: vi.fn(),
  writeWorkspace: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));

vi.mock("@/lib/workspace-store", () => ({
  database: {},
  isWorkspace: mocks.isWorkspace,
  readWorkspace: mocks.readWorkspace,
  writeWorkspace: mocks.writeWorkspace,
}));

import { GET, PUT } from "./route";

const workspace = { activeChatId: "chat-1", chats: [], briefings: [] };

function putRequest(value: unknown) {
  return new Request("http://localhost/api/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

describe("/api/workspace authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-a" });
    mocks.isWorkspace.mockReturnValue(true);
    mocks.readWorkspace.mockResolvedValue(workspace);
    mocks.writeWorkspace.mockResolvedValue(undefined);
  });

  it("rejects unauthenticated reads", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.readWorkspace).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated writes", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await PUT(putRequest({ workspace }));

    expect(response.status).toBe(401);
    expect(mocks.writeWorkspace).not.toHaveBeenCalled();
  });

  it("scopes reads to the authenticated Clerk user", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.readWorkspace).toHaveBeenCalledWith("user-a");
  });

  it("cannot override the authenticated tenant from the request body", async () => {
    const submittedWorkspace = { ...workspace, clerkUserId: "user-b" };

    const response = await PUT(putRequest({ userId: "user-b", workspace: submittedWorkspace }));

    expect(response.status).toBe(200);
    expect(mocks.writeWorkspace).toHaveBeenCalledWith("user-a", submittedWorkspace);
  });

  it("rejects an invalid nested workspace before writing it", async () => {
    mocks.isWorkspace.mockReturnValue(false);

    const response = await PUT(putRequest({ workspace: { activeChatId: "chat-1", chats: [{ messages: [{ content: 42 }] }], briefings: [] } }));

    expect(response.status).toBe(400);
    expect(mocks.writeWorkspace).not.toHaveBeenCalled();
  });

  it("does not return a malformed workspace from storage", async () => {
    mocks.readWorkspace.mockResolvedValue({ activeChatId: "chat-1", chats: [{ bad: true }], briefings: [] });
    mocks.isWorkspace.mockReturnValue(false);

    const response = await GET();

    expect(response.status).toBe(503);
  });

  it("returns 503 when workspace storage fails", async () => {
    mocks.readWorkspace.mockRejectedValue(new Error("database unavailable"));

    const response = await GET();

    expect(response.status).toBe(503);
  });
});
