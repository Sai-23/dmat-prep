# Q1 Generator Integrity Audit

Generated at: 2026-08-09T10:51:14.113Z

## Acceptance summary

- Requested: 90000
- Accepted: 90000
- Rejected candidates before acceptance: 154618
- Accepted-invalid: 0
- Solver mismatches: 0
- Duplicate fingerprints: 28157
- Determinism failures: 0

## Per-generator results

| Generator | Difficulty | Seeds | Accepted | Rejected | Invalid | Duplicates | Duplicate rate | Mean ms | P95 ms | Max ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mathematical-equations | easy | 10000 | 10000 | 0 | 0 | 4748 | 47.5% | 0.113 | 0.211 | 2.542 |
| mathematical-equations | medium | 10000 | 10000 | 0 | 0 | 297 | 3.0% | 0.345 | 0.674 | 48.306 |
| mathematical-equations | hard | 10000 | 10000 | 0 | 0 | 4 | 0.0% | 2.016 | 3.335 | 25.639 |
| latin-squares | easy | 10000 | 10000 | 36723 | 0 | 0 | 0.0% | 0.686 | 2.048 | 7.656 |
| latin-squares | medium | 10000 | 10000 | 27007 | 0 | 0 | 0.0% | 0.736 | 2.059 | 45.178 |
| latin-squares | hard | 10000 | 10000 | 87295 | 0 | 11 | 0.1% | 1.874 | 5.411 | 30.837 |
| figure-sequences | easy | 10000 | 10000 | 0 | 0 | 9728 | 97.3% | 0.28 | 0.485 | 2.679 |
| figure-sequences | medium | 10000 | 10000 | 902 | 0 | 7903 | 79.0% | 0.526 | 0.877 | 2.402 |
| figure-sequences | hard | 10000 | 10000 | 2691 | 0 | 5466 | 54.7% | 0.607 | 1.043 | 41.871 |

## Adversarial rejection

Mutations rejected: 16/16 (100.0%).

Mutation suites cover incorrect or ambiguous equation answers, invalid divisors and explanations; malformed, ambiguous and inconsistent Latin squares; and corrupt figure frames, duplicate continuations and wrong answer keys.

## Findings

- No accepted-invalid, solver mismatch, determinism, or unexpected-exception defect was found.
- High semantic duplicate rates in several low-complexity families are a diversity limitation, not a correctness failure. Deduplication remains mandatory when building a bank.

Acceptance criterion: accepted-invalid must equal zero.
