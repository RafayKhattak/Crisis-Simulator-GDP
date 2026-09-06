-- =============================================================================
-- GCC Data Protection — AI Data Breach Crisis Simulator
-- Paste and run this entire script in the Supabase SQL Editor.
-- =============================================================================

create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- 1. scenarios
-- -----------------------------------------------------------------------------
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  starting_context text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. characters (isolated system_prompt per persona — prevents persona bleed)
-- -----------------------------------------------------------------------------
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null,
  system_prompt text not null,
  created_at timestamptz not null default now(),
  unique (scenario_id, email)
);

create index if not exists characters_scenario_id_idx
  on public.characters (scenario_id);

-- -----------------------------------------------------------------------------
-- 3. messages (stateful memory; scoped per sender/receiver pair)
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  sender_email text not null,
  receiver_email text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on public.messages (scenario_id, sender_email, receiver_email, created_at desc);

create index if not exists messages_scenario_created_idx
  on public.messages (scenario_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. playbook_chunks (RAG store). Embedding column reserved (1536).
--    This Groq account has no embedding model; the app ranks chunks lexically.
-- -----------------------------------------------------------------------------
create table if not exists public.playbook_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- Skip IVFFlat on an empty table (it fails without rows). A sequential scan is
-- fine for a short playbook. After ingest you may optionally add:
-- create index playbook_chunks_embedding_hnsw
--   on public.playbook_chunks using hnsw (embedding vector_cosine_ops);

-- -----------------------------------------------------------------------------
-- 5. RPC: cosine-similarity match for RAG
-- -----------------------------------------------------------------------------
create or replace function public.match_playbook_chunks (
  query_embedding vector(1536),
  match_count int default 3,
  match_threshold float default 0.2
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    playbook_chunks.id,
    playbook_chunks.content,
    1 - (playbook_chunks.embedding <=> query_embedding) as similarity
  from public.playbook_chunks
  where playbook_chunks.embedding is not null
    and 1 - (playbook_chunks.embedding <=> query_embedding) > match_threshold
  order by playbook_chunks.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_playbook_chunks(vector, int, float)
  to service_role;

-- -----------------------------------------------------------------------------
-- 6. trainees (invite-only login) + per-trainee message isolation
--    Existing projects: also run supabase/trainees.sql in the SQL Editor.
-- -----------------------------------------------------------------------------
create table if not exists public.trainees (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists trainee_id uuid references public.trainees (id) on delete cascade;

create index if not exists messages_trainee_scenario_idx
  on public.messages (trainee_id, scenario_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 7. Row Level Security — deny anon/authenticated; the Next.js server uses
--    SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- -----------------------------------------------------------------------------
alter table public.scenarios enable row level security;
alter table public.characters enable row level security;
alter table public.messages enable row level security;
alter table public.playbook_chunks enable row level security;
alter table public.trainees enable row level security;

drop policy if exists "demo_scenarios_all" on public.scenarios;
drop policy if exists "demo_characters_all" on public.characters;
drop policy if exists "demo_messages_all" on public.messages;
drop policy if exists "demo_playbook_chunks_all" on public.playbook_chunks;
