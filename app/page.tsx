"use client";

import { FormEvent, useState } from "react";

type Citation = { id: string; title: string; authority: string; url: string; page?: number };
type Briefing = { answer: string; citations: Citation[]; warning?: string };

const quickPrompts = [
  "Prep me for: 2015+ IRS installation.",
  "What gear oil and friction modifier does this 2015+ IRS need?",
  "Can I drill or grind the IRS mount so the fourth bolt goes in?",
];

export default function Home() {
  const [question, setQuestion] = useState(quickPrompts[0]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setBriefing(null);

    try {
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = (await response.json()) as Briefing & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The Goblin lost the trail.");
      setBriefing(body);
    } catch (error) {
      setBriefing({ answer: error instanceof Error ? error.message : "Unknown error.", citations: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <div className="eyebrow">Factory Five Mk5 Roadster / Local Retrieval Proof</div>
      <h1>Garage Goblin.</h1>
      <p className="lede">A document-grounded garage copilot for the kind of vehicle that makes responsible adults ask whether this was wise.</p>

      <div className="grid">
        <section className="panel">
          <h2>Ask the Goblin</h2>
          <form className="prompt" onSubmit={ask}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Build question" />
            <button disabled={loading}>{loading ? "Searching..." : "Ask"}</button>
          </form>
          <div className="quick">
            {quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>{prompt}</button>)}
          </div>

          {briefing && <div className="answer">{briefing.answer}</div>}
          {briefing?.warning && <div className="notice">{briefing.warning}</div>}
          {briefing?.citations.map((citation) => (
            <div className="source-card" key={citation.id}>
              <div><strong>{citation.title}</strong><br /><span className="status">{citation.authority}{citation.page ? ` · PDF p. ${citation.page}` : " · page mapping pending"}</span></div>
              <a href={citation.url} target="_blank" rel="noreferrer">Open source</a>
            </div>
          ))}
        </section>

        <aside className="panel">
          <h2>Initial official sources</h2>
          <p className="status">The initial proof is intentionally manual-first. Community evidence is not yet in retrieval.</p>
          <a className="source" href="/api/sources/mk5-roadster-manual#page=104" target="_blank" rel="noreferrer">Mk5 Roadster Assembly Manual<small>Factory Five manual · IRS starts at PDF p. 104</small></a>
          <a className="source" href="/api/sources/2015-mustang-irs#page=1" target="_blank" rel="noreferrer">2015+ Mustang IRS Instructions<small>Factory Five option instruction</small></a>
          <a className="source" href="/api/sources/2015-irs-swaybar#page=1" target="_blank" rel="noreferrer">2015 IRS Sway Bar Instructions<small>Factory Five option instruction</small></a>
          <a className="source" href="/api/sources/koni-irs-coil-overs#page=1" target="_blank" rel="noreferrer">Koni IRS Coil-Over Instructions<small>Factory Five option instruction</small></a>
        </aside>
      </div>
    </main>
  );
}
