# Q5 Production dMAT Mock-Test Policy

## Official structure source

The Computer Science preparatory materials dated 8 January 2025 define three independently timed Core subtests: Figure Sequences (20 tasks, 25 minutes), Mathematical Equations (20 systems, 25 minutes), and Latin Squares (20 tasks, 25 minutes). The Computer Science Subject Module uses stimulus-plus-related single-choice questions and has 90 minutes total. The official source does not state a fixed Subject Module question count, so the platform does not invent one.

## Attempt lifecycle

1. Load every published mapping, question, option, structured task, and private answer.
2. Validate section structure and native response compatibility.
3. Insert an `assembling` attempt and immutable public/private question snapshots.
4. Initialize all response records.
5. Lock the attempt as `in_progress` and only then set `started_at` and authoritative section/attempt expiration timestamps.

An assembly failure never starts the clock. Active delivery, grading, and result review read the immutable snapshots, not live question-bank rows.

## Timing and security

Core subtests are contiguous and independently enforced from the server-owned attempt start time. Closing the tab does not stop time. The server rejects writes outside the active section and auto-finalizes the attempt when the complete schedule has expired. Browser payloads contain public snapshots only; private snapshots, correct answers, explanations, and provenance remain server-only until post-submission review.

## Known official ambiguity

The supplied material says the exam itself lasts about three hours and specifies a 30-minute break between modules, while the explicitly stated working times sum to 165 minutes. Q5 enforces the stated task working times. It does not implement a simulated 30-minute waiting break because that is test-center procedure rather than question-working time.
