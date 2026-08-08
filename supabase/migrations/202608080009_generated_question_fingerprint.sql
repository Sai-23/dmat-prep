create unique index if not exists idx_questions_generated_fingerprint_unique
  on public.questions ((metadata -> 'generation' ->> 'fingerprint'))
  where source_type = 'generated'
    and metadata -> 'generation' ->> 'fingerprint' is not null;

