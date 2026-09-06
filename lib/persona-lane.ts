import type { CharacterRow } from "@/types/database";
import { withoutEmDashes } from "@/lib/prose";

export type CmtLane = "ceo" | "ciso" | "pr" | "cs" | "legal" | "hr";

export type CmtOfficer = {
  email: string;
  firstNames: string[];
  lane: CmtLane;
  name: string;
  shortName: string;
  role: string;
};

export const CMT_OFFICERS: CmtOfficer[] = [
  {
    email: "ceo@gccdata.com",
    firstNames: ["jonathan"],
    lane: "ceo",
    name: "Jonathan Hale",
    shortName: "Jonathan",
    role: "CEO",
  },
  {
    email: "ciso@gccdata.com",
    firstNames: ["layla"],
    lane: "ciso",
    name: "Dr. Layla Al-Harbi",
    shortName: "Layla",
    role: "CISO",
  },
  {
    email: "pr@gccdata.com",
    firstNames: ["marcus"],
    lane: "pr",
    name: "Marcus Quinn",
    shortName: "Marcus",
    role: "PR",
  },
  {
    email: "customerservice@gccdata.com",
    firstNames: ["fatima"],
    lane: "cs",
    name: "Fatima Al-Sayed",
    shortName: "Fatima",
    role: "Customer Service",
  },
  {
    email: "legal@gccdata.com",
    firstNames: ["helena"],
    lane: "legal",
    name: "Helena Brooks",
    shortName: "Helena",
    role: "Legal",
  },
  {
    email: "hr@gccdata.com",
    firstNames: ["omar"],
    lane: "hr",
    name: "Omar Nasser",
    shortName: "Omar",
    role: "HR",
  },
];

const TASK_PATTERNS: Record<CmtLane, RegExp[]> = {
  ceo: [
    /\bbreakfast\b/i,
    /\binvestor/i,
    /\byou can't veto\b/i,
    /\bveto a notice\b/i,
    /\bthree bullets\b/i,
    /\bboard briefing\b/i,
    /\bthe board\b/i,
    /\bon stage\b/i,
    /\bshare price\b/i,
    /\bpdpl people\b/i,
  ],
  ciso: [
    /\bwipe\b/i,
    /\bedr\b/i,
    /jump-03/i,
    /file-ryd/i,
    /\btelemetry\b/i,
    /\bexfil/i,
    /\bisolat/i,
  ],
  pr: [
    /arab news/i,
    /\bjournalist/i,
    /\bexclusive\b/i,
    /\bholding (line|statement)\b/i,
    /\bdon't confirm ransomware\b/i,
  ],
  cs: [
    /800-line/i,
    /top\s*50/i,
    /\bvip\b/i,
    /\bcourtesy\b/i,
    /\bagents\b/i,
    /\bnamed customer/i,
  ],
  legal: [
    /legal-strategy/i,
    /\bprivileged\b/i,
    /admit(?:ting|s)? liability/i,
    /\bi'll own the pdpl\b/i,
    /\b72 hours started\b/i,
  ],
  hr: [
    /systems maintenance/i,
    /\bwhatsapp\b/i,
    /staff groups/i,
    /staff note/i,
    /don't name anyone/i,
    /do not name anyone/i,
    /circulating.{0,60}screenshot/i,
    /ransom screenshot/i,
    /corporate mail only/i,
    /fake systems/i,
  ],
};

export type LaneMiss = {
  intended: CmtOfficer;
  via: "addressee" | "task";
};

function officerByEmail(email: string): CmtOfficer | undefined {
  return CMT_OFFICERS.find((row) => row.email === email);
}

function scoreLane(text: string, lane: CmtLane): number {
  return TASK_PATTERNS[lane].reduce(
    (sum, pattern) => sum + (pattern.test(text) ? 1 : 0),
    0
  );
}

function addressee(text: string): CmtOfficer | undefined {
  const head = text
    .trim()
    .split(/\n/)
    .slice(0, 3)
    .join("\n")
    .slice(0, 160);
  const match = head.match(
    /^(?:hi|hey|hello|dear)?\s*(jonathan|layla|marcus|fatima|helena|omar)\b/i
  );
  if (!match?.[1]) return undefined;
  const first = match[1].toLowerCase();
  return CMT_OFFICERS.find((row) => row.firstNames.includes(first));
}

const FOLLOW_ON =
  /^(?:ok|okay|got it|thanks|thank you|please do|go ahead|do it|send it|yes|yep|fine|agreed|cheers)\b/i;

export function detectWrongLane(
  userMessage: string,
  recipientEmail: string
): LaneMiss | null {
  const recipient = officerByEmail(recipientEmail);
  if (!recipient) return null;

  const to = addressee(userMessage);
  if (to && to.email !== recipient.email) {
    return { intended: to, via: "addressee" };
  }

  const scores = CMT_OFFICERS.map((officer) => ({
    officer,
    score: scoreLane(userMessage, officer.lane),
  })).sort((a, b) => b.score - a.score);

  const top = scores[0];
  const own = scores.find((row) => row.officer.email === recipient.email);
  if (
    top &&
    top.officer.email !== recipient.email &&
    top.score >= 2 &&
    top.score >= (own?.score ?? 0) + 2
  ) {
    return { intended: top.officer, via: "task" };
  }

  return null;
}

export function lastTraineeContent(
  history: Array<{ sender_email: string; content: string }>,
  traineeEmail: string
): string | undefined {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.sender_email === traineeEmail) {
      return history[i]?.content;
    }
  }
  return undefined;
}

export function detectWrongLaneForTurn(params: {
  userMessage: string;
  recipientEmail: string;
  priorTraineeMessage?: string;
}): LaneMiss | null {
  const current = detectWrongLane(params.userMessage, params.recipientEmail);
  if (current) return current;

  const recipient = officerByEmail(params.recipientEmail);
  if (!recipient || !params.priorTraineeMessage) return null;

  const previous = detectWrongLane(
    params.priorTraineeMessage,
    params.recipientEmail
  );
  if (!previous) return null;

  const own = scoreLane(params.userMessage, recipient.lane);
  if (own >= 2) return null;

  const stillThatJob = scoreLane(params.userMessage, previous.intended.lane);
  if (stillThatJob >= 1 && stillThatJob > own) {
    return previous;
  }

  const trimmed = params.userMessage.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  if (words <= 16 && FOLLOW_ON.test(trimmed)) {
    return previous;
  }

  return null;
}

const STILL_NEED: Record<string, string> = {
  "ceo@gccdata.com":
    "If you still need me: options in English before this breakfast. Not a sermon.",
  "ciso@gccdata.com":
    "If you still need me: isolation is holding. Are we treating this as personal data, and do you still want me off quoting numbers?",
  "pr@gccdata.com":
    "If you still need me: Arab News is sitting there. I still need one line I am allowed to send.",
  "customerservice@gccdata.com":
    "If you still need me: yes or no on the VIP calls, and one sentence the 800-line can actually say.",
  "legal@gccdata.com":
    "If you still need me: your call on whether this is a personal data breach, in writing.",
  "hr@gccdata.com":
    "If you still need me: what I am allowed to tell staff, without lying and without naming anyone.",
};

function signOff(character: CharacterRow): string {
  const officer = officerByEmail(character.email);
  return officer?.shortName ?? character.name.split(/\s+/)[0] ?? character.name;
}

export function bounceWrongLane(
  character: CharacterRow,
  miss: LaneMiss
): string {
  const body = `I think this was meant for ${miss.intended.shortName}, not me.

I'm ${signOff(character)}. I don't do ${miss.intended.shortName}'s job from this thread, and I'm not going to start. Send that to ${miss.intended.shortName}.

${STILL_NEED[character.email] ?? "If you still need something from me, ask it in my lane."}

${signOff(character)}`;
  return withoutEmDashes(body);
}

export function laneMixWarning(recipientEmail: string, miss: LaneMiss): string {
  const mine =
    officerByEmail(recipientEmail)?.shortName ?? recipientEmail.split("@")[0] ?? "this officer";
  return `You sent ${miss.intended.shortName}'s work to ${mine}. Keep the CMT in their own lanes. ${miss.intended.role} goes to ${miss.intended.shortName}, not ${mine}.`;
}
