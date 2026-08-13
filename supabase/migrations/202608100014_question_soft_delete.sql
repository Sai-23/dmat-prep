alter table public.questions
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists idx_questions_active_publication
  on public.questions (module, question_type, publication_status, verification_status)
  where deleted_at is null;

drop policy if exists questions_select on public.questions;
create policy questions_select
  on public.questions
  for select
  using (
    (
      deleted_at is null
      and publication_status = 'published'
      and verification_status = 'approved'
    )
    or public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])
  );

drop policy if exists question_options_select on public.question_options;
create policy question_options_select
  on public.question_options
  for select
  using (
    exists (
      select 1
      from public.questions
      where questions.id = question_options.question_id
        and (
          (
            questions.deleted_at is null
            and questions.publication_status = 'published'
            and questions.verification_status = 'approved'
          )
          or public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])
        )
    )
  );

-- Application deletes are soft deletes performed by a server-side service-role
-- client. Removing this policy prevents even an authenticated admin browser
-- session from physically deleting a question and its historical references.
drop policy if exists questions_delete on public.questions;
