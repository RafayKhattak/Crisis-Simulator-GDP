# CURSOR CONTEXT DOCUMENT: AI Data Breach Crisis Simulator

## 1. PROJECT OVERVIEW
You are acting as a Lead Enterprise AI Software Engineer. We are building a Proof of Concept (PoC) for an **AI Data Breach Crisis Simulator** for a high-ticket client (GCC Data Protection).

This is a SaaS training platform for Data Protection Officers (DPOs). It simulates a corporate data breach. The trainee interacts with 6-10 AI-driven personas (CEO, CISO, PR Manager, Customer Service) via a **Simulated Email/Memo Inbox UI**. As the trainee makes decisions, an invisible "Evaluator Agent" monitors their actions against a static compliance Playbook (using RAG) and triggers real-time UI warnings if they violate standard operating procedures (SOPs).

## 2. THE TECH STACK
*   **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, TypeScript.
*   **UI Library:** Shadcn UI (Lucide Icons, Toasts for notifications, ScrollArea, Resizable panels).
*   **Database & Vector Store:** Supabase (PostgreSQL with `pgvector` enabled).
*   **AI/LLM:** Groq API (OpenAI-compatible). `openai/gpt-oss-20b` for character dialogue, `openai/gpt-oss-120b` for the Evaluator Agent. Playbook chunks live in Supabase; retrieval ranks stored paragraphs (this Groq account does not expose an embedding model).

## 3. CORE ARCHITECTURE & BUSINESS LOGIC
Do not build a standard ChatGPT wrapper. We must avoid **"Persona Bleed"** (e.g., the CEO AI accidentally knowing what the CISO AI knows). We will use a **Multi-Agent Stateful Architecture**.

### A. The Database Schema (Supabase)
We require five core tables:
1.  `scenarios`: id, title, description, starting_context.
2.  `characters`: id, scenario_id, name, email, role, system_prompt. *(Crucial: Each character has an isolated prompt).*
3.  `messages`: id, scenario_id, trainee_id, sender_email, receiver_email, content, created_at. Isolated per trainee.
4.  `playbook_chunks`: id, content (text), embedding (vector 1536, optional). Used for RAG.
5.  `trainees`: id, email, name, password_hash. Invite-only login. No public sign-up.

### B. Retrieval-Augmented Generation (RAG)
We will not feed the entire training Playbook into the LLM prompts to save token costs.
*   When a user sends a message, we retrieve the top 2-3 most relevant playbook paragraphs from `playbook_chunks` (lexical ranking; vector match is available via `match_playbook_chunks` if embeddings are populated).

### C. The Dual-Agent API Pipeline (The Brain)
When a user sends an email to a character (e.g., `ceo@gccdata.com`), the backend API route must execute the following workflow:
1.  **Retrieve History:** Fetch the last 5 messages between the user and this specific character from Supabase.
2.  **Retrieve RAG Context:** Fetch the relevant playbook chunks based on the user's message.
3.  **Parallel LLM Execution:**
    *   **Thread 1 (Character Agent - `openai/gpt-oss-20b`):** Generate the email reply. System prompt: `[Character System Prompt] + RAG CONTEXT: [Playbook Chunks]`.
    *   **Thread 2 (Evaluator Agent - `openai/gpt-oss-120b`):** Use Structured Outputs (JSON). System prompt: `You are a compliance auditor. Review the user's message against the RAG CONTEXT. If the user violates the SOP (e.g., hides a data breach), output {"violation": true, "reason": "Specific HR warning"}. Else output {"violation": false}`.
4.  **Save & Return:** Save the character's reply to the DB. Return both the `character_reply` and the `evaluator_result` to the frontend.

## 4. UI/UX REQUIREMENTS
*   **Vibe:** London Corporate, Enterprise Security, Sleek Dark Mode.
*   **Layout:** Mimic an email client (e.g., Outlook or the Shadcn Mail template).
    *   *Left Sidebar:* Folders (Inbox, Sent, Drafts).
    *   *Middle Pane:* List of characters/threads the user is interacting with.
    *   *Right Pane:* The active email thread (reading pane) and a rich-text reply box at the bottom.
*   **The Nudge (Crucial Feature):** If the API returns `violation: true` from the Evaluator Agent, the frontend MUST trigger a highly visible Shadcn `useToast` with a `destructive` (red) variant displaying the Evaluator's reason as a "SYSTEM COMPLIANCE WARNING".

## 5. RULES FOR CURSOR
1.  **TypeScript:** Use strict typing for all Supabase database queries and API responses.
2.  **Modularity:** Keep API routes clean. Extract Groq calls and Supabase queries into separate utility functions (e.g., `lib/groq.ts`, `lib/supabase.ts`).
3.  **UI First:** When building the frontend, utilize Shadcn UI components extensively to maintain a premium look.
4.  **Environment Variables:** Assume `GROQ_API_KEY`, `GROQ_EVAL_API_KEY` (evaluator + lessons-learned report; falls back to `GROQ_API_KEY`), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `AUTH_SECRET` are configured in `.env.local` (and Vercel). Use the service role key for backend DB operations. Do not expose the service role key to the browser. Login is invite-only (seeded trainee accounts). Each trainee’s messages are scoped by `trainee_id`.
