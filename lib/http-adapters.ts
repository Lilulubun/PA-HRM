import { getSettings } from "./settings";
import type { JevAdapter, JevDecision, LlmAdapter, LlmResult } from "./ai-evidence";

type ChatMessage = { role: "system" | "user"; content: string };
type ChatContent = { content: string };

const LLMPROMPT = { role: "system" as const, content: `You summarize performance-review evidence. Respond with ONLY minified JSON, no markdown, exactly these keys: {"summary":string,"evidence":[{"answerId":string,"evidenceId":string,"quote":string,"summary":string}],"citedEvidenceIds":[string]}. Every quote MUST be a verbatim substring of the provided sourceText — never paraphrase, shorten, or merge quotes. evidenceId must look like "ev-<answerId-suffix>-<n>". citedEvidenceIds must be a subset of evidence[].evidenceId.` };
const JEVPROMPT = { role: "system" as const, content: `You are Jev, an evidence-assessment module for a performance review. Judge the peer/feedback text against the answer context. Respond with ONLY minified JSON, no markdown, no extra keys, exactly: {"relevant":boolean,"sufficient":boolean,"classification":"support"|"contradiction","probability":number 0..1,"rating":1|2|3|4|5,"questionSetVersion":"v1"}. classification MUST be exactly the string "support" or the string "contradiction" — never any other value. rating MUST be an integer 1-5. questionSetVersion MUST be exactly "v1".` };
function connectionError(message: string, cause: Error): Error {
  return new Error(`${message} (${cause.message})`);
}

function pickText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content.filter((c): c is ChatContent => Boolean(c && typeof c === "object" && typeof (c as ChatContent).content === "string"));
    return parts.map((c) => c.content).join("");
  }
  throw new Error("Invalid chat response shape");
}

function parseSseDelta(chunk: string): string {
  const dataLines = chunk.split("\n").filter((line) => line.startsWith("data:"));
  let text = "";
  for (const line of dataLines) {
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    const parsed = JSON.parse(payload) as { choices?: { delta?: { content?: string | ChatContent[] } }[] };
    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta !== undefined) text += pickText(delta);
  }
  return text;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model returned no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
}

async function chat(settings: { llmBaseUrl: string; llmModel?: string; llmApiKey?: string }, jevKey: string, messages: ChatMessage[], maxTokens: number): Promise<unknown> {
  if (!settings.llmBaseUrl) throw new Error("LLM base URL not configured (set it on the Settings page)");
  if (!settings.llmApiKey) throw new Error("LLM API key not configured (set it on the Settings page)");
  let response: Response;
  try {
    response = await fetch(`${settings.llmBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "authorization": `Bearer ${jevKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: settings.llmModel ?? "hermes-vps", messages, max_tokens: maxTokens, stream: true }),
    });
  } catch (cause) { throw connectionError("LLM request failed", cause as Error); }
  if (!response.ok || !response.body) throw new Error(`LLM request returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (block.startsWith("data:")) full += parseSseDelta(block);
    }
  }
  return extractJson(full);
}

export class HttpLlmAdapter implements LlmAdapter {
  async summarize(input: { answerId: string; sourceText: string; jev: JevDecision }): Promise<unknown> {
    const settings = await getSettings();
    if (!settings) throw new Error("Model settings unavailable");
    const messages: ChatMessage[] = [LLMPROMPT, { role: "user", content: `answerId: ${input.answerId}\nJev classification: ${input.jev.classification}, probability ${input.jev.probability}, rating ${input.jev.rating}\nsourceText: ${input.sourceText}` }];
    return chat(settings, settings.llmApiKey ?? "", messages, 600);
  }
}

export class HttpJevAdapter implements JevAdapter {
  constructor(private readonly baseUrl: string) {}
  async assess(input: { answerId: string; sourceText: string }): Promise<unknown> {
    const settings = await getSettings();
    if (!settings) throw new Error("Model settings unavailable");
    const jevKey = settings.jevApiKey ?? settings.llmApiKey;
    if (!jevKey) throw new Error("Jev API key not configured (set it on the Settings page)");
    if (this.baseUrl === settings.llmBaseUrl) {
      const messages: ChatMessage[] = [JEVPROMPT, { role: "user", content: `answerId: ${input.answerId}\nText under assessment:\n${input.sourceText}` }];
      return chat(settings, jevKey, messages, 300);
    }
    throw new Error(`Jev-only endpoint at ${this.baseUrl} is not implemented; point jevBaseUrl at the same LLM base URL to use the chat-completion assessor`);
  }
}

export function validateLlmResultShape(value: unknown): LlmResult {
  return value as unknown as LlmResult;
}
