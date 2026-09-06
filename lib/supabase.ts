import { type SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabase } from "@/lib/create-supabase";
import type { Database } from "@/types/database";
import {
  HISTORY_LIMIT,
  TRAINEE_EMAIL,
} from "@/lib/constants";
import type {
  CharacterRow,
  MessageRow,
  PlaybookMatchRow,
  ScenarioRow,
  TraineeRow,
} from "@/types/database";

let serverClient: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getServiceSupabase(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }
  if (!serverClient) {
    serverClient = createServiceSupabase(url, key) as SupabaseClient<Database>;
  }
  return serverClient;
}

export async function fetchLatestScenario(): Promise<ScenarioRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchCharacters(scenarioId: string): Promise<CharacterRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchCharacterById(
  characterId: string
): Promise<CharacterRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchTraineeByEmail(email: string): Promise<TraineeRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("trainees")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchScenarioMessages(
  scenarioId: string,
  traineeId: string
): Promise<MessageRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("scenario_id", scenarioId)
    .eq("trainee_id", traineeId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchThreadHistory(params: {
  scenarioId: string;
  traineeId: string;
  characterEmail: string;
  traineeEmail?: string;
  limit?: number;
}): Promise<MessageRow[]> {
  const traineeEmail = params.traineeEmail ?? TRAINEE_EMAIL;
  const limit = params.limit ?? HISTORY_LIMIT;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("scenario_id", params.scenarioId)
    .eq("trainee_id", params.traineeId)
    .or(
      `and(sender_email.eq."${params.characterEmail}",receiver_email.eq."${traineeEmail}"),and(sender_email.eq."${traineeEmail}",receiver_email.eq."${params.characterEmail}")`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).slice().reverse();
}

export async function insertMessage(
  row: Database["public"]["Tables"]["messages"]["Insert"]
): Promise<MessageRow> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("messages")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPlaybookChunks(): Promise<PlaybookMatchRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("playbook_chunks")
    .select("id, content")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    similarity: 0,
  }));
}
