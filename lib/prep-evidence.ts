import OpenAI from "openai";
import type { VectorStoreSearchResponse } from "openai/resources/vector-stores/vector-stores";
import { getDemoBuildContext, getDemoBuildSafetyGaps, renderDemoBuildContext } from "@/lib/demo-build-context";
import { getSource, getSourceFromRetrievalFilename } from "@/lib/sources";

const PREP_MODEL = "gpt-5.4-mini";
const MAX_PROCEDURE_AREAS = 9;
const MAX_SEARCH_QUERIES = 9;
const MAX_EVIDENCE_ITEMS = 20;
const MAX_EVIDENCE_CHARACTERS = 40_000;

const sectionKeys = ["whatYoureDoing", "bringToTheCar", "doThis", "watchFor", "nextSelectedFollowOnWork", "verifyBeforeClosing", "stopAndVerify"] as const;
type SectionKey = (typeof sectionKeys)[number];
type ProcedureScope = "core" | "follow_on" | "excluded";

type PrepPlan = {
  task: string;
  procedureAreas: Array<{
    name: string;
    documentFilename: string;
    startPage: number | null;
    scope: ProcedureScope;
  }>;
};

type SearchSpec = {
  areaName: string;
  scope: ProcedureScope;
  query: string;
  sourcePrefix: string;
  startPage: number | null;
  endPage: number | null;
};

type EvidenceItem = {
  id: string;
  filename: string;
  score: number;
  text: string;
  queries: string[];
  scopes: ProcedureScope[];
};

type CardBullet = {
  text: string;
  evidenceIds: string[];
};

type GarageCard = Record<SectionKey, CardBullet[]>;

export type PrepEvidenceResult = {
  answer: string;
  citations: Array<{
    id: string;
    title: string;
    authority: string;
    page: number | undefined;
    url: string;
  }>;
  procedureAreas: string[];
  searches: string[];
  missingSectionStarts: string[];
  warning?: string;
};

const planSchema = {
  type: "object",
  properties: {
    task: { type: "string" },
    procedureAreas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          documentFilename: { type: "string" },
          startPage: { type: ["integer", "null"] },
          scope: { type: "string", enum: ["core", "follow_on", "excluded"] },
        },
        required: ["name", "documentFilename", "startPage", "scope"],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: MAX_PROCEDURE_AREAS,
    },
  },
  required: ["task", "procedureAreas"],
  additionalProperties: false,
};

const bulletSchema = {
  type: "object",
  properties: {
    text: { type: "string" },
    evidenceIds: { type: "array", items: { type: "string" }, maxItems: 2 },
  },
  required: ["text", "evidenceIds"],
  additionalProperties: false,
};

const cardSchema = {
  type: "object",
  properties: Object.fromEntries(sectionKeys.map((key) => [key, { type: "array", items: bulletSchema }])),
  required: [...sectionKeys],
  additionalProperties: false,
};

function parseStructuredOutput<T>(output: string, label: string): T {
  try {
    return JSON.parse(output) as T;
  } catch {
    throw new Error(`OpenAI returned an invalid ${label}.`);
  }
}

function cleanTask(question: string) {
  return question.replace(/^prep me for\s*:\s*/i, "").replace(/[.?!]+$/, "").trim();
}

function uniqueNonempty(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index);
}

function sourcePrefix(filename: string) {
  return filename.trim().replace(/-p\d{4}\.txt$/i, "").replace(/\.pdf$/i, "");
}

function normalizedProcedureName(value: string) {
  return value.toLowerCase().replace(/\b(?:prep|preparation|installation|install|assembly)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

function applyDemoBuildSelection(question: string, areas: PrepPlan["procedureAreas"]) {
  const isFuelTask = /(?:fuel|tank|pump|sender|filler|vent|filter|fuel[-\s]?line)/i.test(question);
  const isIrsTask = /(?:\birs\b|independent rear suspension|rear suspension|center section|cv axle)/i.test(question);
  const explicitlyRequestsFollowOn = /(?:\birs\s+brakes?\b|\birs\s+sway\s*bar\b|rear\s+sway\s*bar)/i.test(question);

  return areas
    // The approved Mk5 manual's fuel-pickup procedure is for an inline-pump path.
    // This demo build's Holley in-tank module is a vendor-document gap, not a
    // procedure we should silently substitute from the Factory Five manual.
    .map((area) => (
      isFuelTask && /^fuel\s+pick-?up$/i.test(area.name)
        ? { ...area, scope: "excluded" as const }
        : area
    ))
    .map((area) => (
      isIrsTask && !explicitlyRequestsFollowOn && /(?:\birs\s+brakes?\b|\birs\s+sway\s*bar\b|rear\s+sway\s*bar)/i.test(area.name)
        ? { ...area, scope: "follow_on" as const }
        : area
    ));
}

function belongsToSource(filename: string, prefix: string) {
  const normalizedFilename = filename.toLowerCase();
  const normalizedPrefix = prefix.toLowerCase();
  return normalizedFilename === normalizedPrefix
    || normalizedFilename === `${normalizedPrefix}.pdf`
    || normalizedFilename.startsWith(`${normalizedPrefix}-p`);
}

function pageFromFilename(filename: string) {
  const match = filename.match(/-p(\d{4})\.txt$/i);
  return match ? Number(match[1]) : null;
}

async function planTask(client: OpenAI, vectorStoreId: string, question: string, buildContext: string): Promise<PrepPlan> {
  const response = await client.responses.create({
    model: PREP_MODEL,
    instructions: `You plan document retrieval for a hands-on build task. Use File Search to inspect the uploaded manuals, especially their tables of contents, section headings, and task-adjacent procedures. Identify the distinct procedure areas a builder must prepare for. Return exact manual section terminology, not generic automotive guesses. For every area, return the exact filename of the uploaded document that controls that area; a page-index filename such as "manual-name-p0002.txt" is acceptable. Also return the section's PDF start page when the table of contents or retrieved page establishes it; otherwise return null. Do not assign a similarly named area from a different subsystem or document.

Use the supplied build configuration to classify every included area:
- core: needed to perform the requested primary task in the current garage session;
- follow_on: selected for this build but normally a later, separate procedure. Include only if it is genuinely adjacent and useful to surface as a next step.
Do not include unselected variants. Do not repeat the broad requested task itself as a procedure area. Combine closely related adjustment/check sections when necessary. Exclude standalone torque-specification charts because reviewed torque data is handled separately. Do not answer the task, list tools, or invent steps. Keep the map to at most ${MAX_PROCEDURE_AREAS} procedure areas.`,
    input: `REQUEST\n${question}\n\nBUILD CONFIGURATION\n${buildContext}`,
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 10 }],
    tool_choice: "required",
    text: {
      format: {
        type: "json_schema",
        name: "garage_prep_plan",
        strict: true,
        schema: planSchema,
      },
      verbosity: "low",
    },
    store: false,
  });

  const plan = parseStructuredOutput<PrepPlan>(response.output_text, "prep plan");
  const fallbackTask = cleanTask(question);
  const normalizedTask = normalizedProcedureName(plan.task.trim() || fallbackTask);
  return {
    task: plan.task.trim() || fallbackTask,
    procedureAreas: applyDemoBuildSelection(question, plan.procedureAreas
      .map((area): PrepPlan["procedureAreas"][number] => ({
        name: area.name.trim(),
        documentFilename: area.documentFilename.trim(),
        startPage: Number.isInteger(area.startPage) && (area.startPage ?? 0) > 0 ? area.startPage : null,
        scope: area.scope === "follow_on" || area.scope === "excluded" ? area.scope : "core",
      }))
      .filter((area) => area.name && area.documentFilename)
      .filter((area) => {
        const normalizedArea = normalizedProcedureName(area.name);
        return normalizedArea !== normalizedTask && !normalizedTask.startsWith(`${normalizedArea} `);
      })
      .filter((area, index, all) => all.findIndex((item) => item.name === area.name && item.documentFilename === area.documentFilename && item.scope === area.scope) === index)
      .slice(0, MAX_PROCEDURE_AREAS)),
  };
}

function buildSearchQueries(plan: PrepPlan) {
  const searches: SearchSpec[] = plan.procedureAreas.filter((area) => area.scope !== "excluded").map((area) => {
    const prefix = sourcePrefix(area.documentFilename);
    const nextArea = plan.procedureAreas
      .filter((candidate) => sourcePrefix(candidate.documentFilename) === prefix)
      .filter((candidate) => candidate.startPage !== null && area.startPage !== null && candidate.startPage > area.startPage)
      .sort((left, right) => (left.startPage ?? 0) - (right.startPage ?? 0))[0];
    return {
      areaName: area.name,
      scope: area.scope,
      query: `${area.startPage ? `PDF page ${area.startPage}; ` : ""}${area.name}; ${plan.task}; Tools, Parts needed, installation procedure, warnings`,
      sourcePrefix: prefix,
      startPage: area.startPage,
      // Include the boundary page because manuals often end one procedure and
      // begin the next on the same PDF page.
      endPage: area.startPage
        ? (nextArea ? (nextArea.startPage ?? area.startPage) - (nextArea.scope === "excluded" ? 1 : 0) : area.startPage + 8)
        : null,
    };
  });

  return searches
    .filter((search) => search.query.trim() && search.sourcePrefix)
    .filter((search, index, all) => all.findIndex((item) => item.query === search.query && item.sourcePrefix === search.sourcePrefix) === index)
    .slice(0, MAX_SEARCH_QUERIES);
}

async function collectEvidence(client: OpenAI, vectorStoreId: string, searches: SearchSpec[]) {
  const initialPages = await Promise.all(
    searches.map(async (search) => ({
      search,
      page: await client.vectorStores.search(vectorStoreId, {
        query: search.query,
        max_num_results: 10,
        rewrite_query: false,
      }),
    })),
  );

  const scopedResults = (search: SearchSpec, results: VectorStoreSearchResponse[]) => results.filter((result) => {
    if (!belongsToSource(result.filename, search.sourcePrefix)) return false;
    const pageNumber = pageFromFilename(result.filename);
    if (search.startPage === null || search.endPage === null || pageNumber === null) return true;
    return pageNumber >= search.startPage && pageNumber <= search.endPage;
  });

  const resultPages = await Promise.all(initialPages.map(async ({ search, page }) => {
    let results = scopedResults(search, page.data);
    const hasStartPage = search.startPage === null || results.some((result) => pageFromFilename(result.filename) === search.startPage);
    if (!hasStartPage) {
      const repair = await client.vectorStores.search(vectorStoreId, {
        query: `PDF page ${search.startPage}; ${search.areaName}`,
        max_num_results: 10,
        rewrite_query: false,
      });
      results = [...scopedResults(search, repair.data), ...results]
        .filter((result, index, all) => all.findIndex((item) => item.filename === result.filename) === index);
    }
    // A concise procedure section can still span four adjacent pages. Keeping
    // one more ranked page avoids losing a modification instruction (for
    // example, a cut or drilling step) that is between the section heading
    // and the installation photo, without adding another vector-store call.
    return { search, results: results.slice(0, 4) };
  }));

  const byFilename = new Map<string, Omit<EvidenceItem, "id"> & { queryRanks: number[] }>();
  for (const { search, results } of resultPages) {
    for (const [rank, result] of results.entries()) {
      const text = result.content.map((content) => content.text).join("\n").trim();
      if (!text) continue;
      const existing = byFilename.get(result.filename);
      if (existing) {
        existing.score = Math.max(existing.score, result.score);
        existing.queries.push(search.query);
        existing.scopes.push(search.scope);
        existing.queryRanks.push(rank);
        if (text.length > existing.text.length) existing.text = text;
      } else {
        byFilename.set(result.filename, {
          filename: result.filename,
          score: result.score,
          text,
          queries: [search.query],
          scopes: [search.scope],
          queryRanks: [rank],
        });
      }
    }
  }

  // Preserve the best hit for every planned procedure area before filling the
  // remaining budget by score. A global score-only cut can silently discard a
  // lower-scoring section-start page even when it is the best result for that area.
  const candidates = [...byFilename.values()];
  const primary = candidates
    .filter((item) => item.queryRanks.includes(0))
    .sort((left, right) => searches.findIndex((search) => search.query === left.queries[left.queryRanks.indexOf(0)]) - searches.findIndex((search) => search.query === right.queries[right.queryRanks.indexOf(0)]));
  const remainder = candidates
    .filter((item) => !primary.includes(item))
    .sort((left, right) => right.score - left.score);

  let characters = 0;
  const evidence = [...primary, ...remainder]
    .slice(0, MAX_EVIDENCE_ITEMS)
    .flatMap((item, index) => {
      const remaining = MAX_EVIDENCE_CHARACTERS - characters;
      if (remaining <= 0) return [];
      const text = item.text.slice(0, Math.min(remaining, 4_000));
      characters += text.length;
      return [{ id: `S${index + 1}`, filename: item.filename, score: item.score, text, queries: item.queries, scopes: item.scopes }];
    });
  const evidenceFilenames = new Set(evidence.map((item) => item.filename));
  const missingSectionStarts = searches
    .filter((search) => search.startPage !== null)
    .filter((search) => ![...evidenceFilenames].some((filename) => belongsToSource(filename, search.sourcePrefix) && pageFromFilename(filename) === search.startPage))
    .map((search) => `${search.areaName} (PDF p. ${search.startPage})`);

  return { evidence, missingSectionStarts };
}

function serializeEvidence(evidence: EvidenceItem[]) {
  return evidence.map((item) => {
    const mapped = getSourceFromRetrievalFilename(item.filename);
    const sourceLabel = mapped
      ? `${mapped.source.title}, PDF p. ${mapped.page ?? "unmapped"}`
      : item.filename;
    return `[${item.id}] ${sourceLabel}\nScope: ${uniqueNonempty(item.scopes).join(", ")}\nRetrieved for: ${uniqueNonempty(item.queries).join(" | ")}\n${item.text}`;
  }).join("\n\n---\n\n");
}

async function writeCard(client: OpenAI, question: string, plan: PrepPlan, evidence: EvidenceItem[], missingSectionStarts: string[], buildContext: string): Promise<GarageCard> {
  const response = await client.responses.create({
    model: PREP_MODEL,
    instructions: `You create a fast, accurate garage-prep card solely from supplied manual evidence. Do not summarize the whole manual and do not tell the builder to open a manual; source cards handle that. Use concise, action-oriented bullets and never repeat a fact.

The six output fields mean:
- whatYoureDoing: exactly one plain-language orientation bullet describing the selected core task.
- bringToTheCar: only the concrete tools, materials, parts, hardware, and assistance for CORE evidence. Group by core procedure area where useful, consolidate duplicates, and retain every distinct named hand tool from each retrieved core section-start list. A hand tool may appear only once across this field. Prefer named tools and special tools over narrating large quantities of ordinary supplied fasteners. This is a staging list, not prose. Never invent generic tools. If core evidence is incomplete, include what is supported and say exactly which core procedure area's list is missing.
- doThis: 3-6 high-level CORE actions in controlling sequence. Orient the builder without reproducing the manual. A physical alteration (cut, drill, grind, trim, bend, or file) is an exception to high-level wording: make it a standalone bullet that identifies the exact sub-part or feature being altered, the operation, its measured amount or location when supplied, and any stated precondition. Never describe an alteration with a broad assembly shorthand when the evidence identifies a smaller target. For example, never write "cut the master cylinders as instructed" when the evidence identifies a threaded shaft. If those details are not retained in evidence, do not include the alteration in doThis; state the gap in stopAndVerify instead.
- watchFor: 1-4 concrete, non-obvious manual cautions, option branches, fitment notes, or irreversible hold points.
- nextSelectedFollowOnWork: selected follow-on procedures only. Give one short bullet per relevant follow-on procedure with its dependency or timing. Do not repeat its tool list here; this is not a second staging list. If none are selected/retrieved, return "No selected follow-on work retrieved."
- verifyBeforeClosing: 1-4 specific checks before access disappears, final retention, or first load.
- stopAndVerify: only real unresolved safety, fitment, or configuration gaps. If none are evidenced, return one bullet saying "No additional unresolved safety-critical gap retrieved."

Every factual bullet must list only the one or two evidence IDs that directly support it. Use only IDs present in the supplied evidence, and honor each evidence item's Scope field. Use the BUILD CONFIGURATION to resolve selected versus unselected variants; it does not authorize unsupported mechanical instructions. If the configuration says a manual procedure is not the selected configuration, do not mention or use that procedure anywhere in the card. If the configuration names an unindexed vendor-document gap affecting core work, state it plainly in STOP & VERIFY. Refer to selected components as selected, not optional. A missing-information statement may use an empty evidenceIds array. Never put citations in the bullet text. Do not include forum information. Do not include numeric torque values or units; reviewed structured torque data is rendered separately. Keep the rendered card under about 260 words.`,
    input: `REQUEST\n${question}\n\nBUILD CONFIGURATION\n${buildContext}\n\nDISCOVERED PROCEDURE AREAS\n${plan.procedureAreas.filter((area) => area.scope !== "excluded").map((area) => `- [${area.scope}] ${area.name} — controlling upload: ${area.documentFilename}${area.startPage ? ` — starts on PDF p. ${area.startPage}` : ""}`).join("\n")}\n\nSECTION STARTS NOT RETRIEVED AFTER ONE REPAIR PASS\n${missingSectionStarts.length ? missingSectionStarts.map((item) => `- ${item}`).join("\n") : "None"}\n\nMANUAL EVIDENCE\n${serializeEvidence(evidence)}`,
    text: {
      format: {
        type: "json_schema",
        name: "garage_prep_card",
        strict: true,
        schema: cardSchema,
      },
      verbosity: "low",
    },
    store: false,
  });

  return parseStructuredOutput<GarageCard>(response.output_text, "garage card");
}

function renderCard(card: GarageCard) {
  const headings: Record<SectionKey, string> = {
    whatYoureDoing: "What you're doing",
    bringToTheCar: "Bring to the car",
    doThis: "Do this",
    watchFor: "Watch for",
    nextSelectedFollowOnWork: "Next / selected follow-on work",
    verifyBeforeClosing: "Verify before closing",
    stopAndVerify: "STOP & VERIFY",
  };

  return sectionKeys.map((key) => {
    const bullets = card[key].map((bullet) => `- ${bullet.text.trim()}`).join("\n");
    return `## ${headings[key]}\n\n${bullets || "- No supported item retrieved."}`;
  }).join("\n\n");
}

function removeExcludedFuelPickupContent(card: GarageCard, question: string) {
  if (!/(?:fuel|tank|pump|sender|filler|vent|filter|fuel[-\s]?line)/i.test(question)) return;
  const excludedPickup = /(?:inline[-\s]?pump|round-profile\s+o-?ring|square\s+(?:one|o-?ring)|fuel\s+pick-?up)/i;
  for (const key of ["bringToTheCar", "doThis", "watchFor", "nextSelectedFollowOnWork"] as const) {
    card[key] = card[key].filter((bullet) => !excludedPickup.test(bullet.text));
  }
}

function removeBrakeFluidFollowOn(card: GarageCard, question: string) {
  if (!/(?:brake|caliper|rotor|flexline|bleed|brake[-\s]?fluid)/i.test(question)) return;
  const remaining = card.nextSelectedFollowOnWork.filter((bullet) => !/(?:fluid\s+choice|additional\s+information\s+and\s+recommendations)/i.test(bullet.text));
  card.nextSelectedFollowOnWork = remaining.length
    ? remaining
    : [{ text: "No selected follow-on work retrieved.", evidenceIds: [] }];
}

function removeConflictedBrakeFluidStaging(card: GarageCard, question: string) {
  if (!/(?:brake|caliper|rotor|flexline|bleed|brake[-\s]?fluid|master cylinder|pedal\s*box)/i.test(question)) return;
  // This demo has a known Factory Five / selected-Wilwood fluid conflict. The
  // STOP & VERIFY block owns that decision; a staging bullet must not quietly
  // select one side of the conflict for the builder.
  card.bringToTheCar = card.bringToTheCar.filter((bullet) => !/(?:\bdot\s*3\b|brake[-\s]?fluid)/i.test(bullet.text));
}

function normalizeImperialToolSizes(card: GarageCard) {
  const fractionalInches: Record<string, string> = { "25": "1/4", "50": "1/2", "75": "3/4" };
  const toolSize = /\b(\d+)\.(25|50|75)\s*(?:[”"]|in(?:ches)?\.?)\s*((?:deep\s+)?(?:socket|wrench)|hex\s+key|drill\s+bit|bit)\b/gi;
  for (const key of ["bringToTheCar"] as const) {
    card[key] = card[key].map((bullet) => ({
      ...bullet,
      // Manual extraction often expresses conventional tool sizes as decimals.
      // Normalize only named tools; dimensions such as 2.45 in. rack spacers
      // retain their source precision.
      text: bullet.text.replace(toolSize, (_match, whole: string, decimal: string, tool: string) => `${whole}-${fractionalInches[decimal]} in. ${tool}`),
    }));
  }
}

function moveVaguePhysicalAlterationsToStopAndVerify(card: GarageCard) {
  const vagueAlteration = /\b(?:cut|drill|grind|trim|bend|file|modify)\b[^.]*\b(?:as instructed|as directed|as needed)\b/i;
  const broadTarget = /\b(?:cut|drill|grind|trim|bend|file|modify)\s+(?:the\s+)?(?:assembly|component|components|hardware|part|parts|system|box|cylinders?)\b/i;
  const unsafeBullets = card.doThis.filter((bullet) => vagueAlteration.test(bullet.text) || broadTarget.test(bullet.text));
  if (!unsafeBullets.length) return;

  card.doThis = card.doThis.filter((bullet) => !unsafeBullets.includes(bullet));
  card.stopAndVerify = [
    ...card.stopAndVerify.filter((bullet) => !/^No additional unresolved safety-critical gap retrieved\.?$/i.test(bullet.text.trim())),
    {
      text: "STOP & VERIFY the exact target, amount, and location for the manual's physical modification before cutting, drilling, grinding, trimming, bending, or filing. The retrieved card evidence did not retain that detail clearly enough to restate safely.",
      evidenceIds: [],
    },
  ];
}

export async function buildDynamicPrepCard(client: OpenAI, vectorStoreId: string, question: string): Promise<PrepEvidenceResult> {
  const buildContext = renderDemoBuildContext(getDemoBuildContext(question));
  const plan = await planTask(client, vectorStoreId, question, buildContext);
  const searches = buildSearchQueries(plan);
  const { evidence, missingSectionStarts } = await collectEvidence(client, vectorStoreId, searches);
  if (!evidence.length) throw new Error("No manual evidence was retrieved for this prep request.");

  const card = await writeCard(client, question, plan, evidence, missingSectionStarts, buildContext);
  removeExcludedFuelPickupContent(card, question);
  removeBrakeFluidFollowOn(card, question);
  removeConflictedBrakeFluidStaging(card, question);
  normalizeImperialToolSizes(card);
  moveVaguePhysicalAlterationsToStopAndVerify(card);
  const configurationSafetyGaps = getDemoBuildSafetyGaps(question);
  if (configurationSafetyGaps.length) {
    card.stopAndVerify = [
      ...card.stopAndVerify.filter((bullet) => !/^No additional unresolved safety-critical gap retrieved\.?$/i.test(bullet.text.trim())),
      ...configurationSafetyGaps.map((gap) => ({ text: gap.text, evidenceIds: [] })),
    ];
  }
  const allowedIds = new Set(evidence.map((item) => item.id));
  const usedIds = uniqueNonempty(
    sectionKeys.flatMap((key) => card[key].flatMap((bullet) => bullet.evidenceIds)),
  ).filter((id) => allowedIds.has(id));
  const usedEvidence = usedIds.map((id) => evidence.find((item) => item.id === id)).filter((item): item is EvidenceItem => Boolean(item));
  const evidenceCitations = usedEvidence
    .map((item) => getSourceFromRetrievalFilename(item.filename))
    .filter((citation): citation is NonNullable<typeof citation> => Boolean(citation))
    .filter((citation, index, all) => all.findIndex((item) => item.source.id === citation.source.id && item.page === citation.page) === index)
    .map(({ source, page }) => ({
      id: `${source.id}-${page ?? "unmapped"}`,
      title: source.title,
      authority: source.authority,
      page,
      url: `/api/sources/${source.id}#page=${page ?? source.initialPage}`,
    }));
  const safetyGapCitations = configurationSafetyGaps
    .flatMap((gap) => gap.citations ?? [])
    .map(({ sourceId, page }) => {
      const source = getSource(sourceId);
      return source ? {
        id: `${source.id}-${page}`,
        title: source.title,
        authority: source.authority,
        page,
        url: `/api/sources/${source.id}#page=${page}`,
      } : undefined;
    })
    .filter((citation): citation is NonNullable<typeof citation> => Boolean(citation));
  const citations = [...evidenceCitations, ...safetyGapCitations]
    .filter((citation, index, all) => all.findIndex((item) => item.id === citation.id) === index);

  const warning = missingSectionStarts.length
    ? `The following planned manual sections could not be retrieved: ${missingSectionStarts.join(", ")}. Treat their card coverage as incomplete.`
    : usedIds.length === 0
    ? "The card did not retain exact evidence references. Treat it as unverified and consult the controlling documentation."
    : citations.length === 0
      ? "The retrieved evidence is not page-mapped. Treat it as unverified and consult the controlling documentation."
      : citations.some((citation) => !citation.page)
        ? "Some retrieved evidence is not page-mapped. Do not treat an unmapped source card as an exact page citation."
        : undefined;

  return {
    answer: renderCard(card),
    citations,
    procedureAreas: plan.procedureAreas.filter((area) => area.scope !== "excluded").map((area) => area.name),
    searches: searches.map((search) => `${search.sourcePrefix}: ${search.query}`),
    missingSectionStarts,
    warning,
  };
}
