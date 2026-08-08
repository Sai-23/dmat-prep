# Q1 Generator Integrity Audit

Generated at: 2026-08-08T16:27:00.461Z

## Acceptance summary

- Requested: 120000
- Accepted: 120000
- Rejected candidates before acceptance: 158724
- Accepted-invalid: 0
- Solver mismatches: 0
- Duplicate fingerprints: 54213
- Determinism failures: 0

## Per-generator results

| Generator | Difficulty | Seeds | Accepted | Rejected | Invalid | Duplicates | Duplicate rate | Mean ms | P95 ms | Max ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mathematical-equations | easy | 10000 | 10000 | 0 | 0 | 4748 | 47.5% | 0.108 | 0.194 | 2.302 |
| mathematical-equations | medium | 10000 | 10000 | 0 | 0 | 297 | 3.0% | 0.31 | 0.635 | 2.074 |
| mathematical-equations | hard | 10000 | 10000 | 0 | 0 | 4 | 0.0% | 2.551 | 6.228 | 34.059 |
| latin-squares | easy | 10000 | 10000 | 36723 | 0 | 0 | 0.0% | 0.68 | 2.04 | 9.72 |
| latin-squares | medium | 10000 | 10000 | 27007 | 0 | 0 | 0.0% | 0.693 | 1.984 | 7.409 |
| latin-squares | hard | 10000 | 10000 | 87295 | 0 | 11 | 0.1% | 1.882 | 5.417 | 17.019 |
| figure-sequences | easy | 10000 | 10000 | 0 | 0 | 9728 | 97.3% | 0.287 | 0.547 | 2.172 |
| figure-sequences | medium | 10000 | 10000 | 902 | 0 | 7903 | 79.0% | 0.521 | 0.932 | 3.731 |
| figure-sequences | hard | 10000 | 10000 | 2691 | 0 | 5466 | 54.7% | 1.014 | 2.652 | 41.072 |
| computer-science-boolean | easy | 10000 | 10000 | 3207 | 0 | 9988 | 99.9% | 0.095 | 0.202 | 2.426 |
| computer-science-boolean | medium | 10000 | 10000 | 740 | 0 | 9760 | 97.6% | 0.114 | 0.223 | 1.833 |
| computer-science-boolean | hard | 10000 | 10000 | 159 | 0 | 6308 | 63.1% | 0.132 | 0.257 | 2.9 |

## Adversarial rejection

Mutations rejected: 20/20 (100.0%).

Mutation suites cover incorrect/ambiguous equation answers, invalid divisors and explanations; malformed, ambiguous and inconsistent Latin squares; corrupt figure frames, duplicate continuations and wrong answer keys; and malformed Boolean units, duplicate choices and evaluator mismatches.

## Findings

- No accepted-invalid, solver mismatch, determinism, or unexpected-exception defect was found.
- High semantic duplicate rates in several low-complexity families are a diversity limitation, not a correctness failure. Deduplication remains mandatory when building a bank.

Acceptance criterion: accepted-invalid must equal zero.
