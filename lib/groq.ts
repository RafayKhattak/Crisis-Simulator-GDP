import OpenAI from "openai";
import { EMBEDDING_MODEL } from "./constants";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

let groqClient: OpenAI | null = null;
let groqEvalClient: OpenAI | null = null;

function createGroqClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: GROQ_BASE_URL,
  });
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function isGroqEvalConfigured(): boolean {
  return Boolean(process.env.GROQ_EVAL_API_KEY || process.env.GROQ_API_KEY);
}

/** @deprecated Use isGroqConfigured */
export const isOpenAIConfigured = isGroqConfigured;

/** Character dialogue (`openai/gpt-oss-20b`). */
export function getGroq(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in .env.local.");
  }
  if (!groqClient) {
    groqClient = createGroqClient(apiKey);
  }
  return groqClient;
}

/** Evaluator + lessons-learned report (`openai/gpt-oss-120b`). Falls back to GROQ_API_KEY if GROQ_EVAL_API_KEY is unset. */
export function getGroqEval(): OpenAI {
  const apiKey = process.env.GROQ_EVAL_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_EVAL_API_KEY or GROQ_API_KEY is not set in .env.local."
    );
  }
  if (!groqEvalClient) {
    groqEvalClient = createGroqClient(apiKey);
  }
  return groqEvalClient;
}

function withNomicPrefix(input: string, task: "document" | "query"): string {
  const prefix = task === "query" ? "search_query:" : "search_document:";
  const trimmed = input.trim();
  if (trimmed.startsWith("search_query:") || trimmed.startsWith("search_document:")) {
    return trimmed;
  }
  return `${prefix} ${trimmed}`;
}

export async function embedText(
  input: string,
  task: "document" | "query" = "query"
): Promise<number[]> {
  const groq = getGroq();
  const response = await groq.embeddings.create({
    model: EMBEDDING_MODEL,
    input: withNomicPrefix(input, task),
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("Groq returned an empty embedding.");
  }
  return embedding;
}
