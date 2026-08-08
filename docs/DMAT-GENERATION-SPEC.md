# dMAT generation specification

Status: G0 baseline, derived from *dMAT - Preparatory Materials for Test Takers*, dated
2025-01-08. The official material is a format and calibration reference only. Official
questions, figures, answer choices, and solution wording must not be reproduced.

## Acceptance pipeline

Every generated candidate must pass these independent stages in order:

1. Generate from `generatorVersion + seed + configuration`.
2. Solve using code that is separate from the generator.
3. Validate format, domain, solution uniqueness, arithmetic/state safety, and explanation.
4. Calculate difficulty from observable solving work and compare it with the request.
5. Compare a canonical semantic fingerprint with accepted content.
6. Accept only if every required check passes; otherwise discard and retry up to a fixed limit.

Generators cannot mark their own output valid. Validation failures are explicit and are never
persisted as accepted content. Generation timestamps are audit data and are excluded from
reproducibility comparisons and fingerprints.

## Common invariants

- A seed is required and treated as an opaque, non-empty string.
- A generator and validator have independently versioned identifiers.
- The same generator version, seed, and canonical configuration produces the same candidate.
- Primary content is typed structured data; display text and SVG are derived views.
- Metadata records seed, versions, requested and calculated difficulty, generation time,
  attempt count, fingerprint, and validation checks.
- Fingerprints describe semantic structure, not incidental wording or generated identifiers.
- Generated material is original and cannot trace or lightly rewrite an official example.
- Generation runs server-side with bounded attempts. Failure is reported, not weakened.
- Native response mechanics are retained. Four-option multiple choice is not imposed on every
  core task.

## Mathematical Equations (official material pp. 17-23)

- A task contains several related equations whose unknowns are letters.
- Every letter has exactly one solution and each value is an integer from 1 through 20.
- The accepted system has exactly one complete assignment in that domain.
- Tasks are intended for mental calculation without notes.
- The reference progression increases variables, equations, substitutions, and dependency
  depth; it does not define difficulty by large coefficients or advanced mathematics.
- Initial generation may use addition, subtraction, multiplication by integer constants, and
  exact integer division. Division by zero, non-integral required values, and unreasonable
  intermediate values are invalid.
- The independent solver must reproduce the stored answer, prove uniqueness in the domain,
  and verify every equation. The explanation must follow a valid solution path.

## Latin Squares (official material pp. 24-33)

- The grid is exactly 5 by 5 and uses exactly the five response symbols, initially A-E.
- A symbol occurs at most once in each row and at most once in each column. There are no box
  constraints.
- One cell is the question target; other cells may be blank.
- The target must have exactly one value across all completions consistent with visible clues.
- Difficulty is based on necessary logical deduction depth and dependency, not blank count.
- Low reference tasks permit direct or short deductions; medium and high references require
  progressively longer dependent deductions. Exact scoring thresholds remain an engine policy
  to validate empirically in G7.

## Figure Sequences (official material pp. 7-16)

- A task shows a sequence of matrices and asks for each of the next two matrices separately.
- Figures may change position, colour, or orientation under explicit, replayable rules.
- Supported published behaviours include horizontal, vertical and diagonal translation,
  boundary traversal, bouncing, fixed and x+1 movement, fixed 90-degree and x+1 rotation,
  colour cycles, direction cycles, and independent rules for multiple figures.
- Figures cannot disappear, overlap, leave the matrix, or arbitrarily change diagonal movement
  into another movement type.
- State and transformations are structural; raster images are never the source of truth.
- Independent replay must reproduce every shown frame and both missing frames. Each candidate
  set has exactly one correct matrix and no equivalent distractor.

## Computer Science subject module (official material pp. 34 onward)

- The domain shape is `Stimulus -> Questions[]`.
- Each question has four answer options and exactly one correct option.
- Stimuli, questions, and options may include prose, figures, tables, and formulas.
- Questions combine subject knowledge with application rather than pure factual recall.
- Deterministically solvable families are preferred; an LLM cannot be the sole correctness
  judge.

### G13 architecture decision

- A subject unit is a versioned `Stimulus -> Questions[]` aggregate and is deliberately not
  forced into the single-question Core generator model.
- The shared stimulus and each question use typed presentation blocks for prose, code,
  formulas, tables, and structural diagrams.
- Every child question has exactly four distinct options and one stored correct option.
- Unit and option identifiers are incidental; semantic fingerprints exclude them.
- The existing `questions.structured_data` JSONB field can retain the aggregate during initial
  integration, so G13 adds no database migration. Persistence and generated topic families
  remain G14 work.

### G14 first deterministic family

- The first subject family is Boolean logic through complete truth-table output columns.
- One shared stimulus defines the variable row order and two original Boolean expressions;
  each expression has its own four-option question.
- An independent evaluator calculates every row, requires exactly one matching option, and
  rejects duplicate expressions, malformed row orders, duplicate output choices, answer-key
  mismatches, and difficulty mismatches.
- Difficulty is derived from variable count, operator count, and expression depth. The versioned
  policy uses two-variable single-operation expressions for easy, three-variable nested
  expressions for medium, and deeper expressions with negation for hard.

## Existing-system implications

The current SQL schema already provides `questions.structured_data` and `questions.metadata`
JSONB fields plus `source_type = generated`, so G0/G1 require no migration. The current
TypeScript/UI authoring model requires exactly four options and therefore cannot yet represent
native equation and figure-sequence responses. That integration mismatch is intentionally left
for the relevant integration milestones rather than weakening the generation domain model.

## Open specification questions

- The official material demonstrates low/medium/high examples but publishes no numerical
  difficulty thresholds. Thresholds must be versioned, tested policy rather than claimed facts.
- The text does not prescribe figure-matrix dimensions or formally state the number of response
  candidates; these must be confirmed from the rendered task format before G9-G11.
- The equation instructions specify finding letter values but not the production UI response
  control. G5 must preserve multi-value answers without assuming conventional A-D choices.
- The subject module states that a stimulus has a number of questions but sets no fixed count.
