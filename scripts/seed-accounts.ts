import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import { DEMO_SCENARIO_ID } from "../lib/constants";
import { createServiceSupabase } from "../lib/create-supabase";
import { ensureTraineeInbox } from "../lib/inbox";
import { hashPassword } from "../lib/password";

config({ path: resolve(process.cwd(), ".env.local") });

const ACCOUNTS = [
  {
    id: "7a7a7a7a-1111-4111-8111-aaaaaaaaaaa1",
    envEmail: "ACCOUNT_RAFAY_EMAIL",
    envName: "ACCOUNT_RAFAY_NAME",
    envPassword: "ACCOUNT_RAFAY_PASSWORD",
    email: "rafay@archwares.com",
    name: "Rafay · Archwares",
  },
  {
    id: "7a7a7a7a-2222-4222-8222-bbbbbbbbbbb2",
    envEmail: "ACCOUNT_BILAL_EMAIL",
    envName: "ACCOUNT_BILAL_NAME",
    envPassword: "ACCOUNT_BILAL_PASSWORD",
    email: "bilal@gccdataprotection.com",
    name: "Bilal Ghafoor",
  },
] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local`);
  }
  return value;
}

function memorablePassword(label: string): string {
  const token = randomBytes(3).toString("base64url").replace(/[^a-zA-Z0-9]/g, "X");
  return `${label}-${token}`;
}

function upsertEnv(key: string, value: string) {
  const envPath = resolve(process.cwd(), ".env.local");
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (new RegExp(`^${key}=`, "m").test(current)) {
    const next = current.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
    writeFileSync(envPath, next);
    return;
  }
  appendFileSync(envPath, `\n${key}=${value}\n`);
}

function ensureAuthSecret() {
  if (process.env.AUTH_SECRET) return;
  const secret = randomBytes(32).toString("base64url");
  upsertEnv("AUTH_SECRET", secret);
  process.env.AUTH_SECRET = secret;
  console.log("Generated AUTH_SECRET and wrote it to .env.local");
}

async function main() {
  ensureAuthSecret();
  const supabase = createServiceSupabase(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const printed: Array<{ email: string; name: string; password: string; generated: boolean }> =
    [];

  for (const account of ACCOUNTS) {
    const email = (process.env[account.envEmail] ?? account.email).toLowerCase().trim();
    const name = process.env[account.envName] ?? account.name;
    let password = process.env[account.envPassword];
    let generated = false;
    if (!password) {
      password = memorablePassword(account.name.split(" ")[0] ?? "Trainee");
      upsertEnv(account.envPassword, password);
      generated = true;
    }

    const password_hash = await hashPassword(password);

    const { data: existing, error: lookupError } = await supabase
      .from("trainees")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (lookupError) {
      throw new Error(
        `${lookupError.message}\n\nIf the trainees table is missing, paste supabase/trainees.sql into the Supabase SQL Editor, then re-run npm run seed-accounts.`
      );
    }

    const traineeId = existing?.id ?? account.id;
    const { error } = existing
      ? await supabase
          .from("trainees")
          .update({ name, password_hash })
          .eq("id", traineeId)
      : await supabase.from("trainees").insert({
          id: traineeId,
          email,
          name,
          password_hash,
        });
    if (error) {
      throw new Error(error.message);
    }

    await ensureTraineeInbox({
      scenarioId: DEMO_SCENARIO_ID,
      traineeId,
    });

    printed.push({ email, name, password, generated });
  }

  const credPath = resolve(process.cwd(), "credentials.local.txt");
  const creds = printed
    .map(
      (row) =>
        `${row.name}\n  email: ${row.email}\n  password: ${row.password}\n`
    )
    .join("\n");
  writeFileSync(
    credPath,
    `Crisis Simulator — authorised trainees (do not commit)\n\n${creds}`
  );

  console.log("Trainee accounts ready. Each has a private Nightfall inbox.");
  for (const row of printed) {
    console.log(`- ${row.name} <${row.email}>${row.generated ? " (new password)" : ""}`);
  }
  console.log(`Passwords: ${credPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
