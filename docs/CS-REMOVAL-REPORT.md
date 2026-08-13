# Computer Science Removal Report

Date: 2026-08-09

The live product and generation surface is now Core-only: Figure Sequences, Mathematical Equations, and Latin Squares. This was a surgical removal; shared authentication, Supabase, analytics, practice, mock delivery, results, design-system, theme, security, and persistence infrastructure was preserved.

## 1. CS-specific files deleted

- The complete `src/lib/generation/computer-science/` tree, including Boolean logic, combinational circuits, programming, recursion, OOP, testlet planning, validation, fingerprints, diversity checks, hybrid presentation, benchmarks, and their tests.
- `src/components/questions/computer-science-renderer.tsx` and its test.
- `scripts/run-q6-computer-science-stress.mjs`.
- `docs/CS3-HYBRID-GENERATION-REPORT.md`.
- Tracked CS reports under `reports/cs35/`, `reports/cs37/`, and `reports/q6/`.
- Untracked generated artifacts under `reports/cs38/`, `reports/cs39/`, and CS PDF scratch directories.

## 2. Shared files modified

- Product copy, exam-format pages, README, and planning documents now describe only the three Core question types.
- Practice schemas, selection UI, grading, snapshots, results, bookmarks, dashboard queries, and filters were narrowed to Core.
- Admin authoring, generation, review, publishing, question-bank, and test-builder surfaces were narrowed to Core.
- Mock specifications and catalog/assembly guards now accept only Core section types.
- Shared generation exports, fidelity types, and the Q1 integrity audit were narrowed to the three Core generators.
- Generic empirical-calibration analytics and their migration were explicitly preserved/restored.

## 3. Routes removed

There were no standalone CS route files. The CS generation/save server actions and all imports that made them callable were removed. The production route manifest contains no CS, testlet, provider-health, critic, or AI-generation endpoint; deleted endpoints therefore resolve through normal Next.js not-found behavior.

## 4. Types removed

- Removed `computer_science` from live module and question-type unions.
- Removed `subject_answers` from practice answer unions and schemas.
- Removed CS generator, subject-testlet, stimulus, family, provider, critic, validation, fingerprint, and response types with the deleted generator tree.
- Removed CS section types from live mock/admin types.

## 5. Scripts removed

- Removed `audit:q6` and the CS 3.5/3.7/3.8/3.9 benchmark commands from `package.json`.
- Removed the Q6 CS stress runner and all CS-only benchmark test runners.
- Preserved generic lint, typecheck, test, build, Core stress, Q1 integrity, and Q2 fidelity scripts.

## 6. Provider/AI code removed

Removed the CS-only provider abstraction and adapters, AI presentation service, critic service, structured-output schemas, routing/fallback logic, health/circuit-breaker/runtime-safety code, and provider benchmark tooling. No provider SDK dependency existed in `package.json`.

## 7. Environment-variable references removed

Removed application/example references for `AI_GENERATOR_PROVIDER`, `AI_GENERATOR_MODEL`, `AI_CRITIC_PROVIDER`, `AI_CRITIC_MODEL`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, and the CS-only use of `OPENAI_API_KEY`. `.env.local` was neither printed nor modified; unused local secrets can be removed manually.

## 8. Dependencies removed

No package was removed. The repository had no provider-specific SDK dependency. `zod` and `server-only` remain because they are used broadly by Core and shared server code.

## 9. Database structures intentionally retained

The historical `question_module` and `question_type` enum values named `computer_science` remain in `supabase/migrations/202608040001_foundation.sql`, and the generated database type mirrors the dormant schema in `src/types/database.ts`. Historical migrations were not rewritten and stored production data was not destroyed. Current application/admin/student queries exclude dormant CS rows.

## 10. Database structures removed via new migration

None. No table or column was proven to be exclusively CS-specific, so no destructive cleanup migration was added.

## 11. Core functionality verified

- Figure Sequences retain accent-only pre-submit selection, post-submit red/green state, visual options, and visual feedback.
- Mathematical Equations retain spinner-free numeric inputs, leading-zero normalization, the 1–20 integer domain, and human-readable per-variable feedback without raw JSON.
- Latin Squares retain the single compact A–E selector without a duplicate generic MCQ interface.
- Practice keeps Core selection, timing, persistence, immediate feedback, and immutable snapshots.
- Mock delivery keeps preassembly, immutable attempts, server-authoritative section timing, refresh-safe persistence, hidden active-test correctness, and stable historical summaries. Legacy CS detail rows are hidden rather than deleted.
- Generic empirical analytics, authentication, Supabase, admin authorization, theme, and shared UI remain present.

## 12. Tests run

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed: 43 files, 175 active tests; 3 opt-in stress/sampler files skipped as designed.
- `npm run audit:q1` — passed: 9 Core integrity stress tests over 90,000 accepted seeded generations. The regenerated Q1 artifacts contain only the three Core generators.

## 13. Build result

`npm run build` passed with Next.js 16.3.0. TypeScript, page-data collection, and all 27 static-page generation steps completed successfully. The route manifest contains only general/Core product routes.

## 14. Remaining dormant CS references

Only these intentional references remain:

- The two historical enum declarations in `supabase/migrations/202608040001_foundation.sql`.
- The matching generated database union in `src/types/database.ts`.
- `docs/PARTNER-CODEBASE-AUDIT.md`, explicitly labelled as a historical pre-removal audit.

A repository-wide search found no other CS, subject-testlet, provider, critic, benchmark, or provider-key references.

## 15. Risks and follow-up cleanup

- Existing CS database rows remain recoverable but invisible to current product queries. A future data-retention decision can archive or delete them separately with production backups and explicit authorization.
- The dormant PostgreSQL enum values cannot be safely removed by rewriting migration history; a future schema migration can rebuild those enums only if production data has first been audited.
- Unused provider secrets may still exist in the user's local `.env.local`; they were intentionally left untouched.
- Reintroducing a subject module later should be implemented as a new isolated feature and must not widen the Core unions or delivery paths accidentally.

## ADMIN CLEANUP

- **Admin pages removed:** no standalone CS Admin page existed. The shared generator, authoring, review, analytics, dashboard, and test-management pages were narrowed to Core rather than deleted.
- **Admin components removed:** the CS testlet renderer/preview and every CS branch in the shared generator, question form, response preview, review queue, and test builder were removed. No empty or disabled CS component remains.
- **Navigation removed:** Admin navigation contains only the dashboard, Core generation/renderer/authoring, Core test builder, and generic review queue. There is no CS, testlet, AI, provider, critic, or benchmark navigation item.
- **Dashboard cards removed:** no CS/provider/critic card remains. Dashboard question counts are restricted to Core, published-test counts accept only Core section types, and open-report counts join to Core questions.
- **Admin routes removed:** no CS-specific route tree exists under `src/app/admin`. Regression coverage asserts that retired `computer-science`, `cs`, `ai`, and `testlets` route directories remain absent, giving normal not-found behavior.
- **Admin APIs/server actions removed:** CS generation/save, subject-testlet, AI-presentation, critic, provider-health, benchmark, and diversity actions were deleted. Shared Core lifecycle actions reject dormant non-Core question IDs, and test lifecycle actions reject legacy non-Core section structures.
- **CS analytics removed:** empirical calibration queries now explicitly allow only the three live Core question types. Generic calibration, CSV/JSONL export, response timing, difficulty, reports, and review flags remain available.
- **CS filters removed:** question-bank, review, authoring, generation, and test-builder selectors expose only Figure Sequences, Mathematical Equations, and Latin Squares. Dormant rows are filtered at the database-query boundary.
- **AI/provider UI removed:** no provider/model selection, health, fallback, rate, cost, latency, or comparison UI remains.
- **Critic/review UI removed:** no AI critic decision, reason-code, failure queue, regeneration, or human-review testlet UI remains. Generic human question review and publication controls are preserved.
- **Admin tests removed/updated:** CS-only tests were deleted. `admin-surface.test.ts` now checks forbidden Admin UI copy, the exact Core selector values, retired route absence, authoring-boundary rejection, and unchanged reviewer/Admin permission boundaries. Navigation and shared schema/policy tests were updated for Core.
- **Shared Admin functionality preserved:** deterministic generation and preview for all three Core types, manual authoring/editing, versioning, review, publishing, test assembly, immutable attempts, generic calibration analytics/export, reports, role checks, and audit logs remain active.
- **Dormant database structures:** historical enum values and stored CS rows remain `DORMANT — APPLICATION ACCESS REMOVED`; no destructive migration or production-data deletion was performed.
- **Final Admin verification:** focused Admin regression tests, full lint, TypeScript, full test suite, and production build pass. Repository searches show no CS/provider/testlet implementation in Admin; remaining CS text is limited to regression assertions, this report, the labelled historical audit, and dormant schema declarations.
