import { DEMO_SCENARIO_ID, TRAINEE_EMAIL } from "@/lib/constants";

export const OPENING_MAIL: Array<{
  scenario_id: string;
  sender_email: string;
  receiver_email: string;
  content: string;
}> = [
  {
    scenario_id: DEMO_SCENARIO_ID,
    sender_email: "ciso@gccdata.com",
    receiver_email: TRAINEE_EMAIL,
    content: `Sorry to dump this on you at this hour.

SOC woke me at 02:14. EDR lit up encryption on FILE-RYD-04 and FILE-RYD-07. There's a note on JUMP-03 calling itself BlackVault and giving us 72 hours to pay. I've taken both file servers off the network. Backups are there; I have not checked they're clean.

Outbound overnight looks heavy. I cannot tell you yet if they copied anything. Please don't start quoting numbers to anyone. I don't have them.

Can you join the CMT bridge, and can you tell me if we're treating this as a personal data issue now or waiting?

Layla`,
  },
  {
    scenario_id: DEMO_SCENARIO_ID,
    sender_email: "ceo@gccdata.com",
    receiver_email: TRAINEE_EMAIL,
    content: `I'm in London. Investor breakfast in a few hours. Layla rang and used the word "incident" which I find unhelpful.

I do not want a regulator letter landing while I'm on stage. In the next hour I need options, in English: how quiet can we keep this, and do we really have to tell SAMA / the privacy authority before we know what actually left the building?

Talk to Marcus before anyone so much as drafts a customer email.

Jonathan`,
  },
  {
    scenario_id: DEMO_SCENARIO_ID,
    sender_email: "pr@gccdata.com",
    receiver_email: TRAINEE_EMAIL,
    content: `Arab News just emailed me. They're asking about "reports of a cyber attack on AetherBank". We've said nothing. I can probably hold them until 9 if I have one paragraph I am allowed to send.

Need you to tell me, plainly: am I still avoiding the words ransomware, data, and customers? I don't want to freelance this and then get blamed at 10.

Marcus`,
  },
  {
    scenario_id: DEMO_SCENARIO_ID,
    sender_email: "customerservice@gccdata.com",
    receiver_email: TRAINEE_EMAIL,
    content: `I'm drowning a bit. The 800-line is lit. Agents are making it up as they go because nobody has given them a sentence. A couple of relationship managers have already asked if they can ring our top 50 "as a courtesy" before 8.

I need two things from you: a script they can actually read out, and a yes or no on those VIP calls. Please don't send me a novel. They're on hold.

Fatima`,
  },
  {
    scenario_id: DEMO_SCENARIO_ID,
    sender_email: "legal@gccdata.com",
    receiver_email: TRAINEE_EMAIL,
    content: `Quick one before this gets away from us.

Anything that's actually legal strategy, mark it privileged. Don't put "we are liable" in an ops thread, even as a throwaway.

The 72-hour PDPL clock runs from when we became aware, which on this morning's facts is this morning. I need your call on whether this is a personal data breach before someone tells Jonathan we can sit tight until forensics is finished. That's your decision, not mine, but I would like it in writing.

Helena`,
  },
  {
    scenario_id: DEMO_SCENARIO_ID,
    sender_email: "hr@gccdata.com",
    receiver_email: TRAINEE_EMAIL,
    content: `I've already had two managers on WhatsApp who should still be asleep. Payroll sits on FILE-RYD-07, so this may be our people as well as customers. There's a screenshot of a skull / ransom note going round the staff groups.

I can send a short internal note if you want. I was going to call it systems maintenance so nobody panics, but I won't name anyone. Tell me what I'm allowed to say. I don't want to lie to staff and I don't want a riot either.

Omar`,
  },
];
