# Figure Sequence difficulty audit

Accepted sample: 100 per difficulty (300 total).

| Difficulty | Symbols avg | 1/2/3/4 distribution | Independent rules avg | Orientation | Linear | Border | Direction cycle | Diagonal | Candidate similarity | Score avg | Collision rejects | Duplicate rejects | Structural diversity |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 1.42 | 58/42/0/0 | 1.42 | 0 | 0.86 | 0.14 | 0 | 0 | 0.21 | 9.38 | 3 | 0 | 0.1 |
| medium | 2.94 | 0/6/94/0 | 2.94 | 1 | 1 | 0.94 | 0 | 0 | 0.657 | 20.58 | 52 | 0 | 0.35 |
| hard | 3.73 | 0/0/27/73 | 3.73 | 1 | 1 | 1 | 1 | 1 | 0.727 | 43.22 | 172 | 0 | 0.93 |

Frequencies and diversity are proportions from 0 to 1. Candidate similarity is the unchanged-symbol proportion relative to the correct frame.
