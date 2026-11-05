# Rotation Lab: project notes for Claude Code

## What this is
A physics homework companion for a calculus-based mechanics student. The student sets up their own problem (givens, conditions), gathers equations from a library, picks targets and builds a solution path. Equations **glow** when they have exactly one unknown left. Every algebra step is shown, with symbols first and numbers last. Diagrams are clickable and animate the motion.

The goal is reasoning skill, not answer generation: the student makes the physics decisions (which forces, which axes, which conditions); the app does the bookkeeping and checks.

- Design document (source of truth for intent and the plan): https://claude.ai/artifact/2zgFj7tQRXbpbTT442NFcQ
  Sections to read first: "The unified solving process", "Test problems", "Exact changes to the current app", "Build order".
- Sister project: Molecule Lab (chemistry naming tool, same retro style).

## Run it
Plain HTML + ES modules, **no build step, no framework, no bundler**. Keep it that way.
- Local: `python3 -m http.server` in the repo root, open http://localhost:8000
- Hosted: GitHub Pages from `main`, root folder. Installable as an app (manifest + service worker) and works offline.

## Files
- `index.html`: layout and all CSS (retro 90s desktop theme)
- `js/data.js`: physics content: `VARS`, `EQS`, `CHAPTERS`, `PRACTICE`, `fmt`, `posRoots`, and the `kinematics()` builder
- `js/app.js`: state, rendering, path finding, solving, diagrams, graphs, practice bank, setup checker, effects
- `js/sprites.js`: original pixel-art gags drawn procedurally as SVG
- `sw.js`, `manifest.webmanifest`, `icons/`: installable offline app
- `fonts/`: Pixelify Sans, VT323, Press Start 2P (SIL Open Font License), served locally

## Current behaviour (keep working)
- Step tracker: Unit → Givens → Conditions → Gather → Target → Path.
- Units (chapters): Inclines & Newton's laws, Tension & pulleys, Rotation kinematics.
- Givens come from a quantity palette: size + unit + **direction toggle**. The direction sets the sign; students never type minus signs. Values are stored in SI, signed.
- Conditions: choices (friction, direction of motion), locked assumptions, and **hidden givens** ("starts from rest" adds v₀ = 0, labelled "from condition").
- Library: one long document per unit. Equations that don't fit the conditions grey out with the reason; equations with one solvable unknown glow (only after conditions are confirmed).
- Sheet: gathered equations, targets (a), (b)…, solve buttons, reachability status, hint (names the missing link, never the equation), Show me (gathers + solves the shortest path).
- System detection (pulley unit only, hand-written `systems` list): two equations sharing two unknowns → offers the combined shortcut.
- Diagram: clickable points (start, end, stop), force arrows in free-body diagrams, labels; library outlines the related equations. Replay with ghost frames and graphs.
- Practice bank: loads problem text only; "Check my setup" grades givens (missing, wrong value, backwards direction, extra), conditions and targets against an answer key.
- Effects: spherical-cow mascot, gags, SOLVED burst, 90s error dialogs. **Calm mode** must hide all of them.

## Conventions
- **Math is computed by code, never guessed.** Every solver is written by hand per equation and variable (`EQS[id].solve[var] = { steps, sub, f }`). `steps` are the isolation steps with a plain-English `why`; `sub` is the plug-in template with `{var}` slots; `f` returns a number, `{ value, note }` or `{ error }`.
- Sign conventions are explicit per unit (`CHAPTERS[x].axis`, `dirs`). Inclines: + is down the slope. Pulleys: + is forward (m₂ falls). Rotation: + is counterclockwise.
- Square roots and quadratics pick a root deliberately and explain it in `note` (first positive time; velocity sign from the direction of motion; conditions can supply the initial-velocity sign via `__u0sign`).
- Unit-specific wording uses `nm(id)` and `dr(id)` in app.js (names and direction words can be overridden per chapter). Don't read `VARS[id].name` directly in the UI.
- Text style in the UI: plain, short, second person; error dialogs are playful but always explain the physics.
- Art: original pixel art only; no copyrighted characters, no real people.
- When you change any cached file, **bump the cache name in `sw.js`** (currently `rotation-lab-v5`) or installed copies won't update.

## Tests (set these up first, run after every change)
1. **Solver round-trips:** for consistent states (several per unit, including negative directions and friction), remove each variable and check every solver recovers it (relative error < 1e-6). Current status: incline 164/164, pulley 176/176, rotation all pass. The only known "mismatches" are genuinely ambiguous cases (a height passed twice), which must be flagged in `note`.
2. **Practice bank end to end:** for each of the 13 problems, apply the answer-key setup, confirm Check my setup passes, run Show me, compare answers:
   - Incline: v = 4.988 m/s; a = 3.206 m/s²; Δx = −7.089 m; N = 92.18 N; a = 4.823 m/s² and t = 2.231 s
   - Pulley: a = 3.27 m/s² and T = 13.08 N; a = 2.146 m/s²; μk = 0.25; Δx = 1.766 m; μk = 0.2706 and T = 8.31 N
   - Rotation: t = 5 s; θ = 10 rad; v = 6 m/s
3. **Setup checker negative test:** a wrong direction, a missing hidden given, a wrong condition and a missing target must each be reported.
4. **Browser smoke test:** page loads with no console errors; calm mode hides gags; diagram hotspots respond.
Use headless Chrome (Playwright) for 2–4. The app exposes its state as `window.__rl` for tests.

## The plan: next version (see the design doc for details)
Core rule: **every diagram the student builds produces an equation** (free-body diagram → ΣF = ma; motion ladder → v = dx/dt, a = dv/dt; energy bar chart → before + work = after; momentum diagram → p before = p after).

Build in phases. A phase is done only when its gate test passes and all earlier tests still pass.

| Phase | Changes (numbers refer to the design doc's change table) | Gate test |
|---|---|---|
| A. Symbolic core | 1 expression engine + simplifier (sin/cos/tan of an angle as atoms; cancel factors; sin/cos → tan), 2 units on every quantity and coefficient, 4 symbols as givens. Make each equation's `sub` template the single source for both symbolic and numeric answers. Add a "check with numbers" (random-value) comparison. | All 13 practice problems solve with symbols and match their numeric answers |
| B. Motion ladder | 3 polynomials in t with symbolic coefficients: d/dt, ∫dt with a start value, evaluate, solve linear/quadratic in t (first positive root); 5 "acceleration varies with time" condition (greys out constant-a equations); 10 function-of-t and "time when …" targets | Motor shaft: θ(t) = 250t − 20.3t² − 1.44t³ gives ω(t) = 250 − 40.6t − 4.32t² and ω = 0 at t = 4.24 s (reject −13.6 s) |
| C. Build canvas + free-body diagrams | 6 snapping shape palette (ramp, block, ball, wheel, pulley, string, floor) with handles and named properties; existing diagrams become templates. 8 free-body builder: arrows snapped to named directions, chosen axes, component table, ΣF equations onto the sheet, checker (gravity, normal at contacts, friction only if present, third-law pairs). 11 general system detection with symbolic add/substitute. 13 sample-value sliders for replay. | Ramp pushed by F = kt (frictionless, angle θ, from rest): a = (k cosθ/m)t − g sinθ; a = 0 at t* = mg tanθ/k; v(t) = (k cosθ/2m)t² − g sinθ·t (still sliding down at t*, stops at 2t*); N = mg cosθ + kt sinθ |
| D. Scenarios + what matters | 4 scenario-table givens, 10 ranking targets, 12 what-matters panel, limiting cases, per-scenario assumption checks | Two touching blocks pushed by F, same μk: P = F·m_B/(m_A + m_B), μk and g flagged as not mattering; ranking 4 > 2 > 3 > 1 (9, 8, 6, 4 N) for scenarios (m_A, m_B, F, μk) = (2,1,12,0.1), (1,2,12,0.1), (2,2,12,0.3), (1,1,18,0.2); scenario 3 flagged as barely sliding |
| E. Snapshots, energy, momentum | 9 snapshots and stages with per-stage conservation choices; energy bar chart and momentum before/after diagram that write equations; checker for energy across inelastic collisions and momentum with outside forces | Block m from rest at height h on a frictionless ramp sticks to M, slides on a floor with μk: d = (h/μk)(m/(m + M))², independent of g; fraction of K lost = M/(m + M) |
| F. Freehand + polish | 7 freehand recognition (stroke → ramp, loop → ball/wheel, box → block; ask when ambiguous), 14 practice bank additions, energy clouds | All four test problems can be set up from a freehand sketch |

Later, not now: energy shown as soft "electron cloud" glows around objects (like Molecule Lab's space-filling view), sized by amount and coloured by form; torque diagrams (Στ = Iα); pasting a homework problem for Claude to set up.

## Working rules
- Read the design doc sections above before starting a phase.
- Write the gate test first, then build until it passes.
- Never let a model generate physics results; everything shown as an answer must come from code.
- Keep the student in control: hints describe what's missing, they don't solve.
- Keep the retro style and calm mode intact; check layout at 1440×900 (laptop is the main device).
- Commit in small steps with clear messages; bump `sw.js` cache name when shipping.
