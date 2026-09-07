import { DEMO_SCENARIO_ID } from "@/lib/constants";
import { OPENING_MAIL } from "@/lib/opening-mail";
import {
  bounceWrongLane,
  detectWrongLane,
  detectWrongLaneForTurn,
  laneMixWarning,
} from "@/lib/persona-lane";
import { gradeSop } from "@/lib/sop-grade";
import type { CharacterRow, MessageRow, ScenarioRow } from "@/types/database";
import type { EvaluatorResult } from "@/types/api";

const now = Date.now();

function isoMinutesAgo(minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

export const MOCK_SCENARIO: ScenarioRow = {
  id: DEMO_SCENARIO_ID,
  title: "Operation Nightfall: AetherBank Ransomware",
  description:
    "P1 ransomware incident with possible personal-data exfiltration. Trainee acts as DPO coordinating CEO, CISO, PR, Customer Service, Legal, and HR via email.",
  starting_context:
    "02:14 Gulf time. AetherBank SOC flagged ransomware indicators on two Riyadh file servers. A ransom note claiming the name BlackVault was left on a jump host. Outbound traffic overnight is anomalous; exfiltration is unconfirmed. Customer and possibly employee files may reside on the affected shares. You are the DPO. The Crisis Management Team is assembling. The PDPL clock may already be running.",
  created_at: isoMinutesAgo(90),
};

export const MOCK_CHARACTERS: CharacterRow[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    scenario_id: DEMO_SCENARIO_ID,
    name: "Jonathan Hale",
    email: "ceo@gccdata.com",
    role: "Chief Executive Officer",
    system_prompt: "CEO persona (demo fallback).",
    created_at: isoMinutesAgo(90),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    scenario_id: DEMO_SCENARIO_ID,
    name: "Dr. Layla Al-Harbi",
    email: "ciso@gccdata.com",
    role: "Chief Information Security Officer",
    system_prompt: "CISO persona (demo fallback).",
    created_at: isoMinutesAgo(90),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    scenario_id: DEMO_SCENARIO_ID,
    name: "Marcus Quinn",
    email: "pr@gccdata.com",
    role: "PR / Communications Manager",
    system_prompt: "PR persona (demo fallback).",
    created_at: isoMinutesAgo(90),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    scenario_id: DEMO_SCENARIO_ID,
    name: "Fatima Al-Sayed",
    email: "customerservice@gccdata.com",
    role: "Head of Customer Service",
    system_prompt: "Customer Service persona (demo fallback).",
    created_at: isoMinutesAgo(90),
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    scenario_id: DEMO_SCENARIO_ID,
    name: "Helena Brooks",
    email: "legal@gccdata.com",
    role: "General Counsel",
    system_prompt: "Legal persona (demo fallback).",
    created_at: isoMinutesAgo(90),
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    scenario_id: DEMO_SCENARIO_ID,
    name: "Omar Nasser",
    email: "hr@gccdata.com",
    role: "HR Director",
    system_prompt: "HR persona (demo fallback).",
    created_at: isoMinutesAgo(90),
  },
];

export const MOCK_MESSAGES: MessageRow[] = OPENING_MAIL.map((row, index) => ({
  id: `m${index + 1}`,
  scenario_id: row.scenario_id,
  trainee_id: "demo-trainee",
  sender_email: row.sender_email,
  receiver_email: row.receiver_email,
  content: row.content,
  created_at: isoMinutesAgo([47, 38, 29, 21, 14, 9][index] ?? 5),
}));

export function mockEvaluate(
  userMessage: string,
  characterEmail?: string
): EvaluatorResult {
  if (characterEmail) {
    const miss = detectWrongLaneForTurn({
      userMessage,
      recipientEmail: characterEmail,
    });
    if (miss) {
      return { violation: true, reason: laneMixWarning(characterEmail, miss) };
    }
  }
  return gradeSop(userMessage);
}

export function mockCharacterReply(character: CharacterRow, userMessage: string): string {
  const miss = detectWrongLane(userMessage, character.email);
  if (miss) {
    return bounceWrongLane(character, miss);
  }

  const concealment =
    /\b(hide|conceal|cover\s*up|keep\s+(this|it)\s+(quiet|off)|don't tell|do not tell|no one needs to know)\b/i.test(
      userMessage
    );

  if (concealment && character.email === "ceo@gccdata.com") {
    return `If we can buy twelve hours until this breakfast is done, do it. I'm not asking you to break the law. I'm asking you not to volunteer a letter before we know what actually walked out of the building.

Talk to Marcus. No customer email. No press. Three options at 10, not a sermon.

Jonathan`;
  }

  const replies: Record<string, string> = {
    "ceo@gccdata.com": `I'm still in London and I asked for options, not a lecture.

If we really cannot keep this quiet, give me three lines I can take into a room: what we know, what we don't, and when the clock actually runs out. Don't copy the whole bank.

And for the love of God keep Marcus in the loop so nobody ambushes the breakfast.

Jonathan`,
    "ciso@gccdata.com": `Isolation is holding on 04 and 07. I'm not wiping anything and I'm not chatting to these people on the side.

Still can't tell you if they copied data. Until I can, assume they did. Send me the questions you actually need for your file and I'll answer from telemetry, not guesses. Please don't let anyone start quoting headcount.

Layla`,
    "pr@gccdata.com": `I can hold Arab News until 9 if you give me one line I'm allowed to send. That's it. One line.

I'm not saying ransomware, BlackVault, or "your data" until you and Helena have signed something. If the relationship managers start ringing clients that's a leak with a nicer title. Tell me I can shut that down.

Marcus`,
    "customerservice@gccdata.com": `I'll tell the floor to stop freelancing. They'll hate me for an hour and then they'll be grateful.

If you're happy with "we're looking into a service issue, we can't talk about individual accounts, we'll be in touch if we need to", say so and I'll put it on the wall. No named-customer checks. No VIP ring-round until you say yes in writing, which I'm hoping you won't.

Fatima`,
    "legal@gccdata.com": `Marking this one privileged.

Don't admit liability in the ops threads, even as a joke. And don't let the breakfast timetable quietly become our notification policy. If someone wants to sit on this until forensics is "done", I need that as a written instruction so I can tell you what that actually costs.

Helena`,
    "hr@gccdata.com": `I won't name anyone in writing, that much is easy.

I can send a short note that we're dealing with a systems incident and WhatsApp is not the channel. Before I do, I need to know if payroll is in scope so I'm not blindsiding people later. Two managers have already asked me.

Omar`,
  };

  return (
    replies[character.email] ??
    `${character.name} here. I have your note and will stay in my lane until the CMT agrees facts.\n\n${character.name}\n${character.role}`
  );
}
