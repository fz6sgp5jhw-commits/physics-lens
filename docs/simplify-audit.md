# Simplify audit: a first-time walkthrough (2026-11-15)

Done at 1440×900 with storage cleared, as a new student: find exam prep, then solve "Ball down a ramp" (rolling lesson, long stop). Goal of the next work: **remove and merge, don't add.** Teaching research behind it: `docs/teaching-research.md`.

## What a new student meets
- Opens in Drawing first: an empty canvas, a stroke key, a numbered list, a doing/why/next bar and a tip. No problem, nothing called practice or exam.
- Header: Drawing first, Guided, Tools ▾, Calm mode, Sound. Tools holds 10 items in 4 groups. **Practice problems is hidden in Drawing first** (guided-only).
- Exam prep is 4 steps deep: Tools → Course → scroll to a lesson → Exam sheet. Stop names use jargon (long / twin / transfer).
- About 60 controls on the first screen; about 140 in the page.

## Friction found while solving
1. **Instructions in four places at once**: the doing/why/next bar, the "Lesson:" tip line, the Inspect list, the line under the canvas.
2. **Problem text twice**: cut off in the top bar, and again in a box on the left.
3. **Unit tabs** (7) still showing inside a lesson, where they don't apply.
4. **Givens filled in before reading** (g, U = 0, W_nc = 0 from default conditions).
5. **"The body is: in equilibrium" pre-selected** for a ball that accelerates; conditions pre-selected too, so the student decides nothing.
6. **Asked twice**: the route card's cues ("solid sphere", "rolls without slipping", "released from rest") repeat the Conditions choices, and **ticking a cue doesn't set its condition** (from rest stayed off).
7. **Route card pops up as a modal** in the middle of Forces.
8. **"Check my diagram" shows no verdict** where the student is looking; the hint line keeps a guide message.
9. **Two ways to solve on one screen**: the equation sheet (Library → Gather → glowing equations, Hint, Show me) and the typed Algebra workspace (Formula sheet, Undo, Checks). Also Work, What matters and Path so far panels, each mostly empty.
10. **The layout moves**: in Solve the drawing jumps from the right column to the left.
11. **Dead end with a wrong pointer**: drawing a ball made the mass **m**, but the rolling unit's equations use **M**, so Show me says "Target unreachable… a hidden given or a condition". The real causes (wrong symbol, missing from rest) are never named.
12. **Menu bugs**: Tools stays open over the drawer it opened; Escape closes the drawer as well.
13. **After solving**: answers land in the givens list as "found" chips mixed with givens; the worked steps are in a Path panel; no one place says "here is the solution".

## What works (keep)
- Drawing: the ramp and ball snap well, θ appears by itself, forces draw on the body and point the right way.
- The route card teaches: right/wrong laws explained, "why does it hold" with decoys.
- Guide fading ("that step was right, so you get a little less help").
- The exam sheet's line-by-line solution, and the solver's symbols-first work.

## The typed algebra workspace, same problem (second pass)
Set up correctly (M, R, θ, h, from rest), then solved only with the Algebra panel, as a student.
14. **Hidden in Solve only**, under the equation sheet, Work, What matters and Path so far; on Setup it isn't there at all.
15. **Formula sheet search mixes units**: "roll" or "slope" also lists other units' solved forms (a = g sin θ, m = T/(g − a), M = f_s/(g sin θ − a)); energy shows rearranged (K₀ = K + U − U₀ − W_nc), not the law as taught; Fnet = ma uses m where this unit uses M. No "Mg sin θ − f_s = Ma" to pick.
16. **Enter doesn't add a line** (it applies an operation); only the Add button does.
17. **Names must match the app's exactly**: typing f gives "f isn't defined… Defined: (39 names)". The student has to guess f_s. The message sits inside the panel, not where the eye is.
18. **One line at a time**: after the first line, three more typed equations were accepted with no message and didn't appear. Combining equations works only by substitution (Shift+Enter on a = Rα), which the help text mentions in one long sentence.
19. **Windows stack**: the Formula sheet opened over the still-open route card.

## Decision (user, 2026-11-15)
Keep the **list of equations** (the sheet). Each equation gets two ways forward: **solve it for me** (today's Solve ▶ / Show me, worked steps symbols first) or **I'll do the algebra** (the typed workspace, started from that equation, with the sheet's other equations available to substitute). The typed workspace stops being a separate panel with its own formula sheet.
