# Phase E design: one workspace, drawn problems, snapshots, energy and momentum

Status: proposal (2026-11-05). Replaces the Phase E row in CLAUDE.md once agreed.

## What changes and why

Feedback on the current app:

1. **The panels are too far apart.** Givens, conditions, library, diagram, sheet and work sit in seven separate windows over three columns, so one step of reasoning makes you look in three places.
2. **You can't draw motion.** On a slope problem you want to put an arrow on the block that says "velocity, this way". Today only forces can be drawn, and only in the Forces tab.
3. **The drawing should write the problem.** Like Molecule Lab, where drawing a molecule gives its IUPAC name, drawing a setup should give the problem statement.

Phase E (snapshots, energy and momentum) needs all three: a collision problem is a sequence of moments, each with vectors, and the student should see that sequence as one picture.

## 1. One workspace (layout)

The diagram becomes the main surface, the way the canvas is in Molecule Lab.

- **Top:** the problem statement, written from the drawing. You can still type or paste your own text underneath it.
- **Centre, large:** the canvas. Its toolbar holds shapes (ramp, block, ball, wheel, pulley, string, floor, table), **Vector**, **Snapshot** and **Forces**. The free-body builder opens on the body you click, in place, instead of in a separate tab.
- **Under the canvas:** the snapshot timeline and its stages (see 3).
- **Right of the canvas:** the diagrams that write equations for the selected stage (energy bars, momentum arrows, free-body components).
- **Bottom:** the sheet. Equation cards in a row; solving one opens its work **under that card**, not in a separate window. The path is the row of solved cards, in order.
- **Drawers instead of windows:** the equation library slides in from the side when you press Gather; givens and conditions live in a slim strip above the canvas as chips (click a chip to edit it).
- Effects, colours and calm mode stay as they are now.

Gate: at 1440×900 the statement, the canvas, the stage diagrams and the latest solved card are on screen together without scrolling.

## 2. Vectors on the drawing (and givens from them)

- **Vector tool:** drag from a body to draw an arrow. It snaps to named directions (along the slope up/down, horizontal, vertical, perpendicular, or at an angle you name). You pick the quantity: v₀, v, a, Δx, F, p … and give its size as a number, a symbol, or "?" (a target).
- An arrow **is** a given: "v₀ = 3 m/s, down the slope" sets the value and its sign from the axis, exactly like the editor does now. Deleting the arrow deletes the given. Givens entered in the editor show up as arrows.
- Properties of shapes become givens the same way: the ramp's angle θ, a block's mass m, a height h (a dimension line you drag), a surface's μk.
- Conditions are read from the drawing where possible: "rough surface" sets kinetic friction; a v₀ arrow of size 0 or a "starts at rest" badge sets the hidden given; a snapshot with no velocity arrow asks you whether it is at rest.

## 3. Snapshots and stages (Phase E proper)

- **Snapshot tool:** click points along the path to mark moments ①②③④. Each snapshot holds that moment's vectors (v, p) and heights.
- Between snapshots are **stages**. For each stage you choose what holds: energy conserved; energy plus work by friction or a push; momentum conserved (brief collision, or no outside force); or none of these.
- **Energy bar chart** per stage: bars for K, U_g, U_spring before; work in or out; K, U after; and heat. You choose which bars exist. The app writes `before + work = after` with each bar as a term (K = ½mv², U = mgh, heat = f·d).
- **Momentum diagram** per stage: arrows for each object before and after; the app writes `Σp before = Σp after` along the chosen axis.
- **Checker:** energy conserved across a sticking or inelastic collision; momentum conserved while friction or gravity acts along the motion for a long time; a heat bar missing where there's friction; a bar for an object that isn't there.
- Quantities get a snapshot index automatically (v₁, v₂, h₁ …); the sheet treats them like any other variables, so the existing solving, symbols, units, ladder and "what matters" all work across stages.

Gate (from the design doc): block m from rest at height h on a frictionless ramp sticks to M, then slides on a floor with μk:
d = (h/μk)(m/(m + M))², independent of g; fraction of K lost in the collision = M/(m + M).
The checker must flag "energy conserved" if chosen across the collision.

## 4. The drawing writes the problem statement

Code, not a model, writes the text, from a small grammar over the canvas model (like IUPAC naming rules):

- **Objects:** "a block of mass m", "a ramp inclined at θ", "a floor with kinetic friction μk".
- **Relations:** "on", "at the top of", "hanging from", "tied by a string over a pulley to", "touching".
- **Vectors:** "moving at v₀ down the slope", "starts from rest", "pushed by a horizontal force F".
- **Snapshots and stages:** "slides down", "hits and sticks to", "slides until it stops".
- **Targets:** "How far …?", "How fast …?", "How long …?", "Rank … by …".

Each sentence links back to the shape or arrow it came from (hover to highlight). The statement updates as you draw. The four Phase A–D gate problems and all practice-bank problems become tests: drawing their setup must produce a statement whose facts match the bank text (same objects, givens, directions and targets).

Reverse direction (paste a homework problem and have it drawn) stays in "later", as already agreed.

## Build order inside Phase E

| Step | What | Size | Gate |
|---|---|---|---|
| E1 | One workspace (layout, inline work, library drawer, chips strip) | M | All 56 current tests pass; the 1440×900 layout check above |
| E2 | Vectors on the drawing; shape properties and vectors become givens | M | Each Phase A–D gate problem can be set up by drawing alone |
| E3 | Problem statement from the drawing | M | Drawn practice problems produce matching statements |
| E4 | Snapshots, stages, energy bars, momentum diagrams, checker | L | The ramp–collision–friction gate above |

E1 to E3 are what you asked for directly; E4 is the original Phase E. Each step ships on its own, with all earlier tests passing.
