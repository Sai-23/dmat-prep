# Q3 question-bank and publishing policy

## Lifecycle

Generated content enters as a validated unpublished draft. An administrator submits it for
review, a reviewer or administrator records approval/rejection/change requests, and only an
administrator can publish or retire it.

Publication is server-gated. Approval alone is insufficient.

## Native responses

- Generated Mathematical Equations require a validated `symbol_assignment` response.
- Generated Latin Squares require a validated five-symbol `single_choice` response.
- Generated Figure Sequences require two validated candidate stages.
- Manual/imported conventional content retains the database four-option and correct-option
  requirements.

## Provenance and validation

Generated publication requires a non-empty seed, generator version, validator version and
fingerprint, plus a successful validation record whose checks all passed. These values remain
inside question metadata across review and publication.

The partial unique database index on generated fingerprints prevents exact duplicates from
being saved. Near-duplicate suppression is deliberately not automatic: current fingerprints
prove exact semantic equivalence only. Q1 duplicate-rate findings should be treated as bank
diversity warnings when generating batches.

## Security

The question-bank preview route requires reviewer or administrator authorization. Reviewer
actions require reviewer/admin status. Lifecycle actions require administrator status. Student
payloads must not reuse the private bank query because it includes answers, explanations and
generation diagnostics.

## Current UI boundary

The authorized review page filters its loaded bank window by module, question type, difficulty,
generator version, validator version, source, verification status, publication status, creation
date and seed, and supports text/ID search. Larger banks will require server-side pagination and
filtering rather than increasing the bounded query indefinitely.
