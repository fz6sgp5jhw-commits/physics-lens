# Rotation Lab

A retro, slightly unhinged homework companion for rotational motion. Pick a problem, mark the target, and follow the equations that light up when they have one unknown left. Every step of algebra is shown, numbers go in last, and the wheel replays the motion with your values.

How it works: you set up your own problem.
1. Pick the unit and add each given from the quantity palette (size + direction; the lab sets the sign).
2. Choose the conditions (friction, direction of motion, hidden givens like “starts from rest”).
3. Equations that apply and have one unknown left glow in the equation library. Gather the ones you need.
4. Add the target(s) the question asks for.
5. Solve glowing equations on your sheet; each answer can unlock the next.

Givens can be numbers or **symbols only** (m, θ, μk, g…). With symbols you get the answer in symbols, simplified (a = g(sin θ − μk cos θ)), and the lab checks it against the step-by-step numbers at random values.

When the angular acceleration **varies with time**, give θ(t), ω(t) or α(t) as a polynomial and use the **motion ladder** on your sheet: d/dt down a rung, ∫dt up (with the start value), put in a time, or find the time when a quantity has a value.

In the Diagram window, **Build** lets you assemble the setup from shapes (or load a template), and **Forces** is a free-body diagram builder: add each force, pick its direction from named options, and the lab writes the component table and ΣF = ma onto your sheet after checking the diagram (gravity, normal forces at contacts, friction only if the surface has it, the same tension on both ends of a string).

Units so far: Inclines & Newton’s laws, Tension & pulleys (block on a table + hanging mass, with or without friction), Rotation kinematics. The 📚 practice bank loads problem text only; “Check my setup” grades your givens, conditions and targets.

## Run it
Plain HTML and JavaScript, no build step. Serve the folder (for example `python3 -m http.server`) and open it, or host it on GitHub Pages (Settings → Pages → branch `main`, folder `/`). Once hosted, it can be installed as an app and works offline.

## Files
- `index.html`: layout and styles
- `js/data.js`: variables, equations and hand-written solving steps
- `js/expr.js`: expression engine (symbolic answers, numeric checks, units, polynomials in t)
- `js/build.js`: build canvas (shapes that snap together)
- `js/app.js`: path finding, solving, diagram, graphs, effects
- `js/sprites.js`: original pixel-art gags
- `sw.js`, `manifest.webmanifest`, `icons/`: installable offline app
- `fonts/`: Pixelify Sans, VT323 and Press Start 2P (SIL Open Font License)

## Tests (dev only)
The app itself has no dependencies. The tests use Node (built-in test runner) and `playwright-core` driving your installed Google Chrome.
- `npm install` once, then `npm test` (all), `npm run test:solvers` (solver round-trips, no browser) or `npm run test:browser` (practice bank, setup checker, smoke test).
- Set `RL_CHROME_CHANNEL` to use a different Chrome channel (for example `chrome-beta`).
