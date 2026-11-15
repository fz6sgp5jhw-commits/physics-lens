# Learning a concept as a new student: a walkthrough (2026-11-15)

Done with the user, after phase S1: a new student (storage cleared) wants to learn **rolling down a ramp**. The user drove;
Claude read each screen. Goal: show where the design stops a learner. Earlier audit: `docs/simplify-audit.md`.

## The design the user wants (the new home and problem page)
1. **Home screen = an index.** Sections by topic, ordered from the basics up, in place of an empty Setup page.
2. **A section lists its problems.** Each problem card is titled by its concept, has a short plain overview, and is
   tagged by what matters: the law (Στ = Iα, energy conservation…), the concept (rolling without slipping, impulse…) and
   other traits (forces or energy route, constant or varying, one or two bodies). Tags can be computed from the app's
   own solved path (each equation has a principle and a law / relationship / definition kind), so they can't be wrong.
3. **A problem card offers Watch / Guided / Free** (today's Watch a demo, Walk me through / Prompt me, On my own).
4. **The problem opens as a full page with just that problem**: the student draws and does the whole setup on one sheet.
5. **Givens are written on that sheet beside the drawing, as in an exam**: labelling the sketch writes the given and
   writing a given labels the sketch; targets go on the same list with “?”; hidden givens (“from rest” → v₀ = 0) too.

## What a new student meets, in order
**First screen**
1. No way in to learning: it opens on Setup for a blank problem; nothing names a concept. Only the Course & exams button leads to lessons.
2. Doing / Why / Next talks about a problem that doesn't exist yet.
3. Decisions before any physics: 7 unit tabs, an empty problem box, constant / varies, g = 9.81 already given, a sign note, 5 Guide buttons.
4. Two “start here” messages (the Guide box and the instruction bar).
5. The canvas tools are unlabelled icons; a caption is cut off.

**Course & exams**
6. Long / twin / transfer is jargon, explained in one skipped line. Plain words: Learn it step by step → Try one like it → Use it somewhere new.
7. Lessons are named after equipment (“A disc turned by a hanging mass”), not ideas.
8. Subtitles are formulas a new student can't read yet.
9. No starting point, order or difficulty (“open any stop, in any order”); lesson 1 is rotational dynamics.
10. No basics: the lessons were built from exam gaps; nothing on forces, Newton's laws or free-body diagrams.
11. Result: a random click, or the student leaves.

**The lesson page (Ball down a ramp)**
12. The problem text is one cut-off line in the top bar.
13. Nothing teaches the concept before the drawing (what rolling without slipping is, why K has two parts).
14. Watch / Guided / Free comes after the problem opens, small, at the bottom left.
15. The sign note uses L, ω₁, ω₂, W_nc before they are met.
16. Next points at a later stage (Conditions) while in Setup.
17. Unlabelled drawing tools: the student must guess which icon is a ramp or a ball.
18. Half the screen is decoration; the canvas is small.
19. Many small labels, each a decision (★★★ full help, Map, Leave lesson, Check my setup, a third name for the problem).

**Drawing and givens**
20. Drawing works: one stroke snaps to a ramp and θ appears. Keep it.
21. The givens are chips in another column, not written beside the drawing as in an exam (see design point 5).

**Forces**
22. A “This problem: the body is in equilibrium” choice was already pressed (a unit default). **Fixed** (below).
23. Nothing sent the student to Forces: the rolling unit marked the diagram optional and Next skipped to Conditions. **Fixed.**
24. “Write ΣF = ma” explained nothing. **Fixed.**
25. Static friction on a rolling ball was refused (“your conditions say the surface is frictionless”), though rolling
    needs it, and it was named f, not the unit's f_s. **Fixed.**

## Fixed in this pass
- “This problem” questions start unanswered in every unit; the one that decides the law (the body: in equilibrium or
  spinning up) must be answered before the diagram writes its equations, and the message says why.
- After Setup, a drawn body is sent to Forces even where the diagram is optional, and the Forces Next line invites it.
- Writing ΣF = ma now shows how the diagram became the equations, one direction at a time: each force's part, why it is
  + or −, which forces have no part that way, then the sum and why it equals Ma (or 0). The beam/disc diagram says which
  law the student's choice wrote and why.
- Friction is allowed on a rolling body (units without a friction switch) and takes the unit's name, f_s.

## Still open (next: the end of the solve)
- The explanation stops at ΣF along the slope; for a rolling ball the link to Στ = I_cm α (friction is what turns it)
  and a = Rα is not made, so “why it is slower than sliding” is still not taught.
- The rolling unit's condition reads “No energy lost: smooth axle, rolls without slipping”, which sounds like no friction.
- Conditions and Solve for the same problem: to be walked next.
