# Redesign plan (phase 10): the pen-and-ink journal

Approved by the user on 2026-11-13 from the live prototype `mockups/redesign-ink.html` (open it first; it is the reference for
every visual decision below). Earlier prototypes, kept for comparison only: `mockups/redesign.html` (night), `mockups/redesign-journal.html` (sepia).
The prototypes solve no physics; they show the look and one interaction.

## What the user asked for
- The app felt static, the steps did not feel connected, the teaching did not explain enough, and it was hard to use on a phone.
- Look: an old journal or wizard's book. Paper pages, black pen-and-ink drawings (heavy outlines, solid black shadows with white
  highlight lines, fine hatching, stippling), lettered titles with plain captions beside each part, and colour used as "magic ink".
- No mascot for now (the lemur is dropped). Phone layout and laptop layout both matter.
- Rules changed in `CLAUDE.md` the same day: open-licence fonts stored in the repo are allowed; art may be similar in mood to the
  user's references but never copies a specific character, logo or illustration.

## The look (take values from the prototype's CSS)
- **Desk and pages:** dark brown desk behind; pages `--paper #efe0bd` with a lighter corner, darker edges and a grain texture
  (inline SVG `feTurbulence`, multiply). On laptop the app is an open book: two pages with a shadowed gutter.
- **Ink:** near-black `#141009` for outlines and text; captions in a plain hand (`Chalkboard SE` fallback chain); headings in a
  lettered display face (`Luminari` fallback chain). Explanations stay in a readable serif (`Iowan Old Style`, Palatino, Georgia).
  Equations keep monospace. If font files are added, put them in `fonts/` with their licence (ask the user before downloading).
- **Magic ink (the four state colours, darker so they read on paper):** given blue `#1f8fe0`, found amber `#e08a00`, target rose
  `#d93fae`, unknown grey dashed outline `#8d8474`. Also green `#1fa85e` (done, correct), violet `#8a4be0` (aura), red `#c8342b`
  (wax seal, warnings). Quantities are drops of glowing ink; forces are drawn in glowing ink over the black drawing.
- **Motion:** a faint casting circle of the problem's own symbols turns slowly behind the drawing; golden motes drift; the target
  drop breathes; a correct step makes its equation write itself across the page in glowing green, then settle to ink. Calm mode
  and "reduce motion" stop all of it.
- **Main action:** one wax-seal button per step. Secondary actions are underlined pen links.

## Layout
- **Phone (under ~900 px):** one column, no sideways scroll, in this order: title and where you are, the method (steps), the
  sketch, the teaching for this step, quantities. Tools sit in a fixed thumb bar (targets 44 px or more), with the one that
  matters now highlighted. One step's tools at a time. Captions on the drawing open on tap.
- **Laptop:** the open book. Left page: title, the method, quantities, the teaching text for the current step. Right page: the
  sketch, then the step's main action. At the Solve step the right page holds the algebra and the sketch shrinks into the left.
- The current layout gate (`tests/workspace.test.js`, 1440×900: problem, canvas, conditions and latest solved card visible)
  will be rewritten on purpose for the new layout; say so in the commit.

## Steps feel connected (the "intertwined" part)
- The method is always visible: i. Gather the givens, ii. Sketch the setup, iii. Name the forces, iv. Set conditions,
  v. Work the equations, vi. Play it back (vi is phase 12). Done steps are struck through in green; the current one is
  underlined in glowing amber.
- What one step decides shows up in the next: givens become ink drops that stay on the page; a completed free-body diagram
  writes its equation onto the page; the plan ("block: ΣF, disc: Στ, link still needed") is built from the drawing.
- Teaching sits on the page beside the work: a short "what matters here" for the current step, and a caption on each drawn part
  (use `js/concepts.js` cards and the lesson's `guide` data; no new physics text invented in the view).

## Build order (each stage ends with its tests green and a commit)
1. **Tokens and pages.** Replace the pixel-frame variables in `index.html` with the paper, ink and magic-ink tokens; restyle
   cards as pages, buttons, inputs, tabs, chips. Keep every id and class the JS or tests use. Fix phone overflow (today the
   guided screen is 1,676 px wide at 375 px and shows 128 buttons).
2. **The method strip and thumb bar.** Restyle `#steps` as the method list; on phones move the current stage's tools into the
   fixed bar; show one stage at a time.
3. **Pen-and-ink shapes.** `js/build.js` renders shapes in the pen style (heavy outline, black shadow, hatch patterns as SVG
   `<pattern>`s, rough filter). The Motion canvas (`#dg`) gets the same ink palette. Captions per part.
4. **Magic.** Casting circle behind the drawing, motes (replace `js/field.js` drawing with motes; keep its calm-mode switch),
   the equation that writes itself on a correct step, the wax-seal main action.
5. **Notes page and prototypes.** Restyle `concepts.html` to match; delete `mockups/` when the app matches the prototype.
6. **Rules and checks.** Update the UI rules in `CLAUDE.md`; check the four state colours and body text for contrast on paper
   (4.5:1 for text); calm mode; the rewritten layout gate; full suite; bump the cache.

## Not in this phase
- The lemur (dropped for now). Problem playback and the energy graph (phase 12). New physics content.
