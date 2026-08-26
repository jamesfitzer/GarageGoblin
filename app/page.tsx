"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Citation = { id: string; title: string; authority: string; url: string; page?: number };
type BriefingResponse = { answer: string; citations: Citation[]; warning?: string };
type Message = { id: string; role: "user" | "assistant"; content: string; citations?: Citation[]; warning?: string; createdAt: string };
type Chat = { id: string; title: string; createdAt: string; updatedAt: string; messages: Message[] };
type SavedBriefing = { id: string; chatId: string; title: string; question: string; content: string; citations: Citation[]; warning?: string; phase: "Inventory" | "Mock-up" | "Assembly" | "Setup" | "Commissioning"; readiness: "Ready" | "Ready after checks" | "Stop pending resolution"; createdAt: string };
type StoredWorkspace = { chats: Chat[]; activeChatId: string; briefings: SavedBriefing[] };

const storageKey = "garage-goblin.local-workspace.v1";
const quickPrompts = ["Prep me for: 2015+ IRS installation.", "What gear oil and friction modifier does this 2015+ IRS need?", "Can I drill or grind the IRS mount so the fourth bolt goes in?"];
const phases: SavedBriefing["phase"][] = ["Inventory", "Mock-up", "Assembly", "Setup", "Commissioning"];
const readinessStates: SavedBriefing["readiness"][] = ["Ready", "Ready after checks", "Stop pending resolution"];

function newId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function makeChat(): Chat { const now = new Date().toISOString(); return { id: newId("chat"), title: "New garage conversation", createdAt: now, updatedAt: now, messages: [] }; }
function formatDate(date: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date)); }
function normalizeBriefingQuestion(question: string) { return question.trim().replace(/\s+/g, " ").toLowerCase(); }

export default function Home() {
  const [question, setQuestion] = useState(quickPrompts[0]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [briefings, setBriefings] = useState<SavedBriefing[]>([]);
  const [activeBriefingId, setActiveBriefingId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "briefings">("chat");
  const [phase, setPhase] = useState<SavedBriefing["phase"]>("Assembly");
  const [readiness, setReadiness] = useState<SavedBriefing["readiness"]>("Ready after checks");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
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

  async function ask(event: FormEvent) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !activeChat || loading) return;
    const askedAt = new Date().toISOString();
    appendMessage(activeChat.id, { id: newId("message"), role: "user", content: trimmedQuestion, createdAt: askedAt }, activeChat.messages.length === 0 ? trimmedQuestion : undefined);
    setQuestion(""); setLoading(true);
    try {
      const response = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: trimmedQuestion }) });
      const body = (await response.json()) as BriefingResponse & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The Goblin lost the trail.");
      const answer: Message = { id: newId("message"), role: "assistant", content: body.answer, citations: body.citations, warning: body.warning, createdAt: new Date().toISOString() };
      appendMessage(activeChat.id, answer);
      if (/^prep me for\s*:/i.test(trimmedQuestion)) {
        const briefing: SavedBriefing = { id: newId("briefing"), chatId: activeChat.id, title: trimmedQuestion, question: trimmedQuestion, content: answer.content, citations: answer.citations ?? [], warning: answer.warning, phase: "Assembly", readiness: "Ready after checks", createdAt: new Date().toISOString() };
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
    const briefing: SavedBriefing = { id: newId("briefing"), chatId: activeChat.id, title: questionMessage?.content ?? activeChat.title, question: questionMessage?.content ?? "Garage Goblin briefing", content: message.content, citations: message.citations ?? [], warning: message.warning, phase, readiness, createdAt: new Date().toISOString() };
    setBriefings((current) => [briefing, ...current]); setActiveBriefingId(briefing.id); setView("briefings");
  }

  return <main className="app-shell">
    <aside className="app-sidebar">
      <div className="brand-lockup"><strong>Garage Goblin</strong><span>Factory Five Mk5 Roadster</span></div>
      <button className="new-chat sidebar-new-chat" type="button" onClick={createChat}>+ New conversation</button>
      <nav className="workspace-tabs" role="tablist" aria-label="Garage Goblin workspace">
        <button className={view === "chat" ? "active" : ""} type="button" onClick={() => setView("chat")}>Garage chat</button>
        <button className={view === "briefings" ? "active" : ""} type="button" onClick={() => setView("briefings")}>Build briefings <span>{briefings.length}</span></button>
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
      <header className="app-header"><div><div className="eyebrow">Factory Five Mk5 Roadster / Local Retrieval Proof</div><h1>{view === "chat" ? (activeChat?.title ?? "Garage chat") : "Build briefings"}</h1></div><span className="status">Local-only workspace</span></header>
    {view === "chat" ? <section className="chat-workspace">
        <div className="conversation" aria-live="polite" ref={conversationRef}>
          {!activeChat?.messages.length && <p className="empty-state">Ask a manual question. This conversation will remain here on this browser.</p>}
          {activeChat?.messages.map((message) => <article className={`message message-${message.role}`} key={message.id}>
            <div className="message-label">{message.role === "user" ? "You" : "Garage Goblin"} <time>{formatDate(message.createdAt)}</time></div>
            <div className="answer">{message.content}</div>
            {message.warning && <div className="notice">{message.warning}</div>}
            <CitationCards citations={message.citations ?? []} />
          </article>)}
          {loading && <div className="searching">The Goblin is checking the manuals…</div>}
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
     : <section className="briefing-grid">
      <aside className="panel briefing-list"><div className="panel-heading"><h2>Saved build briefings</h2><span className="status">{briefings.length} saved</span></div>
        {!briefings.length && <p className="empty-state">Save an answer from Garage chat to make your first workbench briefing.</p>}
        {briefings.map((briefing) => <button type="button" key={briefing.id} className={briefing.id === activeBriefingId ? "briefing-row active" : "briefing-row"} onClick={() => setActiveBriefingId(briefing.id)}><strong>{briefing.title}</strong><span>{briefing.phase} · {briefing.readiness}</span><small>{formatDate(briefing.createdAt)}</small></button>)}
      </aside>
      <section className="panel briefing-detail">{activeBriefing ? <><div className="panel-heading"><div><div className="eyebrow">Saved workbench artifact</div><h2>{activeBriefing.title}</h2></div><span className="readiness">{activeBriefing.readiness}</span></div>
        <p className="briefing-question">{activeBriefing.question}</p><div className="answer">{activeBriefing.content}</div>{activeBriefing.warning && <div className="notice">{activeBriefing.warning}</div>}
        <div className="briefing-meta"><span>Phase: <strong>{activeBriefing.phase}</strong></span><span>Saved {formatDate(activeBriefing.createdAt)}</span></div><h3>Supporting source pages</h3><CitationCards citations={activeBriefing.citations} />
      </> : <div className="empty-state"><h2>No briefing selected</h2><p>Saved manual-grounded answers will collect here so you can switch jobs without losing your place.</p><button type="button" onClick={() => setView("chat")}>Go to garage chat</button></div>}</section>
    </section>}</section>
  </main>;
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
    return <div className="source-card" key={citation.url.replace(/#page=\d+$/, "")}><div><strong>{citation.title}</strong><br /><span className="status">{citation.authority}{pageLabel}</span></div><a href={citation.url} target="_blank" rel="noreferrer">Open source</a></div>;
  })}</>;
}
