# Latin Square difficulty audit

Accepted sample: 100 per difficulty (300 total).

| Difficulty | Clues min/median/avg/max | Initial candidates avg | Target rounds | Forced before target avg | Direct/indirect/multi-stage | Row deps avg | Column deps avg | Depth avg | Working memory avg | Solver reject rate | Ambiguity reject rate | Structural duplicate rate |
| --- | --- | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 10/13/12.68/15 | 1.27 | 1:99, 2:1 | 0.01 | 99/1/0 | 0.01 | 0 | 1.01 | 2.29 | 0 | 0.029 | 0 |
| medium | 10/12/12.13/15 | 2.47 | 2:100 | 4.16 | 0/100/0 | 2.14 | 2.02 | 2 | 11.79 | 0 | 0.057 | 0 |
| hard | 10/10.5/10.64/13 | 3.56 | 3:98, 4:2 | 7.92 | 0/0/100 | 6.17 | 6.11 | 3.02 | 24.76 | 0 | 0.072 | 0 |

Target row and column distributions (positions 1-5):

- easy: rows 20/18/14/23/25; columns 17/19/23/22/19
- medium: rows 12/25/19/24/20; columns 17/18/25/19/21
- hard: rows 22/23/27/16/12; columns 19/24/14/26/17

Rates are proportions from 0 to 1. Structural signatures ignore A-E relabeling.
