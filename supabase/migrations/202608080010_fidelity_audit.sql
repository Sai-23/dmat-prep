create table if not exists public.fidelity_audit_samples (
  id uuid primary key default gen_random_uuid(),
  sample_key text not null unique,
  question_type public.question_type not null check (question_type in ('mathematical_equation', 'latin_square', 'figure_sequence')),
  difficulty public.question_difficulty not null,
  seed text not null,
  generator_version text not null,
  validator_version text not null,
  fingerprint text not null,
  generated_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (fingerprint)
);

create table if not exists public.fidelity_audit_reviews (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null references public.fidelity_audit_samples(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  correctness_score smallint not null check (correctness_score between 1 and 5),
  format_fidelity_score smallint not null check (format_fidelity_score between 1 and 5),
  clarity_score smallint not null check (clarity_score between 1 and 5),
  difficulty_appropriateness_score smallint not null check (difficulty_appropriateness_score between 1 and 5),
  ambiguity_score smallint not null check (ambiguity_score between 1 and 5),
  mental_workload_score smallint not null check (mental_workload_score between 1 and 5),
  overall_quality_score smallint not null check (overall_quality_score between 1 and 5),
  difficulty_agreement boolean not null,
  ambiguity_flag boolean not null,
  task_specific jsonb not null default '{}'::jsonb,
  comments text not null default '' check (char_length(comments) <= 4000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (sample_id, reviewer_id)
);

create index if not exists idx_fidelity_samples_grouping on public.fidelity_audit_samples(question_type, difficulty, generator_version);
create index if not exists idx_fidelity_reviews_sample on public.fidelity_audit_reviews(sample_id);

alter table public.fidelity_audit_samples enable row level security;
alter table public.fidelity_audit_reviews enable row level security;

create policy fidelity_samples_select on public.fidelity_audit_samples for select
  using (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));
create policy fidelity_samples_insert on public.fidelity_audit_samples for insert
  with check (public.current_user_has_role('admin'));
create policy fidelity_reviews_select on public.fidelity_audit_reviews for select
  using (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));
create policy fidelity_reviews_insert on public.fidelity_audit_reviews for insert
  with check (reviewer_id = auth.uid() and public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));
create policy fidelity_reviews_update on public.fidelity_audit_reviews for update
  using (reviewer_id = auth.uid() or public.current_user_has_role('admin'))
  with check (reviewer_id = auth.uid() or public.current_user_has_role('admin'));

create trigger set_fidelity_reviews_updated_at before update on public.fidelity_audit_reviews
  for each row execute procedure public.set_updated_at();

grant select, insert on public.fidelity_audit_samples to authenticated;
grant select, insert, update on public.fidelity_audit_reviews to authenticated;
