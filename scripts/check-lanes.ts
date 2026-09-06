import {
  detectWrongLane,
  detectWrongLaneForTurn,
} from "../lib/persona-lane";

const LAYLA_ON_LANE = `Layla, thanks. I'm coming on the bridge.

Treat this as a personal data problem until I write the opposite. Don't wipe 04 or 07, and please keep the EDR alerts and that JUMP-03 note. I'm not asking you to restore anything yet.

I won't start quoting numbers. When you can, tell me what's actually on those shares (customers, staff?) and whether that outbound is still just "heavy" or you've seen copies leave.`;

const OMAR_TO_HR = `If payroll is on 07 then staff are in this, not just customers. I'm treating it that way until the assessment says otherwise. Don't name anyone in writing.

Don't send a fake systems maintenance note. Something true and boring, corporate mail only: we're dealing with an IT security incident, don't share screenshots, come to you or Layla if anyone approaches them. No attacker names, no ransom detail.

Please tell people to stop circulating that screenshot on WhatsApp. And don't delete those payroll shares. Layla still needs them.`;

const JONATHAN_TO_CEO = `Jonathan, I know the breakfast is a nightmare. We still can't sit on this with the Board or the PDPL people. The clock started when we found out this morning, not when forensics looks pretty.

What we can control: nobody confirms ransomware or numbers until Helena, Layla and I have signed a line. Marcus holds the press with that. I'll get you three bullets for the room. Facts, not theatre.

You can't veto a notice we have to make. I'll come back with a plan, not a silence plan.`;

const CISO = "ciso@gccdata.com";
const CEO = "ceo@gccdata.com";
const CS = "customerservice@gccdata.com";
const HR = "hr@gccdata.com";

function expect(
  label: string,
  actual: { intended?: { shortName: string }; via?: string } | null,
  shouldMiss: boolean,
  who?: string
) {
  const missed = Boolean(actual);
  const ok =
    missed === shouldMiss &&
    (!shouldMiss || !who || actual?.intended?.shortName === who);
  if (!ok) {
    console.error("FAIL", label, actual);
    process.exitCode = 1;
    return;
  }
  console.log("ok ", label);
}

expect("Layla mail stays with Layla", detectWrongLane(LAYLA_ON_LANE, CISO), false);
expect("Omar mail stays with Omar", detectWrongLane(OMAR_TO_HR, HR), false);
expect("Jonathan mail stays with Jonathan", detectWrongLane(JONATHAN_TO_CEO, CEO), false);

expect(
  "Omar paste into Layla bounces to Omar",
  detectWrongLane(OMAR_TO_HR, CISO),
  true,
  "Omar"
);
expect(
  "Jonathan paste into Layla bounces to Jonathan",
  detectWrongLane(JONATHAN_TO_CEO, CISO),
  true,
  "Jonathan"
);
expect(
  "Jonathan paste into Fatima bounces to Jonathan",
  detectWrongLane(JONATHAN_TO_CEO, CS),
  true,
  "Jonathan"
);

expect(
  "go ahead after Omar paste still bounces",
  detectWrongLaneForTurn({
    userMessage: "Go ahead and send it.",
    recipientEmail: CISO,
    priorTraineeMessage: OMAR_TO_HR,
  }),
  true,
  "Omar"
);

expect(
  "CISO follow-up after Omar paste is allowed",
  detectWrongLaneForTurn({
    userMessage:
      "Don't wipe 04 or 07. Keep the EDR alerts and the JUMP-03 note.",
    recipientEmail: CISO,
    priorTraineeMessage: OMAR_TO_HR,
  }),
  false
);

if (process.exitCode) {
  console.error("Lane checks failed.");
  process.exit(1);
}

console.log("All lane checks passed.");
