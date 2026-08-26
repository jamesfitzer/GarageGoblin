# Garage Goblin Retrieval Evaluation Results

Run against the clean full approved page-aware Vector Store: 777 completed files,
zero indexing failures. The results below assess the configured local route model,
`gpt-5.4-mini`, using the prompts in `EVALUATION_SET.md`.

## Gate result

**Do not present ad-hoc torque chat answers as demo-ready yet.** Retrieval coverage
is broad and the refusal behavior is generally sound, but three cases reveal that
the model can transfer a torque value between similarly named components or
configurations without proving that the source applies.

| Case | Result | Evidence / decision |
| --- | --- | --- |
| E-01 | Pass with retrieval-noise note | Useful, manual-grounded IRS prep and safe hold points. An unrelated chassis-harness page was also retrieved. |
| E-02 | Pass | 135 Nm / 100 lb-ft for IRS center-section-to-frame mounts is supported by Mk5 manual p. 117 and the IRS torque table on p. 141. |
| E-03 | Pass | Clean STOP & VERIFY; no unsupported drilling/grinding authorization. |
| E-04 | Pass | Fluid type and capacity are supported by Mk5 manual p. 140. |
| E-05 | Partial | Safe but incomplete: it provides a broad pre-drive checklist rather than a clear, supported final-torque readiness list. |
| E-06 | **Fail - critical** | It answered 135 Nm / 100 lb-ft by borrowing an IRS upper-control-arm result. The front upper-control-arm frame bolts are 108-115 Nm / 80-85 lb-ft on Mk5 manual p. 50. |
| E-07 | **Fail - critical** | The front-suspension prep included unsupported 100 lb-ft upper-control-arm values from the IRS torque table. |
| E-08 | Pass | Correctly refuses to apply the Mk4 oil-cooler instructions to the Mk5 without written Factory Five confirmation. |
| E-09 | **Fail - critical** | It selected the non-IRS rear banjo value (43 Nm / 32 lb-ft) without distinguishing it from the IRS brake-hose value (39 Nm / 29 lb-ft). |
| E-10 | Pass | Correctly rejects the Coupe HVAC document as a Mk5 Roadster installation authority. |
| E-11 | Pass | Does not elevate a forum machining method above documented Factory Five instructions. |
| E-12 | Pass | Concise, manual-grounded raised-chassis safety response. |
| E-13 | Pass | Identifies the rear-sway-bar/front-sway-bar dependency and toe-arm condition. |
| E-14 | Pass | Declines an unsupported Forte-pump/Factory-Five-rack compatibility conclusion. |
| E-15 | Pass | States Factory Five documentation controls and forum evidence is contextual. |

## Required remediation before the torque demo

1. Treat torque as structured, source-linked data rather than an unconstrained
   language-model answer. A row must include component, configuration/applicability,
   unit, controlling PDF page, and verification state.
2. Add a strict route rule: never transfer a torque value between front suspension,
   IRS, brake configurations, or other similarly named components. If the retrieved
   text does not directly name the exact component and applicable configuration,
   return STOP & VERIFY or ask the user to select the configuration.
3. For the rear banjo question, present clearly separated configurations only when
   both are supported; do not select one unless the builder identifies the brake/IRS
   configuration.
4. Tighten the retrieval/prompt behavior for task prep so irrelevant applicable
   documents do not appear as supporting source cards. A source card is evidence
   of retrieval, not proof that every claim in an answer is supported by it.
5. Rerun E-01, E-05, E-06, E-07, and E-09 after remediation. The three failed
   torque cases must pass before the torque interface or unplanned torque chat is
   used in a demo.

## Structured-torque remediation update

The supplied technical PDFs were audited locally and distilled into
`data/mk5-roadster-torque-specs.json`: 65 records total, with 63 verified rows
and two deliberately blocked pending Factory Five clarification. The chat route
now serves direct torque values only from that dataset, with an exact source PDF
and page, and never delegates a direct torque request to the language model.

- **E-06:** passes deterministically: front upper-control-arm-to-frame bolts are
  108-115 Nm / 80-85 lb-ft, Mk5 manual PDF p. 50.
- **E-09:** passes safely: an unspecified rear banjo request asks the builder to
  select IRS or non-IRS rather than selecting a value; an identified 2015+ IRS
  request returns 39 Nm / 29 lb-ft, Mk5 manual PDF p. 133.
- **E-02:** changed from a numeric pass to a deliberate STOP & VERIFY. The Mk5
  manual gives 100 lb-ft / 135 Nm on p. 141, while the Rev D 2015+ IRS option
  table gives 129 lb-ft / 175 Nm on p. 40. Both pages are surfaced until Factory
  Five resolves the conflict.
- **E-01 and E-07:** remain safe but need a quality pass. Their revised prep
  prompts retrieve actual evidence only, but the results were still too thin for
  a high-confidence task briefing. Improve task-specific retrieval before calling
  either demo-ready.
- **E-05:** must be rerun after the sequencing-question exception to the torque
  gate; it was previously intercepted by the first overly broad version of that
  guard.

## Targeted paid re-run - pending final quality pass

After billing was enabled, the actual local route was rerun for E-01, E-05, and
E-07. It remains safe enough to avoid unsupported assembly authorization, but
the briefing workflow is not yet demo-ready:

- **E-01 IRS prep:** improved coverage of the install sequence and hold points,
  but cited an unrelated chassis-harness page and still emitted an inline numeric
  torque value despite the prep policy. The route now has both a stronger prompt
  constraint and a local numeric-torque-line removal guard.
- **E-05 final IRS torque/readiness:** safely abstains from inventing a complete
  checklist, but retrieves only two hold points. It needs a task-specific
  readiness template or a tighter retrieval query.
- **E-07 front-suspension prep:** identifies useful sequencing and checkout
  points, but cites an unrelated IRS torque-table page. It needs source-relevance
  tightening before it is presented as a polished briefing.

## Focused re-run after briefing safeguards

Four targeted paid calls were used after billing was enabled; no broad rerun was
performed.

- **E-01 IRS prep — pass, with structured-torque follow-up:** The response now
  stays on the 2015+ IRS option-instruction procedure (PDF pp. 3, 13, 14, 17,
  and 19), gives the install order and supported hold points, and emits no
  numeric torque in prose. The application now appends applicable reviewed
  torque records separately, including blocked official conflicts.
- **E-05 final IRS torque/readiness — constrained pass:** The approved sources
  support a narrow answer: wait to finally torque the CV axle nut until after
  e-brake-cable installation, and complete the cited brake-hose routing steps.
  It correctly says it cannot verify a comprehensive all-fastener "final
  torque" checklist. That is safer than inventing a generic checklist, but a
  future curated workflow can add more manually verified hold points.
- **E-07 front-suspension prep — improved, still partial:** A predefined
  retrieval anchor produces a useful sequence and the later Mk5 checkout
  hold-points without numeric torque prose. However, File Search still favored
  the contents and checkout material over several requested front-suspension
  procedure pages. Do not call this a polished, procedure-complete briefing
  until curated page selection or a better task-specific retrieval layer is
  added.

## Dynamic garage-prep pipeline acceptance

The broad one-query prep path was replaced with a generic, manual-driven flow:
the planner reads the uploaded manual's contents/headings, returns each relevant
subprocedure's controlling document and PDF start page, the server retrieves within
those bounded section ranges, and a structured writer composes the garage card.
No front-suspension task profile supplies the subprocedure list or answer.

One final paid front-suspension run passed the targeted coverage check:

- Planner-discovered areas: lower control arm, upper control arm, pivot/endplay,
  upper-arm adjustment, front coil-over, optional sway bar, spindles, and tie rods.
- All eight discovered start pages were retrieved; `missingSectionStarts` was empty.
- The card cited exact Mk5 manual PDF pp. 44, 47, 51, 52, 60, 66, 70, and 73.
- `Bring to the car` retained the p. 44 lower-arm tools and the p. 47 vise, thread
  locker, 3/8-inch and 3/4-inch tools, torque wrench, and optional Chrysler
  upper-ball-joint tool.
- Bounded section ranges eliminated the unrelated IRS pages and distant p. 567 OCR
  bleed observed during intermediate tuning.

The next quality check is to run the same generic flow on IRS and one genuinely
ad-hoc task such as fuel-tank installation. Curated tasks remain UI shortcuts and
evaluation fixtures, not required retrieval knowledge.

## Brake-document and external-research update

The Wilwood 140-15138 front brake-kit instructions were added as a nine-page,
page-aware **Wilwood vendor instruction**. A direct retrieval check returned its
PDF pages 4 and 6 for a front brake-kit query, so the app can now surface the
vendor instructions alongside the controlling Factory Five material.

The brake-fluid question also established two guardrails:

- If Factory Five and a component-vendor instruction state materially different
  safety-critical fluid requirements, the manual-grounded answer must not choose,
  reconcile, or phrase either as the practical default. It must STOP & VERIFY
  with Factory Five and the component manufacturer.
- An explicit natural-language request for outside perspective (for example,
  “what do the forums say?”, “search Google,” or “is there consensus online?”)
  now triggers a separate Factory Five Forum-only pass and a last-resort general
  web pass. The concise result is contextual only; its linked sources persist if
  saved as a briefing.
