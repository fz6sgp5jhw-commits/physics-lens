# Physics Lens roadmap

One phase per Claude Code session. Start a session with the line under **Start with**, run `/clear` when the phase is done. A phase is done when its boxes are ticked, all tests pass, and this file says what changed.
Order: function first, style last. Phases 1–3 are in priority order; 4 builds on 3.

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
- [ ] **Open question (ask before building):** should each stage unlock only after the previous one passes its check, like levels, or can the student move freely while stars show progress?
- [ ] Four stages that match how the student works: **Setup → Forces / motion diagram → Conditions → Solve**. The step tracker shows these four, and each earns a star when its check passes.
- [ ] Only the current stage's panel is open beside the canvas: the free-body checklist in Forces, conditions in Conditions, and the sheet and path in Solve. Conditions are never below the fold.
- [ ] When a quantity varies with time, show its calculus relationships at the top of the Conditions and Solve stages: θ → ω = dθ/dt → α = dω/dt, and x → v → a, with ∫ needing a start value. Show which rung each given sits on.
- [ ] Multi-part problems: every value found in part (a) stays as a known for (b), (c)…, and is labelled as found, with its part. Clearing a part asks first.
- [ ] Sheet: one tap from anywhere (a pinned tab or panel). Cards appear in solving order and are numbered as steps; each says which earlier step it uses.
- [ ] Settled by the drawing: v drawn up or down the slope sets "Moving", and a rough surface sets friction. Conditions only asks what the picture can't show.
- [ ] Update `tests/workspace.test.js` for the new layout on purpose, and add a test for carrying values between parts.

---

## Phase 3: rotation
**Start with:** `Do phase 3 in ROADMAP.md.`

Problems seen in class: defining ω(t) was hard. Given θ(t), finding the revolutions between the time ω = 0 and the time θ = 0 wasn't possible. There was no visible way to get tangential acceleration.
- [ ] Easier function entry: type ω(t) = γ − βt² in one box, with symbols allowed, then a preview of the parsed function. The same box works for θ(t) and α(t).
- [ ] Targets **between two moments**: Δθ between "when ω = 0" and "when θ = 0" (or any two events or times), and **revolutions** = Δθ / 2π. If ω changes sign in between, the angle travelled is not just Δθ: say so and offer both.
- [ ] Average angular velocity and **average angular acceleration**: ω_avg = Δθ/Δt and α_avg = Δω/Δt over a chosen interval, alongside the instantaneous α(t) = dω/dt.
- [ ] Points on a rotating body: v = rω, **tangential acceleration a_t = rα**, centripetal a_c = ω²r = v²/r, and total acceleration. They are added as library equations and also reached from the drawing (phase 4).
- [ ] Gate tests, written first with hand-worked numbers:
  - the fan blade ω(t) = γ − βt²: when ω = 0, α(t), average α over an interval, and the revolutions between two times;
  - θ(t) given: the revolutions between "ω = 0" and "θ = 0";
  - a_t and a_c for a point at radius r.

---

## Phase 4: a diagram library (notation and recognition)
**Start with:** `Do phase 4 in ROADMAP.md.`

Idea: chemistry has a formal drawing language (line drawings, implied carbons), so drawings can be read. Give mechanics diagrams the same: a small, fixed set of components, each drawn one standard way and each tied to the equations it brings.
- [ ] A component library in `data.js`. Each entry has a standard drawing, named properties (and the variables they create), how it connects (rests on, hangs from, pivots at), the arrows that belong to it, and the equations it produces. Components: surface, ramp, block, particle, ball, wheel/disc, rod, pulley, string, spring, pivot, plus arrows for force, v, a, ω, α.
- [ ] Teach the notation: a "Diagram library" drawer, like the equation library, showing each component's standard drawing and what it means. Hovering a toolbar tool shows the same card.
- [ ] Recognition of freehand strokes: a line to a ramp or surface, a closed loop to a ball or wheel, a box to a block, an arrow to a vector. Snap to the standard form, and ask when the stroke is ambiguous. Recognition rules live in one place and can be tested with recorded strokes.
- [ ] Recognised rotation: when a wheel or disc is given ω or α, a button appears on it. Pressing it shows a point's v, a_t and a_c vectors and their equations, and adds them to the sheet if the student chooses.
- [ ] Classroom guidance: each component card has one "what to check" line, such as "a normal force is perpendicular to the surface".
- [ ] Gate: set up each practice problem from freehand strokes; the wheel button shows correct vectors for a sample ω and α.

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
