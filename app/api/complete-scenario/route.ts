import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateDebriefReport } from "@/lib/debrief";
import { MOCK_CHARACTERS, MOCK_MESSAGES, MOCK_SCENARIO } from "@/lib/mock-data";
import {
  fetchCharacters,
  fetchLatestScenario,
  fetchScenarioMessages,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { CompleteScenarioRequest, DebriefReport } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  let body: CompleteScenarioRequest;
  try {
    body = (await request.json()) as CompleteScenarioRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.scenarioId) {
    return NextResponse.json({ error: "scenarioId is required." }, { status: 400 });
  }

  try {
    const liveDb = isSupabaseConfigured();
    const characters = liveDb
      ? await fetchCharacters(body.scenarioId)
      : MOCK_CHARACTERS;
    const scenario = liveDb ? await fetchLatestScenario() : MOCK_SCENARIO;
    const messages = liveDb
      ? await fetchScenarioMessages(body.scenarioId, auth.trainee.id)
      : MOCK_MESSAGES.map((row) => ({ ...row, trainee_id: auth.trainee.id }));

    const report: DebriefReport = await generateDebriefReport({
      messages,
      characters,
      scenarioTitle:
        body.scenarioTitle ??
        scenario?.title ??
        "Operation Nightfall: AetherBank Ransomware",
      traineeName: auth.trainee.name,
      nudges: body.nudges ?? [],
    });

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const rateLimited = /429|rate limit/i.test(message);
    return NextResponse.json(
      {
        error: rateLimited
          ? "Groq is briefly rate-limited. Wait about 20 seconds and click Finish training again."
          : message || "Failed to grade the session.",
      },
      { status: 500 }
    );
  }
}
