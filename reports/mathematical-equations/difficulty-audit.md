# Mathematical Equations difficulty audit

Accepted sample: 200 per difficulty (600 total).

| Difficulty | Variables avg | Equations avg | Exact count | Depth avg | Solve steps avg | Substitutions avg | Operator variety avg | Compound freq. | Branch freq. | Recombine freq. | Indirect-entry freq. | Working memory avg | Obvious-entry penalty | Score avg | Solver reject rate | Difficulty reject rate | Canonical duplicate rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 2 | 2 | 100% | 1 | 2.745 | 1 | 2.36 | 0.805 | 0 | 0 | 0.63 | 1 | 0.185 | 23.525 | 0 | 0 | 0.74 |
| medium | 3 | 3 | 100% | 1.825 | 4.74 | 2.825 | 3.065 | 1 | 1 | 0.825 | 0.205 | 3.65 | 0.265 | 46.367 | 0 | 0 | 0.445 |
| hard | 4 | 4 | 100% | 2.835 | 6.645 | 4.775 | 3.455 | 1 | 1 | 1 | 0.54 | 4.13 | 0.115 | 66.29 | 0 | 0 | 0.465 |

## Operator counts

- easy: add 273, subtract 114, multiply 124, divide 80
- medium: add 492, subtract 215, multiply 341, divide 77
- hard: add 818, subtract 285, multiply 414, divide 91

## Structural-family distribution

- easy: low_scaled_pair 59, low_divide_pair 42, low_direct_chain 74, low_sum_difference 25
- medium: medium_shared_source_recombine 39, medium_compound_chain 45, medium_recombine 40, medium_cross_dependency 41, medium_branch 35
- hard: high_multi_stage 26, high_branch_recombine 33, high_compound_system 32, high_two_stage_recombine 33, high_mixed_dependency 38, high_cross_dependency 38

## Dependency-graph distribution

- easy: depth-1/branch-0/recombine-0/indirect-1 126, depth-1/branch-0/recombine-0/indirect-0 74
- medium: depth-2/branch-1/recombine-1/indirect-0 124, depth-2/branch-1/recombine-1/indirect-1 41, depth-1/branch-1/recombine-0/indirect-0 35
- hard: depth-3/branch-2/recombine-2/indirect-0 59, depth-2/branch-1/recombine-1/indirect-0 33, depth-3/branch-1/recombine-2/indirect-1 70, depth-3/branch-1/recombine-1/indirect-1 38
