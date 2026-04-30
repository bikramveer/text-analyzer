# text-analyzer

A REST API and web UI that uses an AI model to summarize text and extract action items, returning structured JSON. Built with Express and TypeScript.

The codebase is structured to support both **Google Gemini** and **Anthropic Claude** — commented sections in `index.ts` show both implementations side by side, making it easy to swap providers by uncommenting the relevant block.

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/text-analyzer.git
cd text-analyzer
npm install
cp .env.example .env  # add your GEMINI_API_KEY or ANTHROPIC_API_KEY
npm run dev
```

Then open `http://localhost:3000` in your browser to use the web UI, or send requests directly to the API.

Get a free Gemini API key (no credit card) at [aistudio.google.com](https://aistudio.google.com).

## API Usage

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "The Q3 roadmap review was held on Monday. The team agreed to prioritize the mobile checkout flow, defer the analytics dashboard to Q4, and schedule a follow-up with the design team by Friday. Engineering flagged a dependency on the payments API that needs to be resolved before development can start."}'
```

**Response:**

```json
{
  "summary": "The team held a Q3 roadmap review and agreed to prioritize the mobile checkout flow while deferring the analytics dashboard to Q4. A follow-up with the design team is planned for Friday. Engineering identified a payments API dependency that must be resolved before development begins.",
  "action_items": [
    "Prioritize mobile checkout flow development for Q3 delivery",
    "Schedule follow-up meeting with the design team before Friday",
    "Resolve payments API dependency before engineering begins development"
  ]
}
```

---

## Exercise Write-Up

### What I built

A single-endpoint REST API (`POST /analyze`) that accepts a JSON body with a `text` field and returns a structured object with a 2–3 sentence summary and exactly three action items. Built with Express and TypeScript, with Google Gemini as the active AI provider.

I also built a small web UI served from `public/index.html` — partly because I'm more comfortable validating functionality through a real interface than raw API calls, and partly because it makes the tool immediately usable without Postman or curl. The UI sends the same `POST /analyze` request under the hood and renders the structured response visually.

The `index.ts` file includes both the Gemini and Claude implementations as commented parallel sections, documenting how the two providers differ in their SDK design — Gemini uses a single `generateContent` call with a `responseSchema` config, while Claude separates the system prompt from the user message and relies on prompt instructions to constrain output format.

### The prompts I used

**Gemini** — a single prompt template combining instructions and input text, with the output schema enforced at the API level via `responseSchema` in `generationConfig`:

```
You are a text analysis assistant. Extract insights from the following text.

Your goals:
1. Provide a neutral, 2-3 sentence summary.
2. Identify exactly 3 action items.
3. Each action item must start with an imperative verb (e.g., "Draft", "Call", "Update").
4. If the text is missing clear tasks, infer 3 logical next steps based on the context.

TEXT TO ANALYZE:
"[input text]"
```

**Claude** (commented alternative) — a separate system prompt with stricter format instructions, since Claude doesn't use `responseSchema`:

```
You are a text analysis assistant. When given a block of text, you must respond
with ONLY valid JSON — no markdown, no explanation, no preamble...
```

The key difference: with Gemini, `responseSchema` enforces the JSON structure at the generation level, so the prompt can focus purely on content goals. With Claude, the prompt itself carries the formatting burden, requiring explicit rules like "no ```json fences" and "raw JSON only."

### What didn't work at first and how I adjusted

- **Markdown-wrapped JSON** — without `responseSchema`, both models wrapped responses in ```json fences. For Gemini, setting `responseMimeType: "application/json"` and `responseSchema` solved this at the API level. For the Claude version, I added explicit prompt rules ("raw JSON only, no fences") plus a `JSON.parse()` call as a validation gate.

- **Inconsistent action item count** — early iterations returned 2 or 4 items depending on input length. Adding "exactly 3 items" and a fallback rule ("infer next steps if fewer than 3 are explicit") made the count consistent across both providers.

- **Vague action items** — without the imperative verb constraint, items read as observations rather than tasks (e.g. "The team should consider the payments dependency" vs. "Resolve payments API dependency before development begins"). The grammar rule fixed this.

- **API billing issues** — the Anthropic API requires an active billing method before the `/v1/messages` endpoint works, even with credits loaded. The `/v1/models` endpoint returns 200 without billing, which made this tricky to debug. Switching to Gemini's free tier unblocked development, which is why both implementations are preserved in the code.

### What I would improve with more time

- **Provider toggle via environment variable** — since both implementations exist in the codebase, a clean next step would be a `MODEL_PROVIDER=gemini|claude` env flag that switches the active client at startup, rather than commenting/uncommenting code.
- **Input length capping** — currently validates for empty input but doesn't enforce a max character count. Long inputs should be truncated or chunked before hitting the model.
- **Tests** — at minimum, a happy-path integration test and a test for malformed input, with the AI client mocked for deterministic results.
- **Configurable output** — allowing callers to specify action item count or summary length via query params would make the API more flexible without meaningful added complexity.