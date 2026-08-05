# dMAT Prep

dMAT Prep is an independent preparation platform for students preparing for the Digital Master Test, starting with the Computer Science subject module.

> dMAT Prep is an independent preparation platform and is not affiliated with or endorsed by the official dMAT examination authorities.

## Phase 1 Scope

This repository currently includes the Phase 1 foundation:

- Next.js 16 App Router with TypeScript strict mode
- Tailwind CSS v4 and shadcn-style UI primitives
- Shared layout, navigation, and route placeholders
- Supabase browser, server, and proxy clients
- Environment-variable validation with Zod
- Typed question, auth, test, and analytics models
- Supabase SQL migrations for schema, indexes, grants, and RLS
- Initial protected-route and role-check architecture

## Phase 2 Progress

The authentication foundation is now connected to Supabase:

- Email/password registration and sign-in with server-side Zod validation
- Email confirmation callback and safe post-auth redirects
- Password reset request and secure password update flows
- Protected-route session refresh and role-aware redirects
- Authenticated profile summary and sign-out

## Phase 3 Progress

The authenticated student dashboard now reads live Supabase data:

- Completed-attempt, accuracy, study-time, and bookmark metrics
- Recent test attempts with status and accuracy
- Weak-topic analysis from aggregated topic performance
- Active study-plan tasks
- Rule-based next-step recommendations for new and returning students
- Target-exam countdown when a profile date is configured
- Accessible empty, loading, and error states

## Required Environment Variables

Copy `.env.example` to `.env.local` and provide the following values:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser.

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run the full verification suite:

```bash
npm run check
```

## Database

Supabase configuration lives in `supabase/config.toml`, and the initial schema is split across:

- `supabase/migrations/202608040001_foundation.sql`
- `supabase/migrations/202608040002_question_schema.sql`
- `supabase/migrations/202608040003_testing_schema.sql`
- `supabase/migrations/202608040004_learning_schema.sql`
- `supabase/migrations/202608040005_rls_policies.sql`
- `supabase/migrations/202608040006_practice_security.sql`
- `supabase/migrations/202608040007_mistake_notebook.sql`
- `supabase/migrations/202608050008_theme_preference.sql`

## Phase 4 Progress

Focused practice is implemented with a server-authorized data flow:

- Configurable module, question type, topic, difficulty, source, quantity, and timing
- Randomized selection from approved, published questions
- Persisted practice attempts and per-question responses
- Immediate correctness feedback and explanations after submission
- Timed and untimed session modes
- Completion scoring and topic-performance aggregation
- Answer-key column restrictions for browser clients

## Phase 5 Progress

The mock-test catalog and timed test engine are implemented:

- Published free and premium test catalog
- Section, duration, and question-count summaries
- Test instruction and start/resume flow
- Premium subscription access checks
- Deterministic question and option randomization per attempt
- Restorable timed attempts with autosaved responses
- Question navigator with answered and review states
- Manual submission and automatic submission when time expires
- Delayed server-side grading and dashboard performance updates

## Phase 6 Progress

Completed attempts now have secure, detailed result views:

- Result history for submitted practice sessions and mock tests
- Overall score, accuracy, timing, and response-status metrics
- Topic and difficulty performance breakdowns
- Rule-based next-step recommendation
- Filterable correct, incorrect, unanswered, and marked-question review
- Correct-answer and explanation display only after ownership and submission checks
- Direct result-review links after practice and mock-test completion

## Phase 7 Progress

Bookmarks and mistake-driven revision are implemented:

- Bookmark toggles from completed result reviews and mistake entries
- Searchable bookmark library with module and difficulty filters
- Automatically derived mistake notebook from submitted incorrect responses
- Repeated-mistake counts and latest incorrect-answer context
- Personal notes and understood/needs-review state
- Correct-answer and explanation review for owned mistakes
- Exact-question one-item reattempt sessions
- User-owned notebook state protected by Row Level Security

## Phase 8 Progress

The role-protected question content pipeline is implemented:

- Admin question authoring for all supported question types
- Draft saving, editing, version snapshots, and review submission
- Reviewer approval, rejection, and change-request decisions with comments
- Admin-only publication and retirement controls
- Live content and review metrics on the admin dashboard
- Server-side role checks on every privileged mutation
- Audit records for question creation, editing, review, and lifecycle changes
- Published questions automatically available to the existing practice engine

## Phase 9 Progress

The role-protected assessment builder is implemented:

- Draft and direct-publication workflows for diagnostics, sectional tests, mini mocks, and full mocks
- Multi-section configuration with per-section modules and timing
- Searchable approved-question bank with module and difficulty filtering
- Unique question assignment and explicit section/question ordering
- Free or premium access controls and question/option randomization settings
- Draft editing before attempts exist
- Publication readiness checks and safe unpublishing when no attempt is active
- Test-management metrics for sections, questions, and attempts
- Audit records for test creation, editing, publishing, and unpublishing
- Published assessments automatically available in the existing student test engine

## Appearance System

The application uses one semantic Technical Academic IDE theme system:

- Light, Dark, and operating-system-following modes
- Hydration-safe persistence through `next-themes`
- Cross-tab synchronization and live system-theme updates
- Warm technical-paper light surfaces and high-focus dark workspace surfaces
- Inter and JetBrains Mono typography
- Shared gold, teal, warning, and error state tokens
- Theme-aware study controls, code blocks, formulas, answer states, and chart defaults
- Profile preference synchronization through `profiles.theme_preference`
- Retractable and resizable workspace sidebar
- Theme-independent Zen Mode

## Deployment

The application is structured for Vercel deployment. Ensure the same environment variables are configured in the Vercel project before deploying.
