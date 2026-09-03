import { describe, expect, it, vi } from "vitest";
import {
  readWebResearchSessionConsent,
  requestsExternalResearch,
  webResearchSessionConsentKey,
  writeWebResearchSessionConsent,
} from "./external-research";

describe("external research intent", () => {
  it.each([
    "Search the web for IRS installation advice",
    "What do the Factory Five forums recommend for this fitment?",
    "Look up Reddit experience with this component",
    "Is there an online consensus about this issue?",
  ])("recognizes an explicit external-search request: %s", (question) => {
    expect(requestsExternalResearch(question)).toBe(true);
  });

  it.each([
    "How do I install the IRS?",
    "What does the build manual say about brake lines?",
    "Can I drill the mount so the fourth bolt fits?",
    "Prep me for: fuel tank installation",
  ])("keeps an ordinary manual question internal: %s", (question) => {
    expect(requestsExternalResearch(question)).toBe(false);
  });
});

describe("session-scoped web research consent", () => {
  it("reads an allowed session", () => {
    const storage = { getItem: vi.fn().mockReturnValue("allowed"), setItem: vi.fn(), removeItem: vi.fn() };

    expect(readWebResearchSessionConsent(storage)).toBe(true);
    expect(storage.getItem).toHaveBeenCalledWith(webResearchSessionConsentKey);
  });

  it("writes and revokes session consent", () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };

    writeWebResearchSessionConsent(storage, true);
    writeWebResearchSessionConsent(storage, false);

    expect(storage.setItem).toHaveBeenCalledWith(webResearchSessionConsentKey, "allowed");
    expect(storage.removeItem).toHaveBeenCalledWith(webResearchSessionConsentKey);
  });

  it("fails safely when session storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error("blocked"); }),
      setItem: vi.fn(() => { throw new Error("blocked"); }),
      removeItem: vi.fn(() => { throw new Error("blocked"); }),
    };

    expect(readWebResearchSessionConsent(storage)).toBe(false);
    expect(() => writeWebResearchSessionConsent(storage, true)).not.toThrow();
    expect(() => writeWebResearchSessionConsent(storage, false)).not.toThrow();
  });
});
