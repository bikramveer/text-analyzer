# text-analyzer

A REST API with a web UI that uses an AI model to summarize text and extract action items from it, returning the results as structured JSON. Built with Express and TypeScript.

**Live demo:** [text-analyzer-tbs.vercel.app](https://text-analyzer-tbs.vercel.app)

The app is deployed on Vercel and running with my Google Gemini API key, so you can test it directly without any setup.

---

## Exercise Write-Up

### What I built

A single endpoint REST API that accepts a block of text and returns a summary and three action items as JSON. I also built a simple web UI on top of it so you can test it in the browser without needing Postman or curl. The UI sends the same POST request under the hood and renders the response in a readable way.

I kept the codebase simple on purpose. One route, one model call, no database. The goal was to show how I think about structuring a small project and how I approach working with AI APIs, not to over-engineer something that didn't need it.

The index.ts file also includes the Anthropic Claude implementation as commented out code alongside the active Gemini version. I wanted to show how the two providers compare since I explored both during the build. The main difference is that Gemini lets you pass a responseSchema directly in the API config to enforce the JSON structure, while with Claude you have to handle that through the prompt itself.

### The prompts I used

For Gemini I used a single prompt template that combines the instructions and the input text together. Because Gemini supports responseSchema in the generation config, the prompt only needs to describe what the content should look like rather than worry about output formatting.

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

For the Claude version I used a separate system prompt with stricter formatting instructions since Claude does not have a responseSchema equivalent. I had to explicitly tell it to return raw JSON with no markdown fences and define the exact structure I wanted inside the prompt.

### What didn't work at first and how I adjusted

The first thing I ran into was that both models would wrap their JSON responses in markdown code fences by default. For Gemini I fixed this by setting responseMimeType to application/json and adding a responseSchema in the generation config, which enforces the output format at the API level. For the Claude version I added explicit instructions in the prompt like "raw JSON only, no fences" and kept a JSON.parse call to catch anything malformed.

The second issue was inconsistent action item counts. Sometimes the model would return two items, sometimes four, depending on how much content was in the input. Adding "exactly 3 items" and a fallback instruction to infer next steps when the text does not have enough clear tasks fixed this.

I also ran into billing issues with the Anthropic API. Even after adding credits the messages endpoint kept returning a credit balance error, while the models endpoint worked fine. I spent time debugging this before switching to Gemini's free tier to unblock myself. I kept both implementations in the code since I had already built both.

### What I would improve with more time

Right now switching between Claude and Gemini means manually commenting and uncommenting code. A cleaner version would read a MODEL_PROVIDER environment variable at startup and pick the right client automatically.

I also want to add proper tests. At minimum a happy path test and a test for bad input, with the AI client mocked so the tests run fast and do not depend on a live API.

The input currently has a character limit on the frontend but no server side length validation. A production version would enforce that on the API side too and handle chunking for longer documents.
