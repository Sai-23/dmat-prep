create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_questions_module_type on public.questions (module, question_type);
create index if not exists idx_questions_topic on public.questions (topic, subtopic);
create index if not exists idx_questions_publication on public.questions (publication_status, verification_status);
create index if not exists idx_question_options_question_id on public.question_options (question_id);
create index if not exists idx_question_versions_question_id on public.question_versions (question_id);
create index if not exists idx_test_sections_test_id on public.test_sections (test_id);
create index if not exists idx_test_questions_section_id on public.test_questions (test_section_id);
create index if not exists idx_test_questions_question_id on public.test_questions (question_id);
create index if not exists idx_test_attempts_user_id on public.test_attempts (user_id, status);
create index if not exists idx_user_responses_attempt_id on public.user_responses (attempt_id);
create index if not exists idx_bookmarks_user_id on public.bookmarks (user_id);
create index if not exists idx_question_reports_question_id on public.question_reports (question_id, status);
create index if not exists idx_question_reports_reporter_id on public.question_reports (reporter_id);
create index if not exists idx_user_topic_performance_user_id on public.user_topic_performance (user_id, module, topic);
create index if not exists idx_study_plans_user_id on public.study_plans (user_id, plan_date);
create index if not exists idx_study_tasks_plan_id on public.study_tasks (study_plan_id, status);
create index if not exists idx_question_reviews_question_id on public.question_reviews (question_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions (user_id, status);
create index if not exists idx_audit_logs_actor_id on public.audit_logs (actor_id, created_at desc);

grant usage on schema public to anon, authenticated;
grant all privileges on all tables in schema public to authenticated;
grant select on public.questions, public.question_options, public.tests, public.test_sections, public.test_questions to anon;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_versions enable row level security;
alter table public.tests enable row level security;
alter table public.test_sections enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.user_responses enable row level security;
alter table public.bookmarks enable row level security;
alter table public.question_reports enable row level security;
alter table public.user_topic_performance enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_tasks enable row level security;
alter table public.question_reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
  on public.profiles
  for select
  using (auth.uid() = id or public.current_user_has_role('admin'));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert
  on public.profiles
  for insert
  with check (auth.uid() = id or public.current_user_has_role('admin'));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
  on public.profiles
  for update
  using (auth.uid() = id or public.current_user_has_role('admin'))
  with check (auth.uid() = id or public.current_user_has_role('admin'));

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select
  on public.user_roles
  for select
  using (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists user_roles_insert on public.user_roles;
create policy user_roles_insert
  on public.user_roles
  for insert
  with check (public.current_user_has_role('admin'));

drop policy if exists user_roles_update on public.user_roles;
create policy user_roles_update
  on public.user_roles
  for update
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));

drop policy if exists user_roles_delete on public.user_roles;
create policy user_roles_delete
  on public.user_roles
  for delete
  using (public.current_user_has_role('admin'));

drop policy if exists questions_select on public.questions;
create policy questions_select
  on public.questions
  for select
  using (
    (publication_status = 'published' and verification_status = 'approved')
    or public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])
  );

drop policy if exists questions_insert on public.questions;
create policy questions_insert
  on public.questions
  for insert
  with check (public.current_user_has_role('admin'));

drop policy if exists questions_update on public.questions;
create policy questions_update
  on public.questions
  for update
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));

drop policy if exists questions_delete on public.questions;
create policy questions_delete
  on public.questions
  for delete
  using (public.current_user_has_role('admin'));

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
          (questions.publication_status = 'published' and questions.verification_status = 'approved')
          or public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])
        )
    )
  );

drop policy if exists question_options_insert on public.question_options;
create policy question_options_insert
  on public.question_options
  for insert
  with check (public.current_user_has_role('admin'));

drop policy if exists question_options_update on public.question_options;
create policy question_options_update
  on public.question_options
  for update
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));

drop policy if exists question_options_delete on public.question_options;
create policy question_options_delete
  on public.question_options
  for delete
  using (public.current_user_has_role('admin'));

drop policy if exists question_versions_select on public.question_versions;
create policy question_versions_select
  on public.question_versions
  for select
  using (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));

drop policy if exists question_versions_insert on public.question_versions;
create policy question_versions_insert
  on public.question_versions
  for insert
  with check (public.current_user_has_role('admin'));

drop policy if exists tests_select on public.tests;
create policy tests_select
  on public.tests
  for select
  using (is_published or public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));

drop policy if exists tests_insert on public.tests;
create policy tests_insert
  on public.tests
  for insert
  with check (public.current_user_has_role('admin'));

drop policy if exists tests_update on public.tests;
create policy tests_update
  on public.tests
  for update
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));

drop policy if exists tests_delete on public.tests;
create policy tests_delete
  on public.tests
  for delete
  using (public.current_user_has_role('admin'));

drop policy if exists test_sections_select on public.test_sections;
create policy test_sections_select
  on public.test_sections
  for select
  using (
    exists (
      select 1
      from public.tests
      where tests.id = test_sections.test_id
        and (tests.is_published or public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]))
    )
  );

drop policy if exists test_sections_modify on public.test_sections;
create policy test_sections_modify
  on public.test_sections
  for all
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));

drop policy if exists test_questions_select on public.test_questions;
create policy test_questions_select
  on public.test_questions
  for select
  using (
    exists (
      select 1
      from public.test_sections
      join public.tests on tests.id = test_sections.test_id
      where test_sections.id = test_questions.test_section_id
        and (tests.is_published or public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]))
    )
  );

drop policy if exists test_questions_modify on public.test_questions;
create policy test_questions_modify
  on public.test_questions
  for all
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));

drop policy if exists test_attempts_select on public.test_attempts;
create policy test_attempts_select
  on public.test_attempts
  for select
  using (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists test_attempts_insert on public.test_attempts;
create policy test_attempts_insert
  on public.test_attempts
  for insert
  with check (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists test_attempts_update on public.test_attempts;
create policy test_attempts_update
  on public.test_attempts
  for update
  using (auth.uid() = user_id or public.current_user_has_role('admin'))
  with check (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists user_responses_select on public.user_responses;
create policy user_responses_select
  on public.user_responses
  for select
  using (
    exists (
      select 1
      from public.test_attempts
      where test_attempts.id = user_responses.attempt_id
        and (test_attempts.user_id = auth.uid() or public.current_user_has_role('admin'))
    )
  );

drop policy if exists user_responses_insert on public.user_responses;
create policy user_responses_insert
  on public.user_responses
  for insert
  with check (
    exists (
      select 1
      from public.test_attempts
      where test_attempts.id = user_responses.attempt_id
        and (test_attempts.user_id = auth.uid() or public.current_user_has_role('admin'))
    )
  );

drop policy if exists user_responses_update on public.user_responses;
create policy user_responses_update
  on public.user_responses
  for update
  using (
    exists (
      select 1
      from public.test_attempts
      where test_attempts.id = user_responses.attempt_id
        and (test_attempts.user_id = auth.uid() or public.current_user_has_role('admin'))
    )
  )
  with check (
    exists (
      select 1
      from public.test_attempts
      where test_attempts.id = user_responses.attempt_id
        and (test_attempts.user_id = auth.uid() or public.current_user_has_role('admin'))
    )
  );

drop policy if exists bookmarks_access on public.bookmarks;
create policy bookmarks_access
  on public.bookmarks
  for all
  using (auth.uid() = user_id or public.current_user_has_role('admin'))
  with check (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists question_reports_select on public.question_reports;
create policy question_reports_select
  on public.question_reports
  for select
  using (
    auth.uid() = reporter_id
    or public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])
  );

drop policy if exists question_reports_insert on public.question_reports;
create policy question_reports_insert
  on public.question_reports
  for insert
  with check (auth.uid() = reporter_id);

drop policy if exists question_reports_update on public.question_reports;
create policy question_reports_update
  on public.question_reports
  for update
  using (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]))
  with check (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));

drop policy if exists user_topic_performance_access on public.user_topic_performance;
create policy user_topic_performance_access
  on public.user_topic_performance
  for all
  using (auth.uid() = user_id or public.current_user_has_role('admin'))
  with check (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists study_plans_access on public.study_plans;
create policy study_plans_access
  on public.study_plans
  for all
  using (auth.uid() = user_id or public.current_user_has_role('admin'))
  with check (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists study_tasks_select on public.study_tasks;
create policy study_tasks_select
  on public.study_tasks
  for select
  using (
    exists (
      select 1
      from public.study_plans
      where study_plans.id = study_tasks.study_plan_id
        and (study_plans.user_id = auth.uid() or public.current_user_has_role('admin'))
    )
  );

drop policy if exists study_tasks_modify on public.study_tasks;
create policy study_tasks_modify
  on public.study_tasks
  for all
  using (
    exists (
      select 1
      from public.study_plans
      where study_plans.id = study_tasks.study_plan_id
        and (study_plans.user_id = auth.uid() or public.current_user_has_role('admin'))
    )
  )
  with check (
    exists (
      select 1
      from public.study_plans
      where study_plans.id = study_tasks.study_plan_id
        and (study_plans.user_id = auth.uid() or public.current_user_has_role('admin'))
    )
  );

drop policy if exists question_reviews_select on public.question_reviews;
create policy question_reviews_select
  on public.question_reviews
  for select
  using (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));

drop policy if exists question_reviews_modify on public.question_reviews;
create policy question_reviews_modify
  on public.question_reviews
  for all
  using (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]))
  with check (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));

drop policy if exists subscriptions_access on public.subscriptions;
create policy subscriptions_access
  on public.subscriptions
  for all
  using (auth.uid() = user_id or public.current_user_has_role('admin'))
  with check (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select
  on public.audit_logs
  for select
  using (public.current_user_has_role('admin'));

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert
  on public.audit_logs
  for insert
  with check (public.current_user_has_role('admin'));
