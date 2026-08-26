"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { initialSources } from "@/lib/sources";
import { torqueSpecs, type TorqueSpec } from "@/lib/torque-specs";
import type { BriefingArtifact } from "@/lib/briefing-template";

type Citation = { id: string; title: string; authority: string; url: string; page?: number };
type WebResearchSource = { title: string; url: string; sourceType: "Factory Five Forum" | "General web" };
type TorqueSupplement = { title: string; specs: TorqueSpec[] };
type ForumResearch = { answer: string; sources: { title: string; url: string }[]; warning?: string };
type BriefingResponse = { answer: string; citations: Citation[]; warning?: string; torqueSupplement?: TorqueSupplement; briefingArtifact?: BriefingArtifact; webSources?: WebResearchSource[] };
type Message = { id: string; role: "user" | "assistant"; content: string; citations?: Citation[]; warning?: string; torqueSupplement?: TorqueSupplement; briefingArtifact?: BriefingArtifact; forumResearch?: ForumResearch; webSources?: WebResearchSource[]; createdAt: string };
type Chat = { id: string; title: string; createdAt: string; updatedAt: string; messages: Message[] };
type SavedBriefing = { id: string; chatId: string; title: string; question: string; content: string; citations: Citation[]; warning?: string; torqueSupplement?: TorqueSupplement; briefingArtifact?: BriefingArtifact; forumResearch?: ForumResearch; webSources?: WebResearchSource[]; phase: "Inventory" | "Mock-up" | "Assembly" | "Setup" | "Commissioning"; readiness: "Ready" | "Ready after checks" | "Stop pending resolution"; createdAt: string };
type StoredWorkspace = { chats: Chat[]; activeChatId: string; briefings: SavedBriefing[] };

const storageKey = "garage-goblin.local-workspace.v1";
const quickPrompts = ["Prep me for: 2015+ IRS installation.", "What gear oil and friction modifier does this 2015+ IRS need?", "Can I drill or grind the IRS mount so the fourth bolt goes in?"];
const phases: SavedBriefing["phase"][] = ["Inventory", "Mock-up", "Assembly", "Setup", "Commissioning"];
const readinessStates: SavedBriefing["readiness"][] = ["Ready", "Ready after checks", "Stop pending resolution"];

function newId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function makeChat(): Chat { const now = new Date().toISOString(); return { id: newId("chat"), title: "New garage conversation", createdAt: now, updatedAt: now, messages: [] }; }
function formatDate(date: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date)); }
function normalizeBriefingQuestion(question: string) { return question.trim().replace(/\s+/g, " ").toLowerCase(); }
function requestsExternalResearch(question: string) { return /\b(?:search|look\s*up|check|see\s+what)\b[\s\S]{0,80}\b(?:forum|forums|google|web|internet)\b/i.test(question); }

export default function Home() {
  const [question, setQuestion] = useState(quickPrompts[0]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [briefings, setBriefings] = useState<SavedBriefing[]>([]);
  const [activeBriefingId, setActiveBriefingId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "briefings" | "torque">("chat");
  const [phase, setPhase] = useState<SavedBriefing["phase"]>("Assembly");
  const [readiness, setReadiness] = useState<SavedBriefing["readiness"]>("Ready after checks");
  const [loading, setLoading] = useState(false);
  const [forumResearchingMessageId, setForumResearchingMessageId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const workspace = JSON.parse(saved) as StoredWorkspace;
        if (workspace.chats?.length && workspace.activeChatId) {
          setChats(workspace.chats); setActiveChatId(workspace.activeChatId); setBriefings(workspace.briefings ?? []); setHydrated(true); return;
        }
      }
    } catch { /* A broken cache should not prevent a new workspace. */ }
    const firstChat = makeChat(); setChats([firstChat]); setActiveChatId(firstChat.id); setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !activeChatId) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ chats, activeChatId, briefings }));
  }, [activeChatId, briefings, chats, hydrated]);

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId) ?? null, [activeChatId, chats]);
  const activeBriefing = useMemo(() => briefings.find((briefing) => briefing.id === activeBriefingId) ?? null, [activeBriefingId, briefings]);
  const latestAnswer = useMemo(() => [...(activeChat?.messages ?? [])].reverse().find((message) => message.role === "assistant") ?? null, [activeChat]);

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [activeChat?.id, activeChat?.messages.length, loading]);

  function createChat() { const chat = makeChat(); setChats((current) => [chat, ...current]); setActiveChatId(chat.id); setView("chat"); }
  function resetLocalWorkspace() {
    if (!window.confirm("Reset all local Garage Goblin chats and saved briefings on this browser?")) return;
    const firstChat = makeChat();
    window.localStorage.removeItem(storageKey);
    setChats([firstChat]); setActiveChatId(firstChat.id); setBriefings([]); setActiveBriefingId(null); setQuestion(quickPrompts[0]); setView("chat");
  }
  function appendMessage(chatId: string, message: Message, title?: string) {
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, title: title ?? chat.title, updatedAt: message.createdAt, messages: [...chat.messages, message] } : chat));
  }

  async function researchForum(chatId: string, messageId: string, briefingQuestion: string) {
    if (forumResearchingMessageId || !briefingQuestion) return;
    setForumResearchingMessageId(messageId);
    try {
      const response = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: briefingQuestion, forumResearch: true }) });
      const body = (await response.json()) as { forumResearch?: ForumResearch; error?: string };
      if (!response.ok || !body.forumResearch) throw new Error(body.error ?? "The Goblin could not search the forum.");
      setChats((current) => current.map((chat) => chat.id !== chatId ? chat : { ...chat, messages: chat.messages.map((message) => message.id === messageId ? { ...message, forumResearch: body.forumResearch } : message) }));
      setBriefings((current) => current.map((briefing) => normalizeBriefingQuestion(briefing.question) === normalizeBriefingQuestion(briefingQuestion) ? { ...briefing, forumResearch: body.forumResearch } : briefing));
    } catch (error) {
      const warning = error instanceof Error ? error.message : "The Goblin could not search the forum.";
      setChats((current) => current.map((chat) => chat.id !== chatId ? chat : { ...chat, messages: chat.messages.map((message) => message.id === messageId ? { ...message, forumResearch: { answer: "No forum research was added.", sources: [], warning } } : message) }));
    } finally { setForumResearchingMessageId(null); }
  }

  function findBriefingMessage(briefing: SavedBriefing) {
    const chat = chats.find((item) => item.id === briefing.chatId);
    if (!chat) return undefined;
    let latestQuestion = "";
    for (const message of chat.messages) {
      if (message.role === "user") latestQuestion = message.content;
      if (message.role === "assistant" && message.briefingArtifact && normalizeBriefingQuestion(latestQuestion) === normalizeBriefingQuestion(briefing.question)) {
        return { chatId: chat.id, messageId: message.id };
      }
    }
    return undefined;
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !activeChat || loading) return;
    const askedAt = new Date().toISOString();
    appendMessage(activeChat.id, { id: newId("message"), role: "user", content: trimmedQuestion, createdAt: askedAt }, activeChat.messages.length === 0 ? trimmedQuestion : undefined);
    setQuestion(""); setLoading(true);
    try {
      const webResearch = requestsExternalResearch(trimmedQuestion);
      const priorContext = webResearch ? activeChat.messages.slice(-4).map((message) => `${message.role}: ${message.content}`).join("\n\n") : undefined;
      const response = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: trimmedQuestion, webResearch, context: priorContext }) });
      const body = (await response.json()) as BriefingResponse & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The Goblin lost the trail.");
      const answer: Message = { id: newId("message"), role: "assistant", content: body.answer, citations: body.citations, warning: body.warning, torqueSupplement: body.torqueSupplement, briefingArtifact: body.briefingArtifact, webSources: body.webSources, createdAt: new Date().toISOString() };
      appendMessage(activeChat.id, answer);
      if (/^prep me for\s*:/i.test(trimmedQuestion)) {
        const briefing: SavedBriefing = { id: newId("briefing"), chatId: activeChat.id, title: trimmedQuestion, question: trimmedQuestion, content: answer.content, citations: answer.citations ?? [], warning: answer.warning, torqueSupplement: answer.torqueSupplement, briefingArtifact: answer.briefingArtifact, forumResearch: answer.forumResearch, phase: "Assembly", readiness: answer.briefingArtifact?.readiness ?? "Ready after checks", createdAt: new Date().toISOString() };
        setBriefings((current) => {
          const existing = current.find((item) => normalizeBriefingQuestion(item.question) === normalizeBriefingQuestion(trimmedQuestion));
          if (!existing) return [briefing, ...current];
          const refreshed = { ...briefing, id: existing.id, createdAt: existing.createdAt };
          return current.map((item) => item.id === existing.id ? refreshed : item);
        });
        const existing = briefings.find((item) => normalizeBriefingQuestion(item.question) === normalizeBriefingQuestion(trimmedQuestion));
        setActiveBriefingId(existing?.id ?? briefing.id); setView("briefings");
      }
    } catch (error) {
      appendMessage(activeChat.id, { id: newId("message"), role: "assistant", content: error instanceof Error ? error.message : "Unknown error.", citations: [], createdAt: new Date().toISOString() });
    } finally { setLoading(false); }
  }

  function saveBriefing(message: Message) {
    if (!activeChat || message.role !== "assistant") return;
    const questionMessage = [...activeChat.messages].reverse().find((item) => item.role === "user");
    const briefing: SavedBriefing = { id: newId("briefing"), chatId: activeChat.id, title: questionMessage?.content ?? activeChat.title, question: questionMessage?.content ?? "Garage Goblin briefing", content: message.content, citations: message.citations ?? [], warning: message.warning, torqueSupplement: message.torqueSupplement, briefingArtifact: message.briefingArtifact, forumResearch: message.forumResearch, webSources: message.webSources, phase, readiness, createdAt: new Date().toISOString() };
    setBriefings((current) => [briefing, ...current]); setActiveBriefingId(briefing.id); setView("briefings");
  }

  return <main className="app-shell">
    {!bootComplete && <GarageBootSequence onDismiss={() => setBootComplete(true)} />}
    <aside className="app-sidebar">
      <div className="brand-lockup">
        <img src="/brand/garage-goblin-sidebar-icon.png" alt="Garage Goblin mascot" />
        <div><strong>Garage Goblin</strong><span>Factory Five Mk5 Roadster</span><em>Garage systems nominal-ish</em></div>
      </div>
      <button className="new-chat sidebar-new-chat" type="button" onClick={createChat}>+ New conversation</button>
      <nav className="workspace-tabs" role="tablist" aria-label="Garage Goblin workspace">
        <button className={view === "chat" ? "active" : ""} type="button" onClick={() => setView("chat")}>Garage chat</button>
        <button className={view === "briefings" ? "active" : ""} type="button" onClick={() => setView("briefings")}>Build briefings <span>{briefings.length}</span></button>
        <button className={view === "torque" ? "active" : ""} type="button" onClick={() => setView("torque")}>Torque specs <span>{torqueSpecs.length}</span></button>
      </nav>
      <section className="sidebar-section"><div className="sidebar-heading"><h2>Conversations</h2><span>{chats.length}</span></div>
        <div className="chat-list">{chats.map((chat) => <button className={chat.id === activeChatId ? "chat-row active" : "chat-row"} type="button" key={chat.id} onClick={() => { setActiveChatId(chat.id); setView("chat"); }}><strong>{chat.title}</strong><span>{chat.messages.length ? `${chat.messages.length} messages · ${formatDate(chat.updatedAt)}` : "Empty conversation"}</span></button>)}</div>
      </section>
      <details className="source-library"><summary>Initial official sources</summary><p className="status">Manual-first retrieval proof.</p>
        <a className="source" href="/api/sources/mk5-roadster-manual#page=104" target="_blank" rel="noreferrer">Mk5 Roadster Assembly Manual<small>IRS starts at PDF p. 104</small></a>
        <a className="source" href="/api/sources/2015-mustang-irs#page=1" target="_blank" rel="noreferrer">2015+ Mustang IRS Instructions</a>
        <a className="source" href="/api/sources/2015-irs-swaybar#page=1" target="_blank" rel="noreferrer">2015 IRS Sway Bar Instructions</a>
        <a className="source" href="/api/sources/koni-irs-coil-overs#page=1" target="_blank" rel="noreferrer">Koni IRS Coil-Over Instructions</a>
      </details>
      <button className="reset-workspace" type="button" onClick={resetLocalWorkspace}>Reset local demo workspace</button>
    </aside>
    <section className="app-main">
      <header className="app-header"><div><div className="eyebrow">Factory Five Mk5 Roadster / Local Retrieval Proof</div><h1>{view === "chat" ? (activeChat?.title ?? "Garage chat") : view === "briefings" ? "Build briefings" : "Torque specs"}</h1></div><span className="status">Local-only workspace</span></header>
    {view === "chat" ? <section className="chat-workspace">
        <div className="conversation" aria-live="polite" ref={conversationRef}>
          {!activeChat?.messages.length && <p className="empty-state">Ask a manual question. This conversation will remain here on this browser.</p>}
          {activeChat?.messages.map((message, index) => { const briefingQuestion = [...activeChat.messages.slice(0, index + 1)].reverse().find((item) => item.role === "user")?.content; return <article className={`message message-${message.role}`} key={message.id}>
            <div className="message-label">{message.role === "user" ? "You" : "Garage Goblin"} <time>{formatDate(message.createdAt)}</time></div>
            {message.briefingArtifact ? <BriefingArtifactView artifact={message.briefingArtifact} forumResearch={message.forumResearch} onResearchForum={() => researchForum(activeChat.id, message.id, briefingQuestion ?? "")} researchingForum={forumResearchingMessageId === message.id} /> : <MarkdownContent content={message.content} />}
            {message.warning && <div className="notice">{message.warning}</div>}
            {message.torqueSupplement && <BriefingTorqueSupplement supplement={message.torqueSupplement} />}
            <CitationCards citations={message.citations ?? []} />
            {message.webSources && <WebResearchSources sources={message.webSources} />}
          </article>; })}
          {loading && <div className="searching"><span aria-hidden="true">⌁</span>The Goblin is checking the manuals…</div>}
        </div>
        <div className="composer"><div className="quick">{quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>{prompt}</button>)}</div>
        <form className="prompt" onSubmit={ask}><input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Build question" placeholder="Ask a manual-grounded build question" disabled={!activeChat || loading} /><button disabled={!activeChat || loading}>{loading ? "Searching..." : "Ask"}</button></form>
        {latestAnswer && <div className="capture">
          <div><strong>Save the latest answer as a build briefing</strong><span>Capture this answer and its exact source cards for the workbench.</span></div>
          <label>Phase<select value={phase} onChange={(event) => setPhase(event.target.value as SavedBriefing["phase"])}>{phases.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Readiness<select value={readiness} onChange={(event) => setReadiness(event.target.value as SavedBriefing["readiness"])}>{readinessStates.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button type="button" onClick={() => saveBriefing(latestAnswer)}>Save briefing</button>
        </div>}</div>
      </section>
     : view === "briefings" ? <section className="briefing-grid">
      <aside className="panel briefing-list"><div className="panel-heading"><h2>Saved build briefings</h2><span className="status">{briefings.length} saved</span></div>
        {!briefings.length && <p className="empty-state">Save an answer from Garage chat to make your first workbench briefing.</p>}
        {briefings.map((briefing) => <button type="button" key={briefing.id} className={briefing.id === activeBriefingId ? "briefing-row active" : "briefing-row"} onClick={() => setActiveBriefingId(briefing.id)}><strong>{briefing.title}</strong><span>{briefing.phase} · {briefing.readiness}</span><small>{formatDate(briefing.createdAt)}</small></button>)}
      </aside>
      <section className="panel briefing-detail">{activeBriefing ? <><div className="panel-heading"><div><div className="eyebrow">Saved workbench artifact</div><h2>{activeBriefing.title}</h2></div><span className="readiness">{activeBriefing.readiness}</span></div>
        <p className="briefing-question">{activeBriefing.question}</p>{activeBriefing.briefingArtifact ? <BriefingArtifactView artifact={activeBriefing.briefingArtifact} forumResearch={activeBriefing.forumResearch} onResearchForum={() => { const message = findBriefingMessage(activeBriefing); if (message) researchForum(message.chatId, message.messageId, activeBriefing.question); }} researchingForum={forumResearchingMessageId !== null} /> : <MarkdownContent content={activeBriefing.content} />}{activeBriefing.warning && <div className="notice">{activeBriefing.warning}</div>}{activeBriefing.torqueSupplement && <BriefingTorqueSupplement supplement={activeBriefing.torqueSupplement} />}{activeBriefing.webSources && <WebResearchSources sources={activeBriefing.webSources} />}
        <div className="briefing-meta"><span>Phase: <strong>{activeBriefing.phase}</strong></span><span>Saved {formatDate(activeBriefing.createdAt)}</span></div><h3>Supporting source pages</h3><CitationCards citations={activeBriefing.citations} />
      </> : <div className="empty-state"><h2>No briefing selected</h2><p>Saved manual-grounded answers will collect here so you can switch jobs without losing your place.</p><button type="button" onClick={() => setView("chat")}>Go to garage chat</button></div>}</section>
    </section> : <TorqueSpecsWorkspace />}</section>
  </main>;
}

function WebResearchSources({ sources }: { sources: WebResearchSource[] }) {
  if (!sources.length) return null;
  return <section className="web-research-sources"><div className="eyebrow">External research sources</div>{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.sourceType === "Factory Five Forum" ? "Forum" : "Web"}</span>{source.title}</a>)}</section>;
}

function GarageBootSequence({ onDismiss }: { onDismiss: () => void }) {
  return <section className="garage-boot" aria-label="Garage Goblin is starting">
    <div className="garage-boot-grid" aria-hidden="true" />
    <div className="garage-boot-content">
      <div className="garage-boot-kicker">Garage systems boot sequence</div>
      <h1>Garage Goblin</h1>
      <p className="garage-boot-tagline">A suspiciously competent copilot for irresponsible machinery.</p>
      <div className="garage-boot-checks" aria-live="polite">
        <p><span>✓</span> Checking torque records</p>
        <p><span>✓</span> Finding the correct manual page</p>
        <p><span>×</span> Locating the 10mm socket</p>
      </div>
      <div className="garage-boot-progress"><span /></div>
      <button type="button" autoFocus onClick={onDismiss}>Enter the garage ↵</button>
    </div>
  </section>;
}

type TorqueFilter = "all" | "front" | "irs" | "solid-axle" | "brakes" | "driveline" | "general";

const torqueFilters: { id: TorqueFilter; label: string }[] = [
  { id: "all", label: "All specs" },
  { id: "front", label: "Front suspension" },
  { id: "irs", label: "2015+ IRS" },
  { id: "solid-axle", label: "Solid axle" },
  { id: "brakes", label: "Brakes" },
  { id: "driveline", label: "Driveline & wheels" },
  { id: "general", label: "General hardware" },
];

function TorqueSpecsWorkspace() {
  const [filter, setFilter] = useState<TorqueFilter>("all");
  const visibleSpecs = torqueSpecs.filter((spec) => matchesTorqueFilter(spec, filter));
  const verifiedCount = torqueSpecs.filter((spec) => spec.status === "verified").length;
  const blockedCount = torqueSpecs.length - verifiedCount;

  return <section className="torque-workspace">
    <div className="torque-intro"><div><div className="eyebrow">Structured Factory Five data</div><h2>Numbers with receipts, not goblin vibes.</h2><p>Every row is linked to a source PDF page and requires its listed configuration. The chat cannot invent a torque value outside this reviewed data.</p></div><div className="torque-summary"><strong>{verifiedCount} verified</strong><span>{blockedCount} STOP &amp; VERIFY</span></div></div>
    {blockedCount > 0 && <div className="torque-conflict"><strong>Official-source conflicts are blocked.</strong><span>Two IRS entries disagree across Factory Five documents. They remain visible for transparency but are never served as automatic numeric answers.</span></div>}
    <div className="torque-filters" aria-label="Torque specification filters">{torqueFilters.map((item) => <button type="button" key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
    <div className="torque-table-wrap"><table className="torque-table"><thead><tr><th>Component</th><th>Torque</th><th>Applies to</th><th>Source</th><th>Status</th></tr></thead><tbody>{visibleSpecs.map((spec) => <TorqueSpecRow key={spec.id} spec={spec} />)}</tbody></table></div>
    <p className="torque-footnote">General-hardware rows apply only when the manual gives no component-specific value. A component-specific source always wins.</p>
  </section>;
}

function matchesTorqueFilter(spec: TorqueSpec, filter: TorqueFilter) {
  const searchable = `${spec.component} ${spec.configuration.join(" ")}`.toLowerCase();
  if (filter === "all") return true;
  if (filter === "front") return searchable.includes("front");
  if (filter === "irs") return searchable.includes("irs");
  if (filter === "solid-axle") return searchable.includes("solid axle") || searchable.includes("3-link");
  if (filter === "brakes") return searchable.includes("brake") || searchable.includes("caliper");
  if (filter === "driveline") return /driveshaft|hub|wheel|lug|cv axle|oil.filter/.test(searchable);
  return searchable.includes("general");
}

function TorqueSpecRow({ spec }: { spec: TorqueSpec }) {
  const source = initialSources.find((item) => item.id === spec.source.sourceId);
  const sourceTitle = source?.title ?? spec.source.file;
  const sourceUrl = source ? `/api/sources/${source.id}#page=${spec.source.page}` : "#";
  const value = spec.newtonMeters ? `${spec.newtonMeters} Nm · ${spec.lbFt} lb-ft` : `${spec.lbFt} lb-ft`;
  return <tr className={spec.status === "needs-review" ? "needs-review" : ""}><td><strong>{spec.component}</strong>{spec.notes && <small>{spec.notes}</small>}</td><td><strong>{spec.status === "verified" ? value : "STOP & VERIFY"}</strong>{spec.additionalOperation && <small>{spec.additionalOperation}</small>}</td><td>{spec.configuration.map((item) => <span className="config-chip" key={item}>{item}</span>)}</td><td><a href={sourceUrl} target="_blank" rel="noreferrer">{sourceTitle}<small>PDF p. {spec.source.page} · {spec.source.section}</small></a></td><td><span className={spec.status === "verified" ? "torque-status verified" : "torque-status blocked"}>{spec.status === "verified" ? "Verified" : "Blocked"}</span></td></tr>;
}

function BriefingTorqueSupplement({ supplement }: { supplement: TorqueSupplement }) {
  return <section className="briefing-torque">
    <div><div className="eyebrow">Structured Factory Five data</div><h3>{supplement.title}</h3><p>These values are reviewed records, not model-generated prose. Confirm each configuration before final torque.</p></div>
    <div className="briefing-torque-list">{supplement.specs.map((spec) => <BriefingTorqueCard key={spec.id} spec={spec} />)}</div>
  </section>;
}

function BriefingArtifactView({ artifact, forumResearch, onResearchForum, researchingForum }: { artifact: BriefingArtifact; forumResearch?: ForumResearch; onResearchForum?: () => void; researchingForum?: boolean }) {
  return <section className="briefing-artifact">
    <div className="briefing-facts"><span><strong>Readiness</strong>{artifact.readiness}</span><span><strong>Build phase</strong>{artifact.buildPhase}</span><span><strong>Authority</strong>{artifact.primaryAuthority}</span></div>
    {artifact.sections.map((section) => <section className={section.id === "stop" ? "briefing-section briefing-stop" : "briefing-section"} key={section.id}><h3>{section.title}</h3><MarkdownContent content={section.content} /></section>)}
    <section className="forum-research"><div><div className="eyebrow">Optional community context</div><h3>Factory Five Forum gotchas</h3></div>{forumResearch ? <><MarkdownContent content={forumResearch.answer} />{forumResearch.warning && <p className="forum-warning">{forumResearch.warning}</p>}{forumResearch.sources.length > 0 && <div className="forum-sources">{forumResearch.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div>}</> : <><p>Searches only the Factory Five Forum and never overrides the controlling manual.</p><button type="button" onClick={onResearchForum} disabled={!onResearchForum || researchingForum}>{researchingForum ? "Searching Factory Five Forum…" : "Research Factory Five Forum gotchas"}</button></>}</section>
  </section>;
}

function InlineMarkdown({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g);
  return <>{parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(part);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return part;
  })}</>;
}

type MarkdownBlock = { kind: "paragraph" | "list"; lines: string[] } | { kind: "heading"; value: string };

/** Minimal safe Markdown renderer for model text; raw HTML is never interpreted. */
function MarkdownContent({ content }: { content: string }) {
  const blocks: MarkdownBlock[] = [];
  let active: Extract<MarkdownBlock, { kind: "paragraph" | "list" }> | undefined;
  const flush = () => { if (active?.lines.length) blocks.push(active); active = undefined; };

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) { flush(); blocks.push({ kind: "heading", value: heading[2] }); continue; }
    const list = /^[-*]\s+(?:\[[ xX]\]\s+)?(.+)$/.exec(line);
    if (list) {
      if (!active || active.kind !== "list") { flush(); active = { kind: "list", lines: [] }; }
      active.lines.push(line);
      continue;
    }
    if (!active || active.kind !== "paragraph") { flush(); active = { kind: "paragraph", lines: [] }; }
    active.lines.push(line);
  }
  flush();

  return <div className="markdown-content">{blocks.map((block, index): ReactNode => {
    if (block.kind === "heading") return <h4 key={index}><InlineMarkdown content={block.value} /></h4>;
    if (block.kind === "paragraph") return <p key={index}><InlineMarkdown content={block.lines.join(" ")} /></p>;
    return <ul key={index}>{block.lines.map((line, lineIndex) => {
      const checked = /^[-*]\s+\[x\]\s+/i.test(line);
      const value = line.replace(/^[-*]\s+(?:\[[ xX]\]\s+)?/, "");
      return <li className={/^[-*]\s+\[[ xX]\]\s+/.test(line) ? "check-item" : ""} key={lineIndex}>{/^[-*]\s+\[[ xX]\]\s+/.test(line) && <span aria-hidden="true">{checked ? "✓" : "○"}</span>}<InlineMarkdown content={value} /></li>;
    })}</ul>;
  })}</div>;
}

function BriefingTorqueCard({ spec }: { spec: TorqueSpec }) {
  const source = initialSources.find((item) => item.id === spec.source.sourceId);
  const sourceTitle = source?.title ?? spec.source.file;
  const sourceUrl = source ? `/api/sources/${source.id}#page=${spec.source.page}` : "#";
  const value = spec.newtonMeters ? `${spec.newtonMeters} Nm · ${spec.lbFt} lb-ft` : `${spec.lbFt} lb-ft`;
  const conflict = spec.status === "needs-review";
  return <article className={conflict ? "briefing-torque-card blocked" : "briefing-torque-card"}>
    <div><strong>{spec.component}</strong><span>{spec.configuration.join(" · ")}</span>{spec.notes && <small>{spec.notes}</small>}</div>
    <div className="briefing-torque-value"><strong>{conflict ? "STOP & VERIFY" : value}</strong>{spec.additionalOperation && <small>{spec.additionalOperation}</small>}<a href={sourceUrl} target="_blank" rel="noreferrer">{sourceTitle} · PDF p. {spec.source.page}</a>{conflict && <a href="/api/sources/2015-mustang-irs#page=40" target="_blank" rel="noreferrer">2015+ Mustang IRS instruction · PDF p. 40</a>}</div>
  </article>;
}

function CitationCards({ citations }: { citations: Citation[] }) {
  const grouped = citations.reduce<Map<string, { citation: Citation; pages: number[] }>>((groups, citation) => {
    const sourceUrl = citation.url.replace(/#page=\d+$/, "");
    const group = groups.get(sourceUrl) ?? { citation, pages: [] };
    if (citation.page && !group.pages.includes(citation.page)) group.pages.push(citation.page);
    groups.set(sourceUrl, group);
    return groups;
  }, new Map());
  return <>{[...grouped.values()].map(({ citation, pages }) => {
    const sortedPages = pages.sort((a, b) => a - b);
    const pageLabel = sortedPages.length ? ` · PDF p${sortedPages.length === 1 ? "." : "p."} ${sortedPages.join(", ")}` : " · page mapping pending";
    const sourceUrl = citation.url.replace(/#page=\d+$/, "");
    return <div className="source-card" key={sourceUrl}><div><strong>{citation.title}</strong><br /><span className="status">{citation.authority}{pageLabel}</span>{sortedPages.length > 0 && <div className="page-links">{sortedPages.map((page) => <a href={`${sourceUrl}#page=${page}`} target="_blank" rel="noreferrer" key={page}>PDF p. {page}</a>)}</div>}</div><a className="open-document" href={sourceUrl} target="_blank" rel="noreferrer">Open document</a></div>;
  })}</>;
}
