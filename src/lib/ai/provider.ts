import Anthropic from "@anthropic-ai/sdk";
import { db, getSetting } from "../db";

// Abstração de IA: o resto do app só conhece esta interface. Trocar de
// fornecedor no futuro é implementar outro provider aqui.
export interface AIProvider {
  readonly model: string;
  complete(opts: { system: string; prompt: string; maxTokens?: number }): Promise<string>;
}

class AnthropicProvider implements AIProvider {
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(opts: { system: string; prompt: string; maxTokens?: number }): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
}

export function getProvider(): AIProvider | null {
  const key = getSetting("anthropic_api_key", "") || process.env.ANTHROPIC_API_KEY || "";
  if (!key) return null;
  const model = getSetting("ai_model", "") || "claude-sonnet-5";
  return new AnthropicProvider(key, model);
}

export function logAI(kind: string, model: string, inputChars: number, summary: string): void {
  db.prepare("INSERT INTO ai_log (kind, model, input_chars, summary) VALUES (?, ?, ?, ?)").run(
    kind,
    model,
    inputChars,
    summary
  );
}
