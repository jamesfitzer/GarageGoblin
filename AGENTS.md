# Garage Goblin Repository Guide

## Product boundary

Garage Goblin is an authenticated, document-grounded assistant for Factory Five Mk5 Roadster builders. The initial public proof of concept supports one predefined Mk5 demo build.

The MVP answers questions from approved Factory Five manuals and creates saved, task-specific build briefings. It is not a general vehicle-compatibility advisor, registration/insurance workflow, or unrestricted web-research product.

## Brand direction

Garage Goblin is an irreverent but genuinely trustworthy garage copilot for people building gloriously excessive cars. Its voice has the energy of assembling a 500-horsepower, 2,500-pound "stupid-ass car," but it never jokes away safety-critical guidance.

The visual direction is dark, high-contrast, industrial, and garage-ready. Favor large touch targets, concise scan-friendly information, rugged utility, and occasional restrained goblin/menace personality. A small industrial goblin with a torque wrench is a possible recurring visual motif, especially around torque and verification states. Avoid generic corporate-AI aesthetics, decorative clutter, and anything that obscures sources or safety labels.

## Source authority and safety

Use sources in this order:

1. Factory Five documentation is controlling.
2. Vendor documentation is secondary.
3. Donor-car specifications and curated Factory Five forum threads are contextual.
4. General web research is a clearly labeled last resort.

Never present forum consensus as a Factory Five requirement. When official documentation and community advice conflict, show the conflict, cite both, and state that Factory Five documentation controls.

For safety-critical missing or ambiguous information, do not infer an answer. Cite the relevant surrounding manual material and direct the builder to Factory Five. Answers must be concise, garage-scannable, and avoid reproducing large portions of source documents.

## Citations and artifacts

Every factual manual-derived response must link to the exact source PDF and PDF page. Forum-derived content must link to the original thread and be visibly identified as community experience.

Saved briefings, build specifications, and decision-register entries are product artifacts. Preserve their supporting sources, source type, page or URL, and any unresolved questions.

Torque values are structured data, not untraceable chat text. Each torque entry should retain its component, value, unit, applicability, source, PDF page, and notes.

## Data and access

The intended stack is Next.js App Router with TypeScript, Tailwind CSS, shadcn/ui, Clerk authentication, Neon Postgres, private Vercel Blob storage, OpenAI managed Vector Stores/File Search, and Upstash Redis for limits.

All application routes, source documents, chats, and generated artifacts require signed-in access. The public demo should be invite-only or otherwise approved-user-only, with per-user usage limits. Do not expose OpenAI, database, Blob, or authentication secrets to the client.

Original PDFs are canonical source files held in private object storage. OpenAI Vector Stores are retrieval indexes only; retain a re-index and deletion path.

## Repository workflow

Incoming source material belongs in `sources/` until it is reviewed. Do not rename, move, alter, or ingest source files unless the user explicitly authorizes it.

Before implementing retrieval, validate it against the actual Mk5 manuals, especially tables, diagrams, torque values, sequencing, and page citations. Prefer the current OpenAI Responses API and File Search documentation when implementation begins; do not assume an older Assistants API design remains appropriate.

Keep the implementation small and demonstrable. Do not add multi-build support, user file upload, live web search, compatibility calculations, DMV/insurance workflows, or voice features unless explicitly scheduled.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
