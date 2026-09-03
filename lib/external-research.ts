export const webResearchSessionConsentKey = "garage-goblin.web-research-consent.v1";

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function requestsExternalResearch(question: string) {
  const mentionsExternalSource = /\b(?:forum|forums|google|web|internet|online|reddit)\b/i.test(question);
  const asksForOutsidePerspective = /\b(?:search|research|look\s*up|check|find|what\s+(?:do|does)\b[\s\S]{0,32}\b(?:say|think|recommend|use)|how\b[\s\S]{0,32}\b(?:feel|think)|consensus|experience)\b/i.test(question);
  return mentionsExternalSource && asksForOutsidePerspective;
}

export function readWebResearchSessionConsent(storage: SessionStorage) {
  try {
    return storage.getItem(webResearchSessionConsentKey) === "allowed";
  } catch {
    return false;
  }
}

export function writeWebResearchSessionConsent(storage: SessionStorage, allowed: boolean) {
  try {
    if (allowed) storage.setItem(webResearchSessionConsentKey, "allowed");
    else storage.removeItem(webResearchSessionConsentKey);
  } catch {
    // Storage can be unavailable without preventing one-time consent.
  }
}
