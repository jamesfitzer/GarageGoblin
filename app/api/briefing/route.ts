import OpenAI from "openai";
import { getSourceFromRetrievalFilename } from "@/lib/sources";

export const runtime = "nodejs";

const instructions = `You are Garage Goblin, a document-grounded garage copilot for one Factory Five Mk5 Roadster demo build.

Factory Five documentation controls. Do not present community advice as official instruction. For missing or ambiguous safety-critical information, do not infer: state "STOP & VERIFY" and direct the builder to Factory Five or the relevant component manufacturer.

Give concise, garage-scannable answers. Do not reproduce long manual procedures. Use only supplied file-search content. Do not make parts-compatibility conclusions.

The interface, not your prose, renders retrieved source cards with exact PDF pages. Do not state a page number or call an option instruction the Mk5 manual in prose. Refer generically to "the controlling manual" or "the applicable Factory Five option instruction" only when the distinction is supported by the retrieved material.`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY is missing. Add it to .env.local and restart the dev server." }, { status: 503 });
  }
  const vectorStoreId = process.env.OPENAI_PAGE_INDEX_VECTOR_STORE_ID ?? process.env.OPENAI_VECTOR_STORE_ID;
  if (!vectorStoreId) {
    return Response.json({ error: "A Vector Store ID is missing. Run the approved ingestion script, add the printed ID to .env.local, then restart the dev server." }, { status: 503 });
  }

  const body = (await request.json()) as { question?: unknown };
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 1_500) return Response.json({ error: "Provide a question up to 1,500 characters." }, { status: 400 });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: "gpt-5.4-mini",
    instructions,
    input: question,
    include: ["file_search_call.results"],
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 8 }],
    store: false,
  });

  const citations = response.output
    .filter((item) => item.type === "file_search_call")
    .flatMap((item) => item.results ?? [])
    .map((result) => getSourceFromRetrievalFilename(result.filename ?? ""))
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
    warning: citations.some((citation) => !citation.page) ? "Some retrieved material has not yet been page-mapped. Do not treat an unmapped source card as an exact page citation." : undefined,
  });
}
