# Mistake-driven plan (phases M1–M4)

Written 2026-11-14 from one student's graded Exam 3 make-up (work, energy, impulse, momentum; 32/50). The exam itself is private and stays out of the repo. This file keeps only the **patterns** and what the app should do about them. Read only the section your phase names.

## 1. What went wrong, as patterns

The algebra was mostly fine. Points were lost *before* the first equation. Each pattern below comes with the exam slip that showed it, described generically.

| # | Pattern | Seen as |
|---|---|---|
| P1 | Law chosen without checking its condition | Energy conservation used for a mass *lowered slowly* onto a spring (needs ΣF = 0; energy gives 2× the stretch). "A force is present" taken to mean "it does work" (tension perpendicular to motion). |
| P2 | Target not named, so the solving drifts | Work by friction was the target and the only unknown, but it was expanded into μmg cos θ·d and the student went after μ. Area under F–t written down as the final speed. |
| P3 | A given in the wrong term | Spring energy with the slide distance instead of the compression, and not squared; friction work without its distance (μmg); the second body's mass written in the first body's list. In every case **the units of the term were wrong** (N, not J). |
| P4 | Vectors handled as scalars | Explosion: velocities summed without masses, angle taken from one component. Impulse direction taken from the force *on the other body* (Newton 3 pair mixed up). |
| P5 | Didn't read back their own correct equation | Wrote Δp₁ = −Δp₂, then picked "depends on the speeds". |
| P6 | Numbers before symbols | The two problems done symbols-first got full marks; the graph problem had no symbolic equation at all. |
| P7 | Graph interval and shape | Area taken over the wrong interval; the rectangle under a sloped segment left out. |

The student's own preference (asked 2026-11-14): an **exam-style sheet**, a list of problems to work on paper, with solutions revealed step by step and each mistake explained. A private study guide in that format is `private/exam3-makeup-study-guide.html`. It is the reference for M4.

## 2. What the app already does (don't rebuild)

- "What's wrong?" handlers `SLIPS` in `js/packs/mech.js` (trig swap, dropped term, sign) with edits in `app.js` (`swapTrig`, `dropTerm`, `flipSign`) and `unitSlip` / `dropTerms` in `js/pick.js`.
- Option slips in `js/options.js` (root, square, inverse, sign, half, double, prefix).
- "What am I looking for?" and the next-step rule (`js/pick.js`, phase G1).
- Principle chooser and sign-of-work (`js/principle.js`, Q2) and the multiple-choice screen (`js/mc.js`, Q4).
- Concept cards (`js/concepts.js`, `js/packs/mech-notes.js`, phase 11).
- Course lessons with prompts, route cards (laws, cues, decoys) and private stops (`js/course.js`). **Private stops can only replace an existing stop** (`lesson/long|twin|transfer`). New stop ids are skipped.

Gaps found: no lesson on spring equilibrium (kx = mg), impulse as area under F–t and its direction, elastic 1D collisions (the `collide: 'elastic'` condition and P3 exist, but no stop uses them), or a three-piece explosion with unequal masses. Also a bug: an imported stop with an unknown word for a choice condition throws in Check my setup (`app.js` around `c.options.find(...)[1]`).

## 3. What research says to borrow

- **Erroneous examples with self-explanation.** Showing a worked solution with one planted error, and asking the student to find it, explain it and fix it, helps most when there is an explanation prompt (meta-analysis, TU Dresden). It is more confusing and frustrating than plain practice and still teaches more (Richey et al.). In physics: troubleshooting tasks that contrast erroneous and correct examples (Safadi 2020, *Physics Education*). The app can **generate** these: every slip handler is already an edit on a solved path, so applying one edit gives a solution with exactly one known error.
- **A fixed problem-solving framework.** Heller, Keith & Anderson (AJP 60, 1992), the Minnesota strategy: focus the problem → describe the physics (diagram, knowns and the target in symbols) → plan → execute → evaluate. This is the student's checklist, and P1, P2 and P6 are skipped steps in it.
- **Exam wrappers.** After a test, the student sorts their mistakes by kind and plans what to change. The evidence is mixed (one study found no effect, another a modest gain across five courses), so the app should make the sorting fast and **use it**, not just collect it.
- **Andes** (already in core-plan section 13): error handlers, pointing → teaching → bottom-out hints. M1 adds handlers; M3 adds the pointing.

## 4. Phases

### M1: new "What's wrong?" handlers from the patterns
Each handler is an edit on the solved path plus a sentence, the same shape as `SLIPS`, and each has its test.
- `wrongLength` (P3): put another length given in place of a length in one term (compression ↔ slide distance, s ↔ h). Says which term and which length belongs there.
- `dropPower` (P3): remove the square from a squared given (½kx for ½kx²).
- `dropFactor` (P3): drop one factor from a product term (μmg without d). The sentence names the units the term has without it ("this term is in N; the others are in J").
- `noMass` (P4): momentum terms with the masses taken out (v for m·v).
- `energyNotForce` (P1): the spring answer that comes from ½kx² = mgx when ΣF = 0 applies; the sentence explains that a hand doing work breaks energy conservation.
- `wrongInterval` (P7): a graph area over a different interval or without the rectangle under a slope.
- Term units check: when a student's typed term has different units from the rest of its equation, say which term and what units it has. This catches P3 before any number.

### M2: the missing lessons
All problems `original: true`, gates use answers worked outside the app.
- "Hanging and dropping a spring" (Hooke's law): the same mass lowered slowly (ΣF = 0, x = mg/k) and released (energy, x = 2mg/k) **side by side**, so the condition decides the law (P1).
- "Impulse": area under F–t (rectangles and trapezoids, interval marked first), J = Δp on a named body, and direction questions (wall and swimmer, truck and car: equal impulses, unequal Δv) (P4, P5, P7).
- "Elastic collision on a line": stage 1 energy with spring and friction, stage 2 elastic collision, with a units check on every term (P3).
- "Explosion in two dimensions": three pieces, unequal masses, x and y written out separately, then speed and the quadrant of the angle (P4).

### M3: setup gates (the checklist inside the app)
- The target must be named before the equation library opens in a lesson (switchable; G1's "What am I looking for?" already has the data).
- "Why does this law hold?": after picking a law, the student picks the reason from the route card's cues and decoys. A decoy ("energy is always conserved") is explained, not just marked wrong.
- With two or more bodies, givens must have an owner (subscript or drawn body), so m_block and m_toy can't mix.
- "Read it back": in the multiple-choice screen, after the student writes a relation (Δp₁ = −Δp₂), the app asks what it says about the options before revealing a match (P5).

### M4: exam sheet and mistake log
- **Exam sheet:** a printable page that lists a lesson's or a set's problems in exam layout (question, space to work, nothing revealed). Afterwards, each solution opens one step at a time, symbols first. The student can type their own wrong answer: the slip handlers name the likely mistake.
- **Find the mistake:** an erroneous example made by applying one slip edit to the solved path. The student points at the faulty line, picks the pattern, then fixes it. The app checks all three.
- **My mistakes:** a tally by pattern (P1–P7) stored in `localStorage` key `pl-mistakes` (no identifying data, a visible Clear button). The most frequent pattern sets which hint and which setup gate shows first. A short exam-wrapper screen sorts a past test's mistakes into the same patterns in a minute.
