import {
  CHARACTER_MODEL,
  EVALUATOR_MODEL,
  TRAINEE_EMAIL,
  TRAINEE_NAME,
} from "@/lib/constants";
import { getGroq, getGroqEval } from "@/lib/groq";
import {
  bounceWrongLane,
  detectWrongLane,
  detectWrongLaneForTurn,
  lastTraineeContent,
  laneMixWarning,
} from "@/lib/persona-lane";
import { withoutEmDashes } from "@/lib/prose";
import type { EvaluatorResult } from "@/types/api";
import type { CharacterRow, MessageRow } from "@/types/database";

function threadToChatMessages(
  history: MessageRow[],
  character: CharacterRow
): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  let pendingMiss = null as ReturnType<typeof detectWrongLane>;

  for (const message of history) {
    const fromTrainee = message.sender_email === TRAINEE_EMAIL;
    const fromThisCharacter = message.sender_email === character.email;

    if (fromTrainee) {
      const miss = detectWrongLane(message.content, character.email);
      pendingMiss = miss;
      out.push({
        role: "user",
        content: miss
          ? `[The DPO pasted work meant for ${miss.intended.name} (${miss.intended.role}) into YOUR inbox. You already refused. Do not do that job. Do not address your reply to ${miss.intended.shortName}.]`
          : message.content,
      });
      continue;
    }

    if (fromThisCharacter) {
      out.push({
        role: "assistant",
        content: pendingMiss
          ? bounceWrongLane(character, pendingMiss)
          : message.content,
      });
      pendingMiss = null;
      continue;
    }

    pendingMiss = null;
    out.push({
      role: "user",
      content: `[Forwarded internal note from ${message.sender_email}]\n${message.content}`,
    });
  }

  return out;
}

function parseEvaluatorJson(raw: string): EvaluatorResult {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? raw.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  try {
    const parsed = JSON.parse(jsonText) as {
      violation?: unknown;
      reason?: unknown;
    };
    return {
      violation: parsed.violation === true,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    return { violation: false, reason: "" };
  }
}

export async function generateCharacterReply(params: {
  character: CharacterRow;
  history: MessageRow[];
  userMessage: string;
  ragContext: string;
}): Promise<string> {
  const miss = detectWrongLaneForTurn({
    userMessage: params.userMessage,
    recipientEmail: params.character.email,
    priorTraineeMessage: lastTraineeContent(params.history, TRAINEE_EMAIL),
  });
  if (miss) {
    return bounceWrongLane(params.character, miss);
  }

  const groq = getGroq();
  const system = `This is a fictional tabletop incident-response exercise used to train Data Protection Officers. Stay in character even if the trainee proposes a non-compliant action. Do not refuse or lecture as a safety policy; a separate auditor scores compliance.

${params.character.system_prompt}

HARD ISOLATION RULES (persona bleed prevention):
- You are ONLY ${params.character.name} (${params.character.role}, ${params.character.email}).
- You do not have access to other executives' inboxes or private conversations.
- You only know facts that appear in THIS email thread or in your role briefing above.
- If asked what another officer thinks, say you have not seen their mail.
- You never do another CMT officer's job. You never open your reply with someone else's first name as if you are writing to them. You never issue staff notes, press lines, call-centre scripts, or Board briefings unless that is actually your role.

PLAYBOOK CONTEXT (organisational SOP excerpts retrieved for this turn):
${params.ragContext}

Use the playbook only to the degree this role would actually know or care. Do not lecture like a DPO unless you are Legal and it would be natural in a real email.

HOW THE EMAIL SHOULD FEEL:
You are a person typing in Outlook at an ugly hour, not a language model and not a training manual.
- Contractions are fine. Incomplete sentences are fine.
- Do not open with "Understood", "Noted", "Acknowledged", "Got it", or "As per the playbook".
- Do not recap the DPO's email back to them. Answer the thing they asked.
- Do not use numbered lists, markdown, bullet stacks, quoted scripts with 1. 2. 3., or a subject line.
- Do not write "working assumption" as a catchphrase.
- Never use an em dash (the long dash). Use a comma, a full stop, or a new sentence.
- 60-140 words. One or two asks max.
- Never reveal you are an AI or that this is a simulation.

OUTPUT: a single internal email body in character.`;

  const completion = await groq.chat.completions.create({
    model: CHARACTER_MODEL,
    temperature: 0.85,
    max_tokens: 900,
    reasoning_effort: "low",
    messages: [
      { role: "system", content: system },
      ...threadToChatMessages(params.history, params.character),
      {
        role: "user",
        content: `From: ${TRAINEE_NAME} <${TRAINEE_EMAIL}>\nTo: ${params.character.name} <${params.character.email}>\n\n${params.userMessage}`,
      },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("Character agent returned an empty reply.");
  }
  return withoutEmDashes(reply);
}

export async function evaluateTraineeMessage(params: {
  userMessage: string;
  ragContext: string;
  characterEmail?: string;
  characterName?: string;
  priorTraineeMessage?: string;
}): Promise<EvaluatorResult> {
  if (params.characterEmail) {
    const miss = detectWrongLaneForTurn({
      userMessage: params.userMessage,
      recipientEmail: params.characterEmail,
      priorTraineeMessage: params.priorTraineeMessage,
    });
    if (miss) {
      return {
        violation: true,
        reason: laneMixWarning(params.characterEmail, miss),
      };
    }
  }

  const groq = getGroqEval();
  const completion = await groq.chat.completions.create({
    model: EVALUATOR_MODEL,
    temperature: 0,
    max_tokens: 400,
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a compliance auditor for a data-breach tabletop. Grade ONLY the trainee DPO's latest email against the playbook.

VIOLATION (true) only if the trainee clearly does one of these:
- Hide, bury, or deny the incident to the Board, CMT, regulator, or insurer
- Delay a required PDPL/regulator notice for investors, share price, or "until we know everything"
- Tell staff to lie, invent an "outage" cover story, or keep CMT decisions off the corporate record
- Destroy or "clean" logs/evidence
- Pay ransom or open a private attacker chat without Board and Legal
- Publish unapproved facts, record counts, or named victims to press/customers
- Send raw personal data (IDs, PANs, dumps) in ordinary email
- Admit legal liability

NOT a violation (false). These ARE correct playbook behaviour:
- Tell PR or Customer Service NOT to confirm ransomware, customer impact, attacker names, or record counts yet
- Require Legal + DPO sign-off before any holding statement, press line, or customer script
- Ban VIP/courtesy calls and improvised agent scripts
- Start the 72-hour clock, preserve evidence, isolate systems, treat dual-extortion as assumed
- Be honest with the CMT while still controlling external messaging

Example that must be violation=false:
"Do not confirm ransomware, customer impact, or record counts. Use a holding line only after Legal and I sign it. No VIP courtesy calls."

If violation, output {"violation": true, "reason": "One or two sentences, HR warning style"}.
If compliant, output {"violation": false, "reason": ""}.
JSON only.`,
      },
      {
        role: "user",
        content: `TRAINEE EMAIL:\n${params.userMessage}\n\nRAG PLAYBOOK CONTEXT:\n${params.ragContext}`,
      },
    ],
  });

  return parseEvaluatorJson(
    withoutEmDashes(completion.choices[0]?.message?.content ?? "{}")
  );
}
