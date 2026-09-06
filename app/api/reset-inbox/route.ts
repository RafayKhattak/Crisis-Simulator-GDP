import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { DEMO_SCENARIO_ID } from "@/lib/constants";
import { resetTraineeInbox } from "@/lib/inbox";
import { loadScenario } from "@/lib/load-scenario";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  try {
    await resetTraineeInbox({
      scenarioId: DEMO_SCENARIO_ID,
      traineeId: auth.trainee.id,
    });
    const payload = await loadScenario(auth.trainee);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reset this inbox.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
