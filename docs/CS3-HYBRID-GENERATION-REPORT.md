# CS3.7 Hybrid Generation and Fidelity Report

## Scope and prior baseline

CS3.7 retained the CS3.5/CS3.6 deterministic solvers, strict OpenAI presentation contract, critic, snapshot persistence, Recursion generator, and Basic OOP generator. Work was limited to the remaining structural-diversity, live-benchmark, representation, and fidelity gates.

The previous 30-testlet audit reported approximately 50% structural duplication. That detector compared a value-insensitive testlet shape, but it used unordered family/role sets and only four loop structures, four recursion structures, and three OOP structures. It correctly exposed repetition but could not describe composition order, child derivation, control flow, data flow, or nearest neighbors.

## CS3.7 duplicate definition

The canonical structural signature now normalizes away literal values, variable names, scenario nouns, wording, and option order. It retains:

- topic and deterministic structure;
- control-flow features;
- data-flow architecture and reasoning-step count;
- ordered question-family composition;
- ordered reasoning roles;
- child answer-derivation signatures;
- meaningful stimulus representation sequence.

Detection now operates at three levels:

1. Exact/canonical structure through the structural fingerprint.
2. Family/derivation similarity through each child's family, role, task, and semantic modifiers.
3. Testlet similarity through a documented weighted score over structure, topic, composition, derivation, representations, and flow.

The readiness target is below 20% canonical structural duplication, with below 10% aspirational. A semantic-neighbor score of at least 0.90 is reported separately and is not used to weaken the canonical threshold.

## Generator and composition changes

Loop/array/function generation increased from four to ten deterministic structures:

- forward and reverse traversal;
- bounded early termination;
- parity-dependent mutation;
- step/skip traversal;
- search termination;
- two-pass nested traversal;
- fixed overwrite;
- adjacent pair swap;
- update-count-dependent transformation.

Recursion now includes decrement, reduction by two, conditional reduction, array recursion, branching recursion, and recursive search. Basic OOP now includes ordinary state, overriding, independent objects, encapsulated state, collaborating objects, and constructor chaining.

Four-question and six-question testlets use multiple validated composition archetypes rather than a fixed prefix. Eight-question testlets retain the complete diverse plan. The benchmark pipeline rejects a canonical structure already accepted and regenerates from a new deterministic attempt.

## Representation and UI validation

The accepted deterministic set contains:

- technical paragraphs: 30 testlets;
- pseudocode/code: 30;
- supporting tables: 24;
- complexity formulas: 13;
- UML/relationship diagrams: 6.

Tables support ordinary headers/rows and matrix-shaped arrays. Circuit diagrams retain their dedicated SVG renderer. Non-circuit structured diagrams now render accessible relationship cards and labelled edges; malformed diagrams show a visible warning instead of raw JSON or disappearing silently.

Shared stimulus remains stable while navigating child questions. Practice and Mock public snapshots exclude answers, explanations, semantic answer parameters, solver validation, distractor metadata, and verification metadata. Private immutable snapshots retain grading data server-side. No OpenAI call occurs during Practice or Mock delivery.

## Deterministic 30-testlet benchmark

The reproducible audit attempted 40 candidates, rejected 10 repeated canonical structures, and accepted 30 testlets containing 156 child questions:

- 18 loop/array/function/complexity testlets;
- 6 Recursion testlets;
- 6 Basic OOP testlets;
- 10 easy, 10 medium, and 10 hard;
- canonical structural duplicate rate: 0%;
- semantic-neighbor duplicate rate at 0.90: 6.67%;
- superficially different-only testlets: 0;
- exact content fingerprint duplicate rate: 0%;
- known accepted-invalid Class A questions: 0.

The child family/derivation repetition rate is 88.46%. This is expected to be higher because the syllabus deliberately reuses reasoning families such as return value, call count, state prediction, and complexity across structurally different testlets. It remains visible in the report rather than being conflated with whole-testlet duplication.

The authorized reviewer export at `reports/cs35/programming-benchmark.json` contains complete stimuli, options, answers, family/role/verification metadata, canonical signatures, derivation signatures, and nearest-neighbor IDs/scores.

## Live OpenAI benchmark

Status: `FAILED_BEFORE_30_ACCEPTED — AI_RATE_LIMITED`.

`OPENAI_API_KEY` is configured and was successfully detected in the server-only benchmark process without printing, logging, embedding, or otherwise exposing its value. The requested credentialed benchmark was then attempted through the real Responses API pipeline using the configured pipeline default model `gpt-5.6-sol` and presentation prompt `cs-presentation@1.0.0`.

The resumed session made three classified live attempts. Each attempted 12 presentation calls for the first testlet, for 36 real API calls in total. Every call returned HTTP 429 and the provider classified it as `AI_RATE_LIMITED`; none returned structured output or token usage. The most recent run artifact records 12 calls, 0 successful calls, 12 failed calls, 11 retries, and 0 accepted testlets. Because no response crossed the provider boundary, token usage is 0 returned tokens, cost is unavailable, successful-call latency is unavailable, and schema, deterministic-validator, critic, structural-duplicate, semantic-duplicate, accepted-invalid, topic, family, and reasoning-role metrics cannot honestly be calculated for a 30-accepted live set.

The runner now reports schema, deterministic-validator, critic, and structural rejection counts/rates separately; validates accepted-invalid count; records semantic rewrites and duplication; and records coverage for Variables, Loops, Arrays, Functions, Recursion, Time Complexity, and Basic OOP. It still permits one controlled presentation rewrite when nearest-neighbor similarity is at least 0.90 while keeping deterministic values and problem semantics immutable. The credential-safe failure artifact is `reports/cs37/live-openai-benchmark.json`.

## Critic status

The critic reason-code schema covers ambiguity, multiple-correct risk, insufficient stimulus, memory-only questions, repetition, weak distractors, technical conflict/incorrectness, difficulty mismatch, and poor fidelity. A Class A technical conflict still routes to human review and cannot override the deterministic solver. The critic has fixture coverage but could not be evaluated against live outputs because provider rate limiting prevented every presentation response.

## Official PDF fidelity audit

Structural fidelity is verified from the available official document information:

- Security: shared technical input supporting four related application questions.
- Combinational Logic: technical explanation, truth tables, diagrams, formulas, and seven related questions.
- Linear Transformations: technical passage, formulas/matrices, and eight related questions.

The SubjectTestlet model and renderer support rich shared text, code/pseudocode, tables, matrices, formulas, circuits, and general diagrams with 4-8 related questions and exactly four options/one answer each.

Visual PDF audit remains blocked by the environment. Poppler is unavailable; the in-app browser was unavailable; and the alternate headless-browser attempt produced only a blank dark PDF-viewer frame. Exact embedded-figure styling, typography, and page-level spatial relationships on pages 35-55 were therefore not independently verified. No visual rule was invented from missing evidence.

## Verification

The implementation includes regression tests for structural generation, composition sizes, recursion/OOP solvers, duplicate metrics, matrix/diagram rendering, answer security, immutable snapshots, AI schema enforcement, critic authority, and the credential blocker. The final repository gate runs lint, TypeScript, the complete test suite, deterministic benchmark, live-benchmark status, and production build.

## Remaining blockers

The non-live structural target is satisfied. Two critical readiness items remain incomplete:

1. The credentialed OpenAI benchmark reached the provider, but persistent HTTP 429 responses prevented any successful response and therefore prevented the required 30 accepted live testlets.
2. The official PDF visual examples could not be successfully rendered for page-level inspection.

## Final recommendation

NOT READY FOR CS4
