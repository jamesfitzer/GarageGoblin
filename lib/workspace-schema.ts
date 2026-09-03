import type { BriefingArtifact, BriefingSection } from "@/lib/briefing-template";
import type { SourceCoverage } from "@/lib/source-coverage";
import type { TorqueSpec } from "@/lib/torque-specs";

export type Citation = { id: string; title: string; authority: string; url: string; page?: number; pageStart?: number; pageEnd?: number; section?: string };
export type WebResearchSource = { title: string; url: string; sourceType: "Factory Five Forum" | "General web" };
export type TorqueSupplement = { title: string; specs: TorqueSpec[] };
export type ForumResearch = { answer: string; sources: { title: string; url: string }[]; warning?: string };
export type ExternalResearchPrompt = { reason: "requested" | "insufficient"; question: string; context?: string; sourceCoverage?: SourceCoverage };
export type WorkspaceMessage = { id: string; role: "user" | "assistant"; content: string; citations?: Citation[]; warning?: string; torqueSupplement?: TorqueSupplement; briefingArtifact?: BriefingArtifact; forumResearch?: ForumResearch; webSources?: WebResearchSource[]; externalResearchPrompt?: ExternalResearchPrompt; createdAt: string };
export type WorkspaceChat = { id: string; title: string; createdAt: string; updatedAt: string; messages: WorkspaceMessage[] };
export type SavedBriefing = { id: string; chatId: string; title: string; question: string; content: string; citations: Citation[]; warning?: string; torqueSupplement?: TorqueSupplement; briefingArtifact?: BriefingArtifact; forumResearch?: ForumResearch; webSources?: WebResearchSource[]; phase: "Inventory" | "Mock-up" | "Assembly" | "Setup" | "Commissioning"; readiness: "Ready" | "Ready after checks" | "Stop pending resolution"; createdAt: string };
export type PersistedWorkspace = { activeChatId: string | null; chats: WorkspaceChat[]; briefings: SavedBriefing[] };

const phases = new Set<SavedBriefing["phase"]>(["Inventory", "Mock-up", "Assembly", "Setup", "Commissioning"]);
const readinessValues = new Set<SavedBriefing["readiness"]>(["Ready", "Ready after checks", "Stop pending resolution"]);
const coverageValues = new Set<SourceCoverage>(["direct", "context_only", "personal_preference", "ambiguous"]);
const briefingSectionIds = new Set<BriefingSection["id"]>(["what-youre-doing", "bring", "do", "watch", "next", "verify", "stop"]);
const briefingSectionTitles = new Set<BriefingSection["title"]>(["What you're doing", "Bring to the car", "Do this", "Watch for", "Next / selected follow-on work", "Verify before closing", "STOP & VERIFY"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isString(value: unknown, maxLength = 100_000): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function optionalString(value: unknown, maxLength?: number) {
  return value === undefined || isString(value, maxLength);
}

function optionalPositiveInteger(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isSafeInteger(value) && value > 0);
}

/** Returns a safe link destination or null. Only normal app paths and web links are allowed. */
export function safeLink(url: unknown): { href: string; hostname?: string } | null {
  if (!isString(url, 4_096) || !url || /[\u0000-\u001F\u007F\s]/.test(url)) return null;
  if (url.startsWith("/")) {
    if (url.startsWith("//") || url.startsWith("/\\") || url.includes("\\")) return null;
    return { href: url };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return { href: url, hostname: parsed.hostname };
  } catch {
    return null;
  }
}

function isCitation(value: unknown): value is Citation {
  const citation = record(value);
  return Boolean(citation && onlyKeys(citation, ["id", "title", "authority", "url", "page", "pageStart", "pageEnd", "section"])
    && isString(citation.id, 200) && isString(citation.title, 1_000) && isString(citation.authority, 1_000)
    && safeLink(citation.url) && optionalPositiveInteger(citation.page) && optionalPositiveInteger(citation.pageStart)
    && optionalPositiveInteger(citation.pageEnd) && optionalString(citation.section, 1_000));
}

function isWebResearchSource(value: unknown): value is WebResearchSource {
  const source = record(value);
  return Boolean(source && onlyKeys(source, ["title", "url", "sourceType"])
    && isString(source.title, 1_000) && safeLink(source.url)
    && (source.sourceType === "Factory Five Forum" || source.sourceType === "General web"));
}

function isForumResearch(value: unknown): value is ForumResearch {
  const research = record(value);
  return Boolean(research && onlyKeys(research, ["answer", "sources", "warning"])
    && isString(research.answer) && optionalString(research.warning)
    && Array.isArray(research.sources) && research.sources.length <= 50
    && research.sources.every((source) => {
      const item = record(source);
      return Boolean(item && onlyKeys(item, ["title", "url"]) && isString(item.title, 1_000) && safeLink(item.url));
    }));
}

function isTorqueSpec(value: unknown): value is TorqueSpec {
  const spec = record(value);
  const source = spec && record(spec.source);
  return Boolean(spec && source && onlyKeys(spec, ["id", "component", "configuration", "lbFt", "newtonMeters", "additionalOperation", "source", "status", "notes"])
    && onlyKeys(source, ["sourceId", "file", "page", "section", "authority"])
    && isString(spec.id, 200) && isString(spec.component, 1_000) && Array.isArray(spec.configuration) && spec.configuration.length <= 30 && spec.configuration.every((item) => isString(item, 1_000))
    && isString(spec.lbFt, 200) && (spec.newtonMeters === null || isString(spec.newtonMeters, 200)) && optionalString(spec.additionalOperation, 2_000)
    && isString(source.sourceId, 200) && isString(source.file, 1_000) && optionalPositiveInteger(source.page) && isString(source.section, 1_000) && isString(source.authority, 1_000)
    && (spec.status === "verified" || spec.status === "needs-review") && optionalString(spec.notes, 2_000));
}

function isTorqueSupplement(value: unknown): value is TorqueSupplement {
  const supplement = record(value);
  return Boolean(supplement && onlyKeys(supplement, ["title", "specs"])
    && isString(supplement.title, 1_000) && Array.isArray(supplement.specs) && supplement.specs.length <= 100 && supplement.specs.every(isTorqueSpec));
}

function isBriefingArtifact(value: unknown): value is BriefingArtifact {
  const artifact = record(value);
  if (!artifact || !onlyKeys(artifact, ["prepared", "buildPhase", "applicableConfiguration", "primaryAuthority", "readiness", "sections"])
    || !isString(artifact.prepared, 100) || !isString(artifact.buildPhase, 1_000) || !isString(artifact.applicableConfiguration, 4_000)
    || !isString(artifact.primaryAuthority, 1_000) || !readinessValues.has(artifact.readiness as SavedBriefing["readiness"])
    || !Array.isArray(artifact.sections) || artifact.sections.length !== 7) return false;
  return artifact.sections.every((section) => {
    const item = record(section);
    return Boolean(item && onlyKeys(item, ["id", "title", "content"]) && briefingSectionIds.has(item.id as BriefingSection["id"])
      && briefingSectionTitles.has(item.title as BriefingSection["title"]) && isString(item.content));
  });
}

function isExternalResearchPrompt(value: unknown): value is ExternalResearchPrompt {
  const prompt = record(value);
  return Boolean(prompt && onlyKeys(prompt, ["reason", "question", "context", "sourceCoverage"])
    && (prompt.reason === "requested" || prompt.reason === "insufficient") && isString(prompt.question, 10_000)
    && optionalString(prompt.context, 10_000) && (prompt.sourceCoverage === undefined || coverageValues.has(prompt.sourceCoverage as SourceCoverage)));
}

function isMessage(value: unknown): value is WorkspaceMessage {
  const message = record(value);
  return Boolean(message && onlyKeys(message, ["id", "role", "content", "citations", "warning", "torqueSupplement", "briefingArtifact", "forumResearch", "webSources", "externalResearchPrompt", "createdAt"])
    && isString(message.id, 200) && (message.role === "user" || message.role === "assistant") && isString(message.content)
    && isString(message.createdAt, 100) && optionalString(message.warning)
    && (message.citations === undefined || (Array.isArray(message.citations) && message.citations.length <= 100 && message.citations.every(isCitation)))
    && (message.torqueSupplement === undefined || isTorqueSupplement(message.torqueSupplement))
    && (message.briefingArtifact === undefined || isBriefingArtifact(message.briefingArtifact))
    && (message.forumResearch === undefined || isForumResearch(message.forumResearch))
    && (message.webSources === undefined || (Array.isArray(message.webSources) && message.webSources.length <= 50 && message.webSources.every(isWebResearchSource)))
    && (message.externalResearchPrompt === undefined || isExternalResearchPrompt(message.externalResearchPrompt)));
}

function isChat(value: unknown): value is WorkspaceChat {
  const chat = record(value);
  return Boolean(chat && onlyKeys(chat, ["id", "title", "createdAt", "updatedAt", "messages"])
    && isString(chat.id, 200) && isString(chat.title, 10_000) && isString(chat.createdAt, 100) && isString(chat.updatedAt, 100)
    && Array.isArray(chat.messages) && chat.messages.length <= 1_000 && chat.messages.every(isMessage));
}

function isSavedBriefing(value: unknown): value is SavedBriefing {
  const briefing = record(value);
  return Boolean(briefing && onlyKeys(briefing, ["id", "chatId", "title", "question", "content", "citations", "warning", "torqueSupplement", "briefingArtifact", "forumResearch", "webSources", "phase", "readiness", "createdAt"])
    && isString(briefing.id, 200) && isString(briefing.chatId, 200) && isString(briefing.title, 10_000) && isString(briefing.question, 10_000)
    && isString(briefing.content) && isString(briefing.createdAt, 100) && phases.has(briefing.phase as SavedBriefing["phase"])
    && readinessValues.has(briefing.readiness as SavedBriefing["readiness"]) && Array.isArray(briefing.citations) && briefing.citations.length <= 100 && briefing.citations.every(isCitation)
    && optionalString(briefing.warning) && (briefing.torqueSupplement === undefined || isTorqueSupplement(briefing.torqueSupplement))
    && (briefing.briefingArtifact === undefined || isBriefingArtifact(briefing.briefingArtifact))
    && (briefing.forumResearch === undefined || isForumResearch(briefing.forumResearch))
    && (briefing.webSources === undefined || (Array.isArray(briefing.webSources) && briefing.webSources.length <= 50 && briefing.webSources.every(isWebResearchSource))));
}

export function isWorkspace(value: unknown): value is PersistedWorkspace {
  const workspace = record(value);
  if (!workspace || !onlyKeys(workspace, ["activeChatId", "chats", "briefings"])
    || !(workspace.activeChatId === null || isString(workspace.activeChatId, 200))
    || !Array.isArray(workspace.chats) || workspace.chats.length > 200 || !workspace.chats.every(isChat)
    || !Array.isArray(workspace.briefings) || workspace.briefings.length > 500 || !workspace.briefings.every(isSavedBriefing)) return false;
  return workspace.activeChatId === null || workspace.chats.some((chat) => chat.id === workspace.activeChatId);
}
