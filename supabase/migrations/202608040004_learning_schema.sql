create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, question_id)
);

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_topic_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module public.question_module not null,
  topic text not null,
  subtopic text not null default '',
  attempts_count integer not null default 0 check (attempts_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  unanswered_count integer not null default 0 check (unanswered_count >= 0),
  average_response_time_seconds numeric(8,2),
  accuracy numeric(5,2),
  last_practiced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, module, topic, subtopic)
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  status public.study_plan_status not null default 'draft',
  recommendation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, plan_date)
);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null references public.study_plans (id) on delete cascade,
  title text not null,
  description text,
  task_type text not null,
  module public.question_module,
  topic text,
  difficulty public.question_difficulty,
  target_count integer,
  status public.study_task_status not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 1 check (sort_order > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.question_reviews (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  decision public.review_decision not null,
  comments text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'manual',
  plan_code text not null,
  status public.subscription_status not null default 'trialing',
  external_customer_id text,
  external_subscription_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger set_bookmarks_updated_at
  before update on public.bookmarks
  for each row execute procedure public.set_updated_at();

create trigger set_question_reports_updated_at
  before update on public.question_reports
  for each row execute procedure public.set_updated_at();

create trigger set_user_topic_performance_updated_at
  before update on public.user_topic_performance
  for each row execute procedure public.set_updated_at();

create trigger set_study_plans_updated_at
  before update on public.study_plans
  for each row execute procedure public.set_updated_at();

create trigger set_study_tasks_updated_at
  before update on public.study_tasks
  for each row execute procedure public.set_updated_at();

create trigger set_question_reviews_updated_at
  before update on public.question_reviews
  for each row execute procedure public.set_updated_at();

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();
