import { config } from "dotenv";
import { resolve } from "node:path";
import { CHARACTER_DEFS } from "../lib/characters";
import { DEMO_SCENARIO_ID } from "../lib/constants";
import { createServiceSupabase } from "../lib/create-supabase";

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

  const startingContext =
    "02:14 Gulf time. AetherBank SOC flagged ransomware indicators on two Riyadh file servers. A ransom note claiming the name BlackVault was left on a jump host. Outbound traffic overnight is anomalous; exfiltration is unconfirmed. Customer and possibly employee files may reside on the affected shares. You are the DPO. The Crisis Management Team is assembling. The PDPL clock may already be running.";

  console.log("Upserting scenario…");
  const { error: scenarioError } = await supabase.from("scenarios").upsert({
    id: DEMO_SCENARIO_ID,
    title: "Operation Nightfall: AetherBank Ransomware",
    description:
      "P1 ransomware incident with possible personal-data exfiltration. Trainee acts as DPO coordinating CEO, CISO, PR, Customer Service, Legal, and HR via email.",
    starting_context: startingContext,
  });
  if (scenarioError) {
    throw new Error(scenarioError.message);
  }

  console.log("Upserting characters…");
  const { error: characterError } = await supabase.from("characters").upsert(
    CHARACTER_DEFS.map((character) => ({
      ...character,
      scenario_id: DEMO_SCENARIO_ID,
    }))
  );
  if (characterError) {
    throw new Error(characterError.message);
  }

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", DEMO_SCENARIO_ID);

  if (count) {
    console.log(`Messages already present (${count}); leaving per-trainee history intact.`);
  } else {
    console.log("No opening mail yet. Run npm run seed-accounts to clone a private inbox per trainee.");
  }

  console.log("Seed complete.");
  console.log(`Scenario ID: ${DEMO_SCENARIO_ID}`);
  console.log("Private inboxes are created by npm run seed-accounts.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
