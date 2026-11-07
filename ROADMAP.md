# Physics Lens roadmap

One phase per Claude Code session. Start a session with the line under **Start with**, run `/clear` when the phase is done. A phase is done when its boxes are ticked, all tests pass, and this file says what changed.
Order: function first, style last. Phases 1–3 are in priority order; 4 builds on 3; 4b smooths what 3 and 4 built.

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
  - Left for phase 5 (visual): force chips' colours (`.fchip` border-color) and `#dlg` border colours are hidden by the pixel border images.

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

## Phase 5: the new look
**Start with:** `Do phase 5 in ROADMAP.md. Show me a mockup of the main screen before changing index.html.`

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
- Torque diagrams (Στ = Iα), energy shown as soft glowing clouds, more practice problems, pasting a homework problem for setup.
