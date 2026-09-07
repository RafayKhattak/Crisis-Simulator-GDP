import { EVALUATOR_MODEL, TRAINEE_EMAIL } from "@/lib/constants";
import { getGroqEval, isGroqEvalConfigured } from "@/lib/groq";
import { mockEvaluate } from "@/lib/mock-data";
import { withoutEmDashesDeep } from "@/lib/prose";
import type {
  DebriefReport,
  EmailEvaluation,
  SessionNudge,
} from "@/types/api";
import type { CharacterRow, MessageRow } from "@/types/database";

const DEBRIEF_SOP =
  "SOP: do not conceal from CMT, Board, regulator, or insurer. PDPL 72-hour clock starts at awareness, not finished forensics. Preserve evidence, no wiping logs. No unofficial ransom chat or payment without Board and Legal. Holding the press until Legal signs a line is GOOD. Publishing ransomware, record counts, named victims, VIP-only notice, raw PII, or liability admissions is BAD.";

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? raw.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function clip(text: string, max: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

export function buildSessionStats(params: {
  messages: MessageRow[];
  characters: CharacterRow[];
  traineeEmail?: string;
}) {
  const traineeEmail = params.traineeEmail ?? TRAINEE_EMAIL;
  const outbound = params.messages
    .filter((message) => message.sender_email === traineeEmail)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const peopleContacted = Array.from(
    new Set(
      outbound.map((message) => {
        const character = params.characters.find(
          (row) => row.email === message.receiver_email
        );
        return character
          ? `${character.name} (${character.role})`
          : message.receiver_email;
      })
    )
  );

  return {
    outbound,
    outboundCount: outbound.length,
    peopleContacted,
  };
}

function fallbackReport(params: {
  stats: ReturnType<typeof buildSessionStats>;
  nudges: SessionNudge[];
  evaluations: EmailEvaluation[];
  scenarioTitle: string;
  traineeName: string;
  officersTotal: number;
}): DebriefReport {
  const { stats, nudges, evaluations } = params;
  const violations = evaluations.filter((row) => row.violation);
  const okCount = evaluations.filter((row) => !row.violation).length;
  const warningCount = Math.max(nudges.length, violations.length);
  const concealment = [...nudges, ...violations].some((row) =>
    /hid|conceal|quiet|regulator|delay|wipe|ransom|telegram|liability/i.test(
      `${"excerpt" in row ? row.excerpt : ""} ${row.reason}`
    )
  );

  let overallScore = 82;
  if (stats.outboundCount === 0) overallScore = 20;
  else {
    overallScore -= warningCount * 16;
    if (concealment) overallScore -= 6;
    if (okCount > 0) overallScore += Math.min(8, okCount * 2);
    if (stats.peopleContacted.length >= 2) overallScore += 4;
  }
  overallScore = Math.min(100, Math.max(12, overallScore));

  const grade =
    stats.outboundCount === 0
      ? "Incomplete"
      : overallScore >= 80
        ? "Pass"
        : overallScore >= 60
          ? "Needs improvement"
          : "Fail";

  const strengths: string[] = [];
  if (stats.peopleContacted.length) {
    strengths.push(`Contacted: ${stats.peopleContacted.join("; ")}.`);
  }
  if (okCount > 0) {
    strengths.push(
      `${okCount} outbound email(s) stayed inside the playbook (holding the press, clock, evidence, or no VIP ring-round).`
    );
  }

  const gaps =
    stats.outboundCount === 0
        ? ["No outbound mail. The playbook cannot be followed in silence."]
      : violations.length > 0
        ? violations.map((row) => `${row.toName}: ${row.reason || "Playbook violation."}`)
        : nudges.map((nudge) => `${nudge.toName}: ${nudge.reason}`);

  return {
    overallScore,
    grade,
    headline:
      stats.outboundCount === 0
        ? "No DPO actions were recorded"
        : warningCount === 0
          ? "Session complete. Playbook followed on the emails sent"
          : concealment
            ? "External control was mixed with a concealment risk"
            : "Session complete. See lessons below",
    summary:
      stats.outboundCount === 0
        ? "The trainee did not send any emails. A live incident requires CMT contact, a breach view, and controlled communications."
        : `The DPO sent ${stats.outboundCount} email(s) to ${stats.peopleContacted.length} officer(s). ${warningCount} compliance warning(s) were raised. ${okCount} email(s) were graded OK.`,
    strengths: stats.outboundCount === 0 ? [] : strengths,
    gaps,
    lessons: [
      "Be honest with the crisis team. Controlling the press is not the same as hiding a breach from the regulator.",
      "Start the PDPL clock from awareness. Do not wait for perfect forensics.",
      "PR and the call centre need a signed holding line, not improvised facts.",
    ],
    nextTime: [
      "Tell the CISO you are treating it as a personal data breach and to preserve evidence.",
      "Tell the CEO the 72-hour clock is running; options cannot include illegal silence.",
      "Tell PR and Customer Service: no ransomware confirmation, no VIP ring-round, wait for Legal wording.",
    ],
    scenarioTitle: params.scenarioTitle,
    traineeName: params.traineeName,
    timing: {
      outboundCount: stats.outboundCount,
      peopleContacted: stats.peopleContacted,
      officersTotal: params.officersTotal,
      compliantCount: okCount,
      violationCount: violations.length,
    },
    nudges,
    evaluations,
  };
}

function excerptOf(text: string): string {
  return clip(text, 140);
}

function excerptStem(excerpt: string): string {
  return excerpt.replace(/…+$/, "").replace(/\.\.\.$/, "").trim();
}

function validSessionNudges(
  nudges: SessionNudge[],
  outbound: MessageRow[]
): SessionNudge[] {
  return nudges.filter((nudge) => {
    const stem = excerptStem(nudge.excerpt);
    const message = outbound.find((row) => {
      if (row.receiver_email !== nudge.toEmail) return false;
      const compact = row.content.replace(/\s+/g, " ").trim();
      return stem.length >= 24
        ? compact.includes(stem)
        : compact.startsWith(stem);
    });
    if (!message) return false;
    return mockEvaluate(message.content, message.receiver_email).violation;
  });
}

/** Grade from live session nudges + local SOP heuristics. Do not call gpt-oss-120b here — that model is already used on every send and will 429 on finish. */
export function evaluateOutboundEmails(params: {
  messages: MessageRow[];
  characters: CharacterRow[];
  nudges?: SessionNudge[];
  traineeEmail?: string;
}): EmailEvaluation[] {
  const stats = buildSessionStats(params);

  return stats.outbound.map((message) => {
    const character = params.characters.find(
      (row) => row.email === message.receiver_email
    );
    const heuristic = mockEvaluate(message.content, message.receiver_email);
    return {
      toName: character?.name ?? message.receiver_email,
      toEmail: message.receiver_email,
      excerpt: excerptOf(message.content),
      violation: heuristic.violation,
      reason: heuristic.reason,
    };
  });
}

export async function generateDebriefReport(params: {
  messages: MessageRow[];
  characters: CharacterRow[];
  scenarioTitle: string;
  traineeName: string;
  nudges: SessionNudge[];
  evaluations?: EmailEvaluation[];
}): Promise<DebriefReport> {
  const stats = buildSessionStats(params);
  const evaluations =
    params.evaluations ??
    evaluateOutboundEmails({
      messages: params.messages,
      characters: params.characters,
      nudges: params.nudges,
    });
  const liveNudges =
    params.nudges.length > 0
      ? validSessionNudges(params.nudges, stats.outbound)
      : evaluations
          .filter((row) => row.violation)
          .map((row) => ({
            at: new Date().toISOString(),
            toName: row.toName,
            toEmail: row.toEmail,
            excerpt: row.excerpt,
            reason: row.reason,
          }));
  const fallback = fallbackReport({
    stats,
    nudges: liveNudges,
    evaluations,
    scenarioTitle: params.scenarioTitle,
    traineeName: params.traineeName,
    officersTotal: params.characters.length,
  });

  if (!isGroqEvalConfigured() || stats.outboundCount === 0) {
    return withoutEmDashesDeep(fallback);
  }

  const transcript = stats.outbound
    .map((message) => {
      const who =
        params.characters.find((row) => row.email === message.receiver_email)
          ?.name ?? message.receiver_email;
      return `TO ${who}:\n${clip(message.content, 420)}`;
    })
    .join("\n\n---\n\n");

  const nudgeBlock =
    liveNudges.length === 0
      ? "None."
      : liveNudges
          .map(
            (nudge) =>
              `- To ${nudge.toName}: "${nudge.excerpt}" → ${nudge.reason}`
          )
          .join("\n");

  const evaluationBlock =
    evaluations.length === 0
      ? "No outbound mail to grade."
      : evaluations
          .map(
            (row) =>
              `- To ${row.toName}: ${row.violation ? "VIOLATION" : "OK"}: ${row.excerpt}${row.reason ? ` (${row.reason})` : ""}`
          )
          .join("\n");

  try {
    const groq = getGroqEval();
    const completion = await groq.chat.completions.create({
      model: EVALUATOR_MODEL,
      temperature: 0,
      max_tokens: 900,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You write a short after-action report for a DPO tabletop (ransomware / possible personal data breach).
Be fair. Holding the press until Legal signs a line is GOOD. Hiding the incident from the regulator or CMT is BAD.
Do not use em dashes in any field.
Grade ONLY the TRAINEE EMAILS. Use the per-email evaluation and live nudges as the scoreboard. Do not re-invent verdicts.
If a mail is marked OK, do not claim it instructed VIP calls, concealment, delay, or wiping.
Banning "ring the top 50" courtesy calls is GOOD. Saying you will not tell the CEO you can wait for forensics is GOOD.
If LIVE NUDGES is None and every PER-EMAIL EVALUATION is OK, do not invent SOP breaches. Remaining officers not emailed is coverage, not concealment.
If OUTBOUND COUNT is 0, score at most 25 and grade Incomplete. They did not act.
Return JSON only:
{
  "overallScore": 0-100 integer,
  "grade": "Pass with distinction" | "Pass" | "Needs improvement" | "Fail" | "Incomplete",
  "headline": "one line",
  "summary": "3-5 sentences on what happened",
  "strengths": ["..."],
  "gaps": ["..."],
  "lessons": ["three plain-language lessons"],
  "nextTime": ["three concrete things to do next drill"]
}`,
        },
        {
          role: "user",
          content: `SCENARIO: ${params.scenarioTitle}
TRAINEE: ${params.traineeName}
${DEBRIEF_SOP}
OUTBOUND COUNT: ${stats.outboundCount}
OFFICERS CONTACTED: ${stats.peopleContacted.join("; ") || "none"}
LIVE NUDGES DURING SESSION:
${nudgeBlock}

PER-EMAIL EVALUATION:
${evaluationBlock}

TRAINEE EMAILS:
${transcript || "(none)"}`,
        },
      ],
    });

    const parsed = parseJsonObject(
      completion.choices[0]?.message?.content ?? ""
    );
    if (!parsed) return withoutEmDashesDeep(fallback);

    const overallScore = Math.min(
      100,
      Math.max(0, Number(parsed.overallScore) || fallback.overallScore)
    );
    const strengths = asStringArray(parsed.strengths).slice(0, 6);
    const gaps = asStringArray(parsed.gaps).slice(0, 6);
    const lessons = asStringArray(parsed.lessons).slice(0, 6);
    const nextTime = asStringArray(parsed.nextTime).slice(0, 6);

    return withoutEmDashesDeep({
      overallScore,
      grade: typeof parsed.grade === "string" ? parsed.grade : fallback.grade,
      headline:
        typeof parsed.headline === "string" ? parsed.headline : fallback.headline,
      summary:
        typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      strengths: strengths.length ? strengths : fallback.strengths,
      gaps: gaps.length ? gaps : fallback.gaps,
      lessons: lessons.length ? lessons : fallback.lessons,
      nextTime: nextTime.length ? nextTime : fallback.nextTime,
      scenarioTitle: params.scenarioTitle,
      traineeName: params.traineeName,
      timing: fallback.timing,
      nudges: liveNudges,
      evaluations,
    });
  } catch {
    return withoutEmDashesDeep(fallback);
  }
}
