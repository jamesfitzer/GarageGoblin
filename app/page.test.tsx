// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { webResearchSessionConsentKey } from "@/lib/external-research";
import Home from "./page";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <span aria-label="Test user" />,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

type BriefingRequest = {
  question: string;
  webResearch: boolean;
  context?: string;
};

const manualAnswer = {
  answer: "Approved manual answer.",
  citations: [{ id: "manual-1", title: "Mk5 manual", authority: "Factory Five", url: "/api/sources/manual#page=1", page: 1 }],
  externalResearchSuggested: false,
};

const externalAnswer = {
  answer: "External context.",
  citations: [],
  webSources: [{ title: "Factory Five Forum thread", url: "https://thefactoryfiveforum.com/example", sourceType: "Factory Five Forum" }],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

function installFetch(respondToBriefing: (body: BriefingRequest, requestNumber: number) => Response) {
  const briefingRequests: BriefingRequest[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "/api/workspace") return jsonResponse({ error: "Use local test workspace." }, 503);
    if (url === "/api/briefing") {
      const body = JSON.parse(String(init?.body)) as BriefingRequest;
      briefingRequests.push(body);
      return respondToBriefing(body, briefingRequests.length);
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return briefingRequests;
}

async function renderHome() {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: /enter the garage/i }));
  const input = screen.getByRole("textbox", { name: "Build question" }) as HTMLInputElement;
  await waitFor(() => expect(input.disabled).toBe(false));
  return { user, input };
}

async function ask(user: ReturnType<typeof userEvent.setup>, input: HTMLInputElement, question: string) {
  await user.clear(input);
  await user.type(input, question);
  await user.click(screen.getByRole("button", { name: "Ask" }));
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: createStorage() });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: createStorage() });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("external research consent experience", () => {
  it("does not call the briefing API until the user chooses, then honors approved sources only", async () => {
    const requests = installFetch(() => jsonResponse(manualAnswer));
    const { user, input } = await renderHome();

    await ask(user, input, "Search the web for IRS installation advice");

    expect(await screen.findByRole("group", { name: "External research permission" })).toBeTruthy();
    expect(requests).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Use approved sources only" }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      question: "Search the web for IRS installation advice",
      webResearch: false,
    });
    expect(await screen.findByText("Approved manual answer.")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "External research permission" })).toBeNull();
  });

  it("dismisses a no-citation expansion without making another request", async () => {
    const requests = installFetch(() => jsonResponse({
      answer: "No exact manual citation was found.",
      citations: [],
      externalResearchSuggested: true,
    }));
    const { user, input } = await renderHome();

    await ask(user, input, "How should I fit this unusual bracket?");
    expect(await screen.findByRole("button", { name: "Stay with official sources" })).toBeTruthy();
    expect(requests).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Stay with official sources" }));

    await waitFor(() => expect(screen.queryByRole("group", { name: "External research permission" })).toBeNull());
    expect(requests).toHaveLength(1);
  });

  it("explains that a cited personal-preference answer leaves the choice to the builder", async () => {
    const requests = installFetch(() => jsonResponse({
      answer: "Factory Five does not prescribe a body color; the choice is up to you.",
      citations: [{ id: "paint-supplies", title: "Mk5 manual", authority: "Factory Five", url: "/api/sources/manual#page=1", page: 1 }],
      sourceCoverage: "personal_preference",
      externalResearchSuggested: true,
    }));
    const { user, input } = await renderHome();

    await ask(user, input, "What color should I paint my FF Roadster?");

    expect(await screen.findByRole("heading", { name: "The manual leaves this choice to you." })).toBeTruthy();
    expect(screen.getByText(/This is a builder preference, not a controlling build decision/i)).toBeTruthy();
    expect(screen.queryByText(/STOP & VERIFY/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Stay with official sources" }));
    await waitFor(() => expect(screen.queryByRole("group", { name: "External research permission" })).toBeNull());
    expect(requests).toHaveLength(1);
  });

  it("runs an approved expansion as a separate request with the manual result as context", async () => {
    const requests = installFetch((body) => body.webResearch
      ? jsonResponse(externalAnswer)
      : jsonResponse({ answer: "Manual search found no exact instruction.", citations: [], externalResearchSuggested: true }));
    const { user, input } = await renderHome();

    await ask(user, input, "How should I fit this unusual bracket?");
    await user.click(await screen.findByRole("button", { name: "Search forum + web once" }));

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0].webResearch).toBe(false);
    expect(requests[1].webResearch).toBe(true);
    expect(requests[1].context).toContain("APPROVED-SOURCE RESULT");
    expect(requests[1].context).toContain("Manual search found no exact instruction.");
  });

  it("keeps one-time approval temporary", async () => {
    const requests = installFetch(() => jsonResponse(externalAnswer));
    const { user, input } = await renderHome();

    await ask(user, input, "Search the web for IRS installation advice");
    await user.click(await screen.findByRole("button", { name: "Search forum + web once" }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].webResearch).toBe(true);
    expect(window.sessionStorage.getItem(webResearchSessionConsentKey)).toBeNull();

    await ask(user, input, "Look up Reddit experience with this component");

    expect(await screen.findByRole("group", { name: "External research permission" })).toBeTruthy();
    expect(requests).toHaveLength(1);
  });

  it("honors session approval only for explicit requests and supports revocation", async () => {
    const requests = installFetch((body) => jsonResponse(body.webResearch ? externalAnswer : manualAnswer));
    const { user, input } = await renderHome();

    await ask(user, input, "Search the web for IRS installation advice");
    await user.click(await screen.findByRole("button", { name: "Allow requested searches this session" }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].webResearch).toBe(true);
    expect(window.sessionStorage.getItem(webResearchSessionConsentKey)).toBe("allowed");

    await ask(user, input, "What does the build manual say about brake lines?");
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].webResearch).toBe(false);

    await ask(user, input, "Look up Reddit experience with this component");
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].webResearch).toBe(true);

    await user.click(screen.getByRole("button", { name: "Ask me each time" }));
    expect(window.sessionStorage.getItem(webResearchSessionConsentKey)).toBeNull();

    await ask(user, input, "Search the forum for brake-line routing advice");

    expect(await screen.findByRole("group", { name: "External research permission" })).toBeTruthy();
    expect(requests).toHaveLength(3);
  });

  it("does not auto-expand an ambiguous manual answer when session consent exists", async () => {
    window.sessionStorage.setItem(webResearchSessionConsentKey, "allowed");
    const requests = installFetch(() => jsonResponse({
      answer: "The approved sources mention this topic but do not settle the decision.",
      citations: [{ id: "context", title: "Mk5 manual", authority: "Factory Five", url: "/api/sources/manual#page=1", page: 1 }],
      sourceCoverage: "context_only",
      externalResearchSuggested: true,
    }));
    const { user, input } = await renderHome();

    await ask(user, input, "Which aftermarket option should I buy?");

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].webResearch).toBe(false);
    expect(await screen.findByRole("heading", { name: "Manual context, but no recommendation." })).toBeTruthy();
    expect(requests).toHaveLength(1);
  });

  it("keeps the consent prompt available when external research fails", async () => {
    const requests = installFetch((_body, requestNumber) => requestNumber === 1
      ? jsonResponse({ error: "External research is temporarily unavailable." }, 503)
      : jsonResponse(externalAnswer));
    const { user, input } = await renderHome();

    await ask(user, input, "Search the web for IRS installation advice");
    await user.click(await screen.findByRole("button", { name: "Search forum + web once" }));

    expect(await screen.findByText("External research is temporarily unavailable.")).toBeTruthy();
    expect(screen.getByRole("group", { name: "External research permission" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Search forum + web once" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(await screen.findByText("External context.")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "External research permission" })).toBeNull();
  });

  it("does not make unsafe model or external-source URLs clickable", async () => {
    installFetch(() => jsonResponse({
      answer: "Do not open [this link](javascript:alert(1)).",
      citations: [],
      webSources: [{ title: "Unsafe source", url: "javascript:alert(1)", sourceType: "General web" }],
    }));
    const { user, input } = await renderHome();

    await ask(user, input, "What should I inspect?");

    expect(await screen.findByText("this link")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "this link" })).toBeNull();
    expect(screen.queryByRole("link", { name: /unsafe source/i })).toBeNull();
  });

  it("shows an external source hostname beside a safe research link", async () => {
    const requests = installFetch(() => jsonResponse(externalAnswer));
    const { user, input } = await renderHome();

    await ask(user, input, "What should I inspect?");

    expect((await screen.findByRole("link", { name: /factory five forum thread/i })).getAttribute("href")).toBe("https://thefactoryfiveforum.com/example");
    expect(screen.getByText("thefactoryfiveforum.com")).toBeTruthy();
    expect(requests).toHaveLength(1);
  });
});
