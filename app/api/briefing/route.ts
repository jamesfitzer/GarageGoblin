import OpenAI from "openai";
import { garageGoblinInstructions } from "@/lib/garage-goblin-instructions";
import { getSourceFromRetrievalFilename } from "@/lib/sources";
import { getBriefingTorqueSupplement } from "@/lib/briefing-torque";
import { buildDynamicPrepCard } from "@/lib/prep-evidence";
import { buildBriefingArtifact } from "@/lib/briefing-template";
import { getVerifiedTorqueResponse } from "@/lib/verified-torque";

export const runtime = "nodejs";

type ForumSource = { title: string; url: string };
type WebResearchSource = ForumSource & { sourceType: "Factory Five Forum" | "General web" };
type WebSearchResponse = {
  output: Array<{
    type: string;
    content?: Array<{ type: string; annotations?: Array<{ type: string; url?: string }> }>;
    action?: { sources?: Array<{ url?: string }> };
    sources?: Array<{ url?: string }>;
  }>;
};

function getWebSourceUrls(response: WebSearchResponse) {
  const citedUrls = response.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .flatMap((content) => content.annotations ?? [])
    .filter((annotation) => annotation.type === "url_citation")
    .map((annotation) => annotation.url)
    .filter((url): url is string => Boolean(url));
  const searchedUrls = response.output
    .filter((item) => item.type === "web_search_call")
    .flatMap((item) => {
      return item.action?.sources ?? item.sources ?? [];
    })
    .map((source) => source.url)
    .filter((url): url is string => Boolean(url));
  return (citedUrls.length ? citedUrls : searchedUrls).filter((url, index, all) => all.indexOf(url) === index).slice(0, 3);
}

function removeNumericTorqueLines(answer: string) {
  const numericTorque = /\b\d+(?:\s*[-–]\s*\d+)?\s*(?:n\.?m\.?|newton[-\s]?meters?|lb\.?[-\s]?ft|ft\.?[-\s]?lb)\b/i;
  const lines = answer.split("\n");
  const kept = lines.filter((line) => !numericTorque.test(line));
  return { answer: kept.join("\n").replace(/\n{3,}/g, "\n\n").trim(), removed: kept.length !== lines.length };
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY is missing. Add it to .env.local and restart the dev server." }, { status: 503 });
  }
  const vectorStoreId = process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID ?? process.env.OPENAI_PAGE_INDEX_VECTOR_STORE_ID ?? process.env.OPENAI_VECTOR_STORE_ID;
  if (!vectorStoreId) {
    return Response.json({ error: "A Vector Store ID is missing. Run the approved ingestion script, add the printed ID to .env.local, then restart the dev server." }, { status: 503 });
  }

  const body = (await request.json()) as { question?: unknown; forumResearch?: unknown; webResearch?: unknown; context?: unknown };
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 1_500) return Response.json({ error: "Provide a question up to 1,500 characters." }, { status: 400 });
  const context = typeof body.context === "string" ? body.context.trim().slice(0, 4_000) : "";

  const isForumResearch = body.forumResearch === true;
  const isWebResearch = body.webResearch === true;
  if (isForumResearch) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let response;
    try {
      response = await client.responses.create({
        model: "gpt-5.4-mini",
        instructions: `You are performing a separate community-research pass for Garage Goblin. Search only the Factory Five Forum for the exact Mk5 Roadster task in the user question. Return at most three threads, and include a thread only if it describes the procedure or adds a concrete, configuration-relevant gotcha. Label every takeaway "Factory Five community experience — not Factory Five guidance." Never use a forum thread to authorize drilling, machining, a torque value, or a deviation from Factory Five documentation. If official documentation is absent or conflicts with community advice, say Factory Five controls. If no strong relevant thread is found, say so plainly. Be concise.`,
        input: question,
        tools: [{ type: "web_search", filters: { allowed_domains: ["thefactoryfiveforum.com"] }, search_context_size: "low" }],
        tool_choice: "required",
        include: ["web_search_call.action.sources"],
        store: false,
      });
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
      const message = status === 429
        ? "Garage Goblin has reached its temporary OpenAI request limit. Please retry shortly."
        : "Garage Goblin could not search the Factory Five Forum right now. Please retry.";
      return Response.json({ error: message }, { status });
    }

    const sourceUrls = getWebSourceUrls(response as unknown as WebSearchResponse);
    const sources: ForumSource[] = sourceUrls.map((url) => ({ title: "Factory Five Forum thread", url }));

    return Response.json({
      forumResearch: {
        answer: response.output_text,
        sources,
        warning: "Factory Five community experience is contextual only. Factory Five documentation controls.",
      },
    });
  }

  if (isWebResearch) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const researchInput = context ? `REQUEST\n${question}\n\nRELEVANT PRIOR CHAT\n${context}` : question;
    try {
      const [forumResponse, webResponse] = await Promise.all([
        client.responses.create({
          model: "gpt-5.4-mini",
          instructions: `You are Garage Goblin's explicit community-research pass. Search only the Factory Five Forum for the vehicle-specific question supplied. Report at most three concrete takeaways or say no relevant discussion was found. Every statement must be labeled "Factory Five community experience — not Factory Five guidance." Never use community advice to authorize drilling, machining, a torque value, fluid substitution, or another deviation from the Factory Five manual. Be concise.`,
          input: researchInput,
          tools: [{ type: "web_search", filters: { allowed_domains: ["thefactoryfiveforum.com"] }, search_context_size: "low" }],
          tool_choice: "required",
          include: ["web_search_call.action.sources"],
          store: false,
        }),
        client.responses.create({
          model: "gpt-5.4-mini",
          instructions: `You are Garage Goblin's explicit last-resort general-web research pass. Search for generic automotive/component context relevant to the supplied request, not Factory Five-specific authorization. Report at most three concrete, source-linked takeaways or say no useful context was found. Begin every takeaway with "General web context — not Factory Five guidance." Never select a torque value, fluid, fitment, machining action, or other safety-critical configuration from web consensus. State that Factory Five documentation controls and the component manufacturer is the appropriate escalation point for a conflict. Be concise.`,
          input: researchInput,
          tools: [{ type: "web_search", search_context_size: "low" }],
          tool_choice: "required",
          include: ["web_search_call.action.sources"],
          store: false,
        }),
      ]);
      const sources: WebResearchSource[] = [
        ...getWebSourceUrls(forumResponse as unknown as WebSearchResponse).map((url) => ({ title: "Factory Five Forum thread", url, sourceType: "Factory Five Forum" as const })),
        ...getWebSourceUrls(webResponse as unknown as WebSearchResponse).map((url) => ({ title: "General web source", url, sourceType: "General web" as const })),
      ].filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index).slice(0, 6);
      return Response.json({
        answer: `## Factory Five Forum context\n\n${forumResponse.output_text}\n\n## General web context (last resort)\n\n${webResponse.output_text}`,
        citations: [],
        webSources: sources,
        warning: "External research is contextual only. Factory Five documentation controls; resolve a conflict with Factory Five or the relevant component manufacturer.",
      });
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
      const message = status === 429
        ? "Garage Goblin has reached its temporary OpenAI request limit. Please retry shortly."
        : "Garage Goblin could not complete the requested forum and web research right now. Please retry.";
      return Response.json({ error: message }, { status });
    }
  }

  const verifiedTorqueResponse = getVerifiedTorqueResponse(question);
  if (verifiedTorqueResponse) return Response.json(verifiedTorqueResponse);

  const isPrepRequest = /^prep me for\s*:/i.test(question);
  const torqueSupplement = isPrepRequest ? getBriefingTorqueSupplement(question) : undefined;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (isPrepRequest) {
    try {
      const prep = await buildDynamicPrepCard(client, vectorStoreId, question);
      const preparedAnswer = removeNumericTorqueLines(prep.answer);
      return Response.json({
        answer: preparedAnswer.answer,
        citations: prep.citations,
        torqueSupplement,
        briefingArtifact: buildBriefingArtifact(question, preparedAnswer.answer),
        warning: preparedAnswer.removed
          ? "Model-generated numeric torque content was removed. Any reviewed torque records for this task appear separately below."
          : prep.warning,
        retrieval: {
          procedureAreas: prep.procedureAreas,
          searches: prep.searches,
          missingSectionStarts: prep.missingSectionStarts,
        },
      });
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
      const message = status === 429
        ? "Garage Goblin has reached its temporary OpenAI request limit. Please retry shortly."
        : "Garage Goblin could not assemble a grounded prep card right now. Please retry.";
      return Response.json({ error: message }, { status });
    }
  }

  let response;
  try {
    response = await client.responses.create({
      model: "gpt-5.4-mini",
      instructions: garageGoblinInstructions,
      input: question,
      include: ["file_search_call.results"],
      tools: [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 8 }],
      store: false,
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
    const message = status === 429
      ? "Garage Goblin has reached its temporary OpenAI request limit. Please retry shortly."
      : "Garage Goblin could not retrieve the approved manuals right now. Please retry.";
    return Response.json({ error: message }, { status });
  }

  const citedFilenames = response.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content)
    .filter((content) => content.type === "output_text")
    .flatMap((content) => content.annotations)
    .filter((annotation) => annotation.type === "file_citation")
    .map((annotation) => annotation.filename);

  const citations = citedFilenames
    .map((filename) => getSourceFromRetrievalFilename(filename))
    .filter((citation): citation is NonNullable<typeof citation> => Boolean(citation))
    .filter((citation, index, all) => all.findIndex((item) => item.source.id === citation.source.id && item.page === citation.page) === index)
    .map(({ source, page }) => ({
      id: `${source.id}-${page ?? "unmapped"}`,
      title: source.title,
      authority: source.authority,
      page,
      url: `/api/sources/${source.id}#page=${page ?? source.initialPage}`,
    }));

  const citationWarning = citations.length === 0
    ? "No exact source citation was returned with this answer. Treat it as unverified and consult Factory Five documentation."
    : citations.some((citation) => !citation.page)
      ? "Some retrieved material has not yet been page-mapped. Do not treat an unmapped source card as an exact page citation."
      : undefined;

  return Response.json({
    answer: response.output_text,
    citations,
    warning: citationWarning,
  });
}
