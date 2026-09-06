import { RAG_MATCH_COUNT } from "@/lib/constants";
import { fetchPlaybookChunks } from "@/lib/supabase";
import type { PlaybookMatchRow } from "@/types/database";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "have",
  "will",
  "not",
  "are",
  "was",
  "were",
  "you",
  "your",
  "our",
  "any",
  "all",
  "can",
  "may",
  "into",
  "about",
  "than",
  "then",
  "them",
  "they",
  "has",
  "had",
  "been",
  "also",
  "only",
  "over",
  "after",
  "before",
  "must",
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(
    (token) => !STOPWORDS.has(token)
  );
}

function lexicalScore(query: string, document: string): number {
  const queryTokens = Array.from(new Set(tokenize(query)));
  if (queryTokens.length === 0) return 0;
  const documentTokens = tokenize(document);
  const counts = new Map<string, number>();
  for (const token of documentTokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  let score = 0;
  for (const token of queryTokens) {
    const count = counts.get(token);
    if (count) {
      score += 1 + Math.log(1 + count);
    }
  }
  return score / queryTokens.length;
}

export async function retrievePlaybookContext(
  userMessage: string
): Promise<{ chunks: PlaybookMatchRow[]; ragContext: string }> {
  const stored = await fetchPlaybookChunks();
  const chunks = stored
    .map((chunk) => ({
      ...chunk,
      similarity: lexicalScore(userMessage, chunk.content),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, RAG_MATCH_COUNT)
    .filter((chunk) => chunk.similarity > 0);

  const ragContext =
    chunks.length === 0
      ? "No playbook paragraphs met the similarity threshold. Apply core SOP: do not conceal a breach, start the 72-hour PDPL clock, preserve evidence, do not pay ransom without Board and Legal, and do not notify customers with unsanctioned wording."
      : chunks
          .map(
            (chunk, index) =>
              `[Playbook excerpt ${index + 1} | relevance ${chunk.similarity.toFixed(3)}]\n${chunk.content}`
          )
          .join("\n\n");

  return { chunks, ragContext };
}
