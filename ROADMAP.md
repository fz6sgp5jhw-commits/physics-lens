# Physics Lens roadmap

One phase per Claude Code session. Start a session with the line under **Start with**, run `/clear` when the phase is done. A phase is done when its boxes are ticked, all tests pass, and this file says what changed.
Order: function first, style last. Phases 1–3 are in priority order; 4 builds on 3; 4b smooths what 3 and 4 built; 5 (torque) comes before the new look, decided 2026-11-07. Phases 6a–9 (drawing first) come before the new look (10), decided 2026-11-08. **Current order (decided 2026-11-09): C1–C5 (core rebuild and course, below), then 8b and 9, then 10.** 8b waits for C1 because its checks need the code's own answer, which one-line equations make simpler.

---

## Phase 1: clean up, fix, secure
**Start with:** `Do phase 1 in ROADMAP.md.`

Goal: a smaller, tidier codebase with no change in what the student sees or can do.
- [x] Measure first: line count per file (`wc -l js/*.js index.html sw.js`) and the test summary. Record both here.
  Before: app.js 1885, build.js 404, data.js 615, expr.js 628, field.js 196, index.html 731, sw.js 15 = 4474 lines; 61 tests, 61 pass (`npm test` itself failed: wrong glob).
- [x] Fix the test script: `npm test` must run `node --test tests/*.test.js` (the current `node --test tests/` fails on Node 22). Rename the package from `rotation-lab` to `physics-lens`.
- [x] Bugs and irregularities: find and fix them (console errors, dead handlers, state that isn't reset by Clear all or switching units, stale text that mentions old features). List each fix in the commit message.
- [x] Condense (lean but readable): remove dead code and unused exports; merge duplicated helpers; in `index.html`, fold the original theme rules and the later "pixel night skin" overrides into one set of rules, so no rule exists only to be overridden.
- [x] Safety review, fix what it finds:
  - add a shared `esc()` and use it (or `textContent`) wherever typed or pasted text reaches `innerHTML`;
  - confirm there is no `eval`, `new Function`, inline handler, external request or third-party code;
  - wrap all `localStorage` use in `try/catch`;
  - make `sw.js` cache only same-origin GET requests;
  - add a Content-Security-Policy `<meta>` that allows only the app's own files (inline styles and `data:` images are needed).
- [x] Bump the `sw.js` cache name. All 61 tests pass. The layout check at 1440×900 passes.
- [x] Record line counts after, and a short list of what was removed, fixed and secured.
  After: app.js 1847, build.js 404, data.js 614, expr.js 627, field.js 196, index.html 575, sw.js 15 = 4278 lines (−196); 61/61 pass, layout check passes.
  - Removed: 213 CSS declarations that only existed to be overridden (the pixel skin is now the only theme; checked by comparing every element's computed style in 13 app states before and after), dead border-radius rules, the duplicate `.bpal button` and `.dg-controls` rules, unused variables (`--bg`, `--pos`, `--neg`, `--r`, …); the unused `drawFBD`, `svgSub`, `div0`, `polyDegree`; four needless exports; three copies of the work-panel code and two of "check with numbers" (now `startWork`/`workLine`/`workBlock`/`finishStep`, `checkWithNumbers(last)`, `checkText`); a duplicated axis-note line.
  - Fixed: calm mode and reduced motion now also stop `::before`/`::after` animations (the hint-line arrow kept blinking); Clear all left the drawing and drawn forces behind while removing their givens; switching units dropped the drawing's givens; hover highlight on a given (`.known.hl`) was invisible under the pixel frame; `var(--hot)` was undefined (the "1 unknown" and "target!" hints are pink again); dark red `#a00` warnings unreadable on navy (now `--bad`); hint text pointed to old step numbers and called the app "the lab"; the work title said "6. Work"; the problem box promised a "Soon" feature.
  - Secured: `esc()` for typed values that go into HTML (given sizes, function coefficients, scenario cells); Content-Security-Policy `<meta>`; inline colour styles moved to classes. Already fine: no `eval`/`new Function`/inline handlers/external requests, `localStorage` in `try/catch`, `sw.js` same-origin GET only. Cache `physics-lens-v7`.
  - Left for phase 6 (visual): force chips' colours (`.fchip` border-color) and `#dlg` border colours are hidden by the pixel border images.

---

## Phase 2: a guided solving flow
**Start with:** `Do phase 2 in ROADMAP.md. Ask me the open question first.`

Problems seen in class: the Conditions panel is too far down to find. In a rotation problem where ω is a function of time, the derivative relationships weren't visible. Calculated values from one part of a problem weren't easy to carry into the next. The sheet is hard to reach and isn't in a logical order.
- [x] **Open question (ask before building):** should each stage unlock only after the previous one passes its check, like levels, or can the student move freely while stars show progress?
  - Answer (2026-11-07): **hybrid**. Any passed stage can be reopened, and the student can peek one stage past the first one that hasn't passed; further stages stay locked. The sheet can always be read, but solving waits until Solve unlocks.
- [x] Four stages that match how the student works: **Setup → Forces / motion diagram → Conditions → Solve**. The step tracker shows these four, and each earns a star when its check passes.
- [x] Only the current stage's panel is open beside the canvas: the free-body checklist in Forces, conditions in Conditions, and the sheet and path in Solve. Conditions are never below the fold.
- [x] When a quantity varies with time, show its calculus relationships at the top of the Conditions and Solve stages: θ → ω = dθ/dt → α = dω/dt, and x → v → a, with ∫ needing a start value. Show which rung each given sits on.
- [x] Multi-part problems: every value found in part (a) stays as a known for (b), (c)…, and is labelled as found, with its part. Clearing a part asks first.
- [x] Sheet: one tap from anywhere (a pinned tab or panel). Cards appear in solving order and are numbered as steps; each says which earlier step it uses.
- [x] Settled by the drawing: v drawn up or down the slope sets "Moving", and a rough surface sets friction. Conditions only asks what the picture can't show.
- [x] Update `tests/workspace.test.js` for the new layout on purpose, and add a test for carrying values between parts.
- What changed: the tracker is four stage buttons with stars plus a pinned **Sheet · n** tab. Checks: Setup = something drawn or a given you added; Forces = a checked ΣF written from a free-body diagram, or a v/a arrow (a motion diagram), and it's skipped (no star, doesn't block) when nothing is drawn; Conditions = confirmed; Solve = every target found. The sheet, work, What matters and Path moved beside the canvas (right column, 460px) and open only in Solve. Found values carry `part` (the target they belong to) and show "found · (a)" in the givens strip; ↺ on a solved target clears that part and the steps after it, after asking; changing a given, a condition or ΣF after solving also asks first. Surface friction and a v arrow along the slope settle "Surface" and "Moving" (shown, not asked). The calculus ladder strip (`#calcCond`, `#calcSolve`) shows when a quantity varies with time. 64 tests (3 new in `workspace.test.js`; other browser tests reordered to set up before confirming conditions, and to roughen the drawn surface instead of setting friction). Cache `physics-lens-v8`.

---

## Phase 3: rotation
**Start with:** `Do phase 3 in ROADMAP.md.`

Problems seen in class: defining ω(t) was hard. Given θ(t), finding the revolutions between the time ω = 0 and the time θ = 0 wasn't possible. There was no visible way to get tangential acceleration.
- [x] Easier function entry: type ω(t) = γ − βt² in one box, with symbols allowed, then a preview of the parsed function. The same box works for θ(t) and α(t).
- [x] Targets **between two moments**: Δθ between "when ω = 0" and "when θ = 0" (or any two events or times), and **revolutions** = Δθ / 2π. If ω changes sign in between, the angle travelled is not just Δθ: say so and offer both.
- [x] Average angular velocity and **average angular acceleration**: ω_avg = Δθ/Δt and α_avg = Δω/Δt over a chosen interval, alongside the instantaneous α(t) = dω/dt.
- [x] Points on a rotating body: v = rω, **tangential acceleration a_t = rα**, centripetal a_c = ω²r = v²/r, and total acceleration. They are added as library equations and also reached from the drawing (phase 4).
- [x] Gate tests, written first with hand-worked numbers:
  - the fan blade ω(t) = γ − βt²: when ω = 0, α(t), average α over an interval, and the revolutions between two times;
  - θ(t) given: the revolutions between "ω = 0" and "θ = 0";
  - a_t and a_c for a point at radius r.
- What changed: a function of time is typed in one box (`#edFn`, read by `X.parseFn` in `expr.js`) with a live preview (`#edFnPreview`) of the polynomial and each new constant's unit; a constant must multiply one power of t on its own (so it has one unit). New targets **between two moments** (`dth` Δθ, `nrev` revolutions, `dtrav` angle travelled both ways, `wavg` ω_avg, `aavg` α_avg) use the "Between two moments" card on the sheet (`#spanCard`): each moment is a time or "when θ/ω/α = …" (the first time after the previous moment); the `span` move solves both times (rejected roots listed), then works the quantity out exactly, symbols allowed; if ω changes sign in between it says so and gives both the net Δθ and the angle travelled. Point quantities are offered as targets even before "Track a point" is on (choosing one turns it on); new library equations R10 a꜀ = v²/r and R11 a = √(aₜ² + a꜀²). Averages are only between two moments with functions of time (constant-α problems use the ladder by ticking "varies with time"). 70 tests (`tests/rotation.test.js` new, 5 gates; parser unit test; solver count 128 → 134; round-trip states include the total acceleration; the `addFunction` helper types into the one box). Cache `physics-lens-v9`.

---

## Phase 4: a diagram library (notation and recognition)
**Start with:** `Do phase 4 in ROADMAP.md.`

Idea: chemistry has a formal drawing language (line drawings, implied carbons), so drawings can be read. Give mechanics diagrams the same: a small, fixed set of components, each drawn one standard way and each tied to the equations it brings.
- [x] A component library in `data.js`. Each entry has a standard drawing, named properties (and the variables they create), how it connects (rests on, hangs from, pivots at), the arrows that belong to it, and the equations it produces. Components: surface, ramp, block, particle, ball, wheel/disc, rod, pulley, string, spring, pivot, plus arrows for force, v, a, ω, α.
- [x] Teach the notation: a "Diagram library" drawer, like the equation library, showing each component's standard drawing and what it means. Hovering a toolbar tool shows the same card.
- [x] Recognition of freehand strokes: a line to a ramp or surface, a closed loop to a ball or wheel, a box to a block, an arrow to a vector. Snap to the standard form, and ask when the stroke is ambiguous. Recognition rules live in one place and can be tested with recorded strokes.
- [x] Recognised rotation: when a wheel or disc is given ω or α, a button appears on it. Pressing it shows a point's v, a_t and a_c vectors and their equations, and adds them to the sheet if the student chooses.
- [x] Classroom guidance: each component card has one "what to check" line, such as "a normal force is perpendicular to the surface".
- [x] Gate: set up each practice problem from freehand strokes; the wheel button shows correct vectors for a sample ω and α.
- What changed: `COMPONENTS` in `data.js` (16 entries: `draw` SVG, `means`, `props`, `connects`, `arrows`, `eqs` ids + `more` for relations not in the library yet, `check`, `tools`). **Diagrams** button opens `#diagDrawer` (cards in `#diagLib`); toolbar tools with a card show it in `#compCard` on hover/focus instead of a `title`. New canvas parts: particle, rod, spring, pivot (a wheel's or rod's centre dropped on it is pinned), ω and α curved arrows (click a wheel or ball; click again to reverse). The toolbar is 4 columns. **Pen** tool: strokes go to `js/recognize.js` (all rules and thresholds in `RULES`): line → floor / table / ramp at the drawn angle (6–12° asks), closed shape → box or loop by how much of its tightest turned rectangle it fills (in between asks), tiny loop → particle, small loop at a table edge or ramp top → pulley, box under a pulley → hanging block, masses named by unit (m₁/m₂, m_A/m_B), stroke from a body over a pulley to a body → string (two strokes join), line or arrow out of a body → asks v or a. After snapping, the hint line gives the component's "what to check". A wheel in Rotation shows **◎ a point** once ω (or ω₀) or α is known or drawn: P at the top of the rim gets v, aₜ, a꜀ and a, with directions from the signs and sizes from the R7–R11 templates; **+ Add these to my sheet** turns on Track a point and gathers them. `renderAll` now redraws the canvas (labels and the wheel button follow the givens). 91 tests (`tests/recognize.test.js` 5 rule tests on recorded strokes `tests/strokes.json`; `tests/diagrams.test.js` 13 practice problems drawn with the pen through the mouse and compared with the templates, ask flow, the wheel gate, the drawer and hover card). Cache `physics-lens-v10`.

---

## Phase 4b: smoother rotation problems
**Start with:** `Do phase 4b in ROADMAP.md.`

Problems seen while solving homework: a flywheel (r = 0.400 m, from rest, α = 0.700 rad/s²) asked for (a) the tangential, (b) the radial and (c) the resultant acceleration after 2.00 s; a disk with an α–t graph (a straight line from 0 to 6 rad/s² over 5 s) asked for the revolutions in the first 5.0 s. The app solves both, but only if the student knows where things are hidden.
Decisions (2026-11-07): the student still makes each choice, but the problem-type choices are asked in Setup; the student reads graphs themselves; the sheet's numbering stays.
- [x] Ask the kind of motion in Setup: a row beside the givens with the unit's problem-type choices (constant or varying acceleration; the whole body or a point at radius r), so the function box and r are there while givens are entered. Conditions still shows them.
- [x] Textbook words: quantity names and target options also use the words homework uses (radial acceleration, resultant acceleration, revolutions), and the function box says how to read a straight-line graph.
- [x] A wheel or ball with an ω or α arrow is its motion diagram: drawing a wheel no longer locks Solve behind the Forces stage.
- [x] Gate: both homework problems solved through the UI in that order (Setup row → givens → conditions → targets): aₜ = 0.280, a_rad = 0.784, a = 0.832 m/s²; N = 3.98 rev from α(t) = 1.2t; with a drawn flywheel and an ω arrow, Solve opens.
- What changed: conditions with an `ask` field in `CHAPTERS` (rotation: varA, rim; incline: varA) appear as a **This problem** row (`#kindRow`, buttons `data-ck`) above the givens; `setKind` changes them without confirming the conditions. The editor says where to find "varies with time" when the function option is missing, and the function box explains reading a straight-line graph. Names: a꜀ "radial (centripetal) acceleration", a "resultant (total) acceleration", N "revolutions turned between two moments (like “in the first 5 s”)". `stageChecks` counts ω/α arrows as a motion diagram. 94 tests (`tests/homework.test.js`, 3 new). No existing test changed. Cache `physics-lens-v11`.
  Follow-up: a student drew gravity on the flywheel and stayed locked. Rotation kinematics has no forces or torques yet, so `CHAPTERS.rotation.forcesOptional` makes the Forces stage optional there (no star, doesn't block); an ω or α arrow still earns the star. Cache `physics-lens-v12`.

---

## Phase 5: torque, statics and rotational dynamics
**Start with:** `Do phase 5 in ROADMAP.md. Ask me the open questions first.`

Problems seen in class (end of the torque and rotational-motion homework): beams held by a hinge or pivot and a cable, with hung weights; moments of inertia of standard shapes; a body spun up by a torque. None can be set up today: the app has no torque, lever arm or moment of inertia. The rod and pivot from phase 4 are drawable but bring no equations.
- [x] **Open questions (ask before building):** how the student picks the axis for Στ (any point they click, or the pivot by default with a prompt to explain why it's a good choice); whether this is one new unit ("Torque & equilibrium") or two ("Statics", "Rotational dynamics"); how far the extended free-body diagram goes (forces drawn at their point on the rod, not at the centre).
  Decided 2026-11-07: the axis starts at the pivot or hinge, the student can click any other point on the beam, and a prompt asks why the pivot is a good choice (the hinge forces have no lever arm there). One unit, "Torque & equilibrium", whose This problem row asks equilibrium (α = 0) or spinning up (Στ = Iα). Points of application on rods/beams and on discs (string tension at the rim); blocks keep one centre point. In gate 2, x = 38.5 cm is measured horizontally from the hinge to where the cable hangs.
- [x] An extended free-body diagram on the drawing: forces on a rod or beam start where they act (the weight at its centre, a hung mass at its hook, a cable where it's tied, the hinge at the pivot). Distances along the beam are named properties, like a ramp's angle.
- [x] Torque with the lever arm shown: τ = rF sin φ, counterclockwise +, the sign from the drawn direction (never a typed minus). The student picks the axis; each torque card says which force, its lever arm and its sign.
- [x] Equilibrium writes equations from the picture, like ΣF = ma does now: ΣFx = 0, ΣFy = 0 and Στ = 0 about the chosen axis. The hinge force is two unknown components (H_x, H_y) whose signs come out of the algebra; a negative answer is explained, not hidden.
- [x] Moments of inertia: a table of standard shapes and axes (thin rod about its centre or one end, solid disc or cylinder, thin ring, solid and hollow sphere, a point mass at r), each with its standard drawing in the diagram library, and the parallel-axis theorem I = I_cm + Md².
- [x] Rotational dynamics: Στ = Iα, and a string wrapped on a disc tied to a hanging mass (a = rα, the no-slip link from phase 3).
- [x] Gate tests, written first with hand-worked numbers (g = 9.81 m/s²):
  - beam on a pivot with a slanted cord: L = 1.79 m, M = 1.07 kg, pivot 0.262 m from the left end, m = 0.301 kg hung 0.262 m from the right end, cord 0.354 m from the right end at 24.9° to the beam → T = 21.0 N, hinge H_x = 19.05 N (toward the beam's far end), H_y = 4.61 N up;
  - beam hinged to the ceiling, hanging by a vertical cable: L = 45.3 cm, M = 1.41 kg, cable 12.9 cm long at x = 38.5 cm → the beam tilts 18.5°, T = 7.72 N, H_x = 0, H_y = 6.12 N up;
  - thin rod, 2.50 kg, 70.0 cm, axis through one end → I = ⅓ML² = 0.408 kg·m² (and 4 × the centre-axis value, by the parallel-axis theorem);
  - solid disc M = 2.00 kg, R = 0.200 m, string to a hanging m = 1.00 kg, from rest → a = mg/(m + M/2) = 4.905 m/s², T = 4.905 N, α = 24.5 rad/s².
- What changed: a new unit **Torque & equilibrium** (`CHAPTERS.torque`; This problem asks equilibrium or spinning up, `dyn`; Conditions add `shape` and `axis`, settled by a drawn disc or rod and where it is pinned; conditions can now hold named values, `condIs`). New file `js/torque.js` holds the extended free-body math: force kinds on a beam or disc (`KINDS`: gravity, hung mass, cord, hinge as H_x + H_y, push), named directions (`DIRS`, slants at φ to the beam, tilt β), each force's point (centre, ends, pivot, or d_P, d_m, d_T, d_F from the end the student picks), its lever arm r, sin φ and τ (`parts`), the equations (`equations`: ΣFx = 0, ΣFy = 0, Στ = 0 about the chosen axis, or Στ = Iα) and the checker (`check`). On the canvas a rod is a body in this unit (frame `beam`), pinned at any point over a pivot (`pinAt`, `pinU`) and tilted with the beam; a wheel is a `disc`; forces start where the drag starts; an **axis** tool (forces toolbar) clicks the axis onto the nearest named point; dashed lever arms; strings attach at a disc's rim or on the beam; templates **beam** and **disc** (only in this unit). The Forces panel for a beam/disc (`renderExtFBD`) has the tilt, the left/right-end choice per distance, the axis select (`#fbdAxis`) with “Why is the pivot a good axis?” (`[data-why]`, `#whyMsg`), the torque cards (`#torqueTable`) and Write. Found force parts show their direction, and a negative one is explained (`foundDir`). Library: D1 τ = rF sin φ; I1–I9 moments of inertia (rod centre/end, disc, ring, solid and hollow sphere, point mass, parallel axis, I = I_cm) with cards in the diagram library; D2–D6 Στ = Iα, a = Rα, TR = Iα, mg − T = ma, a = mg/(m + I/R²); G1–G2 beam geometry (ids `GEO1`, `GEO2`: generated equations are `G<n>`). Path finding and **Combine them** handle a **system of three** linear equations (`triples`, `eliminate`; dependent ones are skipped). 101 tests (`tests/torque.test.js` new, 7: the four gates, the axis tool, a force drawn on the beam; solver count 134 → 188 in `tests/expr.test.js`, on purpose). Cache `physics-lens-v13`.

---

## Drawing first (phases 6a–9)
Design: `docs/drawing-first-plan.md`, decided with the user on 2026-11-08. Each phase names the plan sections to read; read only those. First scope: the torque unit and a rod with point masses (worked example: three blocks of mass m clamped at the ends and centre of a light rod of length L; I about the centre = mL²/2, about one end = 5mL²/4).
Ground rules for every phase: drawing-first is the default and guided mode (today's flow) stays behind a toggle, unchanged; new code goes in new files (`js/setup.js`, `js/algebra.js`), not into `app.js`; the student does the physics and the algebra, and the code only carries out and checks exactly what they ask. During a session, run only the phase's own test file; run the full suite once before committing.

Sessions (decided 2026-11-08): four build sessions, grouped so each reads shared code once. Set the model and effort in the app's model picker before the first message. Every session follows the usage stop rule in `CLAUDE.md`; if it stops early, the next session starts with the same line and resumes from the phase's "Resume from" note.

| Session | Phases | Start with | Model | Effort |
|---|---|---|---|---|
| 1 | 6a | `Do phase 6a in ROADMAP.md.` | Opus | High |
| 2 | 6b and 7 (canvas tools in `build.js`) | `Do phases 6b and 7 in ROADMAP.md.` | Sonnet | Medium |
| 3 | 8a | `Do phase 8a in ROADMAP.md.` | Opus | High |
| 4 | 8b and 9 (both on the workspace) | `Do phases 8b and 9 in ROADMAP.md.` | Opus | Medium |
| later | 10, the new look | `Do phase 10 in ROADMAP.md. …` | Opus | Medium |

## Phase 6a: modes, part cards, summary
**Start with:** `Do phase 6a in ROADMAP.md.` Read plan sections 1, 2 and 3.
- [x] Mode toggle in the app bar: drawing-first (default) and guided mode (today's stages, sheet, Hint, Show me). Stored as `pl-mode` (with a visible way to reset it). `openApp` in `tests/helpers.js` gets a `mode` option and opens in guided mode by default, so the existing tests keep passing unchanged.
- [x] **Done drawing** button; after it, a pressable dot with a title on every part ("Rod", "Block 1"); a counter ("3 of 5 parts set").
- [x] Part cards driven by one data table in `js/setup.js`: the draft-2 vocabulary (groups, choices with the term and a plain line, what each adds, assumed defaults with the words that overturn them, conflict rules). Only groups that fit what's drawn are shown (no vectors: stationary groups only). Conditions are clicked, never typed.
- [x] Summary: every choice, the assumed defaults (changeable), and conflicts named with their reason; it closes only when there are none.
- [x] Gate (`tests/drawfirst-setup.test.js`, written first): rod and three blocks drawn; every card answered (rod negligible mass; each block a point mass); a block marked free while drawn on the rod is named as a conflict; guided mode still opens today's flow.
- What changed: new `js/setup.js` (the `VOCAB` table: groups, choices with term, plain line and what each adds, assumed defaults with the words that overturn them, `needs`/`clash` conflict rules; facts read from the drawing; dots, cards, counter, summary). App bar **Drawing first / Guided** (`#modeBtn`, `pl-mode`; drawing-first uses the torque unit and hides the guided flow with `.guided-only`). Canvas bar: **Done drawing** (`#doneDraw`), **Summary** (`#dfSumBtn`), counter (`#dfCount`); right column `#dfCard`; taller canvas in drawing-first. `build.js` gained `afterRender` and `rodAt`. `openApp` gets `mode` (guided by default; existing tests unchanged). 104 tests (`tests/drawfirst-setup.test.js` new, 3). Cache `physics-lens-v14`.

## Phase 6b: connections, names, knowns, counter
**Start with:** `Do phases 6b and 7 in ROADMAP.md.` (session 2) Read plan sections 3 (connections and strings), 4 and 6.
- [x] Connect tool: drag from one part to another; the connector gets a dot and a card (clamped, resting on, hangs by a string, sliding along); a connection to a rod adds a tick. Strings drawn with the same tool, through pulleys and off a disc's rim.
- [x] Per-part names (m₁, m₂, L_rod, T₁): "has mass" → typed symbol or number with units writes m₁ = m; a value of the wrong kind is refused. Numbers stay with their symbol.
- [x] Knowns list with each entry's source (drawing, card, assumed); targets; "not needed" greys an entry out.
- [x] Freedoms per body (fixed, slide x, slide y, turn θ); constraints remove them; a counter of unknowns against relationships, which never says which relationship is missing.
- [x] Gate (`tests/drawfirst-knowns.test.js`): the three blocks connected and clamped, each "has mass m" → knowns m₁ = m, m₂ = m, m₃ = m, L_rod = L, M_rod = 0; target I; counter 1 unknown, 0 relationships. A disc's shape card adds its I_cm.

- What changed (6b): new `js/tools.js` (active tool, pointer plumbing, the `ask` question box), `js/connect.js` (connect tool; connectors are shapes of kind `conn`; strings reuse the `string` shape), `js/knowns.js` (names with kind checks, knowns list with sources, targets, not-needed, freedoms, counter). `build.js` gained kinds `conn`/`tk` and `addRaw`, `touch`, `shape`. `setup.js` gained the Connection card and an `ext` hook. Right column `#dfKnowns`; toolbar `#dfTools`. Counter: unknowns = targets + tensions not given + remaining freedoms when the system is not in equilibrium; relationships = ideal-string links + no-slip; it never names what is missing. Cache `physics-lens-v15`.

## Phase 7: the toolkit
**Start with:** done in session 2, after 6b. Read plan section 5.
- [x] One set of x–y axes: drag the origin, turn by a handle, snaps to meaningful directions, the angle can be named.
- [x] Split a force onto the axes: dashed projections the student labels (W sin θ …); labels are checked only when a check is used (phase 8b).
- [x] Rod ticks at every point of interest (ends, centre, connections, pivot, ones the student adds); gap labels as dimension lines; optional point letters (A, B, C).
- [x] Coordinates typed on points; the rotation-axis marker (⊙ or a dashed line); the fade control for the setup lines.
- [x] Gate (`tests/drawfirst-toolkit.test.js`): the blocks get x = −L/2, 0, L/2 on axes through the rod's centre, gaps labelled L/2 and L/2, axis ⊙ at the centre; on a ramp, W is split onto tilted axes and labelled.
- What changed (7): new `js/toolkit.js`, all stored in one hidden `tk` shape (so undo and Clear cover it): axes (drag origin, turn by handle, snaps to horizontal, ramp, rod, string; angle nameable), force arrows drawn in drawing-first mode and split onto the axes with student labels (unchecked until 8b), rod ticks (ends, centre, pivot, connections, added), gap labels as dimension lines, coordinates, rotation-axis marker (⊙, then dashed line), optional A/B/C letters, fade slider. Coordinates and gaps feed the knowns list (source `toolkit`). Gate: `tests/drawfirst-toolkit.test.js` (3); 6b gate `tests/drawfirst-knowns.test.js` (3). 110 tests.

## Phase 8a: the algebra workspace
**Start with:** `Do phase 8a in ROADMAP.md.` Read plan sections 7 and 8.
- [x] Formula-sheet popup with search, neutral (no suggestions). New: I = Σmr² with as many terms as there are masses.
- [x] Lines of algebra on one line each (no stacked fractions), kept in the student's form; every operation exact (`js/algebra.js`, built on `expr.js` trees).
- [x] Tap a term → menu (divide, multiply, add, subtract, square, square-root, substitute what it equals); Shift applies it to both sides; without Shift it applies to that term only, even when that makes the equation untrue.
- [x] Typed lines and operations with Python-style names (`m_1`, `I_cm`, `theta`, `**`, `sqrt()`); autocomplete offers only defined symbols. Undo; going back greys later lines.
- [x] Gate (`tests/drawfirst-algebra.test.js`): from I = Σmr² with the knowns substituted to I = mL²/2, once by mouse only and once by keyboard only; a one-sided division is written as asked.

- What changed (8a): new `js/algebra.js` (`createWorkspace`, card `#dfWork`, popups `#algSheet` and `#algMenu`). Its own tree keeps the student's form; operations are structural and exact; Simplify (one term, or both sides with Shift) goes through `expr.js` (`toRat` → `toText` → parse), with sample values added by the new `expr.addSamples` under a `ws:` prefix. The sheet is every library relationship whose `sub` parses, grouped by section title, plus I = Σ m r² (terms = blocks in the drawing, ± stepper); nothing is marked until the student searches. Names must already be defined (knowns, targets, active lines), so a typo is refused with a suggestion. Lines: Enter on a typed line adds it; Enter on an op (/ 2, * m, ^2, sqrt, simplify, r_1 = L/2 in the term menu) applies to the picked term, Shift+Enter to both sides; `/` in the empty line box opens the sheet. Undo greys later lines; "Back to here" moves either way; a new step drops the greyed lines. Gate: `tests/drawfirst-algebra.test.js` (3). 113 tests.
  Note for 8b: Simplify of a whole term or both sides is already here (the gate needs it); 8b adds selecting a group inside a term.

## Phase 8b: condensing, checks, numbers, rewards
**Start with:** `Do phases 8b and 9 in ROADMAP.md.` (session 4) Read plan sections 8 (condensing), 9 and 10.
- [ ] Condensing: name a selected piece (A = …, expandable), work a piece out in numbers, simplify a selected part (each its own line).
- [ ] The code's own answer for the setup (the first scope: I = Σmr² from the clamped point masses and their positions; beams and discs through `torque.js`), used only by the checks.
- [ ] Two checks the student can use whenever before the answer, and a final check (technique: two-point numeric checking, `docs/core-plan.md` section 3): pass or something to look at; revise, or ask for a correction (names the first line that doesn't follow and why, never writes it). After a failed check the formula sheet can highlight the group to look in.
- [ ] Numbers last with units and the unit check; a star per passed check, SOLVED only at the final one.
- [ ] Gate (`tests/drawfirst-checks.test.js`): parts A (mL²/2) and B (5mL²/4) end to end; a planted sign slip is found by a check with its line named; a swapped sin/cos label on a split force is flagged.

## Phase 9: drag shortcuts (optional)
**Start with:** done in session 4, after 8b (skip it if the stop rule triggers first). Read plan section 8.
- [ ] Drag a term across = (its sign flips, or it moves from top to bottom of a fraction), and drag a known onto a symbol to substitute it. Both are shortcuts for what the tap menu already does.
- [ ] Gate: the phase 8a mouse route redone with drags.

---

## Core rebuild and course (phases C1–C5)
Design: `docs/core-plan.md`, decided with the user on 2026-11-09. The app has to last through rotation, fluids and thermo, then Physics 2 (E&M, AC circuits, optics and waves), and hold homework problems with or without a drawing. C1–C2 settle the data formats so later subjects are mostly data; they add nothing visible. C3–C5 add the next section's physics, a homework notebook with a board, and a course of lessons.
Token rules for these phases (plan section 11): read only the sections each phase names; run tests through the `test-runner` subagent and find code with `code-scout` (both in `.claude/agents/`, on Haiku); commit after each ticked box; the usage stop rule in `CLAUDE.md` applies.

| Session | Phase | Start with | Model | Effort |
|---|---|---|---|---|
| 1 | C1 (starts with the test tooling) | `Do phase C1 in ROADMAP.md.` | Opus | High |
| 2 | C2 and C3 (C3's equations go straight into the new mechanics pack) | `Do phases C2 and C3 in ROADMAP.md.` | Opus | High |
| 3 | C4 | `Do phase C4 in ROADMAP.md.` | Opus | Medium |
| 4 | C5 | `Do phase C5 in ROADMAP.md. Ask me for the lesson problems first.` | Opus | Medium |
| later | C6 hints, only if the C5 pilot shows they're worth it | `Do phase C6 in ROADMAP.md.` | Opus | Medium |
Grouped by the code each session reads (decided 2026-11-09), so shared code is read once; if a grouped session hits the usage stop rule, the next starts from its `Resume from` note. If the next section's homework starts before C1–C2 are done, C3 can run first in the old format (some rework later).
Testing in every C phase: while working, run `npm run test:fast` (Node-only, seconds) and the box's own test; ask `test-runner` to rerun only failing tests by name; run the browser tests and the full suite once before committing.

## Phase C1: one-line equations and engine additions
**Start with:** `Do phase C1 in ROADMAP.md.` Read plan sections 1, 2, 3 and 11; `docs/architecture.md` "Conventions and internals".
- [x] Test tooling first (plan section 11): `package.json` scripts `test:fast` (Node-only files: engine, units, solvers, recognition, setup data) and `test:browser` (files that open Chrome; today 17 of 20), with `test` running both; a seeded random helper (`tests/rand.js`) used by every test that draws random values, printing its seed on failure (`SEED=… npm run test:fast` replays it); data-table cases report their id, inputs, expected and actual; a snapshot `tests/fixtures/solvers.json` of all 188 current hand-solver results at seeded values, made **before** any solver changes (old code checking new code, so it doesn't break the "answers from outside the app" rule, which is for physics answers).
  Done: `test:fast` = expr, solvers, solver-snapshot, recognize (seconds); `test:browser` = the other 17; `tests/rand.js` (mulberry32, `SEED`, printed on failure) used by expr and fbd; `tests/fixtures/solvers.json` = 752 cases (4 points per solver, two with random signs) from `tests/make-solver-snapshot.js`, checked by `tests/solver-snapshot.test.js`.
- [ ] Gate first (`tests/core-equations.test.js`): for every existing equation and every variable with a hand solver, `isolate` gives the same number at random sample values (relative error < 1e-9) and the same branch where a `pick` exists; an equation that can't be rearranged fails at load with its id and variable. A computer-algebra oracle checks each rearrangement in this test only: SymPy run from the test with `python3`, or nerdamer-prime (MIT) as a **devDependency**; it confirms the result satisfies the original equation, not that its form matches (plan section 13). It is never loaded by the app.
- [ ] `isolate(eq, id)` in `expr.js`: undo operations when the variable appears once (with a plain `why` per step), linear or quadratic otherwise.
- [ ] Equations become one line (`eq`) with `kind` (law / rel / def) and `cue`; `solve` keeps only `pick`, `guard`, `alt`, `note` and hand `steps` where the automatic wording reads badly. Remove each hand solver only once it agrees.
- [ ] Units: bases m, kg, s, A, K, mol; named J, W, Pa, C, V, Ω, F, T, H, Hz, L, atm, eV; prefixes n, μ, m, c, k, M (written from the SI definitions; Compute Engine's MIT unit tables as a reference, copied only if open question 3 allows). Test: PV = nRT and Q = CV check, mm and μF convert.
- [ ] `exp` / `ln` as atoms (parse, evaluate, simplify, unit check: the argument has no unit). Test: W = nRT ln(V₂/V₁) round trip; q = Q₀e^(−t/RC) solved for t.
- [ ] Systems by matching + strongly connected components + exact elimination per block, in path finding and Combine (replaces pairs/triples) (plan section 3). Test: a 4-equation system in a test-only fixture. (Missing/redundant-equation hints from the same graph come in C5.)
- [ ] All existing tests pass (solver count stays 188; tests change only to use the seeded helper). Cache bumped. One line here on what changed.

## Phase C2: subject packs and one rule for diagrams
**Start with:** `Do phases C2 and C3 in ROADMAP.md.` (session 2) Read plan sections 4 and 5; ask `code-scout` for every `S.ch ===` / `ch ===` branch in `app.js` before reading it.
- [ ] Gate first (`tests/core-packs.test.js`): a test pack (`tests/fixtures/demo-pack.js`, P = P₀ + ρgh) loads, shows in the library and solves with Show me, with no `app.js` change; an id collision between packs is refused at load; no unit name (`'incline'`, `'pulley'`, `'rotation'`, `'torque'`, `'blocks'`) appears in `app.js`.
- [ ] Pack registry (`js/packs/index.js`); mechanics moves to `js/packs/mech.js` (quantities with `py` and `sample`, equations, chapters, components, diagrams, practice). Mechanics ids stay bare; new packs prefix theirs.
- [ ] The unit branches in `app.js` listed, grouped by what they decide, and each group made one hook with a default.
- [ ] The free-body builder and `torque.js` wrapped as diagrams `{ kind, pack, equations(state), check(state) }`; behaviour unchanged.
- [ ] Packs carry `license` (code, content) and every practice or lesson problem a `source` (work, edition, licence, url, problem) or `original: true`; an attribution list is built from them (plan section 4). Existing practice problems get their sources.
- [ ] A short function index for `app.js` in `docs/architecture.md`. All tests pass. Cache bumped. One line here on what changed.

## Phase C3: the next section (energy with rotation, rolling, angular momentum)
**Start with:** done in session 2, after C2. Read plan section 9. The new entries go straight into `js/packs/mech.js`.
- [ ] Gate first (`tests/rolling.test.js`), classic forms solved with symbols: rolling down a ramp a = (5/7)g sin θ (solid sphere), (3/5)g sin θ (hollow sphere), (2/3)g sin θ (disc); v = √(10gh/7) for a solid sphere from height h; K_rot / K = 2/7 for a solid sphere; disc and hanging mass by energy v = √(2mgh / (m + M/2)), the same as by forces; a turntable of diameter D: M = 16K / (D²ω²); a skater ω₂ = ω₁I₁/I₂ with "no outside torque", and refused (with the reason) when an outside torque is present. Numeric checks against the textbook's answers when the user supplies them.
- [ ] Library entries (plan section 9) as one-line equations with kinds and cues, in a "Rolling and angular momentum" unit; conditions rolls without slipping, fixed axis, no outside torque, rough axle does work W_f.
- [ ] All tests pass. Cache bumped. One line here on what changed.

## Phase C4: the notebook and the board
**Start with:** `Do phase C4 in ROADMAP.md.` Read plan sections 6, 7 and the board row of 13 (layered layout, written in our own code).
- [ ] Gate first (`tests/notebook.test.js`): save a problem with a drawing and one without; reload; search by chapter and by law; export → Clear notebook → import restores both; a version-0 fixture record is migrated on load; a solved path builds a board given → equation → found → target with the state colours; a note card is added and kept.
- [ ] Notebook (`js/notebook.js`, key `pl-notebook`, versioned records, validated on read, `esc()` for typed text, export/import as a file, Clear with a confirm).
- [ ] Board (`js/board.js`): quantity, equation, note and state cards, arrows, the pathway layout from a solved path; stored in the problem record.
- [ ] Layout check at 1440×900 still passes. All tests pass. Cache bumped. One line here on what changed.

## Phase C5: the course engine and a two-lesson pilot
**Start with:** `Do phase C5 in ROADMAP.md. Ask me for the lesson problems first.` Read plan section 8 (hints, lesson content and licences) and the step-checking paragraph of section 3.
- [ ] Gate first (`tests/course.test.js`): the map is always open; both pilot lessons run end to end (long → twin → transfer); the route card grades a right and a wrong choice (wrong is explained, not blocked); the kind tap is asked before an equation is added in a lesson; Show me and glow are off in the twin; progress is saved in `pl-course` and cleared by its button. One looping test applies every lesson's answer key, solves and compares with stored answers.
- [ ] Course engine (`js/course.js`): Course button and map drawer, lesson data in packs, prompts on the hint line, help switches, route card, kind tap, recap.
- [ ] Hints, pilot size: pointing → teaching → bottom-out (only bottom-out costs a star); "What's wrong?" error handlers as data with just two handlers (sin/cos swap, sign flip); missing/redundant-equation hints from the Dulmage–Mendelsohn split of C1's graph ("you still need an equation with X", "this adds nothing new"). Test: each handler names its slip; one unknown short → the hint names that unknown; a redundant equation is named.
- [ ] Pilot lessons: disc and hanging mass (Στ = Iα with a = αR; second route by energy) and rolling down a ramp (solid vs hollow sphere), with problems from the user or from CC BY / CC BY-SA sources (not current OpenStax, which is CC BY-NC-SA), each with its `source`; textbook answers compared within their significant figures.
- [ ] All tests pass. Cache bumped. One line here on what changed; decide with the user whether to write the rest of the course and whether C6 is needed.

## Phase C6: fuller hints (only if the pilot shows they're worth it)
**Start with:** `Do phase C6 in ROADMAP.md.` Read plan section 8 (hints).
- [ ] "Next step": what is sought → which principle → the route with the most steps already done (Andes's rule).
- [ ] More "What's wrong?" handlers, mined from the slips seen in the pilot (dropped term, wrong component, unit slip, …), each with its test.
- [ ] All tests pass. Cache bumped. One line here on what changed.

---

## Phase 10: the new look
**Start with:** `Do phase 10 in ROADMAP.md. Show me a mockup of the main screen before changing index.html.`

Mood: late-'90s/early-2000s TV and film animation and science shows: bold outlines, flat cel colour, playful science-show energy, a hint of anime-era mecha UI panels and handheld-game menus. These are mood references only. Draw nothing from those shows: no characters, logos, title lettering or recognisable designs.
- [ ] Palette: soft pastels, like a 2020s K-pop album cover (sky blue, bubblegum pink, cream, soft lilac), with one bright accent. The four variable-state colours keep their meanings and stay readable (checked for contrast).
- [ ] One small **original lemur** character, in that cel-animated style, as an occasional guide (for example beside the hint line). It never covers content, holds still in calm mode, and is not a copy of any TV lemur. Lift the old "no cartoon gags" rule for this one character only, and update the smoke test that forbids `#mascot` on purpose.
- [ ] Field background, panels, buttons, tabs and toolbar restyled together. Calm mode and the 1440×900 layout check still pass.
- [ ] Update the UI rules in `CLAUDE.md` to describe the new look.

---

## Done
- Pixel night skin and glowing vector field (2026-11-05).
- Draw toolbar, folder tabs, turnable force/v/a arrows, centre of mass, ramp and shape resizing, undo (2026-11-05).
- Phases A–E2 of the original plan: symbolic engine, motion ladder, build canvas with free-body diagrams, scenarios and "what matters", one workspace, draw first. Details in `docs/architecture.md`.

## Later (not scheduled)
- Energy and momentum: snapshots and stages with per-stage conservation choices; an energy bar chart and a momentum before/after diagram that write equations. Gate: block m from rest at height h on a frictionless ramp sticks to M, slides on a floor with μk: d = (h/μk)(m/(m + M))², independent of g; fraction of K lost = M/(m + M). Plan: `docs/phase-e-design.md`.
- Energy shown as soft glowing clouds, more practice problems, pasting a homework problem for setup.
