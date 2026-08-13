# Mathematical Equations manual quality review

Twenty deterministic samples from the 1,000-question audit: 5 Easy, 10 Medium, and 5 Hard.

## 1. EASY — easy_multiplier_difference

Equations:

- A = 4 × B
- A − B = 3

Response: enter A, B.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 4, B = 1

Reasoning path:

1. Rewrite the multiplier relationship as A = 4B; the difference then gives B = 1.
2. Use A = 4B to obtain A = 4.

Fastest method: Replace A by 4B in the difference, solve the single short equation for B, then multiply once.

Complexity score: 1 (variables 2, equations 2, reasoning depth 2, hidden groups 0, reversals 0).

## 2. EASY — easy_division_difference

Equations:

- A ÷ 3 = B
- A − B = 2

Response: enter A, B.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 3, B = 1

Reasoning path:

1. Reverse A ÷ 3 = B to A = 3B; the difference gives B = 1.
2. Multiply B = 1 by 3 to get A = 3.

Fastest method: Turn the division into A = 3B, substitute it into the difference, and solve mentally.

Complexity score: 2 (variables 2, equations 2, reasoning depth 2, hidden groups 0, reversals 1).

## 3. EASY — easy_scaled_total

Equations:

- B + A = 10
- 4 × B = A

Response: enter A, B.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 8, B = 2

Reasoning path:

1. Replace A with 4B in the total, giving B = 2.
2. Use the multiplier relationship to get A = 8.

Fastest method: See the total as B + 4B; divide by 5, then multiply once.

Complexity score: 1 (variables 2, equations 2, reasoning depth 2, hidden groups 0, reversals 0).

## 4. EASY — easy_sum_difference

Equations:

- A + B = 11
- A − B = 3

Response: enter A, B.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 7, B = 4

Reasoning path:

1. Add the two relationships so B cancels, giving A = 7.
2. Substitute A = 7 into the sum to get B = 4.

Fastest method: Add the sum and difference equations to isolate A, then subtract 7 from the sum to find B.

Complexity score: 1 (variables 2, equations 2, reasoning depth 2, hidden groups 0, reversals 0).

## 5. EASY — easy_division_difference

Equations:

- B − A = 3
- B ÷ 2 = A

Response: enter A, B.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 3, B = 6

Reasoning path:

1. Reverse B ÷ 2 = A to B = 2A; the difference gives A = 3.
2. Multiply A = 3 by 2 to get B = 6.

Fastest method: Turn the division into B = 2A, substitute it into the difference, and solve mentally.

Complexity score: 2 (variables 2, equations 2, reasoning depth 2, hidden groups 0, reversals 1).

## 6. MEDIUM — medium_hidden_sum

Equations:

- D + C + A + B = 18
- C = 3 × D
- A + B = 10
- D = B ÷ 3

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 4, B = 6, C = 6, D = 2

Reasoning path:

1. Replace A + B by 10 in the total and use C = 3D; this gives D = 2.
2. The multiplier relationship gives C = 6.
3. Reverse B ÷ 3 = 2 to get B = 6.
4. Use A + 6 = 10 to get A = 4.

Fastest method: Insert the known group A + B directly into the total. With C = 3D, the remaining equation has only D.

Complexity score: 10 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 1).

## 7. MEDIUM — medium_hidden_difference

Equations:

- 2 × A = B
- B + (C − A) = 11
- D = B ÷ A
- C − A = 1

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 5, B = 10, C = 6, D = 2

Reasoning path:

1. Use C − A = 1 inside the grouped equation to get B = 10.
2. From 2 × A = 10, obtain A = 5.
3. Use C − 5 = 1 to get C = 6.
4. Finally D = 10 ÷ 5, so D = 2.

Fastest method: Spot C − A inside the longer equation first. That reveals B; the multiplier, difference, and quotient then finish the chain.

Complexity score: 10 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 1).

## 8. MEDIUM — medium_mixed_grouping

Equations:

- A + C = 5
- D = 3 × B
- B + D + A + C = 13
- C = 2 × B

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 1, B = 2, C = 4, D = 6

Reasoning path:

1. Use the repeated group A + C = 5 in the total and D = 3B; this gives B = 2.
2. The first multiplier gives D = 6.
3. The second multiplier gives C = 4.
4. Subtract 4 from 5 to get A = 1.

Fastest method: Collapse A + C in the total, replace D by 3B, and solve the resulting one-letter equation.

Complexity score: 9 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 0).

## 9. MEDIUM — medium_reverse_relationship

Equations:

- B = A ÷ 4
- C − B = 3
- A + C = 13

Response: enter A, B, C.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 8, B = 2, C = 5

Reasoning path:

1. Rewrite A ÷ 4 = B as A = 4B, and C − B = 3 as C = B + 3; the total gives B = 2.
2. Multiply by 4 to obtain A = 8.
3. Add 3 to 2 to obtain C = 5.

Fastest method: Express both A and C in terms of B, substitute once into the total, then read off the other values.

Complexity score: 5 (variables 3, equations 3, reasoning depth 3, hidden groups 0, reversals 1).

## 10. MEDIUM — medium_hidden_sum

Equations:

- C + A + B + D = 15
- 2 × C = A
- D ÷ 2 = C
- B + D = 9

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 4, B = 5, C = 2, D = 4

Reasoning path:

1. Replace B + D by 9 in the total and use A = 2C; this gives C = 2.
2. The multiplier relationship gives A = 4.
3. Reverse D ÷ 2 = 2 to get D = 4.
4. Use B + 4 = 9 to get B = 5.

Fastest method: Insert the known group B + D directly into the total. With A = 2C, the remaining equation has only C.

Complexity score: 10 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 1).

## 11. MEDIUM — medium_hidden_sum

Equations:

- B + D = 13
- D ÷ 3 = C
- 3 × C = A
- C + A + B + D = 29

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 12, B = 1, C = 4, D = 12

Reasoning path:

1. Replace B + D by 13 in the total and use A = 3C; this gives C = 4.
2. The multiplier relationship gives A = 12.
3. Reverse D ÷ 3 = 4 to get D = 12.
4. Use B + 12 = 13 to get B = 1.

Fastest method: Insert the known group B + D directly into the total. With A = 3C, the remaining equation has only C.

Complexity score: 10 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 1).

## 12. MEDIUM — medium_mixed_grouping

Equations:

- A + B = 9
- C + D + A + B = 25
- D = 3 × C
- B = 2 × C

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 1, B = 8, C = 4, D = 12

Reasoning path:

1. Use the repeated group A + B = 9 in the total and D = 3C; this gives C = 4.
2. The first multiplier gives D = 12.
3. The second multiplier gives B = 8.
4. Subtract 8 from 9 to get A = 1.

Fastest method: Collapse A + B in the total, replace D by 3C, and solve the resulting one-letter equation.

Complexity score: 9 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 0).

## 13. MEDIUM — medium_hidden_sum

Equations:

- D + B + C + A = 25
- B = 2 × D
- A ÷ 3 = D
- C + A = 13

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 12, B = 8, C = 1, D = 4

Reasoning path:

1. Replace C + A by 13 in the total and use B = 2D; this gives D = 4.
2. The multiplier relationship gives B = 8.
3. Reverse A ÷ 3 = 4 to get A = 12.
4. Use C + 12 = 13 to get C = 1.

Fastest method: Insert the known group C + A directly into the total. With B = 2D, the remaining equation has only D.

Complexity score: 10 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 1).

## 14. MEDIUM — medium_hidden_sum

Equations:

- D ÷ 2 = C
- C + B + A + D = 25
- 2 × C = B
- A + D = 13

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 5, B = 8, C = 4, D = 8

Reasoning path:

1. Replace A + D by 13 in the total and use B = 2C; this gives C = 4.
2. The multiplier relationship gives B = 8.
3. Reverse D ÷ 2 = 4 to get D = 8.
4. Use A + 8 = 13 to get A = 5.

Fastest method: Insert the known group A + D directly into the total. With B = 2C, the remaining equation has only C.

Complexity score: 10 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 1).

## 15. MEDIUM — medium_hidden_sum

Equations:

- B ÷ 3 = D
- C + B = 14
- 3 × D = A
- D + A + C + B = 30

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 12, B = 12, C = 2, D = 4

Reasoning path:

1. Replace C + B by 14 in the total and use A = 3D; this gives D = 4.
2. The multiplier relationship gives A = 12.
3. Reverse B ÷ 3 = 4 to get B = 12.
4. Use C + 12 = 14 to get C = 2.

Fastest method: Insert the known group C + B directly into the total. With A = 3D, the remaining equation has only D.

Complexity score: 10 (variables 4, equations 4, reasoning depth 4, hidden groups 1, reversals 1).

## 16. HARD — hard_nested_dependency

Equations:

- C + B = 3
- D = 2 × C
- C + D + A = 11
- A = D + B

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 5, B = 1, C = 2, D = 4

Reasoning path:

1. Use B = 3 − C, D = 2C, and A = D + B inside the total; this gives C = 2.
2. The multiplier gives D = 4.
3. The pair gives B = 1.
4. Combine the two known values to obtain A = 5.

Fastest method: Replace B, D, and then A in that order so the final total becomes a short equation in C.

Complexity score: 11 (variables 4, equations 4, reasoning depth 5, hidden groups 1, reversals 0).

## 17. HARD — hard_group_bridge

Equations:

- C = 2 × D
- C − A = 1
- D + B = 5
- B + A = 7

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 5, B = 2, C = 6, D = 3

Reasoning path:

1. Link the groups D + B, C − A, and B + A, then use C = 2D; this isolates D = 3.
2. Use the first group to get B = 2.
3. Use the multiplier to get C = 6.
4. Use the difference group to get A = 5.

Fastest method: Add or subtract the three short group equations so B and A cancel, then replace C with 2D.

Complexity score: 12 (variables 4, equations 4, reasoning depth 5, hidden groups 2, reversals 0).

## 18. HARD — hard_two_groups

Equations:

- 3 × D = C
- A = 2 × B
- A + C = 18
- B + D = 7

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 6, B = 3, C = 12, D = 4

Reasoning path:

1. Treat B + D and A + C as two groups, then replace A by 2B and C by 3D; this isolates B = 3.
2. Use the first group to obtain D = 4.
3. Use A = 2B to obtain A = 6.
4. Use C = 3D to obtain C = 12.

Fastest method: Keep both sums grouped, substitute the two multiplier relationships, and compare the resulting weighted sum with B + D.

Complexity score: 12 (variables 4, equations 4, reasoning depth 5, hidden groups 2, reversals 0).

## 19. HARD — hard_dependency_chain

Equations:

- B + D + A + C = 21
- A − B = C
- A = 3 × D
- D = B + 2

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 9, B = 1, C = 8, D = 3

Reasoning path:

1. Follow the chain D = B + 2, A = 3D, and C = A − B inside the total; this gives B = 1.
2. Add 2 to get D = 3.
3. Multiply 3 by 3 to get A = 9.
4. Subtract 1 from 9 to get C = 8.

Fastest method: Write every letter in terms of B, insert the chain into the total, and then work forward once.

Complexity score: 12 (variables 4, equations 4, reasoning depth 6, hidden groups 1, reversals 0).

## 20. HARD — hard_nested_dependency

Equations:

- B + C + A = 19
- 3 × B = C
- A = C + D
- B + D = 7

Response: enter A, B, C, D.

Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.

Correct answer: A = 11, B = 2, C = 6, D = 5

Reasoning path:

1. Use D = 7 − B, C = 3B, and A = C + D inside the total; this gives B = 2.
2. The multiplier gives C = 6.
3. The pair gives D = 5.
4. Combine the two known values to obtain A = 11.

Fastest method: Replace D, C, and then A in that order so the final total becomes a short equation in B.

Complexity score: 11 (variables 4, equations 4, reasoning depth 5, hidden groups 1, reversals 0).
