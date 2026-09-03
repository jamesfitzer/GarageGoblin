import { describe, expect, it } from "vitest";
import { isWorkspace, safeLink } from "./workspace-schema";

const validWorkspace = {
  activeChatId: "chat-1",
  chats: [{
    id: "chat-1",
    title: "IRS installation",
    createdAt: "2026-09-03T12:00:00.000Z",
    updatedAt: "2026-09-03T12:00:00.000Z",
    messages: [{
      id: "message-1",
      role: "assistant",
      content: "Use the manual.",
      citations: [{ id: "manual", title: "Mk5 manual", authority: "Factory Five", url: "/api/sources/mk5#page=1", page: 1 }],
      createdAt: "2026-09-03T12:00:00.000Z",
    }],
  }],
  briefings: [],
};

describe("workspace schema", () => {
  it("accepts a valid current workspace and the older shape without optional research fields", () => {
    expect(isWorkspace(validWorkspace)).toBe(true);
  });

  it("rejects invalid nested values and an active chat that does not exist", () => {
    expect(isWorkspace({ ...validWorkspace, activeChatId: "missing" })).toBe(false);
    expect(isWorkspace({ ...validWorkspace, chats: [{ ...validWorkspace.chats[0], messages: [{ ...validWorkspace.chats[0].messages[0], role: "system" }] }] })).toBe(false);
    expect(isWorkspace({ ...validWorkspace, chats: [{ ...validWorkspace.chats[0], messages: [{ ...validWorkspace.chats[0].messages[0], content: 42 }] }] })).toBe(false);
  });

  it("rejects unsafe persisted source URLs", () => {
    const message = validWorkspace.chats[0].messages[0];
    const unsafe = {
      ...validWorkspace,
      chats: [{ ...validWorkspace.chats[0], messages: [{ ...message, citations: [{ ...message.citations[0], url: "javascript:alert(1)" }] }] }],
    };
    expect(isWorkspace(unsafe)).toBe(false);
  });
});

describe("safeLink", () => {
  it("allows normal external web URLs and single-slash app paths", () => {
    expect(safeLink("https://thefactoryfiveforum.com/thread")).toEqual({ href: "https://thefactoryfiveforum.com/thread", hostname: "thefactoryfiveforum.com" });
    expect(safeLink("/api/sources/mk5#page=1")).toEqual({ href: "/api/sources/mk5#page=1" });
  });

  it("rejects dangerous or ambiguous link destinations", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,nope", "//evil.example", "/\\evil.example", "https:// good.example", "not a url"]) {
      expect(safeLink(url)).toBeNull();
    }
  });
});
