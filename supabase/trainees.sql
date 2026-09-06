-- =============================================================================
-- Additive migration: isolated trainee accounts (run in Supabase SQL Editor).
-- Safe to re-run. Wipes the shared demo inbox so each login starts clean.
-- =============================================================================

create table if not exists public.trainees (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists trainees_email_idx on public.trainees (email);

delete from public.messages;

alter table public.messages
  add column if not exists trainee_id uuid references public.trainees (id) on delete cascade;

create index if not exists messages_trainee_scenario_idx
  on public.messages (trainee_id, scenario_id, created_at desc);

alter table public.trainees enable row level security;
alter table public.scenarios enable row level security;
alter table public.characters enable row level security;
alter table public.messages enable row level security;
alter table public.playbook_chunks enable row level security;

drop policy if exists "demo_scenarios_all" on public.scenarios;
drop policy if exists "demo_characters_all" on public.characters;
drop policy if exists "demo_messages_all" on public.messages;
drop policy if exists "demo_playbook_chunks_all" on public.playbook_chunks;
drop policy if exists "demo_trainees_all" on public.trainees;
