import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TRAINEE_EMAIL } from "@/lib/constants";
import {
  evaluateTraineeMessage,
  generateCharacterReply,
} from "@/lib/agents";
import { isGroqConfigured } from "@/lib/groq";
import { retrievePlaybookContext } from "@/lib/rag";
import {
  MOCK_CHARACTERS,
  mockCharacterReply,
  mockEvaluate,
} from "@/lib/mock-data";
import { lastTraineeContent } from "@/lib/persona-lane";
import {
  fetchCharacterById,
  fetchThreadHistory,
  insertMessage,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { SendMessageRequest, SendMessageResponse } from "@/types/api";
import type { MessageRow } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const trainee = auth.trainee;

  let body: SendMessageRequest;
  try {
    body = (await request.json()) as SendMessageRequest;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const userMessage = body.userMessage?.trim();
  const { characterId, scenarioId } = body;
  if (!userMessage || !characterId || !scenarioId) {
    return badRequest("userMessage, characterId, and scenarioId are required.");
  }

  const live = isSupabaseConfigured() && isGroqConfigured();

  try {
    if (!live) {
      const character =
        MOCK_CHARACTERS.find((row) => row.id === characterId) ?? MOCK_CHARACTERS[0];
      const evaluator_result = mockEvaluate(userMessage, character.email);
      const createdAt = new Date().toISOString();
      const user_message: MessageRow = {
        id: crypto.randomUUID(),
        scenario_id: scenarioId,
        trainee_id: trainee.id,
        sender_email: TRAINEE_EMAIL,
        receiver_email: character.email,
        content: userMessage,
        created_at: createdAt,
      };
      const character_reply: MessageRow = {
        id: crypto.randomUUID(),
        scenario_id: scenarioId,
        trainee_id: trainee.id,
        sender_email: character.email,
        receiver_email: TRAINEE_EMAIL,
        content: mockCharacterReply(character, userMessage),
        created_at: new Date(Date.now() + 800).toISOString(),
      };
      const payload: SendMessageResponse = {
        user_message,
        character_reply,
        evaluator_result,
      };
      return NextResponse.json(payload);
    }

    const character = await fetchCharacterById(characterId);
    if (!character || character.scenario_id !== scenarioId) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    const history = await fetchThreadHistory({
      scenarioId,
      traineeId: trainee.id,
      characterEmail: character.email,
    });

    const { ragContext } = await retrievePlaybookContext(userMessage);

    const [characterText, evaluator_result] = await Promise.all([
      generateCharacterReply({
        character,
        history,
        userMessage,
        ragContext,
      }),
      evaluateTraineeMessage({
        userMessage,
        ragContext,
        characterEmail: character.email,
        priorTraineeMessage: lastTraineeContent(history, TRAINEE_EMAIL),
      }).catch(() => mockEvaluate(userMessage, character.email)),
    ]);

    const user_message = await insertMessage({
      scenario_id: scenarioId,
      trainee_id: trainee.id,
      sender_email: TRAINEE_EMAIL,
      receiver_email: character.email,
      content: userMessage,
    });

    const character_reply = await insertMessage({
      scenario_id: scenarioId,
      trainee_id: trainee.id,
      sender_email: character.email,
      receiver_email: TRAINEE_EMAIL,
      content: characterText,
    });

    const payload: SendMessageResponse = {
      user_message,
      character_reply,
      evaluator_result,
    };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
