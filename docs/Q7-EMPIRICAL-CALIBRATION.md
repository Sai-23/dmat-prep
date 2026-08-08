# Q7 Empirical Difficulty Calibration

## Interpretation

Generator difficulty and observed difficulty are separate concepts. Generator `requestedDifficulty` and `calculatedDifficulty` remain immutable provenance. Accuracy, response time, unanswered rate, and report rate are observed operational measures; they are not validated psychometric scores.

Item flags are review signals only. They do not edit, retire, delete, or reclassify a question. The default minimum sample is 20 analyzable responses and is configured in `src/lib/analytics/calibration.ts`.

## Privacy and research export

The admin-only CSV and JSONL exports contain a deterministic pseudonymous participant ID, attempt and question identifiers, generator/validator versions, both difficulty fields, outcome, response time, context, and timestamp.

Exports deliberately exclude names, email addresses, authentication data, answer payloads, correct answers, seeds, and fingerprints. The latter two remain in protected attempt snapshots for internal reproducibility but are withheld from routine export to reduce live-bank exposure.

## Operations

Apply `supabase/migrations/202608080013_empirical_calibration.sql`, then open `/admin/analytics`. The view includes completed practice and mock attempts only. Heavy research analysis should operate on an export or offline database copy rather than repeatedly scanning production.
