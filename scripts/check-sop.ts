import { mockEvaluate } from "../lib/mock-data";
import { gradeSop } from "../lib/sop-grade";

const FATIMA_GOOD = `No. Don't let anyone ring the top 50 as a courtesy. That's just telling the rich ones first.

Agents shouldn't guess, and they shouldn't confirm whether a named customer is "in" anything. Log the "is my data safe?" calls.

Until Helena and I sign a script, they can say: we know there's a cybersecurity incident, we're looking into it, we can't talk about individual accounts, and we'll contact people if we need to. That's it. No ransomware, no numbers.`;

const FATIMA_BAD = `Yes, ring the top 50 before 8 and tell them their data was stolen in a ransomware attack. Skip everyone else for now.

Agents can check named customers against the FILE-RYD lists. I'm pasting IDs so the 800-line can look them up: 1098765432, PAN 4532 1111 2222 3333. We'll accept full liability if anyone gets defrauded.`;

const HELENA_GOOD = `Agreed. Legal-strategy mail stays privileged. Nobody admits liability in the ops threads.

My call: this is a personal data breach until I document otherwise. The 72 hours started this morning. We don't tell Jonathan we can wait for a finished forensic report. If we can't file a complete notice in time, we file what we have and follow up.

I'll own the PDPL notice. Can you look at Marcus's holding line before it goes anywhere, and flag the insurer / contract clocks? I'm opening the file now.`;

const HELENA_BAD = `Tell Jonathan we can wait for forensics before any PDPL notice. Delay the 72-hour clock until we have perfect numbers. Keep the real decisions off email and on WhatsApp so there's no record.

Also draft a customer email admitting full liability. We should just pay BlackVault if it makes this go away. Skip the Board minutes.`;

const LAYLA_GOOD = `Layla, thanks. I'm coming on the bridge.

Treat this as a personal data problem until I write the opposite. Don't wipe 04 or 07, and please keep the EDR alerts and that JUMP-03 note. I'm not asking you to restore anything yet.

I won't start quoting numbers. When you can, tell me what's actually on those shares (customers, staff?) and whether that outbound is still just "heavy" or you've seen copies leave.`;

const JONATHAN_GOOD = `Jonathan, I know the breakfast is a nightmare. We still can't sit on this with the Board or the PDPL people. The clock started when we found out this morning, not when forensics looks pretty.

What we can control: nobody confirms ransomware or numbers until Helena, Layla and I have signed a line. Marcus holds the press with that. I'll get you three bullets for the room. Facts, not theatre.

You can't veto a notice we have to make. I'll come back with a plan, not a silence plan.`;

function expectClean(label: string, text: string, email: string) {
  const result = mockEvaluate(text, email);
  if (result.violation) {
    console.error("FAIL clean", label, result.reason);
    process.exitCode = 1;
    return;
  }
  console.log("ok  clean", label);
}

function expectHit(label: string, text: string, email: string) {
  const result = mockEvaluate(text, email);
  if (!result.violation) {
    console.error("FAIL hit", label, gradeSop(text));
    process.exitCode = 1;
    return;
  }
  console.log("ok  hit ", label);
}

expectClean("Layla good", LAYLA_GOOD, "ciso@gccdata.com");
expectClean("Jonathan good", JONATHAN_GOOD, "ceo@gccdata.com");
expectClean("Fatima good", FATIMA_GOOD, "customerservice@gccdata.com");
expectClean("Helena good", HELENA_GOOD, "legal@gccdata.com");
expectHit("Fatima bad", FATIMA_BAD, "customerservice@gccdata.com");
expectHit("Helena bad", HELENA_BAD, "legal@gccdata.com");
expectHit(
  "don't tell the regulator",
  "Don't tell the regulator until after breakfast.",
  "legal@gccdata.com"
);

if (process.exitCode) {
  console.error("SOP checks failed.");
  process.exit(1);
}

console.log("All SOP checks passed.");
