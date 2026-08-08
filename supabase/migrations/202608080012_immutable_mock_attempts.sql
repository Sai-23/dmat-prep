-- Q5: assemble and snapshot a complete mock before its authoritative clock starts.
alter type public.test_attempt_status add value if not exists 'assembling' before 'in_progress';

alter table public.test_attempts
  add column if not exists current_section_id uuid references public.test_sections(id) on delete set null,
  add column if not exists section_started_at timestamptz,
  add column if not exists section_expires_at timestamptz,
  add column if not exists current_question_id uuid references public.questions(id) on delete set null,
  add column if not exists test_snapshot jsonb not null default '{}'::jsonb;

alter table public.practice_attempt_items
  add column if not exists test_section_id uuid references public.test_sections(id) on delete set null,
  add column if not exists section_position integer check (section_position is null or section_position >= 1);

create index if not exists idx_practice_attempt_items_section
  on public.practice_attempt_items(attempt_id, test_section_id, section_position);

-- Students access attempts through ownership-checked server actions. Private snapshots
-- and immutable answer keys remain unavailable to browser database clients.
revoke all on public.practice_attempt_items from anon, authenticated;

