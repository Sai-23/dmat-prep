# Q5 Production dMAT Mock-Test Policy

## Official structure source

The preparatory materials dated 8 January 2025 define three independently timed Core subtests: Figure Sequences (20 tasks, 25 minutes), Mathematical Equations (20 systems, 25 minutes), and Latin Squares (20 tasks, 25 minutes). The platform’s full mock gate contains exactly those three Core sections.

## Attempt lifecycle

1. Load every published mapping, question, option, structured task, and private answer.
2. Validate section structure and native response compatibility.
3. Insert an `assembling` attempt and immutable public/private question snapshots.
4. Initialize all response records.
5. Lock the attempt as `in_progress` and only then set `started_at` and authoritative section/attempt expiration timestamps.

An assembly failure never starts the clock. Active delivery, grading, and result review read the immutable snapshots, not live question-bank rows.

## Timing and security

Core subtests are contiguous and independently enforced from the server-owned attempt start time. Closing the tab does not stop time. The server rejects writes outside the active section and auto-finalizes the attempt when the complete schedule has expired. Browser payloads contain public snapshots only; private snapshots, correct answers, explanations, and provenance remain server-only until post-submission review.

The Core working sections total 75 minutes. Test-center procedures outside those working sections are not simulated.
