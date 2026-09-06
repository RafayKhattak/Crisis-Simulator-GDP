import { TRAINEE_EMAIL } from "@/lib/constants";
import { ensureTraineeInbox } from "@/lib/inbox";
import { MOCK_CHARACTERS, MOCK_MESSAGES, MOCK_SCENARIO } from "@/lib/mock-data";
import {
  fetchCharacters,
  fetchLatestScenario,
  fetchScenarioMessages,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { SessionTrainee } from "@/lib/session";
import type { ScenarioPayload } from "@/types/api";

function withTrainee(
  trainee: SessionTrainee,
  payload: Omit<ScenarioPayload, "trainee">
): ScenarioPayload {
  return { ...payload, trainee };
}

export async function loadScenario(
  trainee: SessionTrainee
): Promise<ScenarioPayload> {
  const fallback = withTrainee(trainee, {
    scenario: MOCK_SCENARIO,
    characters: MOCK_CHARACTERS,
    messages: MOCK_MESSAGES.map((row) => ({ ...row, trainee_id: trainee.id })),
    traineeEmail: TRAINEE_EMAIL,
    demoMode: true,
  });

  if (!isSupabaseConfigured()) {
    return fallback;
  }

  try {
    const scenario = await fetchLatestScenario();
    if (!scenario) return fallback;

    await ensureTraineeInbox({
      scenarioId: scenario.id,
      traineeId: trainee.id,
    });

    const [characters, messages] = await Promise.all([
      fetchCharacters(scenario.id),
      fetchScenarioMessages(scenario.id, trainee.id),
    ]);

    return withTrainee(trainee, {
      scenario,
      characters,
      messages,
      traineeEmail: TRAINEE_EMAIL,
      demoMode: false,
    });
  } catch (error) {
    console.error("[loadScenario] falling back to demo mode:", error);
    return fallback;
  }
}
