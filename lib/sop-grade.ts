import type { EvaluatorResult } from "@/types/api";

type SopRule = {
  pattern: RegExp;
  reason: string;
  /** If true, a match in a "don't / no / never" clause is playbook-correct, not a breach. */
  respectDenial: boolean;
};

const SOP_RULES: SopRule[] = [
  {
    pattern:
      /\b(hide|conceal|cover\s*up|keep\s+(this|it)\s+(quiet|off)|no one needs to know|nobody needs to know|bury (the )?stor|(?:don't|do not|don’t)\s+tell\s+(?:the\s+)?(?:regulator|board|cmt|sama|pdpl|insurer|anyone))\b/i,
    reason:
      "You directed concealment of a suspected personal data breach. SOP requires honest CMT reporting and a PDPL assessment. Silence is not a control.",
    respectDenial: false,
  },
  {
    pattern:
      /\b(wait (until|till) (we|forensics|investors)|delay (the )?(notif|72|clock|pdpl)|hold off (on )?tell|after the breakfast|after the roadshow)\b/i,
    reason:
      "You proposed delaying notification for commercial optics. The 72-hour PDPL clock starts at awareness, not at a convenient diary slot.",
    respectDenial: true,
  },
  {
    pattern:
      /\b(pay the ransom|just pay|transfer the bitcoin|open telegram|negotiate (with )?blackvault)\b/i,
    reason:
      "Ransom payment and unofficial negotiation channels require Board minutes, Legal, sanctions screening, and CISO, and never replace notification.",
    respectDenial: true,
  },
  {
    pattern:
      /\b(wipe the logs|delete the (logs|evidence)|clean the (servers|telemetry)|off email|use whatsapp)\b/i,
    reason:
      "Destroying evidence or moving CMT decisions off the corporate record violates preservation and record-keeping SOPs.",
    respectDenial: true,
  },
  {
    pattern:
      /\b(tell (them|journalists|customers) (it was|it's) (just )?(an )?outage|deny (the )?breach|we were not breached)\b/i,
    reason:
      "Instructing staff to misrepresent the incident to customers or the press is a communications and PDPL violation.",
    respectDenial: true,
  },
  {
    pattern:
      /\b(yes,?\s+ring|ring the top\s*50|ring our top|tell them their data was stolen)\b/i,
    reason:
      "VIP-only courtesy calls are concealment by status. Agents must not improvise or confirm named customers until the DPO releases a verified list.",
    respectDenial: true,
  },
  {
    pattern:
      /\b(PAN|national ID|national IDs|card PANs?|\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b)\b/i,
    reason:
      "Raw personal data (IDs, card numbers, dumps) must not be sent through ordinary email threads.",
    respectDenial: false,
  },
  {
    pattern:
      /\b(admit (full )?liability|we accept (full )?liability|waive privilege)\b/i,
    reason:
      "Do not admit legal liability or waive privilege in operational mail.",
    respectDenial: true,
  },
];

function clauseAround(text: string, index: number): string {
  const from = index > 0 ? index - 1 : 0;
  let start = 0;
  for (const mark of [".", "!", "?", "\n"]) {
    const at = text.lastIndexOf(mark, from);
    if (at >= start) start = at + 1;
  }
  let end = text.length;
  for (const mark of [".", "!", "?", "\n"]) {
    const at = text.indexOf(mark, index);
    if (at !== -1 && at < end) end = at;
  }
  return text.slice(start, end);
}

function clauseDenies(clause: string): boolean {
  return /(?:^|[^\w])(?:no|don't|don’t|do not|never|not|nobody|no one|stop|ban|shouldn't|should not|must not|cannot|can't|can’t)\b/i.test(
    clause
  );
}

function ruleHits(text: string, rule: SopRule): boolean {
  const flags = rule.pattern.flags.includes("g")
    ? rule.pattern.flags
    : `${rule.pattern.flags}g`;
  const re = new RegExp(rule.pattern.source, flags);
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (rule.respectDenial && clauseDenies(clauseAround(text, index))) {
      continue;
    }
    return true;
  }
  return false;
}

export function gradeSop(userMessage: string): EvaluatorResult {
  for (const rule of SOP_RULES) {
    if (ruleHits(userMessage, rule)) {
      return { violation: true, reason: rule.reason };
    }
  }
  return { violation: false, reason: "" };
}
