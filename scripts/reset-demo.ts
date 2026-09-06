import { config } from "dotenv";
import { resolve } from "node:path";
import { DEMO_SCENARIO_ID } from "../lib/constants";
import { createServiceSupabase } from "../lib/create-supabase";
import { resetTraineeInbox } from "../lib/inbox";

config({ path: resolve(process.cwd(), ".env.local") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local`);
  }
  return value;
}

async function main() {
  const supabase = createServiceSupabase(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data, error } = await supabase.from("trainees").select("id, email, name");
  if (error) {
    throw new Error(
      `${error.message}\n\nIf the trainees table is missing, paste supabase/trainees.sql into the Supabase SQL Editor.`
    );
  }

  const trainees = data ?? [];
  if (trainees.length === 0) {
    console.log("No trainee accounts yet. Run npm run seed-accounts first.");
    return;
  }

  for (const trainee of trainees) {
    await resetTraineeInbox({
      scenarioId: DEMO_SCENARIO_ID,
      traineeId: trainee.id,
    });
    console.log(`Reset inbox for ${trainee.name} <${trainee.email}>`);
  }

  console.log("Each trainee is back to the six opening crisis emails only.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
