import express, { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config()

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname,"../public")));

// --------- CLAUDE CLIENT -- Initializer ---------
// const client = new Anthropic();

// --------- GEMINI CLIENT -- Initializer ---------
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = genai.getGenerativeModel(
  {
    model: "gemini-3-flash-preview", 
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          summary: { 
            type: SchemaType.STRING,
            description: "A 2-3 sentence summary."
          },
          action_items: { 
            type: SchemaType.ARRAY, 
            items: { type: SchemaType.STRING },
            description: "Exactly 3 action items."
          }
        },
        required: ["summary", "action_items"]
      }
    }
  },
  { apiVersion: "v1beta" }
);

interface AnalyzeRequest {
  text: string;
}

interface AnalyzeResponse {
  summary: string;
  action_items: string[];
}

// --------- CLAUDE PROMPT -- used for when using the Anthropic API ---------
// const SYSTEM_PROMPT = `You are a text analysis assistant. When given a block of text, you must respond with ONLY valid JSON — no markdown, no explanation, no preamble.

// The JSON must have exactly this structure:
// {
//   "summary": "<a 2-3 sentence summary of the text>",
//   "action_items": [
//     "<action item 1>",
//     "<action item 2>",
//     "<action item 3>"
//   ]
// }

// Rules:
// - summary: concise, neutral, 2-3 sentences max
// - action_items: exactly 3 items, each starting with an imperative verb (e.g. "Review...", "Schedule...", "Send...")
// - If the text has fewer than 3 clear actions, infer reasonable next steps from context
// - Output raw JSON only — no \`\`\`json fences, no extra keys`;

// --------- GEMINI PROMPT -- used for the Google Gemini API ---------
const PROMPT_TEMPLATE = (text: string) => `
You are a text analysis assistant. Extract insights from the following text.

Your goals:
1. Provide a neutral, 2-3 sentence summary.
2. Identify exactly 3 action items. 
3. Each action item must start with an imperative verb (e.g., "Draft", "Call", "Update").
4. If the text is missing clear tasks, infer 3 logical next steps based on the context.

TEXT TO ANALYZE:
"${text.trim()}"
`;

app.post("/analyze", async (req: Request, res: Response) => {
  const { text } = req.body as AnalyzeRequest;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "Request body must include a non-empty 'text' field." });
    return;
  }

  try {
    // --------- CLUADE RESULTS -- Model and results when using Anthropic API ---------
    // const message = await client.messages.create({
    //   model: "claude-opus-4-5",
    //   max_tokens: 512,
    //   system: SYSTEM_PROMPT,
    //   messages: [
    //     {
    //       role: "user",
    //       content: `Analyze this text:\n\n${text.trim()}`,
    //     },
    //   ],
    // });

    // const raw = message.content[0].type === "text" ? message.content[0].text : "";
    // const result: AnalyzeResponse = JSON.parse(raw)

    // res.json(result);

    // --------- GEMINI RESULTS - Results parsing when using Google API ---------
    const result = await model.generateContent(PROMPT_TEMPLATE(text.trim()));
    const responseText = result.response.text();
    
    // The response is now guaranteed to be valid JSON matching your interface
    res.json(JSON.parse(responseText));
  } catch (error) {
    // --------- CLAUDE ERROR HANDLING ---------
    // console.error("Anthropic Error:", error);
    // res.status(500).json({ error: "Failed to analyze text" });

    // --------- GEMINI ERROR HANDLING ---------
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to analyze text." });
  }
});

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;