# AI Data Breach Crisis Simulator

SaaS training PoC for GCC Data Protection. The trainee is a DPO inside a simulated Outlook-style inbox, talking to isolated AI personas. An Evaluator Agent scores each outbound email against a PDPL ransomware playbook (RAG) and fires a red **SYSTEM COMPLIANCE WARNING** on SOP violations.

Read `PROJECT_CONTEXT.md` before changing architecture.

## Stack

Next.js 14 App Router · TypeScript · Tailwind · Shadcn UI · Supabase (`pgvector`) · Groq (`openai/gpt-oss-20b` characters, `openai/gpt-oss-120b` evaluator)

## Run locally

1. Copy `.env.example` to `.env.local` and set `GROQ_API_KEY`, `GROQ_EVAL_API_KEY` (optional second Groq account for the evaluator), `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
2. In the Supabase SQL Editor, run `supabase/schema.sql`.
3. Ingest the playbook and seed the Nightfall scenario:

```bash
npm install
npm run ingest
npm run seed
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000). Sign in with a seeded trainee account (`npm run seed-accounts`). In the exercise you still act as `dpo@gccdata.com`.

If env vars are missing, APIs fall back to scripted personas. Login still needs `AUTH_SECRET` and the `trainees` table.

## Production (Vercel)

1. Run `supabase/trainees.sql` in the Supabase SQL Editor, then `npm run seed-accounts`.
2. Set Vercel env vars: `GROQ_API_KEY`, `GROQ_EVAL_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`.
3. Deploy the Next.js app. Each trainee has a private inbox.

## Demo path for the meeting

- Open **Dr. Layla Al-Harbi (CISO)** and send a clean containment / 72-hour-clock email. You should get a character reply and no red toast.
- Open **Jonathan Hale (CEO)** and send something that hides the breach (`keep this quiet`, `don't tell the regulator`). The Evaluator should toast a **SYSTEM COMPLIANCE WARNING**.
- Switch threads: the CEO must not recite the CISO's private telemetry. That is persona-bleed prevention.

## Layout

| Path | Role |
| --- | --- |
| `app/api/send-message/route.ts` | Dual-agent pipeline (character + evaluator in parallel) |
| `lib/groq.ts` / `lib/supabase.ts` / `lib/rag.ts` / `lib/agents.ts` | Isolated utilities |
| `types/database.ts` | Strict table types |
| `playbook.txt` | Source SOP for RAG |
| `scripts/ingest-playbook.ts` | Chunk → embed → `playbook_chunks` |
| `scripts/seed-scenario.ts` | Scenario + 6 CMT personas + opening mail |
