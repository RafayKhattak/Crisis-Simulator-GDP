import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { loadScenario } from "@/lib/load-scenario";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  try {
    const payload = await loadScenario(auth.trainee);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load scenario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
