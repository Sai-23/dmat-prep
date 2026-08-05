create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('student', 'reviewer', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'question_module') then
    create type public.question_module as enum ('core', 'computer_science');
  end if;

  if not exists (select 1 from pg_type where typname = 'question_type') then
    create type public.question_type as enum (
      'figure_sequence',
      'mathematical_equation',
      'latin_square',
      'computer_science'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'question_difficulty') then
    create type public.question_difficulty as enum ('easy', 'medium', 'hard');
  end if;

  if not exists (select 1 from pg_type where typname = 'question_source_type') then
    create type public.question_source_type as enum ('manual', 'generated', 'imported');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum (
      'draft',
      'under_review',
      'approved',
      'rejected'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'publication_status') then
    create type public.publication_status as enum (
      'draft',
      'published',
      'flagged',
      'retired'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'test_type') then
    create type public.test_type as enum (
      'diagnostic',
      'mini_mock',
      'full_mock',
      'sectional'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'test_attempt_status') then
    create type public.test_attempt_status as enum (
      'in_progress',
      'submitted',
      'auto_submitted',
      'abandoned'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'response_status') then
    create type public.response_status as enum ('unanswered', 'answered', 'skipped');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_reason') then
    create type public.report_reason as enum (
      'incorrect_answer',
      'ambiguous_wording',
      'missing_information',
      'formatting_problem',
      'unclear_explanation',
      'technical_issue'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('open', 'under_review', 'resolved', 'dismissed');
  end if;

  if not exists (select 1 from pg_type where typname = 'study_plan_status') then
    create type public.study_plan_status as enum ('draft', 'active', 'completed', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'study_task_status') then
    create type public.study_task_status as enum (
      'pending',
      'in_progress',
      'completed',
      'skipped'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'review_decision') then
    create type public.review_decision as enum (
      'approved',
      'rejected',
      'changes_requested'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'expired'
    );
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
