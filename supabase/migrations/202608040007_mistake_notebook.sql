create table if not exists public.mistake_notebook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 2000),
  is_understood boolean not null default false,
  understood_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, question_id)
);

create index if not exists idx_mistake_notebook_user_id
  on public.mistake_notebook_entries (user_id, is_understood, updated_at desc);

drop trigger if exists set_mistake_notebook_entries_updated_at
  on public.mistake_notebook_entries;
create trigger set_mistake_notebook_entries_updated_at
  before update on public.mistake_notebook_entries
  for each row execute procedure public.set_updated_at();

grant all privileges on public.mistake_notebook_entries to authenticated;

alter table public.mistake_notebook_entries enable row level security;

drop policy if exists mistake_notebook_access
  on public.mistake_notebook_entries;
create policy mistake_notebook_access
  on public.mistake_notebook_entries
  for all
  using (auth.uid() = user_id or public.current_user_has_role('admin'))
  with check (auth.uid() = user_id or public.current_user_has_role('admin'));
