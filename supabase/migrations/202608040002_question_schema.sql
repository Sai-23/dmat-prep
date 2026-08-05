create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  full_name text,
  avatar_path text,
  target_exam_date date,
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  module public.question_module not null,
  question_type public.question_type not null,
  subject text,
  topic text not null,
  subtopic text,
  difficulty public.question_difficulty not null,
  question_text text not null,
  passage text,
  code text,
  formula text,
  table_data jsonb,
  diagram_data jsonb,
  structured_data jsonb not null default '{}'::jsonb,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  correct_option_id uuid,
  explanation text not null,
  estimated_time_seconds integer not null check (estimated_time_seconds > 0),
  source_type public.question_source_type not null default 'manual',
  verification_status public.verification_status not null default 'draft',
  publication_status public.publication_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null check (sort_order between 1 and 4),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (question_id, sort_order),
  unique (question_id, label)
);

alter table public.questions
  add constraint questions_correct_option_fk
  foreign key (correct_option_id) references public.question_options (id)
  on delete set null;

create table if not exists public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  change_summary text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (question_id, version)
);

create or replace function public.current_user_has_role(target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = target_role
  );
$$;

create or replace function public.current_user_has_any_role(target_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = any (target_roles)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_user_roles_updated_at
  before update on public.user_roles
  for each row execute procedure public.set_updated_at();

create trigger set_questions_updated_at
  before update on public.questions
  for each row execute procedure public.set_updated_at();

create trigger set_question_options_updated_at
  before update on public.question_options
  for each row execute procedure public.set_updated_at();
