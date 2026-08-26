# Garage Goblin Retrieval Evaluation Results

Run against the clean full approved page-aware Vector Store: 768 completed files,
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
