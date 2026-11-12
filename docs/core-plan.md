# Core rebuild and course: a design plan

Decided with the user on 2026-11-09. Phases C1–C5 in `ROADMAP.md` carry this out; each phase names the sections below to read. Read only those.

## 1. Why

Physics Lens is meant to last through the rest of the user's physics: rotation, torque and angular momentum now; fluids and intro thermodynamics next; then Physics 2 (electricity and magnetism, AC circuits, optics and waves). It should also hold homework problems, including ones with no diagram, and teach through a course of lessons.

Two kinds of things grow:
- **Data** (equations, quantities, lessons, saved homework) piles up, so its *format* must be settled now. A format change later means rewriting everything stored in it.
- **Engine** (what the code can compute) can grow later without touching data, as long as the formats leave room.

So the rebuild settles the formats and adds only the engine pieces that are cheap now. It adds no visible features: after C1 and C2 the app does exactly what it does today.

What it costs today, measured 2026-11-09:
- Every library equation has one hand-written solver per variable (53 `solve` blocks, 188 solvers). A Physics 2 chapter would need hundreds more.
- One flat `VARS` list (~80 quantities) in one `data.js` for every subject. Physics reuses letters (I: inertia / current; P: pressure / power; E: energy / field; V: volume / voltage; T: tension / temperature / period), so a flat list breaks.
- About 23 `S.ch === 'incline' | 'pulley' | 'rotation' | 'torque'` branches in `app.js`.
- Units know only m, kg and s (`BASE` in `expr.js`); no A, K, mol, no prefixes.
- No `exp`/`ln`; functions of time are polynomials only; path finding solves at most 3 equations together.

## 2. Equations: one line each (C1)

```js
N2: { label: 'F1', eq: '{W} = {m}{g}', kind: 'rel',
      cue: 'near Earth’s surface', meaning: '…', calc: '…',
      applies: c => …, needs: '…',
      solve: { /* only overrides, see below */ } }
```
- `eq` uses the existing template syntax (`{id}`, `½`, `√(…)`, `sin`, `²`…), now with `=`. It is the **single source** for every variable in it.
- `kind`: `'law'` (holds for any system you choose: ΣF = ma, Στ = Iα, W_net = ΔK, conservation of energy, of momentum, of angular momentum), `'rel'` (holds because of this setup: no slip, light string, f = μN, I of a shape), `'def'` (true by what a quantity means: v = dx/dt, K = ½mv², τ = rF sin φ). `cue` names the picture or wording that brings it in. The UI explains the difference in one line per kind.
- **Automatic rearranging** (`expr.js`, new `isolate(eq, id)`): when the variable appears once, walk the tree undoing each operation (add/subtract, multiply/divide, ², ³, √, sin/cos/tan ↔ inverse, exp ↔ ln); each undo writes a step with a plain `why` (reuse the wording of `algebra.js` `describe`). When it appears more than once and the equation is linear or quadratic in it, use `solveLinear` or the quadratic formula (± needs a `pick`). Anything else is a **load-time error** naming the equation and variable, so authors find out at once.
- `solve[var]` keeps only what code can't decide: `pick` (root choice and its note), `guard` (physics error), `alt` (special cases), `note`, or hand `steps` where the automatic wording reads badly. `sol.f(v)` is still derived at load time and returns the same shape as today.
- Migration rule: no hand solver is deleted until the automatic one agrees with it (numbers at random sample values, relative error < 1e-9; same branch where a `pick` exists). The C1 gate checks all 188.

## 3. Engine additions (C1)

- **Units:** base dimensions m, kg, s, A, K, mol; named units J, W, Pa, C, V, Ω, F, T, H, Hz, L, atm, eV (with their dimensions); prefixes n, μ, m, c, k, M on any unit; `dimEq` compares all bases. Conversions stay per quantity (`units: { … }`).
- **Functions:** `exp(…)` / `e^(…)` and `ln(…)`, parsed, evaluated, simplified as atoms (like sin/cos), units checked (the argument must have no unit).
- **Powers that aren't whole numbers** (added 2026-11-11, from the sample-exam audit): adiabatic gases need PV^γ with γ = 5/3 or 7/5. Any numeric exponent, or an exponent expression with no unit, is allowed; whole numbers keep today's exact expansion, the rest become an atom (like ln) so nothing is guessed. A numeric exponent multiplies the base's dimensions; a symbolic exponent needs a unitless base, so ratios are written out: P₂ = P₁(V₁/V₂)^γ. `isolate` undoes a power with the reciprocal power and solves for an exponent with ln.
- **Temperature offsets** (added 2026-11-11): °C is the one offset unit. Absolute temperatures (`absolute: true` on the quantity) convert with +273.15; differences (ΔT) and °C inside compound units (J/(kg·°C)) convert by 1; an absolute temperature can be shown back in °C. A °C temperature inside a product or ratio of units is refused with the reason. °F only if a course needs it.
- **Systems and path finding:** replace the pairs/triples search with the method used for large equation sets (Modelica-style causalization): a bipartite graph of equations and unknowns, a maximum matching (Hopcroft–Karp), then strongly connected components (Tarjan) give the solve order and the blocks that must be solved together; each block is solved by exact elimination over the engine's rational forms. The Dulmage–Mendelsohn split of the same graph names what is missing or redundant, which gives hints for free: an unmatched unknown → "you still need an equation with X"; a redundant equation → "this adds nothing new" (the matching and solve order are built in C1; these hints are wired up in C5). Kirchhoff loops will fit later.
- **Step checking** (used by phase 8b and typed lines): Andes's "color by numbers": substitute the solved values (symbols get random "ugly" positive values) into both sides of a student's line; use a **second** point with different values to close Andes's blind spot (a wrong term times something that is zero at the first point). A line follows from the previous one when both hold at both points; report the first line that doesn't, with a counterexample. Steps that square or divide by a symbol add a branch or non-zero condition. Guard like Isaac Physics' checker: refuse to judge when sampled values are too large or too small to compare.
- Not now (formats leave room): complex numbers (AC at this level uses magnitudes and phase angles), vector fields (directions stay toggles and drawn arrows; the right-hand rule becomes a direction choice), non-polynomial functions of time (needed for waves; one engine change later, see §10).

## 4. Quantities and subject packs (C2)

- A **pack** is one file, `js/packs/<id>.js`:
  ```js
  export default { id: 'mech', name: 'Mechanics', quantities, equations, chapters,
                   components, diagrams, lessons, practice, hooks,
                   license: { code: '…', content: 'CC BY-SA 4.0' } }
  ```
  Every problem in `practice` and `lessons` carries `source: { work, edition, license, url, problem }` (or `original: true`); an attribution list is built from these.
  Mechanics moves out of `data.js` into `js/packs/mech.js` (data.js keeps shared helpers: `fmt`, `posRoots`, builders). A registry (`js/packs/index.js`) loads packs, merges them and **refuses an id collision** at load.
- **Quantity ids:** mechanics keeps its bare ids (`w0`, `I`, `T`), so no test churn. Every new pack prefixes its ids (`fl.P`, `th.T`, `em.I`); the on-screen symbol can repeat across packs. A quantity entry is today's `VARS` entry plus `py` (its typed name in the algebra workspace) and `sample`.
- **Hooks** replace the `S.ch === …` branches. C2 starts by listing all 23, grouping them by what they decide (axis words, extra conditions, statics check, which diagram is offered, …) and making each group one hook with a default. Done when no unit name appears in `app.js`.
- Gate proof that a new subject needs no `app.js` edit: a small test pack (`tests/fixtures/demo-pack.js`, e.g. P = P₀ + ρgh) loads, shows in the library and solves with Show me.

## 5. One rule for diagrams (C2)

Every diagram type provides:
```js
{ kind: 'fbd', pack: 'mech',
  equations(state) → [{ id, eq, kind, why, from }],
  check(state)     → [{ ok, text }] }
```
The free-body builder (`fbdEquations`, `fbdCheck`) and `torque.js` (`equations`, `check`) are wrapped in this shape; behaviour unchanged. Later diagrams (energy bar chart, momentum before/after, PV diagram, circuit loop, ray diagram) plug into the same slot.

## 6. Notebook: a homework library (C4)

A problem is a saved record, with or without a drawing:
```json
{ "v": 1, "id": "…", "title": "…", "chapter": "…", "objectives": [], "text": "…",
  "parts": [{ "label": "a", "target": "…" }], "givens": [], "conds": {},
  "drawing": null, "board": null, "steps": [], "laws": [], "notes": "…",
  "created": "…", "updated": "…" }
```
- Stored in `localStorage` key `pl-notebook` (try/catch, validated on read). `v` is the format version; `migrate[v]` upgrades old records on load, so problems saved this year still open after future updates. Typed text is untrusted (`esc()` / `textContent`).
- Library view: list, search by chapter, objective and law used; open a problem into the workspace; save the current problem.
- **Export** (a `.json` file the student saves) and **import** (a file they choose), so the library can be backed up and moved. No network. A visible **Clear notebook** button, with a confirm.

## 7. Board: a quick organizing diagram (C4)

One generic board for every subject, stored in the problem record (`board`):
- Cards: `quantity` (coloured by state: given cyan, found amber, target pink, unknown grey), `equation` (shows its kind), `note`, `state` (a box for "state 1 / state 2", for energy, momentum or thermo processes). Arrows between cards, optional label.
- **Pathway map:** from a solved path, the board lays itself out as given → equation → found → target, so the route is visible. The student can also build one by hand before solving.
- **Notes:** free cards for formulas and reminders. No physics simulation, no checks: it organizes, it doesn't solve.

## 8. Course: lessons as data (C5)

Built on the notebook. The map stays open (any lesson, any stop); progress is stored in `pl-course` with a Clear button.
```js
{ id, chapter, objectives: [], title,
  stops: [ { kind: 'long' | 'twin' | 'transfer', problem /* practice id or inline record */,
             mode: 'guided' | 'draw', help: { glow, showMe, hints },
             prompts: [{ when /* stage or event */, text }],
             route: { laws: [], cues: [] } } ],
  recap }
```
- **Long** problem: full help; it is written to need the whole pathway (sometimes two routes, shown to agree). **Twin:** same pathway, a changed scenario, Show me and glow off. **Transfer:** a different-looking problem with the same principle, no help (drawing-first once that scenario is supported).
- The student **draws, then chooses the route**: after Setup, a "What's the route?" card asks for the law(s) and the picture cues that bring in relationships; a wrong choice is explained, never blocked.
- In a lesson, adding an equation first asks its kind (law / relationship / definition) with a short reason picked from a list (strategy writing: Leonard, Dufresne & Mestre 1996; principle-first analysis: Dufresne et al. 1992; novices sort by surface features, experts by principle: Chi, Feltovich & Glaser 1981; faded worked examples: Renkl).
- Early lessons run in guided mode, so the app shows the algebra rather than the student doing it; accepted by the user (2026-11-09). A lesson moves to drawing-first by changing `mode`.
- Prompts name the decision, never the answer. All answers come from code; only the lesson text is hand-written.
- **Hints, from Andes** (VanLehn et al. 2005): wrong entries turn red; a pop-up only for likely slips (a missing unit); "What's wrong?" runs error handlers that each try a small edit (swap sin/cos, flip a sign, drop a term) and re-check, the most specific one that makes the line correct wins; hints go **pointing → teaching → bottom-out**, and only bottom-out hints cost a star. "Next step" asks what is sought, then which principle, then walks the solution path, preferring the route with the most steps already done. Error handlers are data (one table per pack), in the spirit of STACK's potential-response trees: a test, then a true/false branch with its feedback.
- **Lesson content and licences** (checked 2026-11-09): current OpenStax University Physics is **CC BY-NC-SA 4.0** and its preface forbids feeding the text into generative AI without permission, so it is not used as is. Sources: the CC BY 4.0 copy of OpenStax University Physics on LibreTexts (CC licences can't be revoked), Crowell & Shotwell *Problems in Introductory Physics* and Crowell *Light and Matter* (CC BY-SA), Schnick *Calculus-Based Physics* (CC BY-SA), the user's own homework (kept private, not published), and original problems. Avoid NC material (MIT OCW, current OpenStax, WeBWorK OPL defaults, OLI) so the lesson data can stay CC BY-SA 4.0. Problems are adapted by hand, not by a model fed the source text. Only odd-numbered OpenStax answers are public: keep one test case at the source's numbers so the published answer checks it.

## 9. The next section's content (C3)

The user's next section objectives (2026-11-09): torque about a pivot; rotational dynamics with Newton's laws; whether a rotating body has rotational and translational kinetic energy; angular momentum; when it is conserved; rotational problems by conservation of energy and of angular momentum.
New library entries (one line each after C1), with kinds:
- `def` K_rot = ½Iω²; L = Iω; L = rp sin φ (a particle)
- `rel` v_cm = ωR and a_cm = αR (rolling without slipping); K = ½Mv_cm² + ½I_cmω² (rolling)
- `law` W_net = ΔK (with rotation); K₁ + U₁ + W_nc = K₂ + U₂; Στ_ext = dL/dt; L₁ = L₂ when Στ_ext = 0
- Conditions: "rolls without slipping", "fixed axis", "no outside torque" (conserves L), "rough axle does work W_f".

## 10. Later, on the new core (not scheduled yet)

Each is mostly a pack file plus its tests: fluids (`fl`, Pa, P = P₀ + ρgh, continuity, Bernoulli, buoyancy; tank and pipe parts), intro thermo (`th`, PV = nRT, Q = mcΔT, ΔU = Q − W, W = nRT ln(V₂/V₁); a PV diagram), E&M (`em`, Coulomb, fields, Gauss's law for symmetric cases, circuits with Kirchhoff loops), AC circuits (impedance and phase as magnitudes and angles, e^(−t/RC)), optics and waves (thin lens, Snell's law, sinusoidal waves). Waves need one engine change first: functions of time as expression trees, not only polynomials.

## 11. Saving tokens

- **Formats first, so later sessions are data sessions.** After C1–C2, a new chapter is equation lines and a lesson table: run those sessions on Sonnet at medium effort.
- **Read lists:** each phase in `ROADMAP.md` names the sections of this file and of `docs/architecture.md` to read. Nothing else is read whole; `grep -n` for a function and read that range.
- **Subagents** (`.claude/agents/`, both on Haiku):
  - `test-runner`: runs the given test files (or the full suite) and returns only the pass/fail counts and, per failure, the test name and the first lines of the assertion. Use it for every test run, so long output never enters the main conversation.
  - `code-scout`: read-only; finds where something lives and returns `file:line` ranges with a one-line summary each, not code. Use it before reading `app.js`.
- **Tests that rarely need rerunning** (decided 2026-11-09):
  - Fast and slow apart: `npm run test:fast` runs the Node-only files (engine, units, solvers, recognition, setup data) in seconds; `npm run test:browser` runs the files that open Chrome (17 of 20 today). Work against the fast set and the box's own test; run the browser set and the full suite once before committing.
  - Rerun only failures: `test-runner` reruns a failing test by name (`node --test --test-name-pattern "…" file`), never the whole suite.
  - Seeded random values (`tests/rand.js`): a failure prints its seed and `SEED=…` replays it exactly.
  - Self-explaining failures: every data-table case reports its id, inputs, expected and actual values, so a session can diagnose from the message without adding prints and rerunning.
  - Snapshots for refactors: before C1 changes any solver, record all 188 current results in `tests/fixtures/solvers.json`; the new code is compared with it, even after the hand solvers are gone.
  - One small test per checkbox, so a finished box is checked on its own.
- **Grouped sessions:** phases that read the same code share a session (C2 with C3); heavy design phases stay alone (C1, C4, C5).
- **One looping test per data table** (every equation's units and round trip; every lesson applied, solved and compared with its stored answers), so adding data adds no test code.
- **Answers from outside the app:** expected values come from hand working or the textbook's answer key, never from a first run of the code. Textbook answers are compared within a tolerance matching their significant figures (usually 3).
- Commit after each ticked box; the usage stop rule in `CLAUDE.md` applies, with `Resume from:` notes.
- At the end of C2, add a short function index for `app.js` to `docs/architecture.md`, so later sessions jump straight to a range.

## 12. Open questions

1. Problem texts and answer keys for the user's homework (spheres, turntable, wheel and block, table and pulley), for C5 lessons and later gates.
2. Whether the notebook keeps several attempts of the same problem or only the latest.
3. Whether to allow copied-in MIT libraries in `js/vendor/` (no build, no CDN, works offline, license kept beside them). Today's rules (no runtime dependencies, no third-party scripts) say no; section 13 assumes no, except dev-only test tools. Small permissive files (the ~400-line BSD $P/$Q recognizer, copied unit tables) would also need a yes here, or are rewritten in our own code.
4. The licence for lesson data: CC BY-SA 4.0 is the recommendation (it lets CC BY and CC BY-SA sources be combined); the app code's own licence is separate and not yet chosen.

## 13. Prior art: what to borrow (surveyed and verified 2026-11-09)

Full survey with sources: `reports/Open source physics tutor prior art.md` (kept outside git; notes in `research_notes/`). No open project does what Physics Lens does as a whole. The strongest ones are copyleft server systems (Andes LGPL-3.0, PrairieLearn AGPL-3.0, STACK and WeBWorK GPL), whose code would force their licence onto ours, or libraries bigger than the whole app. Rule: **borrow techniques and data tables; use libraries only as dev-only test oracles.** Check each repository's LICENSE file before copying anything; keep the notice with any copied table or file.

| Our piece | Open source | Licence | Use |
|---|---|---|---|
| Step checking, hints, next step (8b, C5) | Andes physics tutor (Common Lisp, last push 2018; VanLehn et al. 2005 "lessons learned") | LGPL-3.0 | **Technique only:** color-by-numbers checking with a second point, error handlers, pointing → teaching → bottom-out hints, next-step rule (sections 3 and 8). |
| Path finding and missing-equation hints (C1) | Modelica-style causalization: Hopcroft–Karp matching, Tarjan SCC, Dulmage–Mendelsohn | algorithms | Write our own (section 3). |
| Equivalence of a typed answer | Isaac Physics equality-checker (Python/SymPy) | Apache-2.0 | Technique: exact match → simplify → random sampling, refusing to judge when values are out of range. Its question content licence is unconfirmed: don't reuse content. |
| Hint data format (C5) | STACK potential-response trees | GPL-3.0 | Design only: test → true/false branch → feedback, as data. |
| Free-body arrow grading (drawing first) | PrairieLearn `pl-drawing` | AGPL-3.0 | Technique only: angle within 10°, start point inside a box along the arrow, length not graded, one-to-one matching, extra arrows penalised only after the required ones are present. |
| Oracle for rearranging (C1 test) | SymPy (Python, run from the test) or nerdamer-prime 1.5 (JS, ES module, ~174 KB gz); math.js 15 for equivalence and units | BSD; MIT; Apache-2.0 | **Dev-only.** Check that the rearranged result satisfies the original equation (difference simplifies to 0, or matches at random points), not that its form matches. Algebrite dropped (no release since 2021, no ES module). |
| Step wording (C1) | mathsteps (Google/Socratic, archived 2023, ~80 step types) | Apache-2.0 | Read its step names; borrow its shape: the student's move is the main step, automatic tidying shows as named sub-steps. |
| Units (C1) | Compute Engine unit tables (7 SI bases, all prefixes); js-quantities (~9 KB gz) | MIT | Copy unit and prefix definitions as data, with the notice; keep our own dimension code. |
| Runtime CAS (Physics 2, later) | Cortex Compute Engine 0.184 (pre-1.0, up to ~1.7 MB gz, units, solve, integrals, complex) or Pyodide + SymPy (~17 MB, MPL-2.0, offline-cacheable) | MIT / MPL-2.0 | Decide when Physics 2 starts, after a trial on real rearrangements (whether Compute Engine isolates one symbol in a many-symbol formula is unverified). Giac ruled out (GPL). Loaded only when needed, behind the engine interface. |
| Math keyboard and touch input | MathLive 0.111 (~228 KB gz + ~280 KB KaTeX fonts) | MIT | Not now: its fonts break the no-web-fonts rule; only if tablets matter (open question 3). |
| Drag-to-rearrange (phase 9) | Algebranch (TypeScript, active 2026); Graspable Math (closed) | GPL-3.0; closed | Design only: select a term and valid destinations light up; a circled "=" for both-sides moves (touch-friendly alternative to Shift); a branching history; Graspable's game (From Here to There) beat an active control in a ~3,600-student trial. |
| Pen recognition (`recognize.js`) | $P / $Q point-cloud recognizers (one ~400-line vanilla JS file each); perfect-freehand (~2 KB gz) | New BSD; MIT | $P/$Q can be copied with the notice if the box/loop rules fail too many strokes (stroke order and count don't matter; no rotation, so up and down arrows stay distinct). perfect-freehand for nicer strokes only. |
| Board layout (C4) | dagre 3.1 (MIT, ~16 KB gz) as a reference | MIT | Our own layered layout, ~150–250 lines: layers from card roles (givens → equations → found → target), placeholder nodes for long edges, a few barycenter sweeps, seeded from the previous order so cards don't jump; state boxes laid out as one node; note cards pinned. |
| Drawing canvas | Excalidraw (MIT, React and a build); tldraw (licence key for production); JSXGraph (75 MB) | — | Neither fits; keep `build.js`. Excalidraw's arrows that stay attached to shapes are worth copying as an idea. |
| Simulation | Matter.js, planck.js (MIT); PhET libraries (MIT, simulations GPLv3; post-2026-03-29 sims need a licence for commercial use) | — | Not needed; PhET for design ideas only. |
| Lesson problems (C5) | See section 8 | CC BY 4.0 / CC BY-SA | Not current OpenStax (CC BY-NC-SA 4.0). |

Techniques named so phases don't rediscover them: inverse-operation tree walk for `isolate` (C1); matching + SCC + per-block exact elimination for systems, Dulmage–Mendelsohn for hints (C1); two-point numeric step checking (8b, C5); layered DAG layout (C4); faded worked examples, Andes hints and next-step rule (C5); point-cloud stroke matching if recognition needs it (later).
