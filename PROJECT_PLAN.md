# Garage Goblin MVP Project Plan

## Outcome

Deliver an authenticated public proof of concept for Garage Goblin: one Factory Five Mk5 Roadster demo build. Signed-in builders can ask grounded questions about approved manuals, open the exact PDF pages supporting answers, and save task-specific build briefings.

## Brand and interface direction

Garage Goblin is a trustworthy garage copilot with an irreverent, slightly unhinged personality suited to people building 500-horsepower, 2,500-pound "stupid-ass cars." The interface should be dark, high-contrast, industrial, and usable with dirty hands: large controls, strong hierarchy, concise garage-scannable outputs, and no generic corporate-AI styling.

The product may use a small industrial goblin-with-torque-wrench motif, particularly for torque and stop-and-verify moments. Humor and visual attitude must never diminish the prominence or seriousness of primary-source citations, torque values, or safety-critical instructions.

Create a stronger, recognizable Garage Goblin visual identity before the demo is
presented: a primary logo/wordmark, compact app mark, simple source/safety/torque
iconography, and a reusable color/type/spacing system. The identity should feel
like rugged garage equipment with a restrained goblin menace, not generic AI
software or novelty cartoon branding.

## Confirmed scope

- One predefined Factory Five Mk5 Roadster demo build.
- Factory Five manuals as primary source material.
- Suggested build-task list derived from the approved manuals, plus ad-hoc prep requests.
- Saved concise garage-prep cards; the manual remains the deep procedure.
- A Build Briefings tab that lists and reopens previously created briefings, so a
  builder can return to interrupted work while waiting on parts, tools, or answers.
- Structured, manually entered torque values for the demo.
- A supplied Roadster torque-spec list used as a curated torque-data seed and
  validated against controlling manual pages.
- Curated Factory Five forum threads as clearly labeled contextual material.
- Live web research only as a later, clearly labeled fallback.
- Individual chats within the demo build.
- Build-spec and decision-register artifacts, supplied or approved by the user.
- Browser speech-to-text only as a later convenience feature.

## Development and deployment strategy

Build the MVP as a local-first, real-AI demo. The Next.js app will run locally
while its server-side routes use a real OpenAI API project, managed Vector Store,
and File Search. This permits both preplanned demo questions and grounded,
unplanned builder questions without relying on mocked retrieval.

During local development, canonical PDFs remain in the reviewed source set and
are served through the local application for page-specific citation viewing. The
OpenAI Vector Store is a remote retrieval index, not local/offline inference.
Authentication, database, private object storage, usage controls, and Vercel
hosting remain required for the hosted version. Production deployment is a
stretch goal after the local demo is credible and tested.

## Explicitly out of scope

- Parts compatibility calculations or engineering validation.
- DMV, insurance, or registration paperwork workflows.
- Multi-build or user-uploaded document support.
- Forum content treated as an authoritative source.
- Unauthenticated or unlimited public AI access.

## Architecture decisions

- Deploy the Next.js App Router application to Vercel.
- Use Clerk for authentication and access control.
- Use Neon Postgres for structured application data.
- Use private Vercel Blob storage for canonical PDF source files.
- Use OpenAI managed Vector Stores/File Search only for document retrieval.
- Use Upstash Redis for rate limits and usage controls.
- Retain exact source metadata with every generated factual claim and artifact.
- Use the supplied torque list as a provisional structured dataset; its rows must
  retain a controlling manual source/page or be labeled unverified and unavailable
  for safety-critical use.
- Prove page-specific citation behavior with a local retrieval spike before
  building the broader application experience.
- Keep Garage Goblin's behavioral policy in a versioned application instruction
  module sent with every stateless Responses request. Do not rely on a persistent
  OpenAI thread for source hierarchy, safety, torque, or configuration rules.

## Source precedence

1. Factory Five documentation.
2. Vendor documentation.
3. Donor-car specifications and curated Factory Five forum material.
4. General web research, only when enabled as a fallback.

## Delivery phases

### 1. Source readiness and catalog

Catalog the approved manuals, identify versions, verify PDF page numbering, and
classify every source as controlling, applicable secondary, conditional/reference
only, curated community evidence, or owner-private material. Record its intended
access scope before ingestion. The Mk5 manual is currently Rev 1P (December 2025).

Collect the supplied torque list, initial build specification, decision register,
and curated forum links. Derive and approve a suggested Mk5 task list from the
manuals for fast demo actions. Keep the build specification, purchase/order material,
and owner-specific decisions private unless explicitly approved for demo users.

### 2. Local retrieval and citation proof

Ingest the approved source subset into an OpenAI Vector Store from a local script.
Test real responses against representative questions for procedures, sequence
dependencies, torque tables, diagrams, and exact PDF-page citations. Capture
retrieval results and record gaps. Verify supplied torque-list entries against
controlling manual pages before exposing them as structured torque data.

Create a compact evaluation set of real builder questions, expected manual pages,
and expected abstentions. This is the gate for using unplanned questions during a
live demo.

### 3. Local vertical slice

Build a local Next.js demonstration using real retrieval, not mocked AI. The first
complete workflow is `Prep me for: 2015+ IRS installation`, including the Mk5
manual, applicable IRS instructions, relevant curated forum findings, source cards,
and local PDF-page navigation. Support both a short Fast result and a saved Deep
briefing based on the supplied template.

### 4. Hosted product foundation

Create the Next.js project foundation, authentication, database schema, private document storage, role/access policy, rate limits, and source metadata model.

### 5. Grounded chat

Build chat creation and history for the Mk5 demo build. Require cited answers, expose exact PDF-page links, label source types, and provide safety-focused abstention when primary documentation is insufficient.

### 6. Build briefings and artifacts

Implement compact garage-prep cards, saved briefing records, a Build Briefings
tab, structured torque interface, build-spec display, and decision-register display.
The Build Briefings tab must support returning to previously generated work with
its readiness state, build phase, source links, unresolved hold points, and creation
date visible at a glance. Preserve sources and unresolved questions in each artifact.

### 6a. Evidence-first garage-prep pipeline

Do not ask one broad File Search query to summarize a multi-page mechanical task.
Before generating a garage-prep card, collect task evidence in distinct categories:

- procedure and sequencing;
- required tools, materials, parts, and assistance;
- non-obvious manual warnings and configuration gates;
- checks before access is concealed, final retention, or first load; and
- applicable reviewed torque records.

The default flow must not depend on manually authored task profiles. First use the
model to inspect the uploaded manuals' tables of contents and headings, identify
the controlling document and PDF start page for each relevant subprocedure, then
retrieve evidence from those bounded section ranges. For example, front suspension
should discover lower arms, upper arms, pivot/endplay, coil-overs, optional sway
bar, spindles, tie rods, and brakes from the manual itself. Curated tasks may cache
or validate a discovered plan for demo speed, but they are optimization and eval
fixtures—not product knowledge required for an ad-hoc task or a newly uploaded manual.

For the Mk5 demo, the planner also receives a compact, source-reviewed build
configuration context derived from the private build specification and order/receipt
evidence: selected versus unselected variants, selected components, and known
vendor-document gaps. This context scopes a card into **core work now** and
**selected follow-on work**; it never supplies a procedure, tool, or torque value.
In a full product, the same structure is created from the builder's project choices
and delivered-part verification rather than hard-coded demo facts.

Run the narrow section searches in parallel, preserve the best hit for every
discovered procedure area before filling remaining evidence by score, deduplicate
by source/PDF page, and pass the bounded evidence set to the card-writing model.
The model may only claim a tool, part, action, or gotcha that appears in this
evidence. If a category is not retrieved, say it is not established; do not infer
a generic shop-tool list.

The default card is a concise workbench artifact, not a manual summary:

- What you're doing
- Bring to the car
- Do this
- Watch for
- Next / selected follow-on work
- Verify before closing
- STOP & VERIFY

The original manual remains the detailed procedure. Source cards provide the
clickable route to exact pages; the card must not waste space repeatedly telling
the builder to open the manual.

Validate each curated task with an evidence-coverage check before calling it
demo-ready. For front suspension, the evidence set must include the relevant
tool/parts pages (including Mk5 manual PDF pp. 44 and 47) as well as procedure and
hold-point pages. Capture card quality and latency for manual-only retrieval.

### 7. Curated community context

Add approved Factory Five forum threads, task tags, links, and prominent community-source labeling. Do not enable live forum/general-web search until the manual-grounded core is verified.

When research is enabled, use a deliberate, reviewable escalation path rather than
unbounded search: (1) retrieve controlling Factory Five and vendor documents,
(2) search `thefactoryfiveforum.com` for vehicle-specific experience only when it
adds useful context, and (3) use general internet search only when the first two
sources do not answer a non-safety-critical question. Preserve the query, result
URL, source type, and retrieval date with any saved artifact. Forum results must
be labeled **Factory Five community experience**, link to the original thread, and
never override official documentation. Generic internet findings must be visibly
labeled **General internet context — not Factory Five guidance** and carry a
prominent caveat that they are last-resort, non-controlling material. Safety-
critical ambiguity still stops at the surrounding official documentation and a
direction to consult Factory Five; it never escalates to crowd or web consensus.

### 8. Hosted validation and publication (stretch goal)

Run acceptance tests based on real Mk5 builder questions. Verify citation navigation, access control, rate limiting, mobile/garage usability, error states, source deletion/re-indexing, and production deployment.

### 9. Visual identity and demo polish

Develop the Garage Goblin logo, app mark, visual language, and presentation-ready
UI polish. Apply the identity consistently to the landing/chat experience, Build
Briefings tab, source cards, torque interface, and STOP & VERIFY states while
preserving information clarity and safety hierarchy.

### 10. Explain-it-like-I-am-five architecture tab

Add a presentation-friendly `How Garage Goblin Works` tab near the end of the
project. It should explain the product architecture and design choices in simple,
non-technical language suitable for MBA classmates: manuals are the trusted
reference library, the AI finds relevant pages rather than making things up, the
builder sees the original source page, forum advice is clearly secondary, and
saved chats/briefings keep work organized. Include a small visual flow from
builder question to cited answer, but do not expose secrets, internal IDs, or
unnecessary implementation detail.

## Current next sequence

1. Validate the new table-of-contents → controlling document/start page → bounded
   section retrieval → structured card flow on front suspension. The first live
   acceptance run retrieved required manual pp. 44 and 47 and their named tool lists.
2. Validate selected-build scoping on IRS and fuel-tank installation: core staging
   lists must exclude selected later procedures, and a vendor-document gap must
   become STOP & VERIFY rather than a substituted manual configuration.
3. Keep external research as a separate, explicit user action: a chat request such
   as “search the forums and web” triggers one Factory Five Forum-only pass and a
   separately labeled, last-resort general-web pass. It must be saved with any
   resulting briefing, never block manual-first output, and never turn community
   or generic-web consensus into a safety-critical instruction.
4. Tune the concise garage-card presentation with representative builder tasks,
   then write and rehearse the class-demo script and fallback path.
5. Treat authentication, persistent database/blob storage, rate limits, and Vercel
   deployment as the hosted-product stretch sequence after the local demo is
   credible and evaluated.

## Inputs needed from the product owner

- Approved Factory Five Mk5 manuals, including revision/version details.
- Manually extracted torque sheet.
- Roadster torque-spec list, with any available manual-page/source notes.
- Briefing template.
- Initial build specification and decision register.
- Curated Factory Five forum threads.
- Approval of the derived predefined task list.
- Authentication policy: initial invited users and permitted sign-in methods.
- Vercel, Clerk, Neon, OpenAI, and Upstash configuration when implementation reaches each service.

## MVP acceptance criteria

- An unauthenticated visitor cannot access chat, documents, or saved artifacts.
- A signed-in approved user can select a predefined Mk5 task or ask a manual question.
- The local demo uses real OpenAI retrieval and handles both scripted and
  unscripted questions without inventing missing safety-critical information.
- Answers identify their source type and link to exact manual PDF pages whenever a manual supports the claim.
- A briefing is a concise evidence-backed garage card that names task-specific
  tools/parts only when their supporting manual pages were retrieved, and it can
  be saved for later viewing.
- Saved briefings appear in a dedicated Build Briefings tab and can be reopened
  with their original source links and readiness/hold-point context.
- Torque information is rendered from structured, sourced data.
- Forum material is linked and labeled as community experience, never as official instruction.
- Safety-critical uncertainty results in an explicit stop-and-verify response rather than an invented specification.
