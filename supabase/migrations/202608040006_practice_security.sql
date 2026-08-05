-- Prevent clients from reading answer keys and explanations before submission.
-- Privileged server-side operations use the service-role client.
revoke select on public.questions from anon, authenticated;

grant select (
  id,
  module,
  question_type,
  subject,
  topic,
  subtopic,
  difficulty,
  question_text,
  passage,
  code,
  formula,
  table_data,
  diagram_data,
  structured_data,
  image_url,
  metadata,
  estimated_time_seconds,
  source_type,
  verification_status,
  publication_status,
  version,
  published_at,
  created_at,
  updated_at
) on public.questions to anon, authenticated;

-- Practice attempts use a stable system test while their selected questions are
-- persisted as user responses. This keeps practice activity compatible with
-- the existing analytics and result schema.
insert into public.tests (
  id,
  title,
  description,
  test_type,
  duration_seconds,
  instructions,
  is_premium,
  is_published,
  randomize_questions,
  randomize_options
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Focused Practice',
  'Configurable topic and difficulty practice session.',
  'sectional',
  3600,
  'Answer each question and review the immediate explanation.',
  false,
  true,
  true,
  false
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  is_published = true,
  updated_at = timezone('utc', now());
