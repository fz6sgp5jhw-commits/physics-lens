# Physics Lens

A guided problem-solving lens for intro calculus-based mechanics, used in classrooms. The student makes every physics decision (draw the setup, forces, axes, conditions, which equations); the app does the bookkeeping, checks the reasoning, and shows every algebra step, symbols first, numbers last. Goal: reasoning skill for new students, still useful to anyone analysing a physical system.

**Current work: see `ROADMAP.md`.** Do only the phase you are asked to do; tick its boxes when done.
**Drawing first (phases 6a–9):** the design is `docs/drawing-first-plan.md`; read only the sections your phase names. Drawing-first is the default mode and guided mode (stages, sheet, Show me) stays behind a toggle. New code goes in new files (`js/setup.js` part cards and vocabulary, `js/algebra.js` the workspace), not into `app.js`.
**Core rebuild and course (phases C1–C5, next in order):** the design is `docs/core-plan.md`; read only the sections your phase names. The app will grow into fluids, thermo and Physics 2 through subject packs (`js/packs/`), so formats come first.
**Subagents (save tokens):** run tests with the `test-runner` agent and find code with `code-scout` (`.claude/agents/`, both Haiku), so long output and whole-file reads stay out of the main conversation.
**How the code works** (state, solvers, templates, path finding, tests in detail): `docs/architecture.md`. Read the section you need, not the whole file.

## Stack (keep it this way)
Plain HTML + ES modules. No build step, no framework, no bundler, no runtime dependencies, no web fonts (system UI font for text, system monospace for equations). All CSS lives in `index.html`.
- Run: `python3 -m http.server` in the repo root, open http://localhost:8000
- Hosted: GitHub Pages from `main` (repo `fz6sgp5jhw-commits/physics-lens`). Installable offline app (`manifest.webmanifest`, `sw.js`).
- Files: `js/data.js` physics content, solvers and the diagram library · `js/expr.js` expression engine · `js/app.js` state, UI, solving, checking · `js/torque.js` beam/disc free-body math (lever arms, Στ) · `js/build.js` drawing canvas · `js/recognize.js` freehand-stroke rules · `js/field.js` animated background · `tests/` Node test runner + playwright-core (drives installed Chrome; app state is `window.__rl`).

## Tests
- Run: `node --test tests/*.test.js` (114 tests; `npm run test:fast` for the Node-only set). Show only the summary: `… 2>&1 | grep -E "^✖|ℹ (pass|fail)"`.
- From phase 6a, `openApp` in `tests/helpers.js` opens guided mode unless given `mode: 'draw'`. While working, run only your phase's test file; run the full suite once before committing.
- All tests pass before every commit. Change a test only when the roadmap phase you are doing changes that behaviour on purpose, and say so in the commit message.
- Layout check: at 1440×900 after solving, the problem, canvas, conditions and latest solved card are visible without scrolling (`tests/workspace.test.js`).

## Physics rules (never break)
- **Math is computed by code, never guessed or written by a model.** Each equation's `sub` template is the single source of its answer, evaluated for numbers and simplified for symbols by `expr.js`. No arithmetic anywhere else.
- Signs come from directions chosen by the student (direction toggles, drawn arrows), never typed minus signs. Sign conventions are explicit per unit.
- Rewards (glow, stars, SOLVED) appear only for correct physics. Hints name what's missing; they never solve.
- Roots and branches are chosen deliberately and explained (first positive time, rejected roots listed).

## UI rules
- Variable colours mean the same everywhere: given cyan `#4fd1ff`, found amber `#ffd166`, target pink `#ff6bd6`, unknown grey. A restyle may change shades but must keep four distinct, accessible state colours.
- Decoration never covers equations, numbers or the drawing. Calm mode stops all motion and honours "reduce motion".
- Keep element ids and the classes the JS or tests use. If a change needs a different structure, list the changed ids/classes in the commit message.
- Art is original only: no copyrighted characters, logos or real people, even "in the style of".
- UI text: plain, short, second person; it explains the physics behind every error.

## Data and safety
- All data stays on the student's device. No accounts, analytics, trackers, third-party scripts, CDNs or network calls except loading the app's own files.
- Stored data: `localStorage` only, keys prefixed `pl-` (the existing `rl-calm` key is the exception), always inside `try/catch`, JSON validated on read, and never anything identifying a student. Any new stored data needs a visible way to clear it.
- Text the user types or pastes (problem text, symbol names, coefficients) is untrusted: never put it into `innerHTML` unescaped; use `textContent` or the shared `esc()` helper in `app.js`. No `eval`, `new Function` or inline event handlers.
- `sw.js` caches only same-origin GET requests. When any cached file changes, bump the cache name in `sw.js`.

## Code style
- Lean but readable: remove dead code and duplication, merge repeated logic, prefer data tables to repeated branches. Don't pack code into long one-liners just to cut lines.
- Small, focused commits. Never commit `node_modules`.

## Saving context (tokens)
- **Usage stop rule:** after each roadmap checkbox, check usage (the session usage tool). If the 5-hour limit is past 75% or this conversation is past 40% of its context window, stop cleanly: run the phase's own tests, commit what is done (even if the phase isn't finished), and write one line under the phase in `ROADMAP.md`, `Resume from: …`, naming the next unticked box and anything half-built. Then tell the user to `/clear` and start the next session with the same line. A session that starts and finds a `Resume from` note continues from it and deletes the note when the phase is done.
- One roadmap phase per session; the user runs `/clear` between phases.
- `app.js` is ~2,300 lines: `grep -n` for the function you need and read that range; don't read whole files without a reason.
- Filter long command output (tests, git diff --stat). Take screenshots only to check layout or visuals.
- When a phase is finished, update `ROADMAP.md` (tick boxes, one line on what changed) and, if the design changed, the matching section of `docs/architecture.md`, so the next session doesn't need to rediscover it.
