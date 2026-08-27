# Garage Goblin Hosted Demo Punch List

## Purpose

This is an optional convenience deployment for the completed class demo: James
can open Garage Goblin from a private browser URL without starting a local Next.js
server. It is **not** a public pilot or a multi-builder product launch.

Keep the deployment invite-only, source-private, usage-limited, and small. The
local demo remains the primary development and presentation fallback.

## Proposed hosted shape

- **Vercel** hosts the existing Next.js application and deploys from GitHub.
- **Clerk** gates every page and API route behind James's account (and any
  deliberately invited tester accounts).
- **Neon Postgres** persists chats and saved briefings that currently live only
  in the browser.
- **Private Vercel Blob** stores the canonical PDFs; authenticated server routes
  provide page-specific viewing links.
- **OpenAI Vector Store** remains the retrieval index. It is not the canonical
  document store.
- **Upstash Redis** applies a small per-user request limit so an exposed URL
  cannot run up API costs.

Vercel can connect directly to the GitHub repository: each pull request receives
a preview URL, while `main` deploys the production demo URL. Do **not** import or
deploy the current unprotected application before authentication works locally:
its local source routes are not an acceptable public document host.

## Dependency-ordered implementation

### 0. Decide the demo boundary

- Confirm this remains an invite-only personal/class demo; do not enable open
  registration.
- Pick the sign-in identity for the first deployment (James's email) and whether
  one or two classmates need access.
- Set a monthly OpenAI project budget and a conservative per-user request limit.
- Decide whether to use the default Vercel URL first or connect a custom domain.

**Done when:** there is a named owner, approved-user list, and spend ceiling.

### 1. Add authentication locally before any cloud deployment

- Create/link a Clerk application through Clerk or the Vercel Marketplace.
- Add Clerk middleware and protect pages, API routes, source-view routes, chats,
  and briefings by default.
- Permit only the approved user list; disable open sign-up.
- Verify the protected experience locally with James's account.

**Done when:** a signed-out local visitor cannot view a chat, PDF, briefing,
source metadata, or API response; James can sign in successfully.

### 2. Connect authenticated code to Vercel and GitHub

- Confirm `main` builds locally and add the production environment-variable
  checklist without committing secrets.
- Create a Vercel project by importing `jamesfitzer/GarageGoblin` from GitHub.
- Add the Clerk and OpenAI variables for Preview and Production, using a
  dedicated OpenAI API project key rather than a personal key shared elsewhere.
- Configure Clerk's Vercel preview and production redirect URLs.
- Verify preview deployments are protected before treating the production URL as
  usable.

**Done when:** Vercel automatically deploys `main`, and a signed-out visitor sees
the sign-in boundary rather than the app.

### 3. Move browser-only artifacts into persistent storage

- Provision Neon Postgres and add a minimal schema: users, demo builds, chats,
  chat messages, saved briefings, briefing sources, and source metadata.
- Write a one-time, local-to-hosted migration only if preserving existing browser
  history is worth it; otherwise start the hosted demo clean.
- Replace localStorage as the authoritative chat/briefing store while retaining
  a graceful local-only development mode.
- Enforce ownership checks on every read/write.

**Done when:** refreshing or opening another approved browser retains James's
saved chats and briefings, while another user cannot read them.

### 4. Put canonical PDFs in private object storage

- Upload only the approved demo PDFs to private Vercel Blob.
- Preserve stable source IDs, display names, authority type, and PDF page
  mapping in Neon.
- Change source-page links to an authenticated route that serves or redirects to
  the correct private PDF/page.
- Keep the local `sources/` files and document the re-index/delete procedure.

**Done when:** every citation opens the correct PDF page for an approved user,
and direct unauthenticated access to a source URL fails.

### 5. Connect retrieval to hosted source governance

- Store the approved OpenAI Vector Store ID and source-index version as server
  configuration/metadata, never client code.
- Verify the deployed app produces the same cited results as local for the four
  demo prompts.
- Document a small admin-only re-index path and an index deletion path; do not
  build end-user uploads for this demo.

**Done when:** deployed retrieval is grounded, source-linked, and recoverable if
the index must be recreated.

### 6. Limit cost and make failures survivable

- Provision Upstash Redis and enforce per-user request limits for chat, briefing,
  and forum-research actions.
- Add clear messages for limit reached, OpenAI errors, and unavailable retrieval.
- Keep Canned Demo available as a zero-API presentation fallback.
- Ensure no API key, database string, blob token, or source file URL is exposed
  in the client bundle or logs.

**Done when:** an approved user is rate-limited predictably, OpenAI failure has a
safe UI state, and the canned demo still works without live AI.

### 7. Production acceptance rehearsal

- Test signed-out access, approved-user sign-in, and an unapproved account.
- Run the canned demo and the live demo queue from the production URL.
- Open every citation in the four demo responses and verify its PDF page.
- Create, reopen, and delete/reset a chat and briefing as intended.
- Check mobile/garage-sized layout and one deliberate failure case.
- Confirm Vercel preview deployments work from a GitHub pull request.

**Done when:** the production URL is safe enough for a class presentation and
the local demo remains a tested fallback.

## Explicit non-goals

- Open public registration or a broadly shared public demo URL.
- Multi-build support or user document uploads.
- Live internet research by default.
- A full admin console, billing system, or production-grade organization model.
- Replacing the local demo before the hosted copy passes the rehearsal.

## Rough effort

If we keep the scope above narrow, this is roughly one to two focused development
days after service accounts are created. Persistent storage and private PDF access
are the substantive work; connecting GitHub to Vercel is the easy part.
