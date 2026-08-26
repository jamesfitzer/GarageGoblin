import OpenAI from "openai";
import { garageGoblinInstructions } from "@/lib/garage-goblin-instructions";
import { getSourceFromRetrievalFilename } from "@/lib/sources";
import { getVerifiedTorqueResponse } from "@/lib/verified-torque";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY is missing. Add it to .env.local and restart the dev server." }, { status: 503 });
  }
  const vectorStoreId = process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID ?? process.env.OPENAI_PAGE_INDEX_VECTOR_STORE_ID ?? process.env.OPENAI_VECTOR_STORE_ID;
  if (!vectorStoreId) {
    return Response.json({ error: "A Vector Store ID is missing. Run the approved ingestion script, add the printed ID to .env.local, then restart the dev server." }, { status: 503 });
  }

  const body = (await request.json()) as { question?: unknown };
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 1_500) return Response.json({ error: "Provide a question up to 1,500 characters." }, { status: 400 });

  const verifiedTorqueResponse = getVerifiedTorqueResponse(question);
  if (verifiedTorqueResponse) return Response.json(verifiedTorqueResponse);

  const input = /^prep me for\s*:/i.test(question)
    ? `${question}\n\nRetrieve the controlling task-procedure pages, not merely a table of contents. Produce a concise briefing with applicable prerequisites, sequence dependencies, hold points, and STOP & VERIFY items. Cite each factual item from the exact supporting pages.`
    : question;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let response;
  try {
    response = await client.responses.create({
      model: "gpt-5.4-mini",
      instructions: garageGoblinInstructions,
      input,
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

  return Response.json({
    answer: response.output_text,
    citations,
    warning: citations.length === 0
      ? "No exact source citation was returned with this answer. Treat it as unverified and consult Factory Five documentation."
      : citations.some((citation) => !citation.page)
        ? "Some retrieved material has not yet been page-mapped. Do not treat an unmapped source card as an exact page citation."
        : undefined,
  });
}
