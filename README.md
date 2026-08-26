# Garage Goblin

Local-first retrieval proof for a Factory Five Mk5 Roadster garage copilot.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add a dedicated OpenAI API project key as `OPENAI_API_KEY`.
3. Run `npm run extract:irs-pages`.
4. Run `npm run ingest:irs-pages`.
5. Copy the printed `OPENAI_PAGE_INDEX_VECTOR_STORE_ID` line into `.env.local`.
6. Run `npm run dev` and open the local URL shown by Next.js.

The initial ingestion set is intentionally limited to the Mk5 manual pages 104-141
and the official 2015+ IRS option instructions. The page-aware index produces one
retrieval file per original PDF page, so a search hit has an exact source-page
identity. `sources/` remains the canonical local source intake; no owner-private
documents are ingested.

## Retrieval-proof status

The briefing route uses real OpenAI Responses API File Search and returns the
actual retrieved source pages. See `EVALUATION_SET.md`.
