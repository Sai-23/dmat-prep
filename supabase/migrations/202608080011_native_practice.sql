-- Generated structured_data and metadata can contain solution paths and answer keys.
revoke select on public.questions from anon, authenticated;
grant select (
  id, module, question_type, subject, topic, subtopic, difficulty, question_text,
  passage, code, formula, table_data, diagram_data, image_url,
  estimated_time_seconds, source_type, verification_status, publication_status,
  version, published_at, created_at, updated_at
) on public.questions to anon, authenticated;

create table if not exists public.practice_attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  source_question_id uuid not null references public.questions(id) on delete restrict,
  position integer not null check (position >= 1),
  question_type public.question_type not null,
  public_snapshot jsonb not null,
  private_snapshot jsonb not null,
  generator_version text,
  validator_version text,
  seed text,
  fingerprint text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (attempt_id, position),
  unique (attempt_id, source_question_id)
);

alter table public.user_responses
  add column if not exists response_payload jsonb;

alter table public.question_reports
  add column if not exists attempt_id uuid references public.test_attempts(id) on delete set null,
  add column if not exists provenance jsonb not null default '{}'::jsonb;

create index if not exists idx_practice_attempt_items_attempt on public.practice_attempt_items(attempt_id, position);
create index if not exists idx_question_reports_attempt on public.question_reports(attempt_id);

alter table public.practice_attempt_items enable row level security;
create policy practice_attempt_items_admin on public.practice_attempt_items for select
  using (public.current_user_has_role('admin'));

-- Browser clients never query snapshots directly. Authenticated practice requests use
-- ownership-checked server actions and the server-only service client.
revoke all on public.practice_attempt_items from anon, authenticated;

