-- Q7: privacy-conscious empirical calibration over immutable attempt snapshots.
create index if not exists idx_user_responses_analytics
  on public.user_responses(question_id, response_status, answered_at);
create index if not exists idx_test_attempts_analytics
  on public.test_attempts(status, started_at, test_id);

create or replace view public.admin_response_analytics
with (security_invoker = false)
as
select
  md5('dmat-research-v1:' || a.user_id::text) as participant_id,
  a.id as attempt_id,
  r.question_id,
  i.question_type::text as question_type,
  nullif(i.public_snapshot->>'subtopic', '') as question_family,
  i.generator_version,
  i.validator_version,
  nullif(i.private_snapshot->'provenance'->>'requestedDifficulty', '') as requested_difficulty,
  coalesce(nullif(i.private_snapshot->'provenance'->>'calculatedDifficulty', ''), nullif(i.public_snapshot->>'difficulty', '')) as calculated_difficulty,
  case
    when r.response_status <> 'answered' then 'unanswered'
    when r.is_correct then 'correct'
    else 'incorrect'
  end as outcome,
  r.time_spent_seconds as response_time_seconds,
  case when a.test_id = '00000000-0000-4000-8000-000000000001'::uuid then 'practice' else 'mock' end as attempt_context,
  a.started_at as attempted_at,
  (select count(*)::integer from public.question_reports qr where qr.attempt_id = a.id and qr.question_id = r.question_id) as report_count
from public.user_responses r
join public.test_attempts a on a.id = r.attempt_id
join public.practice_attempt_items i on i.attempt_id = r.attempt_id and i.source_question_id = r.question_id
where a.status in ('submitted', 'auto_submitted');

revoke all on public.admin_response_analytics from anon, authenticated;
