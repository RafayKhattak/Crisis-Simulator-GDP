import { redirect } from "next/navigation";
import { MailApp } from "@/components/mail/mail-app";
import { getSession } from "@/lib/auth";
import { loadScenario } from "@/lib/load-scenario";

export const dynamic = "force-dynamic";

export default async function Home() {
  const trainee = await getSession();
  if (!trainee) redirect("/login");
  const initialPayload = await loadScenario(trainee);
  return <MailApp initialPayload={initialPayload} />;
}
