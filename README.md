# Garage Goblin

Garage Goblin is an authenticated, document-grounded garage copilot for Factory
Five Mk5 Roadster builders. It answers questions from approved source material,
shows exact PDF-page citations, and creates saved, task-specific build
briefings.

The product is deliberately narrow: one predefined Mk5 demo build, Factory
Five documentation as the controlling authority, and an invite-only hosted
demo. It is not a general vehicle-compatibility advisor, engineering validator,
DMV/insurance workflow, or unrestricted web-research product.

## Current status

The local proof and hosted demo are operational.

- Next.js App Router and TypeScript application deployed through Vercel.
- Clerk invite-only authentication protects all pages, API routes, and source
  document routes.
- Neon Postgres persists per-user chats, briefings, and live-request usage
  counters. Browser storage remains a local-development fallback.
- Canonical PDFs are stored in private Vercel Blob storage and are served only
  through authenticated application routes.
- OpenAI Responses API and managed Vector Stores provide retrieval and live
  answers. The Vector Store is an index, not the canonical document store.
- Live requests are limited to 10 per user per day and 25 per user per month.
  The configured owner email is exempt; canned demo actions remain free.
- The current approved source catalog contains 11 source documents. Factory
  Five documentation controls vendor, forum, and general-web context.

The local demo remains the fallback for development and presentations. See
[`HOSTED_DEMO_PLAN.md`](HOSTED_DEMO_PLAN.md) and
[`HOSTED_DEMO_HANDOFF.md`](HOSTED_DEMO_HANDOFF.md) for deployment details and
acceptance gates.

## Run locally

Requirements: Node.js 22 or newer, a Clerk application, a Neon database, and
the required OpenAI/Blob configuration.

1. Copy `.env.example` to `.env.local`.
2. Add the local Clerk keys, database URL, private Blob token, and OpenAI
   configuration. Never commit `.env.local`.
3. Initialize or verify the local database:

   ```bash
   npm run db:init
   npm run db:check
   ```

4. Start the application:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Next.js and sign in with an invited Clerk
   account.

The existing managed Vector Store IDs can be used for normal development. The
ingestion scripts are available when rebuilding the approved page index; they
use paid OpenAI calls and should be run deliberately:

```bash
npm run extract:approved-pages
npm run ingest:approved-pages
```

The local app can run without Neon, but it then uses browser storage and shows a
local-only/database-unavailable state. Live AI requests fail closed if usage
protection cannot be checked; the zero-API Canned Demo remains available.

## Environment configuration

Use `.env.example` as the variable-name reference. Important server-side values
include:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- `OPENAI_PRODUCTION_API_KEY` for application live requests
- `OPENAI_API_KEY` for explicitly run local ingestion/evaluation scripts when
  applicable
- `OPENAI_VECTOR_STORE_ID`, `OPENAI_PAGE_INDEX_VECTOR_STORE_ID`, and
  `OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID`
- `DATABASE_URL` for local Neon development
- `DATABASE_URL_PROD` for read-only/local hosted-database checks when needed;
  do not place it in the browser or source
- `BLOB_READ_WRITE_TOKEN` for private source storage
- `GARAGE_GOBLIN_UNLIMITED_EMAIL` as a server-only owner quota exemption

In Vercel, configure the appropriate values separately for Preview and
Production. No OpenAI key, Clerk secret, Neon connection string, Blob token, or
source URL belongs in client code, Git, screenshots, issues, or logs.

## Source and answer policy

Every factual manual-derived answer should link to the exact source PDF and PDF
page. The source hierarchy is:

1. Factory Five documentation
2. Vendor documentation
3. Donor specifications and curated Factory Five forum experience
4. General internet context as a clearly labeled last resort

Forum and web material never overrides Factory Five documentation. For
safety-critical ambiguity, Garage Goblin cites the surrounding official material
and directs the builder to Factory Five rather than guessing.

The application uses section-aware retrieval for ad-hoc questions and presents
the relevant manual section or chapter with a page range when the evidence
supports one. Torque values retain structured source and page metadata, and the
Mk5 manual is the primary source for the IRS demo workflow.

## Useful checks

Run these before opening a pull request:

```bash
npm run lint
npm run build
npm run db:check
git diff --check
```

Additional targeted checks are available for retrieval and safety behavior:

```bash
npm run evaluate:torque
npm run check:safety-gaps
npm run evaluate:retrieval
npm run evaluate:forum-workflow
npm run audit:vector-search
```

For protected-route testing, sign out and verify that direct requests to the
workspace, briefing, and source routes return unauthorized responses. Then sign
in, run Canned Demo, run one live question, open citations, save/reopen a
briefing, and verify the database-unavailable and quota-limit states.

## Security posture

The hosted demo is invite-only. Keep the GitHub repository private while it
contains the canonical source PDFs, and grant classmates repository read access
only if they need to inspect the code. Do not grant them Vercel, Clerk, Neon,
Blob, or OpenAI access.

GitHub Actions currently provide lint/build and security-oriented checks such as
dependency updates and secret scanning. Treat AI review as an additional
reasoning pass, not as a replacement for authentication tests, dependency
audits, secret scanning, or human review.

## Roadmap

The next product work is focused on production hardening and demo readiness:

- complete the whole-repository security audit and remediate confirmed findings;
- keep dependency upgrades compatible with the current Next.js/ESLint stack;
- rehearse production auth, source citations, persistence, quotas, and failure
  modes;
- improve visual identity and presentation polish; and
- keep multi-build support, user uploads, unrestricted public access, and broad
  live web research out of scope until explicitly scheduled.

## License and source material

This repository is a private project. The included source materials are reviewed
for this demo and should remain access-controlled. Respect the applicable
Factory Five and third-party documentation rights when sharing or deploying the
project.
