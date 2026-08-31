# Hosted Demo Implementation Handoff

## Objective

Turn the completed local Garage Goblin class demo into a small, invite-only URL
that James can open in a browser without starting a terminal. This is a personal
or class convenience deployment, not a public pilot.

## Read first

1. [`AGENTS.md`](AGENTS.md) — product boundary, source authority, safety, secret,
   cost, and source-material rules.
2. [`HOSTED_DEMO_PLAN.md`](HOSTED_DEMO_PLAN.md) — dependency-ordered scope and
   acceptance gates.
3. The relevant current Next.js guide under `node_modules/next/dist/docs/` before
   changing Next.js code, as required by `AGENTS.md`.

## Current repository state

- The class demo is complete and works locally with real OpenAI Responses/File
  Search retrieval.
- Canonical PDFs are local reviewed source files; the current source-page routes
  are local-only and must not be publicly exposed.
- Chats and saved briefings are localStorage only.
- There is no Clerk auth, database, Blob storage, or Redis rate limiting yet.
- A real OpenAI API key is stored only in `.env.local`; never place it in source,
  client code, logs, a GitHub issue, or chat.
- Canned Demo is a zero-API fallback; Live Demo deliberately spends API calls.

## First implementation task: invite-only Clerk auth, locally

Do this before importing/deploying the application on Vercel.

1. James creates or supplies a Clerk application configured for his account,
   with open sign-up disabled.
2. Add the Clerk publishable and secret keys only to `.env.local`; use the
   variable names in `.env.example`.
3. Install and configure the current Clerk + current Next.js integration using
   their official docs.
4. Protect all app pages and all API/source routes by default. Do not allow a
   signed-out request to fetch a chat, briefing, source PDF, source metadata, or
   OpenAI-backed result.
5. Verify locally:
   - signed-out visitor sees the sign-in boundary;
   - James can sign in;
   - signed-in user can run Canned Demo and one Live Demo request;
   - a direct request to each API/source route is denied while signed out.

Commit this as a focused PR before proceeding to Vercel.

## Service variables to expect later

No values belong in Git. The documented names in `.env.example` are the expected
application contract:

- `OPENAI_API_KEY` and the existing vector-store IDs
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `DATABASE_URL` (Neon)
- `GARAGE_GOBLIN_UNLIMITED_EMAIL` (server-only quota exemption for the owner)
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Service integrations may expose vendor-specific aliases; normalize them in the
server-only configuration layer rather than leaking them into client code.

## Scope guardrails

- No public sign-up, public sources, user uploads, multi-build support, or broad
  live web research.
- Factory Five material controls; vendor material is secondary; forum/web material
  is contextual and visibly labeled.
- Preserve exact PDF-page links for all manual-based claims.
- Keep API calls frugal; do not burn paid calls for exploratory testing.
- Keep the local demo as a working fallback until the hosted acceptance rehearsal
  passes.
