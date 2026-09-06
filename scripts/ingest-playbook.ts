import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServiceSupabase } from "../lib/create-supabase";

config({ path: resolve(process.cwd(), ".env.local") });

const PLAYBOOK_PATH = resolve(process.cwd(), "playbook.txt");
const TARGET_WORDS = 500;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local`);
  }
  return value;
}

function chunkByWords(text: string, targetWords: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer: string[] = [];
  let words = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push(buffer.join("\n\n"));
    buffer = [];
    words = 0;
  };

  for (const paragraph of paragraphs) {
    const count = paragraph.split(" ").length;
    if (words > 0 && words + count > targetWords) {
      flush();
    }
    buffer.push(paragraph);
    words += count;
  }
  flush();
  return chunks;
}

async function main() {
  console.log("Starting playbook ingest…");
  if (!existsSync(PLAYBOOK_PATH)) {
    throw new Error(`Playbook not found at ${PLAYBOOK_PATH}`);
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createServiceSupabase(supabaseUrl, serviceRoleKey);

  const raw = readFileSync(PLAYBOOK_PATH, "utf8");
  const chunks = chunkByWords(raw, TARGET_WORDS);
  console.log(`Loaded playbook.txt — ${chunks.length} chunk(s) of ~${TARGET_WORDS} words.`);

  console.log("Clearing existing playbook_chunks…");
  const { error: deleteError } = await supabase
    .from("playbook_chunks")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    throw new Error(`Failed to clear playbook_chunks: ${deleteError.message}`);
  }

  for (let index = 0; index < chunks.length; index += 1) {
    const content = chunks[index];
    console.log(
      `Inserting chunk ${index + 1}/${chunks.length} (${content.split(" ").length} words)…`
    );
    const { error: insertError } = await supabase.from("playbook_chunks").insert({
      content,
    });
    if (insertError) {
      throw new Error(`Insert failed for chunk ${index + 1}: ${insertError.message}`);
    }
    console.log(`  Inserted chunk ${index + 1}.`);
  }

  console.log("Ingestion complete.");
}

main().catch((error: unknown) => {
  console.error("INGEST FAILED");
  console.error(error);
  process.exit(1);
});
