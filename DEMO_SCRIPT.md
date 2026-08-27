# Garage Goblin MBA Demo Script

## Goal

Show that Garage Goblin turns an overwhelming stack of vehicle manuals into
short, source-linked, safety-aware garage guidance for one specific build.

Target length: 4–5 minutes.

## Before class

- Start the local app and confirm the splash screen appears.
- Have the `How it works` tab, the settings gear, and the Garage Chat visible.
- Confirm the `Open canned demo` control works before relying on the live run.
- Keep the Mk5 assembly manual source page openable in a second tab only if you
  want a belt-and-suspenders fallback.

## 1. Open with the real problem (about 35 seconds)

Say:

> Building a kit car means doing project management, engineering research, and
> parts archaeology at the same time. You might have a 500-page assembly manual,
> aftermarket brake instructions, wiring diagrams, and random forum threads—all
> while standing under a car with dirty hands.

> I am building a Factory Five Mk5 Roadster, and I wanted to see whether the
> useful part of AI could be productized without turning safety-critical work
> into a hallucination machine.

## 2. Explain the product in one sentence (about 20 seconds)

Say:

> Garage Goblin is a manual-first garage copilot. It creates a short, practical
> briefing for a task, but every factual answer points back to the exact PDF page
> that controls it.

## 3. Show `How it works` (about 45 seconds)

Click **How it works** in the sidebar.

Say:

> The important design choice is the source hierarchy. Factory Five documentation
> controls. Vendor instructions come next. Forum experience is useful, but it is
> visibly labeled as community context—not a requirement.

> The AI is not asked to remember how to build a car. It maps the question to
> sections in the uploaded manuals, pulls the relevant pages, and turns those
> pages into a staging list, sequence, and gotchas. If documentation conflicts or
> a selected part is missing instructions, it says STOP & VERIFY instead of
> pretending it knows.

## 4. Run the real AI demo (about 90 seconds)

Click the gear beside the Garage Goblin logo, then click **Run live demo**.

While the queue runs, say:

> These are real queries against indexed Factory Five and vendor documents—not
> prerecorded chatbot text. They run one at a time so the demo is reliable and
> each result becomes a separate saved conversation.

Open the live **fuel tank installation** result when it finishes.

Say:

> This is the workflow I actually want in the garage: what I am doing, what to
> bring over, the rough sequence, the non-obvious mistakes, and checks before I
> close something up. It does not regurgitate the full manual. The manual remains
> the deep procedure.

Click one of the **PDF page** links.

Say:

> This is the trust mechanism. The answer is useful because it is concise, but I
> can immediately inspect the actual source page.

## 5. Show safety behavior (about 40 seconds)

Open the live **brake-fluid conflict** conversation.

Say:

> Here is the behavior I care about most. Factory Five calls for DOT 3, while the
> selected Wilwood instructions specify a different performance-fluid requirement.
> A generic chatbot might confidently pick one. Garage Goblin surfaces both,
> cites both, and tells the builder exactly when to stop and verify with Factory
> Five and Wilwood.

## 6. Show community research (optional, about 30 seconds)

Return to the live fuel-tank briefing and click **Research Factory Five Forum
gotchas**.

Say:

> Forum experience can be valuable for fitment gotchas, but it is deliberately a
> separate research pass. It never overrides the controlling manual.

If time is short, skip this step.

## 7. Fallback path if live AI is slow or unavailable (about 30 seconds)

Click the gear, then **Open canned demo**.

Say:

> I planned for the demo gods. This view uses the same source-linked examples,
> but it makes no API calls. The product can still show the experience, citations,
> forum labeling, and safety behavior even if Wi-Fi or a rate limit decides to be
> dramatic.

## 8. Close with the product path (about 30 seconds)

Say:

> This proof of concept is intentionally narrow: one Factory Five Mk5 build,
> manual-grounded guidance, citations, and saved briefings. The product path is
> authenticated user projects, private document storage, real saved build history,
> and the same safety rules applied to each builder’s exact configuration.

> The point is not to replace judgment. It is to make the correct documentation
> available at the moment a builder needs it.

## If you are asked a question

- For a source question: click the cited PDF page.
- For a question about conflicting documentation: say Factory Five controls and
  component-manufacturer instructions are surfaced beside it.
- For a question about AI reliability: point to the source hierarchy, exact page
  links, structured torque data, and STOP & VERIFY behavior.
- For a question about whether this works beyond Factory Five: say the retrieval
  approach generalizes, but this demo deliberately validates one build first.
