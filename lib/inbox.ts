import { OPENING_MAIL } from "./opening-mail";
import { getServiceSupabase } from "./supabase";

export async function ensureTraineeInbox(params: {
  scenarioId: string;
  traineeId: string;
}): Promise<void> {
  const supabase = getServiceSupabase();
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", params.scenarioId)
    .eq("trainee_id", params.traineeId);
  if (countError) throw new Error(countError.message);
  if (count && count > 0) return;

  const { error } = await supabase.from("messages").insert(
    OPENING_MAIL.map((row) => ({
      ...row,
      scenario_id: params.scenarioId,
      trainee_id: params.traineeId,
    }))
  );
  if (error) throw new Error(error.message);
}

export async function resetTraineeInbox(params: {
  scenarioId: string;
  traineeId: string;
}): Promise<void> {
  const supabase = getServiceSupabase();
  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("scenario_id", params.scenarioId)
    .eq("trainee_id", params.traineeId);
  if (deleteError) throw new Error(deleteError.message);
  await ensureTraineeInbox(params);
}
