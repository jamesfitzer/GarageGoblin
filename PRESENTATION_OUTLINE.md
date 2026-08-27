# Garage Goblin MBA Presentation Outline

## Deliverables

- A five-slide, 16:9 PowerPoint deck.
- Speaker notes derived from `DEMO_SCRIPT.md`.
- The deck is an introduction and transition into the live app demo; it should
  not duplicate the app's `How it works` tab.

## Audience and job

Audience: MBA classmates, not vehicle builders or software engineers.

By the end, they should understand that Garage Goblin makes a complicated,
high-risk document-retrieval problem usable in a garage by combining AI with
source hierarchy, exact citations, and explicit uncertainty.

## Visual direction

- 16:9, dark industrial Garage Goblin aesthetic.
- Colors: near-black / charcoal background, off-white text, acid yellow-green
  accent, restrained warning orange-red.
- Tone: an irreverent but credible copilot for a 500-horsepower, 2,500-pound
  Factory Five Roadster. Do not make safety guidance jokey.
- Use `public/brand/garage-goblin-engine-drop-splash-v2.png` as the title-slide
  visual if useful. Do not use generic corporate-AI imagery.
- Keep visible copy sparse and large. The live app is the main visual.

## Slide 1 — Garage Goblin

### Visible copy

**Garage Goblin**

*A manual-first AI copilot for people building gloriously excessive cars.*

Factory Five Mk5 Roadster proof of concept

### Visual

Use the Garage Goblin splash/engine-drop image on the right or full-bleed with
a dark left-side text treatment.

### Speaker notes

Use `DEMO_SCRIPT.md`, sections **1. Open with the real problem** and **2.
Explain the product in one sentence**.

## Slide 2 — The builder's real problem is fragmented truth

### Visible copy

**The hard part is not finding *an* answer. It is finding the right answer for
this exact build.**

- 500-page build manual
- Vendor instructions and aftermarket parts
- Mixed components and changing decisions
- Forum wisdom that may be useful—or confidently wrong

Footer takeaway: *The cost of a bad answer is rework, delay, or a safety risk.*

### Visual

One large, editorial collage/stack of manual pages, wiring sheets, receipts,
and a greasy workbench—not a dashboard or dense diagram.

### Speaker notes

Use `DEMO_SCRIPT.md`, section **1. Open with the real problem**. Explain that
the prompt comes from a real Factory Five builder experience, not a hypothetical
persona.

## Slide 3 — The design principle: AI finds the manual; it does not replace it

### Visible copy

**The manual stays in charge.**

Factory Five documents → Vendor instructions → Factory Five Forum context →
General web as last resort

Small supporting line: *Every manual-derived answer links to the exact PDF page.*

### Visual

Simple horizontal source-authority flow. Factory Five should be visually dominant;
forum and general web should look clearly secondary.

### Speaker notes

Use `DEMO_SCRIPT.md`, section **3. Show `How it works`**. Point out that this
is the reliability design: source ranking, page links, structured torque records,
and STOP & VERIFY behavior.

## Slide 4 — Live demonstration

### Visible copy

**Let’s build something stupid. Safely.**

Live Garage Goblin demonstration

Small supporting line: *Real retrieval against the indexed Factory Five and
vendor manuals.*

### Visual

Minimal transition slide. Reuse a different crop of the Garage Goblin branding
asset or a dark typographic treatment. Do not put screenshots here; switch to
the running app.

### Speaker notes

Use `DEMO_SCRIPT.md`, sections **4. Run the real AI demo**, **5. Show safety
behavior**, and optionally **6. Show community research**.

Demonstrate:

1. `How it works` tab briefly.
2. Gear → **Run live demo**.
3. Fuel-tank card and exact PDF source link.
4. Brake-fluid conflict and STOP & VERIFY behavior.
5. Optional Factory Five Forum gotchas.

If the live route is slow/unavailable, use Gear → **Open canned demo**, then
say the fallback is intentionally source-linked and makes no API calls.

## Slide 5 — The proof of concept is narrow on purpose

### Visible copy

**Start with one build. Earn the right to expand.**

Today

- One Factory Five Mk5 demo build
- Manual-grounded chat and build briefings
- Exact source pages, structured torque, and safety stops

Next

- Authenticated builder projects
- Private document storage and persistent build history
- Same safety model for each builder's exact configuration

### Visual

Two-column “Today / Next” composition with a subtle Mk5 silhouette or goblin
brand treatment. Keep it calm and credible; do not make a speculative roadmap
chart.

### Speaker notes

Use `DEMO_SCRIPT.md`, section **8. Close with the product path**. End with:

> The point is not to replace judgment. It is to make the correct documentation
> available at the moment a builder needs it.

## Sources and claims

- All product/design claims derive from this repository's `AGENTS.md`,
  `PROJECT_PLAN.md`, `DEMO_SCRIPT.md`, and the implemented Garage Goblin app.
- Do not add market-size figures, adoption claims, safety statistics, or user
  quotes unless separately researched and cited in speaker notes.
- Cite the local Garage Goblin product materials in notes where appropriate;
  do not cite private build specifications or receipts.
