import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  consumeLiveQuota: vi.fn(),
  getVerifiedTorqueResponse: vi.fn(),
  buildDynamicPrepCard: vi.fn(),
  responsesCreate: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));

vi.mock("@/lib/workspace-store", () => ({
  consumeLiveQuota: mocks.consumeLiveQuota,
}));

vi.mock("@/lib/verified-torque", () => ({
  getVerifiedTorqueResponse: mocks.getVerifiedTorqueResponse,
}));

vi.mock("@/lib/prep-evidence", () => ({
  buildDynamicPrepCard: mocks.buildDynamicPrepCard,
}));

vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.responsesCreate };
  },
}));

import { POST } from "./route";

const openAiResponse = {
  output_text: "Grounded answer.",
  output: [{ type: "message", content: [{ type: "output_text", annotations: [] }] }],
};

const citedOpenAiResponse = {
  output_text: "Grounded answer with a source.",
  output: [{
    type: "message",
    content: [{ type: "output_text", annotations: [{ type: "file_citation", filename: "mk5-roadster-manual-p0104.txt" }] }],
  }],
};

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/briefing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/briefing security boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-owner" });
    mocks.currentUser.mockResolvedValue(null);
    mocks.consumeLiveQuota.mockResolvedValue({ allowed: true });
    mocks.getVerifiedTorqueResponse.mockReturnValue(undefined);
    mocks.responsesCreate.mockResolvedValue(openAiResponse);
    mocks.buildDynamicPrepCard.mockResolvedValue({
      answer: "## Before you begin\n\nReview the controlling manual.",
      citations: [],
      procedureAreas: [],
      searches: [],
      missingSectionStarts: [],
      warning: undefined,
    });
  });

  it("rejects unauthenticated requests before quota or OpenAI", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await POST(request({ question: "How do I install the IRS?" }));

    expect(response.status).toBe(401);
    expect(mocks.consumeLiveQuota).not.toHaveBeenCalled();
    expect(mocks.responsesCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["normal retrieval", { question: "How do I install the IRS?" }],
    ["prep card", { question: "Prep me for: IRS installation" }],
    ["forum research", { question: "Any IRS installation gotchas?", forumResearch: true }],
    ["web research", { question: "Research IRS installation online", webResearch: true }],
    ["web-worded manual retrieval", { question: "Search the web for IRS installation advice" }],
  ])("blocks %s when the daily quota is exhausted", async (_, body) => {
    mocks.consumeLiveQuota.mockResolvedValue({ allowed: false, period: "day" });

    const response = await POST(request(body));

    expect(response.status).toBe(429);
    expect(mocks.consumeLiveQuota).toHaveBeenCalledOnce();
    expect(mocks.responsesCreate).not.toHaveBeenCalled();
    expect(mocks.buildDynamicPrepCard).not.toHaveBeenCalled();
  });

  it.each([
    ["normal retrieval", { question: "How do I install the IRS?" }],
    ["prep card", { question: "Prep me for: IRS installation" }],
    ["forum research", { question: "Any IRS installation gotchas?", forumResearch: true }],
    ["web research", { question: "Research IRS installation online", webResearch: true }],
    ["web-worded manual retrieval", { question: "Search the web for IRS installation advice" }],
  ])("fails closed for %s when quota storage is unavailable", async (_, body) => {
    mocks.consumeLiveQuota.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request(body));

    expect(response.status).toBe(503);
    expect(mocks.responsesCreate).not.toHaveBeenCalled();
    expect(mocks.buildDynamicPrepCard).not.toHaveBeenCalled();
  });

  it("consumes quota before forum research calls OpenAI", async () => {
    const response = await POST(request({ question: "Any IRS installation gotchas?", forumResearch: true }));

    expect(response.status).toBe(200);
    expect(mocks.consumeLiveQuota).toHaveBeenCalledWith("user-owner");
    expect(mocks.responsesCreate).toHaveBeenCalledOnce();
    expect(mocks.consumeLiveQuota.mock.invocationCallOrder[0]).toBeLessThan(mocks.responsesCreate.mock.invocationCallOrder[0]);
  });

  it("consumes quota before both general-web research calls", async () => {
    const response = await POST(request({ question: "Research IRS installation online", webResearch: true }));

    expect(response.status).toBe(200);
    expect(mocks.consumeLiveQuota).toHaveBeenCalledOnce();
    expect(mocks.responsesCreate).toHaveBeenCalledTimes(2);
    expect(mocks.consumeLiveQuota.mock.invocationCallOrder[0]).toBeLessThan(mocks.responsesCreate.mock.invocationCallOrder[0]);
  });

  it("requires an explicit boolean flag before performing general-web research", async () => {
    const response = await POST(request({ question: "Search the web for IRS installation advice" }));

    expect(response.status).toBe(200);
    expect(mocks.responsesCreate).toHaveBeenCalledOnce();
    expect(mocks.responsesCreate).toHaveBeenCalledWith(expect.objectContaining({
      tools: [expect.objectContaining({ type: "file_search" })],
    }));
  });

  it("consumes quota before prep-card generation", async () => {
    const response = await POST(request({ question: "Prep me for: IRS installation" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.externalResearchSuggested).toBe(true);
    expect(mocks.consumeLiveQuota).toHaveBeenCalledOnce();
    expect(mocks.buildDynamicPrepCard).toHaveBeenCalledOnce();
    expect(mocks.consumeLiveQuota.mock.invocationCallOrder[0]).toBeLessThan(mocks.buildDynamicPrepCard.mock.invocationCallOrder[0]);
  });

  it("consumes quota before ordinary manual retrieval", async () => {
    const response = await POST(request({ question: "How do I install the IRS?" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.externalResearchSuggested).toBe(true);
    expect(mocks.consumeLiveQuota).toHaveBeenCalledOnce();
    expect(mocks.responsesCreate).toHaveBeenCalledOnce();
    expect(mocks.consumeLiveQuota.mock.invocationCallOrder[0]).toBeLessThan(mocks.responsesCreate.mock.invocationCallOrder[0]);
  });

  it("does not suggest external expansion when manual retrieval maps a citation", async () => {
    mocks.responsesCreate.mockResolvedValue(citedOpenAiResponse);

    const response = await POST(request({ question: "How do I install the IRS?" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.externalResearchSuggested).toBe(false);
    expect(body.citations).toHaveLength(1);
  });

  it("keeps an ordinary deterministic torque response free", async () => {
    mocks.getVerifiedTorqueResponse.mockReturnValue({ answer: "Verified torque record.", citations: [] });

    const response = await POST(request({ question: "What is the verified IRS torque?" }));

    expect(response.status).toBe(200);
    expect(mocks.consumeLiveQuota).not.toHaveBeenCalled();
    expect(mocks.responsesCreate).not.toHaveBeenCalled();
  });

  it("does not use the free deterministic shortcut for explicit research", async () => {
    mocks.getVerifiedTorqueResponse.mockReturnValue({ answer: "Verified torque record.", citations: [] });

    const response = await POST(request({ question: "Research IRS torque online", webResearch: true }));

    expect(response.status).toBe(200);
    expect(mocks.getVerifiedTorqueResponse).not.toHaveBeenCalled();
    expect(mocks.consumeLiveQuota).toHaveBeenCalledOnce();
    expect(mocks.responsesCreate).toHaveBeenCalledTimes(2);
  });
});
