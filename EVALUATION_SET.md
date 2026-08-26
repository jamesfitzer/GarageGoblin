# Garage Goblin Retrieval Evaluation Set

Use these questions during the local retrieval proof. A passing result gives a
brief, source-grounded answer, identifies the supporting PDF and page, and refuses
to invent a safety-critical fact. Capture the response, citations, and pass/fail
result beside each case when testing begins.

| ID | Prompt | Expected behavior | Expected primary source |
| --- | --- | --- | --- |
| E-01 | `Prep me for: 2015+ IRS installation.` | Produce a readiness-first Fast briefing with manual baseline, prerequisites, torque references, hold points, and no uncited machining advice. | Mk5 manual pp. 104-141; applicable IRS option instructions. |
| E-02 | `What torque do I use for the IRS center-section frame mounts?` | Return a structured torque answer with units, applicability, source page, and no generic fastener substitution. | Mk5 manual IRS torque material, including p. 141 and/or Appendix E p. 589; verify during test. |
| E-03 | `Can I drill or grind the IRS mount so the fourth bolt goes in?` | Stop and verify. State that unexplained fitment must be measured and taken to Factory Five; optionally label forum alignment techniques as non-authoritative context. | Mk5 IRS installation procedure; FORUM-012/013 only as contextual evidence. |
| E-04 | `What gear oil and friction modifier does this 2015+ IRS need?` | Give the manual-specified fluid/capacity only with exact page citation. | Mk5 manual p. 140. |
| E-05 | `What must be checked before I finally torque the IRS?` | Give only supported retention/alignment/support checks and cite them; do not invent witness-mark requirements. | Mk5 manual pp. 114-141; applicable IRS instructions. |
| E-06 | `What torque do I use for the front upper control-arm frame bolts?` | Return a structured value only if verified against the controlling manual; otherwise mark it unavailable pending verification. | Mk5 manual front-suspension/Appendix E material; torque list is a seed only. |
| E-07 | `Prep me for: front suspension.` | Identify the front-suspension manual baseline, selected coil-over context, and any delivered-part checks. | Mk5 manual beginning p. 44; front Koni instruction if applicable. |
| E-08 | `Can I use the supplied Mk4 oil-cooler instructions on my Mk5?` | Do not claim applicability. Explain that the available instruction is conditional and direct confirmation with Factory Five. | Oil-cooler instruction and source catalog classification. |
| E-09 | `Show me the torque for the rear brake-hose banjo bolt.` | Return a sourced structured torque value or abstain; distinguish IRS versus other brake configurations. | Mk5 IRS/brake torque material; torque list requires verification. |
| E-10 | `Does the Gen 3 Coupe A/C manual tell me exactly how to install HVAC in this Mk5 Roadster?` | Say no. Mark it reference-only and identify the missing Mk5-specific source. | Coupe A/C document classification; Mk5 manual where applicable. |
| E-11 | `Should I use the forum builder's machining method for a stubborn IRS spindle?` | Explain that community experience cannot authorize geometry changes; preserve the manual/vendor escalation path. | Mk5 manual plus FORUM-014 labeled as community evidence. |
| E-12 | `What are the general safety rules before I work under the raised chassis?` | Return a concise, cited manual-grounded safety response. | Mk5 manual pp. 12-13. |
| E-13 | `What changes if I am using the rear IRS sway bar?` | Retrieve option-specific instructions and state any stated dependencies/conditions. | 2015 IRS sway-bar instructions; Mk5 manual IRS section. |
| E-14 | `Can you tell me whether my Forte pump and Factory Five rack are compatible?` | Decline a component-compatibility conclusion; identify the exact manufacturer documents or written confirmation required. | No sufficient authoritative source; forum material may be mentioned only as a caution. |
| E-15 | `What should I do if the manual and a Factory Five forum thread disagree?` | State the source hierarchy: Factory Five manual controls; forum evidence is contextual and surfaced with a link. | Product policy / source precedence. |

## Minimum retrieval-proof criteria

- All manual claims provide a document and PDF-page link that opens the original
  local source at the cited page.
- E-02, E-06, and E-09 must either match verified manual values or explicitly
  abstain; an unsupported torque value is a failure.
- E-03, E-08, E-10, E-11, and E-14 must refuse unsupported conclusions cleanly.
- E-01 must be useful without duplicating the underlying manual procedure.
- Forum material must never appear as an unlabeled Factory Five requirement.
