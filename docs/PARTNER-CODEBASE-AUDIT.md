# Partner Codebase Audit

Audit date: 2026-08-08

Scope: the tracked repository at `E:\D\Projects\dMat_Prep`, inspected from source without changing application code or data. Ignored build products and dependencies were excluded from the inventory. The local `.env.local` was deliberately not read or reproduced.

## 1. Repo inventory

### Applications, packages, and services

There is one application package, not a monorepo:

| Item | What exists | Evidence |
| --- | --- | --- |
| Web application | One private npm package named `dmat-prep-web`; there are no npm workspaces or other package manifests. | `package.json`, `package-lock.json` |
| Database/auth service definition | Supabase configuration plus eight ordered PostgreSQL migrations. This is not a separately packaged local service. | `supabase/config.toml`, `supabase/migrations/*.sql` |
| Planning documents | Three original planning documents, stored under the IDE-specific `.trae` directory rather than `docs`. | `.trae/documents/dmat-prep-phase-1-plan.md`, `.trae/documents/dmat-prep-prd.md`, `.trae/documents/dmat-prep-technical-architecture.md` |

There is no Dockerfile, Compose file, Python/Rust/Go project, worker, queue consumer, separate API package, or infrastructure-as-code project in the tracked tree. `vercel.json` is the only hosting-specific file.

### Top-level tree

- `src/app`: Next.js App Router pages, one route handler, server actions, global styles, loading/error/not-found boundaries.
- `src/components`: client and server UI components for authentication, navigation, practice, tests, results, learning tools, administration, theme controls, and local shadcn-style primitives.
- `src/lib`: server-side data access and business rules grouped by `admin`, `auth`, `dashboard`, `learning`, `practice`, `results`, `supabase`, and `tests`; Zod schemas; pure helpers.
- `src/types`: hand-written auth, question, test, analytics, and partial Supabase database types.
- `supabase`: local Supabase ports/configuration and the complete SQL migration history.
- `public`: only the default Next/Vercel SVG assets (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`); application question assets are not stored here.
- `.trae/documents`: product, architecture, and Phase 1 planning documents.
- Root configuration: `.env.example`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `components.json`, `eslint.config.mjs`, `next.config.ts`, `package.json`, `package-lock.json`, `postcss.config.mjs`, `tsconfig.json`, and `vercel.json`.

The tracked-file inventory comes from Git and therefore respects `.gitignore`. Ignored local items present during the audit included `node_modules`, `.next`, `.env.local`, and TypeScript build information; their contents are not part of this source inventory. See `.gitignore`.

### Package manager, languages, and frameworks

- Package manager: npm, established by `package-lock.json` and npm scripts. There is no `packageManager` field or Node engine constraint in `package.json`.
- Application languages: TypeScript/TSX, CSS, SQL, and small JavaScript/MJS/TOML/JSON configuration files. There is no second application language runtime.
- Framework/runtime: Next.js 16.3.0 App Router with React/React DOM 19.2.8 (`package.json`, `next.config.ts`). All built routes are dynamically server-rendered because the root layout reads session/profile theme state (`src/app/layout.tsx`).
- Styling/UI: Tailwind CSS 4 through `@tailwindcss/postcss`, local shadcn-style primitives configured in `components.json`, Radix Slot, Lucide icons, Inter and JetBrains Mono fonts, and CSS variables in `src/app/globals.css`.
- Data/auth: Supabase JS 2.49.1 and `@supabase/ssr` (`src/lib/supabase/*`).
- Validation/testing: Zod 4, Vitest 3, ESLint 9, and TypeScript strict mode (`src/lib/**/schemas.ts`, `package.json`, `tsconfig.json`).
- Theme: `next-themes`, with optional authenticated persistence to `profiles.theme_preference` (`src/components/providers/theme-provider.tsx`, `src/app/auth/actions.ts`).
- Installed but not used by application TypeScript: React Hook Form, `@hookform/resolvers`, and Recharts. Recharts class names only appear in CSS; forms use native form elements/server actions (`package.json`, `src/app/globals.css`).

## 2. Entry points and run instructions

### Actual commands

The executable entry points are the scripts in `package.json`:

| Command | Actual behavior |
| --- | --- |
| `npm install` | Installs the locked npm dependency graph. |
| `npm run dev` | Runs `next dev` on the normal Next.js development port. |
| `npm run build` | Builds the production Next.js application. |
| `npm start` | Runs `next start`; it requires a prior successful build. |
| `npm run lint` | Runs `eslint .`. |
| `npm run typecheck` | Runs `tsc --noEmit`. |
| `npm test` | Runs the Vitest suite once. |
| `npm run check` | Runs lint, type-check, tests, and production build in sequence. |

There is no Docker or Compose entry point and no npm script that starts Supabase or applies migrations. `vercel.json` contains only a same-path `/api/:path*` rewrite; it does not create an API service or a deployment command.

### Environment and external services

`src/lib/validators/env-schema.ts` declares:

- `NEXT_PUBLIC_APP_URL`: required URL; used as the metadata base and to construct email-confirmation/password-reset callbacks.
- `NEXT_PUBLIC_SUPABASE_URL`: required URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: required non-empty string; exposed by design to browser/session clients.
- `SUPABASE_SERVICE_ROLE_KEY`: typed as optional, but operationally required by practice, tests, results, bookmarks/mistakes, question administration, test administration, and premium checks because those modules call `createSupabaseAdminClient` (`src/lib/supabase/admin.ts`, `src/lib/{practice,tests,results,learning,admin}/*.ts`). In practice the site is only partly usable without it.

The only external platform is Supabase:

- Supabase Auth supplies email/password login, email confirmation, password reset, sessions, and the `auth.users` records (`src/app/auth/actions.ts`, `src/app/auth/callback/route.ts`).
- Supabase PostgreSQL supplies every product record. Local settings expect PostgreSQL 17 and default Supabase API/database/Studio ports 54321/54322/54323 (`supabase/config.toml`).
- Supabase Storage is enabled in config but no application code calls a storage API. Question images are arbitrary URL strings and are opened as external links (`src/components/practice/practice-experience.tsx`).
- No Redis, payment API, email API outside Supabase Auth, analytics service, or question-generation API is referenced.

### Required local setup not fully documented

`README.md` documents npm installation, development, verification, environment names, and the migration filenames, but does not provide a command or mechanism to apply those migrations. A working environment must separately do all of the following:

1. Create/use a Supabase project or install/use the Supabase CLI for `supabase/config.toml`, then apply all eight migrations in filename order. The application does not run migrations itself (`supabase/migrations/*.sql`).
2. Configure Supabase Auth site/redirect URLs to match `NEXT_PUBLIC_APP_URL`. The committed local Supabase config permits `http://localhost:3000` and `http://127.0.0.1:3000`, but a hosted project must be configured externally (`supabase/config.toml`, `src/app/auth/actions.ts`).
3. Seed actual approved/published questions. The only seeded content is an internal "Focused Practice" test with fixed UUID `00000000-0000-4000-8000-000000000001`; there are no seed questions or student-facing mocks (`supabase/migrations/202608040006_practice_security.sql`).
4. Assign the first admin and any reviewer role outside this UI. Registration always creates only the `student` role through `handle_new_user`; there is no role-management screen or bootstrap script (`supabase/migrations/202608040002_question_schema.sql`, `src/app/register/page.tsx`).
5. Create subscription records externally if premium tests are to be accessible. There is no checkout, webhook, or subscription administration flow (`src/lib/tests/data.ts`, `supabase/migrations/202608040004_learning_schema.sql`).

The audit machine used Node v20.16.0 and npm 10.8.1 successfully, but those versions are not pinned in the repository.

## 3. Architecture map

### Request and data flow

The actual dominant flow is:

`App Router page/client component -> server action -> Zod input schema -> auth/role guard -> src/lib domain/data function -> Supabase`

- `src/proxy.ts` refreshes Supabase sessions and redirects unauthenticated student routes to `/login`. `/admin` and `/admin/review` admit reviewers/admins; `/admin/questions*` and `/admin/tests*` admit admins only. Pages and mutations repeat the authorization check with `requireUser`/`requireRole`, so proxy redirects are not the only protection (`src/lib/auth/guards.ts`).
- Server components render catalogs, dashboards, results, and administration pages. Client components own temporary interaction state for practice, the timed test runner, result filters, bookmarks/mistakes, and admin forms (`src/app/**/page.tsx`, `src/components/**`).
- Auth, header/profile reads, dashboard reads, and theme persistence use a cookie-aware typed Supabase server client and therefore RLS (`src/lib/supabase/server.ts`).
- Almost all domain modules instantiate the untyped service-role client, which bypasses RLS (`src/lib/supabase/admin.ts`). Those calls rely on the preceding server-action/page guard and explicit `userId` ownership checks.
- A browser Supabase client factory exists but is never imported elsewhere, so interactive data changes currently go through server actions rather than direct browser queries (`src/lib/supabase/client.ts`).

### Modules and where logic lives

| Module | Actual responsibility | Logic vs. scaffolding |
| --- | --- | --- |
| `src/app/auth`, `src/lib/auth` | Registration, login/logout, confirmation callback, password reset, safe redirects, role checks, display-name resolution. | Implemented. Role assignment/invitation is external. |
| `src/lib/practice`, `src/components/practice` | Filters approved/published questions, starts an attempt under the internal practice test, gives immediate grading/explanations, and aggregates topic performance. | Implemented, but active practice cannot be restored after refresh and timeout submission exists only in the open browser. |
| `src/lib/tests`, `src/components/tests` | Catalog/access checks, attempts, deterministic optional randomization, per-answer persistence, navigation, countdown, grading, and submission. | Implemented. Per-section times are informational only; one total timer is enforced. |
| `src/lib/results`, `src/components/results` | Result history, detailed review, topic/difficulty breakdowns, rule-based recommendation, and bookmark toggles. | Implemented from current question records rather than immutable attempt snapshots. |
| `src/lib/dashboard` | Reads summary metrics, five recent attempts, five weakest topics, bookmarks, and up to four tasks from an already-active study plan; produces simple rule-based recommendations. | Metrics/recommendations implemented. Study-plan creation/task mutation is absent. |
| `src/lib/learning`, `src/components/learning` | Bookmark library; incorrect-response grouping; notes, understood state, reattempt links. | Implemented, limited to the most recent 1,000 incorrect response rows for mistake aggregation. |
| `src/lib/admin/data.ts`, `src/components/admin` | Question authoring/editing, snapshots, review decisions, publish/retire, metrics, and audit inserts. | Implemented with multi-step non-transactional writes. Version/audit history is written but has no viewer. |
| `src/lib/admin/test-data.ts`, admin test components | Approved-question bank, multi-section test builder, ordering, randomization flags, publication/access configuration. | Implemented with multi-step non-transactional writes. Existing-attempt tests cannot be structurally edited. |
| `src/lib/theme.ts`, theme components | Light/dark/system choice, local browser persistence through `next-themes`, and optional profile persistence. | Implemented. |
| `src/types` | Domain/Zod models and a manually written partial Supabase `Database` type. | Primarily scaffolding; the database type is incomplete and does not match the SQL for questions/options. |

Business rules mostly live in `src/lib`, as planned. Rendering is not cleanly separated into a shared question renderer: practice, test, and result review repeat question/passage/code/formula/option markup in three components (`src/components/practice/practice-experience.tsx`, `src/components/tests/test-runner.tsx`, `src/components/results/result-review.tsx`).

## 4. Data model, from the source of truth

The source of truth is the ordered SQL in `supabase/migrations`, not `src/types/database.ts`. The schema uses Supabase-managed `auth.users` plus 19 public tables.

### Enums and database functions

`supabase/migrations/202608040001_foundation.sql` creates `pgcrypto`, a UTC `set_updated_at` trigger function, and these enums:

- `app_role`: `student`, `reviewer`, `admin`
- `question_module`: `core`, `computer_science`
- `question_type`: `figure_sequence`, `mathematical_equation`, `latin_square`, `computer_science`
- `question_difficulty`: `easy`, `medium`, `hard`
- `question_source_type`: `manual`, `generated`, `imported`
- `verification_status`: `draft`, `under_review`, `approved`, `rejected`
- `publication_status`: `draft`, `published`, `flagged`, `retired`
- `test_type`: `diagnostic`, `mini_mock`, `full_mock`, `sectional`
- `test_attempt_status`: `in_progress`, `submitted`, `auto_submitted`, `abandoned`
- `response_status`: `unanswered`, `answered`, `skipped`
- `report_reason`: `incorrect_answer`, `ambiguous_wording`, `missing_information`, `formatting_problem`, `unclear_explanation`, `technical_issue`
- `report_status`: `open`, `under_review`, `resolved`, `dismissed`
- `study_plan_status`: `draft`, `active`, `completed`, `archived`
- `study_task_status`: `pending`, `in_progress`, `completed`, `skipped`
- `review_decision`: `approved`, `rejected`, `changes_requested`
- `subscription_status`: `trialing`, `active`, `past_due`, `canceled`, `expired`

`supabase/migrations/202608040002_question_schema.sql` adds security-definer role-check functions and an `auth.users` insert trigger. A new Auth user gets a `profiles` row and the `student` role; the name comes from user metadata or the email prefix.

### Tables and fields

Notation: `not null` is stated explicitly; omitted nullability means the column accepts null. `UTC now` means `timezone('utc', now())`.

#### Identity and content

- `profiles`: `id uuid PK -> auth.users.id ON DELETE CASCADE`; `display_name text`; `full_name text`; `avatar_path text`; `target_exam_date date`; `timezone text not null default 'UTC'`; `created_at timestamptz not null default UTC now`; `updated_at timestamptz not null default UTC now`; `theme_preference text not null default 'system' CHECK light/dark/system` (added by migration 008). Sources: `202608040002_question_schema.sql`, `202608050008_theme_preference.sql`.
- `user_roles`: `id uuid PK default gen_random_uuid()`; `user_id uuid not null -> auth.users ON DELETE CASCADE`; `role app_role not null`; `assigned_by uuid -> auth.users ON DELETE SET NULL`; timestamps not null/default UTC now; unique `(user_id, role)`. Source: `202608040002_question_schema.sql`.
- `questions`: `id uuid PK default gen_random_uuid()`; `module question_module not null`; `question_type question_type not null`; `subject text`; `topic text not null`; `subtopic text`; `difficulty question_difficulty not null`; `question_text text not null`; `passage text`; `code text`; `formula text`; `table_data jsonb`; `diagram_data jsonb`; `structured_data jsonb not null default {}`; `image_url text`; `metadata jsonb not null default {}`; `correct_option_id uuid -> question_options.id ON DELETE SET NULL`; `explanation text not null`; `estimated_time_seconds integer not null CHECK > 0`; `source_type question_source_type not null default manual`; `verification_status verification_status not null default draft`; `publication_status publication_status not null default draft`; `version integer not null default 1 CHECK > 0`; `created_by` and `updated_by uuid -> auth.users ON DELETE SET NULL`; `published_at`, `retired_at timestamptz`; timestamps not null/default UTC now. Source: `202608040002_question_schema.sql`.
- `question_options`: `id uuid PK`; `question_id uuid not null -> questions ON DELETE CASCADE`; `label text not null`; `content text not null`; `metadata jsonb not null default {}`; `sort_order integer not null CHECK 1..4`; timestamps; unique `(question_id, sort_order)` and `(question_id, label)`. Source: `202608040002_question_schema.sql`.
- `question_versions`: `id uuid PK`; `question_id uuid not null -> questions ON DELETE CASCADE`; `version integer not null CHECK > 0`; `snapshot jsonb not null`; `change_summary text`; `changed_by uuid -> auth.users ON DELETE SET NULL`; `created_at timestamptz not null default UTC now`; unique `(question_id, version)`. Source: `202608040002_question_schema.sql`.

#### Tests and responses

- `tests`: `id uuid PK`; `title text not null`; `description text`; `test_type test_type not null`; `module question_module`; `duration_seconds integer not null CHECK > 0`; `instructions text`; `is_premium boolean not null default false`; `is_published boolean not null default false`; `randomize_questions` and `randomize_options boolean not null default false`; `created_by uuid -> auth.users ON DELETE SET NULL`; timestamps. Source: `202608040003_testing_schema.sql`.
- `test_sections`: `id uuid PK`; `test_id uuid not null -> tests ON DELETE CASCADE`; `title text not null`; `section_type text not null`; `module question_module`; `duration_seconds integer not null CHECK > 0`; `sort_order integer not null CHECK > 0`; timestamps; unique `(test_id, sort_order)`. Source: `202608040003_testing_schema.sql`.
- `test_questions`: `id uuid PK`; `test_section_id uuid not null -> test_sections ON DELETE CASCADE`; `question_id uuid not null -> questions ON DELETE RESTRICT`; `sort_order integer not null CHECK > 0`; timestamps; unique `(test_section_id, sort_order)` and `(test_section_id, question_id)`. Source: `202608040003_testing_schema.sql`.
- `test_attempts`: `id uuid PK`; `test_id uuid not null -> tests ON DELETE RESTRICT`; `user_id uuid not null -> auth.users ON DELETE CASCADE`; `status test_attempt_status not null default in_progress`; `started_at timestamptz not null default UTC now`; `submitted_at`, `expires_at timestamptz`; `total_time_seconds integer not null default 0 CHECK >= 0`; `score numeric(6,2)`; `accuracy numeric(5,2)`; `randomization_seed text`; `last_activity_at timestamptz not null default UTC now`; timestamps. Source: `202608040003_testing_schema.sql`.
- `user_responses`: `id uuid PK`; `attempt_id uuid not null -> test_attempts ON DELETE CASCADE`; `question_id uuid not null -> questions ON DELETE RESTRICT`; `selected_option_id uuid -> question_options ON DELETE SET NULL`; `is_correct boolean`; `is_marked_for_review boolean not null default false`; `response_status response_status not null default unanswered`; `time_spent_seconds integer not null default 0 CHECK >= 0`; `shown_at`, `answered_at timestamptz`; timestamps; unique `(attempt_id, question_id)`. Source: `202608040003_testing_schema.sql`.

#### Learning, review, commerce, and audit

- `bookmarks`: `id uuid PK`; `user_id uuid not null -> auth.users ON DELETE CASCADE`; `question_id uuid not null -> questions ON DELETE CASCADE`; timestamps; unique `(user_id, question_id)`. Source: `202608040004_learning_schema.sql`.
- `question_reports`: `id uuid PK`; `question_id uuid not null -> questions ON DELETE CASCADE`; `reporter_id uuid not null -> auth.users ON DELETE CASCADE`; `reason report_reason not null`; `details text`; `status report_status not null default open`; `resolved_by uuid -> auth.users ON DELETE SET NULL`; `resolved_at timestamptz`; timestamps. Source: `202608040004_learning_schema.sql`.
- `user_topic_performance`: `id uuid PK`; `user_id uuid not null -> auth.users ON DELETE CASCADE`; `module question_module not null`; `topic text not null`; `subtopic text not null default ''`; four non-negative integer counters (`attempts_count`, `correct_count`, `incorrect_count`, `unanswered_count`) default 0; `average_response_time_seconds numeric(8,2)`; `accuracy numeric(5,2)`; `last_practiced_at timestamptz`; timestamps; unique `(user_id, module, topic, subtopic)`. Source: `202608040004_learning_schema.sql`.
- `study_plans`: `id uuid PK`; `user_id uuid not null -> auth.users ON DELETE CASCADE`; `plan_date date not null`; `status study_plan_status not null default draft`; `recommendation_snapshot jsonb not null default {}`; timestamps; unique `(user_id, plan_date)`. Source: `202608040004_learning_schema.sql`.
- `study_tasks`: `id uuid PK`; `study_plan_id uuid not null -> study_plans ON DELETE CASCADE`; `title text not null`; `description text`; `task_type text not null`; `module question_module`; `topic text`; `difficulty question_difficulty`; `target_count integer`; `status study_task_status not null default pending`; `due_at`, `completed_at timestamptz`; `sort_order integer not null default 1 CHECK > 0`; timestamps. Source: `202608040004_learning_schema.sql`.
- `question_reviews`: `id uuid PK`; `question_id uuid not null -> questions ON DELETE CASCADE`; `reviewer_id uuid not null -> auth.users ON DELETE CASCADE`; `decision review_decision not null`; `comments text`; timestamps. Source: `202608040004_learning_schema.sql`.
- `subscriptions`: `id uuid PK`; `user_id uuid not null -> auth.users ON DELETE CASCADE`; `provider text not null default manual`; `plan_code text not null`; `status subscription_status not null default trialing`; `external_customer_id`, `external_subscription_id text`; `starts_at`, `ends_at timestamptz`; timestamps. Source: `202608040004_learning_schema.sql`.
- `audit_logs`: `id uuid PK`; `actor_id uuid -> auth.users ON DELETE SET NULL`; `action text not null`; `entity_type text not null`; `entity_id uuid` with no foreign key; `metadata jsonb not null default {}`; `created_at timestamptz not null default UTC now`. Source: `202608040004_learning_schema.sql`.
- `mistake_notebook_entries`: `id uuid PK`; `user_id uuid not null -> auth.users ON DELETE CASCADE`; `question_id uuid not null -> questions ON DELETE CASCADE`; `note text not null default '' CHECK length <= 2000`; `is_understood boolean not null default false`; `understood_at timestamptz`; timestamps; unique `(user_id, question_id)`. Source: `202608040007_mistake_notebook.sql`.

All UUID primary keys above default to `gen_random_uuid()` unless the field description explicitly identifies `profiles.id` as the Auth key. All tables with `updated_at` receive a before-update trigger; `audit_logs` and `question_versions` only have creation timestamps. Sources: migrations 002-004 and 007.

### Relationships

- `auth.users` owns one `profiles` row and many roles, attempts, bookmarks, reports, topic aggregates, study plans, subscriptions, and notebook entries; it is also referenced for author/reviewer/audit attribution.
- A question owns options and version snapshots, is assigned to sections through `test_questions`, and is referenced by responses, bookmarks, reports, reviews, and notebook entries.
- A test owns sections and attempts; a section owns ordered question mappings; an attempt owns one response per question.
- A study plan owns tasks.
- `questions.correct_option_id` and `user_responses.selected_option_id` point to option rows, but the database does not enforce that either option belongs to the same question named by its parent row.
- `audit_logs.entity_id` is deliberately polymorphic and has no referential constraint.

### RLS and grants that affect the model

Migration 005 enables RLS on all then-existing public tables and migration 007 does so for notebook entries. Published/approved question content and published test structures are readable; reviewer/admin policies open controlled content; user-owned records are generally scoped to their owner. Migration 006 revokes whole-row question reads from `anon`/`authenticated` and grants a safe column list that omits `correct_option_id` and `explanation` (`202608040005_rls_policies.sql`, `202608040006_practice_security.sql`).

However, migration 005 grants all table privileges to authenticated clients and permits owners to update their own `test_attempts`, `user_responses`, `user_topic_performance`, and `subscriptions`. Because the public anon key can be used outside this UI, a signed-in user can directly alter score/status/correctness aggregates and can create or change their own active/trialing subscription row. The server-side premium check subsequently trusts those subscription rows (`src/lib/tests/data.ts`). RLS limits which user's rows are changed; it does not protect these server-owned fields from that same user.

### Schema/code disagreements

1. `src/types/database.ts` is hand-written and partial. It omits `test_sections`, `test_questions`, `user_responses`, `question_versions`, `question_reports`, `question_reviews`, `subscriptions`, `audit_logs`, and `mistake_notebook_entries`, plus many real columns on included tables. Every relationship array is empty.
2. Its `questions` and `question_options` row types embed camelCase Zod domain shapes (`questionType`, `questionText`, `questionId`, `sortOrder`) while PostgreSQL uses snake_case. The service-role client is created without the `Database` generic, which is why these discrepancies do not type-check the core queries (`src/lib/supabase/admin.ts`).
3. `DatabaseTable.Insert` and `.Update` are defined as `Partial<Row>` for every table, so required SQL fields are not represented accurately (`src/types/database.ts`).
4. `src/types/tests.ts` defines test statuses such as `flagged`, `retired`, and `archived`, but the real `tests` table only has `is_published boolean`; this type is not used by the test engine.
5. `src/types/questions.ts` requires exactly four options. SQL only limits each option's `sort_order` to 1-4 and makes it unique; it does not require four rows. Application authoring and publication checks enforce four, while direct database data can violate that count.
6. SQL allows a correct/selected option from another question. Application actions validate selected options and authoring chooses local options, but the schema itself does not guarantee this.
7. The `skipped` response state, `flagged` question publication state, and several audit/report/study/subscription states exist in SQL but have no application transition that creates them.

## 5. Core logic, explained function by function where non-trivial

### Practice selection, answer checking, and aggregation

`getPracticeFilters` (`src/lib/practice/data.ts`) queries all approved/published questions with the service role, deduplicates topics into `core` and `computer_science` arrays, and sorts them alphabetically.

`createPracticeAttempt`:

1. Filters questions by module and optionally exact question ID, type, topic, difficulty, and declared source; only approved/published questions with a non-null correct option qualify.
2. Applies an in-memory Fisher-Yates shuffle driven by `Math.random`, then takes up to the requested quantity (1-20). This is random selection, not adaptive difficulty or generation.
3. Fetches options and drops selected questions that do not have exactly four option rows. It does not refill from the remaining candidates after dropping incomplete questions, so the returned session can be smaller than requested.
4. For timed mode, sums `estimated_time_seconds` across retained questions and sets one expiry timestamp.
5. Inserts an `in_progress` attempt under the fixed Focused Practice test, then inserts one unanswered response per retained question and returns the question data without answer keys.

The stored randomization UUID is not used to reproduce practice selection or order. There is no loader for an existing practice attempt, so a browser refresh loses the active client session even though rows remain in the database.

`recordPracticeAnswer` verifies attempt ownership/status/expiry, response membership, and that the chosen option belongs to the question. It reads the answer key server-side, updates the response, and returns immediate correctness, the correct option ID, and explanation.

`finishPracticeAttempt` is also the shared finalizer for mock tests:

1. Reads all responses and the corresponding topic metadata.
2. Counts correct responses; total is every initialized response, including unanswered; accuracy is `correct / total * 100`; total time is the sum of stored per-response times.
3. Atomically guards only the attempt status update (`WHERE status = in_progress`), setting score, accuracy, time, submission timestamp, and final status.
4. Groups responses by `(module, topic, subtopic)`. For each group it reads an existing aggregate, adds correct/incorrect/unanswered counters, calculates accuracy over all responses (including unanswered in the denominator), and calculates a weighted average time using old attempt count plus the session's total response time. It upserts each group sequentially.

The aggregate updates are not in the same transaction as attempt completion. A late failure can leave a completed attempt with only some topic groups updated. Retrying returns the completed attempt early with `total: 0`, so it does not repair the missing aggregates.

`PracticeExperience` (`src/components/practice/practice-experience.tsx`) tracks the start time of the displayed question in browser memory, submits only when the user presses "Check answer," and displays immediate feedback. Its one-second timer calls the normal completion action at zero; that action always uses `submitted`, not `auto_submitted`. Closing the browser does not trigger a server job, so expired practice attempts can remain `in_progress` indefinitely.

### Test ordering, persistence, timing, and grading

`seededShuffle` (`src/lib/tests/randomization.ts`) hashes a string with FNV-style integer operations, feeds the result into a small deterministic PRNG, and applies Fisher-Yates. The same seed and array produce the same order.

`hasPremiumAccess` treats any `trialing`/`active` subscription with no end or a future end as access. It does not inspect `starts_at`, plan code, provider, or external subscription identity (`src/lib/tests/data.ts`).

`getTestCatalog`/`getTestOverview` return only published tests, excluding the internal practice test from the catalog. They count sections/mappings and attach the same account-wide premium-access Boolean to every premium test.

`startTestAttempt` resumes the latest unexpired `in_progress` attempt for the same user/test. Otherwise it marks that attempt abandoned, gathers unique mapped question IDs, creates a new expiry based on total test duration, inserts the attempt and unanswered response rows, and returns its ID. The attempt and response initialization are separate writes; response failure leaves the attempt behind.

`getTestAttempt`:

1. Confirms user, test ID, `in_progress` status, premium access, and an expiry value, but does not reject an already-expired timestamp.
2. Loads ordered sections/mappings. If question randomization is enabled, it shuffles within each section using `attempt seed + section ID`; sections themselves remain ordered.
3. Loads only questions that are still approved/published. Missing/retired mappings silently disappear from the runnable question array.
4. Optionally shuffles each question's options with `attempt seed + question ID`, and restores saved selection/review/time state.

`saveTestResponse` validates ownership, status, unexpired time, response membership, and option/question membership. It updates selection, answered/unanswered state, review flag, accumulated client-reported time, and answer timestamp. It does not update `test_attempts.last_activity_at`.

`gradeAndSubmitTest` loads current answer keys, writes `is_correct` on each response in parallel, then calls `finishPracticeAttempt`. Read errors on responses/questions are not checked before grading; a failed/missing answer-key query can therefore turn responses into incorrect values and continue. The client-supplied `autoSubmitted` Boolean selects the final status rather than the server deriving it from expiry.

`TestRunner` (`src/components/tests/test-runner.tsx`) persists on option selection, mark changes, and navigation, and saves the current question before manual submission. It has no periodic save or unload handler. At timeout it skips the final save and submits immediately, so time since the last interaction is omitted. Auto-submission requires an open browser; no database job submits closed expired attempts. Section durations are displayed in the overview but there is no section lock or section timer; the total test expiry is the sole timing rule.

### Result calculation and recommendations

`buildResultBreakdown` groups every question by label, counts only answered-and-correct rows as correct, includes unanswered rows in total and average-time denominator, calculates percentages/average time, and sorts weakest accuracy first (`src/lib/results/analytics.ts`).

`buildResultRecommendation` chooses the weakest topic if it is below 70%; otherwise an overall score at least 80% gets "increase the challenge"; all other cases get a generic review recommendation.

`getAttemptResult` (`src/lib/results/data.ts`) reloads current question text, options, correct answers, and explanations, then recomputes displayed score/accuracy and breakdowns. It does not use the score/accuracy fields read from the attempt and does not use `question_versions` snapshots. Consequently, an administrator's live correction can change an old result's displayed correct answer and recomputed score without changing the stored attempt score. It can also change content while an attempt is active; grading uses whichever answer key is current at submission.

Dashboard `buildRecommendations` (`src/lib/dashboard/recommendations.ts`) is a fixed rule set, not a learned/adaptive engine: zero completed attempts yields two starter suggestions; otherwise up to two weakest topics become suggestions and a generic timed-set prompt is appended. Dashboard overall accuracy is the unweighted mean of completed attempt percentages, not total correct divided by total questions (`src/lib/dashboard/data.ts`).

### Mistake and bookmark logic

`setBookmark` only permits currently approved/published questions, then upserts/deletes `(user, question)` (`src/lib/learning/data.ts`). Retired questions remain in the database bookmark table but are hidden from the library query.

`getMistakes` reads completed attempts, fetches at most the newest 1,000 answered/incorrect responses, groups by question, counts occurrences, and retains the newest selected option/timestamp. It joins current question/options/answer/explanation, notebook state, and bookmarks. Because correctness history is stored but content is current, a corrected question can still appear as a historical mistake while displaying a new answer key.

`saveMistakeEntry` first proves the user has at least one completed incorrect response for that question, then upserts note/understood state and sets/clears `understood_at`. Reattempt links configure practice for exactly that question (`src/app/practice/page.tsx`, learning components).

### Administrative workflows

`createQuestion` (`src/lib/admin/data.ts`) inserts a question, four A-D options, the selected correct option, version 1 snapshot, then an audit row. It tries to delete the question if option/correct-answer setup fails, but none of these writes share a database transaction. A version/audit failure occurs after content is already committed.

`updateQuestion` permits draft/rejected questions and currently published questions. It increments the version, updates the question and correct option pointer, updates four option rows individually, writes a complete JSON snapshot, then writes an audit row. Draft/rejected edits can stay draft or return to review. A published edit is an immediate live correction: it remains published with its current verification state and bypasses reviewer reapproval (`src/components/admin/question-form.tsx`). Partial option/version/audit writes are possible.

`reviewQuestion` only accepts `under_review`, records a review, then maps approved->approved, rejected->rejected, and changes_requested->draft. It then writes an audit event. These are separate operations.

`updateQuestionLifecycle` allows draft/rejected submission, approved/four-option publication, and retirement of published questions. Retirement does not check whether the question is assigned to a published test or active attempt.

`saveAdminTest` (`src/lib/admin/test-data.ts`) validates every assigned question is still approved/published and module-compatible, calculates total duration from sections, creates/replaces sections and mappings, updates test details, optionally publishes, and audits. Updates stage new sections at sort orders starting at 1001 before deleting old sections and normalizing. It blocks structural edits after any attempt exists. The staged replacement reduces some collision risk but is not transactional; failures can leave staged structure or updated structure with stale test metadata.

`updateAdminTestPublication` blocks unpublishing only while an attempt is active. Publishing validates at least one section, globally unique mapped questions, duration equality, and current question eligibility.

### Logic that does not exist

There is no question/item generation algorithm, Latin-square generator, equation generator, SVG figure transformation engine, distractor validator, import pipeline, or adaptive difficulty selection anywhere in `src`. `source_type = generated` is only an admin-selected label and a practice filter (`src/lib/admin/schemas.ts`, `src/lib/practice/data.ts`). Marketing copy describing deterministic generation/validation is not backed by implementation (`src/app/exam-format/page.tsx`, `src/components/marketing/exam-overview.tsx`). `structured_data` is author-entered JSON; practice/test delivery does not render it. `table_data` is rendered as raw JSON in practice/test, and `diagram_data` is not fetched by those engines.

## 6. API surface

There are no `src/app/api` route handlers and no REST/GraphQL API implemented by this repository. The only HTTP route handler is the Auth callback; all mutations use Next.js server actions. `vercel.json`'s `/api` rewrite is therefore a no-op for current code.

### Pages and route handler

| Route | Access and actual output |
| --- | --- |
| `/` | Public static marketing/foundation content and links. |
| `/exam-format` | Public hardcoded exam/module descriptions. |
| `/pricing` | Public free/premium marketing cards; no purchase action. |
| `/login`, `/register` | Public auth forms; already-authenticated users redirect to their destination/dashboard. |
| `/forgot-password`, `/reset-password` | Public request/completion forms; reset action requires a valid Supabase recovery session. |
| `GET /auth/callback?code&next` | Exchanges an Auth code for a session and safely redirects; invalid/expired codes redirect to login with an error. Implemented in `src/app/auth/callback/route.ts`. |
| `/dashboard` | Authenticated live metrics/recommendations/tasks. |
| `/practice` | Authenticated practice configuration and in-browser session; accepts optional `question` UUID and `module` query parameters for exact reattempt. |
| `/tests` | Authenticated published test catalog with premium-access status. |
| `/tests/[testId]` | Authenticated test overview/start-or-resume action. |
| `/tests/[testId]/take?attempt=[uuid]` | Authenticated timed runner for the matching owned attempt. |
| `/results` | Authenticated last 30 submitted results. |
| `/results?attempt=[uuid]` | Authenticated detailed owned result. |
| `/mistakes`, `/bookmarks`, `/profile` | Authenticated learning/account pages. Profile exposes email, theme, and logout only. |
| `/admin` | Reviewer/admin metrics dashboard. |
| `/admin/review` | Reviewer/admin question review; reviewers see only under-review items, admins see up to 100 across states. |
| `/admin/questions/new` | Admin-only creator. |
| `/admin/questions/[questionId]/edit` | Admin-only draft/rejected editor or live published correction editor. |
| `/admin/tests`, `/admin/tests/new`, `/admin/tests/[testId]/edit` | Admin-only test management/build/edit. |

The production build also exposes the framework-generated `/_not-found` boundary. Every route above successfully compiled in the audit build.

### Server actions

All inputs below are validated and all protected actions authenticate again on the server.

| Action | Input | Output/side effect | Status |
| --- | --- | --- | --- |
| `loginAction` | FormData `email`, `password`, optional `next` | Error state or login plus safe redirect. | Implemented (`src/app/auth/actions.ts`). |
| `registerAction` | `fullName`, `email`, `password`, `confirmPassword` | Error, email-confirmation success message, or dashboard redirect if a session is issued. | Implemented. |
| `forgotPasswordAction` | `email` | Always returns a generic success message after requesting Supabase reset mail. | Implemented. |
| `resetPasswordAction` | `password`, `confirmPassword` | Updates password for current recovery user; error or dashboard redirect. | Implemented. |
| `logoutAction` | None | Signs out, revalidates root layout, redirects to login. | Implemented. |
| `saveThemePreferenceAction` | `light | dark | system` | `{saved, error}` and optional profile update for signed-in user. | Implemented. |
| `startPracticeAction` | `{questionId?, module, questionType|any, topic?, difficulty|any, sourceType|any, quantity 1..20, timingMode}` | Error or `{attemptId, expiresAt, questions, requestedQuantity}`. | Implemented (`src/app/practice/actions.ts`). |
| `submitPracticeAnswerAction` | `{attemptId, questionId, optionId, timeSpentSeconds}` | Error or `{isCorrect, correctOptionId, explanation}`. | Implemented. |
| `completePracticeAction` | `{attemptId}` | Error or `{correct, total, accuracy, totalTimeSeconds}`. | Implemented. |
| `startTestAction` | Test UUID | Error or `{attemptId, resumed}`. | Implemented (`src/app/tests/actions.ts`). |
| `saveTestResponseAction` | `{attemptId, questionId, selectedOptionId|null, markedForReview, timeSpentSeconds}` | `{saved:true}` or error. | Implemented. |
| `submitTestAction` | `{attemptId, autoSubmitted}` | Grading totals or error. | Implemented. |
| `toggleBookmarkAction` | `{questionId, bookmarked}` | Upsert/delete and `{bookmarked}` or error. | Implemented (`src/app/learning/actions.ts`). |
| `saveMistakeEntryAction` | `{questionId, note<=2000, isUnderstood}` | Saved note/state or error. | Implemented. |
| `createQuestionAction` | FormData classification/content/four options/correct index/intent and optional `questionId` | Creates/updates, snapshots, audits, returns status/message/ID. | Implemented, admin-only (`src/app/admin/actions.ts`). |
| `reviewQuestionAction` | `{questionId, decision, comments?}` | Review/status/audit or error. | Implemented, reviewer/admin. |
| `questionLifecycleAction` | `{questionId, action: submit_review|publish|retire}` | Lifecycle/audit or error. | Implemented, admin-only. |
| `saveAdminTestAction` | FormData test fields plus JSON section array and optional `testId` | Creates/updates/publishes test and returns ID/message. | Implemented, admin-only. |
| `adminTestLifecycleAction` | `{testId, action: publish|unpublish}` | Publication update/audit or error. | Implemented, admin-only. |

Internal exported functions in `src/lib` are server modules/pure helpers, not package or network APIs. No route or action returns a mock/not-implemented response.

## 7. What's missing or unfinished

### Explicit markers and automated verification

No `TODO`, `FIXME`, `HACK`, empty function body, intentionally thrown "not implemented," or commented-out implementation block was found in tracked application source. There are stale "Phase 1/later phases" messages, but they are user-visible/docs text rather than code markers (`src/app/page.tsx`, `src/app/not-found.tsx`, `src/components/marketing/exam-overview.tsx`, opening of `README.md`).

`npm test` result on 2026-08-08:

```text
Test Files  15 passed (15)
Tests       41 passed (41)
```

There were no failures to reproduce verbatim. The tests cover Zod schemas and pure helpers for environment parsing, roles/auth redirects/display names, navigation, theme values, question validation, practice/test/admin/learning validation, seeded shuffle, result analytics, and dashboard recommendations (`src/**/*.test.ts`). They do not exercise Supabase, RLS, migrations, server actions, multi-step writes, React components, browser timing, or end-to-end flows.

`npm run check` also passed in full: ESLint passed, `tsc --noEmit` passed, the same 41 tests passed, and Next.js 16.3.0 built all routes successfully. This verifies compilation but not live database compatibility because the service-role client is untyped and no database integration test ran.

### Functionality that is absent or only partially wired

- Question generation/import and specialized figure/equation/Latin-square rendering do not exist; generated/imported are labels only. Marketing describes capabilities that are not implemented (`src/app/exam-format/page.tsx`, `src/lib/admin/schemas.ts`).
- Question reporting exists only as table/RLS/count. Students cannot submit reports, and reviewers/admins cannot inspect or resolve them in the UI (`question_reports` migration; only reference in `getAdminMetrics`).
- Study-plan/task creation, recommendation snapshots, task completion, and scheduling are absent. Dashboard only reads externally created active rows (`src/lib/dashboard/data.ts`).
- Subscription/payment flows are absent. Premium access is a database-row check; pricing has no checkout (`src/app/pricing/page.tsx`, `src/lib/tests/data.ts`).
- Admin user/role management, subscription management, report management, audit-log viewing, and question-version viewing are absent despite corresponding tables/policies.
- Profile management is limited to email display, theme preference, and logout. There is no UI/action for display/full name, avatar, timezone, target exam date, password, study preferences, or subscription overview. The dashboard's "Update target" link goes to `/profile`, which cannot update the target (`src/app/dashboard/page.tsx`, `src/app/profile/page.tsx`).
- Practice restoration is absent; persistence is used for results, not resuming the active UI. Closed/expired attempts are not server-auto-submitted.
- Test auto-submission is browser-timer-driven, and per-section timing is not enforced. "Full-screen focus mode" is not implemented as browser fullscreen; the global site header/footer still wrap the take route (`src/app/layout.tsx`, `src/app/tests/[testId]/take/page.tsx`).
- No immutable question/option snapshot is attached to an attempt, so active and historical exams are not stable across admin corrections.
- Recharts is installed but no chart component is used; analytics are cards/progress bars. React Hook Form/resolvers are installed but unused.
- Supabase Storage is configured but unused. No application asset upload exists.
- `README.md`, homepage cards, exam overview, and not-found copy still describe a Phase 1 foundation even though Phases 2-9 functionality exists.

### Incomplete failure handling

Core authoring, attempt initialization, grading, finalization, versioning, and auditing use multiple service-role requests rather than PostgreSQL transactions/RPCs (`src/lib/admin/data.ts`, `src/lib/admin/test-data.ts`, `src/lib/practice/data.ts`, `src/lib/tests/data.ts`). The code sometimes performs compensating deletes, but those deletes' failures are not checked and many later-step failures occur after an irreversible earlier commit. Error messages can therefore say an operation failed when its primary row actually changed.

## 8. Comparison against project docs, if present

The exact requested filenames under `docs/` were not present before this audit. Three similarly named planning documents do exist under `.trae/documents`, so they were compared.

### Phase 1 plan

`.trae/documents/dmat-prep-phase-1-plan.md` largely matches the original foundation: one strict TypeScript Next App Router app, Tailwind/shadcn-style UI, Supabase clients, role guards, domain types, the planned five base migrations, RLS, and Vercel config all exist. The planned route placeholders have since become implemented pages and three later migrations add answer-key security, notebook entries, and theme preference.

File-level differences are mostly version/convention changes: `src/proxy.ts` and `src/lib/supabase/proxy.ts` replace the planned `middleware.ts`/middleware client, and Tailwind 4 uses CSS/PostCSS without the planned `tailwind.config.ts`. The planned database typing goal is not achieved accurately because `src/types/database.ts` is partial and inconsistent with SQL.

### Product requirements document

`.trae/documents/dmat-prep-prd.md` matches the broad visitor -> auth -> practice/test -> result -> learning loop and the author -> reviewer -> publish loop. The implemented pages include all routes named in the PRD plus test details/take, admin test management/edit, question edit, and auth callback routes.

Material gaps against the PRD:

- Student profile/study settings and subscription overview are not implemented.
- Admin report, user, analytics, subscription, and audit-record management are not implemented.
- Study recommendations exist as simple rules, but no process creates study plans/tasks.
- Pricing/access display exists; commerce does not.
- Analytics do not include score trends or real charts.
- The "dynamic authoring form for all supported types" stores generic text/JSON fields but does not provide type-specific generation, preview, or validation engines.
- The test engine supports total timing, navigation, marking, deterministic randomization, and delayed feedback, but not independent section timers or true full-screen mode.

The product document's visual palette (white/grey/deep blue/indigo) diverged into a broader CSS-variable light/dark system with warm paper/gold dark-theme accents (`src/app/globals.css`). This is an implementation choice, not a runtime defect.

### Technical architecture document

`.trae/documents/dmat-prep-technical-architecture.md` correctly predicts App Router server/client components, Supabase Auth/PostgreSQL, Zod, server actions, role guards, JSONB question content, Vercel, and the main route/data model.

Divergences:

- React Hook Form is installed but unused; forms are native React forms/client state plus server actions.
- Supabase Storage is configured but unused.
- Recharts is installed but unused.
- The planned independent question renderer does not exist; rendering is duplicated by workflow.
- Most domain reads/writes use an untyped service-role client instead of the promised typed database boundary.
- The browser client exists only as unused scaffolding.
- The document calls options "exactly four," but SQL does not enforce row count.

## 9. Anything a second developer needs to know before touching this code

1. **Do not treat `src/types/database.ts` as authoritative.** Read migrations first. Regenerating Supabase types from the applied schema would expose many currently hidden mismatches and remove the `any`-like service-role query surface.
2. **Protect server-owned result and entitlement fields at the database boundary.** Current authenticated RLS allows users to mutate their own attempt scores/status, response correctness, performance aggregates, and subscriptions (`202608040005_rls_policies.sql`). Premium access and analytics are therefore not trustworthy against direct API use.
3. **Preserve attempt-time content.** Published corrections mutate question/option rows in place. Tests and results reload current rows and grade against the current key, so corrections can alter active attempts and historical display. The existing `question_versions` snapshots are not linked to attempts (`src/lib/admin/data.ts`, `src/lib/tests/data.ts`, `src/lib/results/data.ts`).
4. **Move multi-table workflows into database transactions/RPCs.** Question create/update/review, test structure replacement, attempt initialization, grading, aggregate updates, snapshots, and audit writes currently permit partial success.
5. **The service role is central and must remain server-only.** No tracked credential value was found; `.env.local` exists but is ignored, and its contents were not inspected. `.env.example`/`README.md` contain placeholders. Never pass the real service key into a client component or `NEXT_PUBLIC_` variable.
6. **Content availability can drift.** Retiring/correcting a question does not check published tests or active attempts. A mapped question that ceases to be approved/published is silently omitted from the runner even though catalog counts still count the mapping (`src/lib/tests/data.ts`, `src/lib/admin/data.ts`).
7. **Timeout guarantees are client-side only.** There is no cron/queue/database job for expired attempts. Practice timeouts record `submitted`, test timeouts depend on an open tab, and unsaved dwell time is lost at auto-submit.
8. **Premium is manual data, not billing.** `starts_at` is ignored, any qualifying row grants all premium tests, and user-owned subscription RLS currently permits self-service mutation. Do not present pricing as a functioning purchase system.
9. **Roles require external bootstrap.** Every registration is a student. Admin/reviewer UI visibility and page access work once `user_roles` is populated, but there is no invitation/assignment screen.
10. **Several schema areas are read-only scaffolding from the app's perspective.** Reports, plans/tasks, subscription lifecycle, version history, and audit visibility need explicit product flows before they can be called complete.
11. **Pure-unit coverage is green but integration risk is untested.** Add migration/RLS tests, Supabase integration tests, transaction/failure tests, and browser tests for auth, refresh/resume, timers, role routes, corrections, and premium access before relying on the green 41-test count as end-to-end assurance.
12. **Some public copy is stale or overclaims implementation.** In particular, the homepage/not-found still call the app Phase 1, and exam-format copy describes deterministic generation and validation pipelines that do not exist. Update those claims only after deciding the real product boundary.
