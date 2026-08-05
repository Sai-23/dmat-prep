create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  test_type public.test_type not null,
  module public.question_module,
  duration_seconds integer not null check (duration_seconds > 0),
  instructions text,
  is_premium boolean not null default false,
  is_published boolean not null default false,
  randomize_questions boolean not null default false,
  randomize_options boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  title text not null,
  section_type text not null,
  module public.question_module,
  duration_seconds integer not null check (duration_seconds > 0),
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (test_id, sort_order)
);

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_section_id uuid not null references public.test_sections (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (test_section_id, sort_order),
  unique (test_section_id, question_id)
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.test_attempt_status not null default 'in_progress',
  started_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  expires_at timestamptz,
  total_time_seconds integer not null default 0 check (total_time_seconds >= 0),
  score numeric(6,2),
  accuracy numeric(5,2),
  randomization_seed text,
  last_activity_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  selected_option_id uuid references public.question_options (id) on delete set null,
  is_correct boolean,
  is_marked_for_review boolean not null default false,
  response_status public.response_status not null default 'unanswered',
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  shown_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (attempt_id, question_id)
);

create trigger set_tests_updated_at
  before update on public.tests
  for each row execute procedure public.set_updated_at();

create trigger set_test_sections_updated_at
  before update on public.test_sections
  for each row execute procedure public.set_updated_at();

create trigger set_test_questions_updated_at
  before update on public.test_questions
  for each row execute procedure public.set_updated_at();

create trigger set_test_attempts_updated_at
  before update on public.test_attempts
  for each row execute procedure public.set_updated_at();

create trigger set_user_responses_updated_at
  before update on public.user_responses
  for each row execute procedure public.set_updated_at();
