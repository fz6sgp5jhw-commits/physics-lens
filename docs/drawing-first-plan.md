# Drawing first: a design plan

Status: agreed (2026-11-08). Built in phases 6a–9 of `ROADMAP.md`; each phase names the sections of this plan to read.

## What changes and why

Today the app walks the student through four locked stages (Setup → Forces → Conditions → Solve), and the solving is done for them: they pick an equation, press Solve and watch the algebra. The goal is different:

1. **The student draws the problem, and the drawing is understood.** Rod, blocks, pivot and string are recognised as they are drawn today.
2. **The drawing suggests conditions; the student decides.** One popup, after drawing, asks what the picture can't show: clamped or hanging, negligible mass or not, and so on.
3. **The student defines the system:** what can move (degrees of freedom), the constraints, distances and axes, and the list of knowns. Picking the knowns and dropping what isn't needed is the hard part, so the app makes it visible but doesn't do it.
4. **The student does the algebra.** They pick relationships from a formula sheet, then work each line themselves with the mouse or the keyboard. Numbers go in at the end, and the work is checked at fixed points.

The rules in `CLAUDE.md` stay. The code does every computation exactly (each operation the student asks for, every equivalence check, every number), never a model. Signs come from drawn directions. Rewards only for correct physics. All data stays on the device.

Worked example used throughout: three small blocks of mass m are clamped at the ends and at the centre of a rod of length L and negligible mass. (A) Find I about an axis through the centre, perpendicular to the rod. Answer: I = mL²/2. A likely part (B), with the axis at one end, gives 5mL²/4.

## 1. Two modes

- **Drawing-first** is the default.
- **Guided mode**: today's stages, sheet, Hint and Show me, unchanged, behind a toggle in the app bar (for teachers, or to check an answer). The code stays; it's hidden, not deleted. Existing tests run in guided mode.

## 2. The flow, end to end

1. **Draw.** Pen or toolbar, as today. There is no problem-text box in drawing-first mode (decided 2026-11-08): the drawing, the popup and the toolkit are the only sources of knowns. A block is put on a rod with a **link** tool: draw the block anywhere, then link it to a point on the rod (whether it's clamped, hanging or resting is asked in the popup). Recognition snaps strokes to standard parts. Nothing pops up while drawing.
2. **Done drawing → the setup popup** (section 3): one popup that goes through every part and every link, then closes.
3. **Freedoms and constraints** (section 4): the student says what can move; the constraints from the popup remove freedoms.
4. **Toolkit** (section 5): the student measures distances, places axes and names angles. These become knowns or relationships.
5. **Knowns, unknowns and the counter** (section 6).
6. **Formula sheet** (section 7): the student chooses relationships.
7. **Algebra workspace** (section 8): the student manipulates, condenses and substitutes.
8. **Numbers last** (section 9), then the **final check** (section 10).

The student can go back to any step; later steps update or say what they lost.

## 3. The setup popup (needs the most care)

It opens once, when the student presses **Done drawing** (and again on demand from a button, or when a part is added later). It must be impossible to get lost in, so:

- **One thing at a time.** The part being asked about glows on the drawing; everything else is dimmed. A short header says "Part 2 of 5: the rod".
- **Order:** bodies first (rod, then blocks left to right), then links (each block to the rod), then the whole system (axis, Earth or not).
- **Conditions are set only on the screen** (decided 2026-11-08): each question is a short list to click, no typing. This replaces the earlier "list plus typing" idea.
- **Wording: the physics term plus one plain line** (decided 2026-11-08), e.g. "Point mass: so small that only its distance from the axis matters."
- **Dots, any order** (decided 2026-11-08): after Done drawing, every part shows a pressable dot with its title ("Rod", "Block 1" …). Tapping one opens that part's card: its condition groups and its properties. Parts can be set in any order; a counter says "3 of 5 parts set", and the summary opens when all are set (or on request). This replaces the one-part-at-a-time walk-through; the "one thing at a time" rule above still holds inside a card (its part glows, the rest dims).
- **Every part's quantities have their own names** (decided 2026-11-08): block 1's mass is always m₁, block 2's is m₂, the rod's length is L_rod, and so on. On a card the student clicks a property ("has mass") and is asked what it is: a symbol (m) or a number. That writes a relation: m₁ = m. Doing the same on the other blocks gives m₂ = m and m₃ = m, so equal masses come from the student's own entries. The knowns list shows each relation. A value of the wrong kind (a length typed for a mass) is refused with a reason.
- **Symbol now, number optional** (decided 2026-11-08): beside the symbol is an optional value box with a unit picker (0.5 kg). The number stays with the symbol until numbers go in at the end (section 9), so the algebra stays in symbols.
- **Every choice says what it means physically, and what it adds:** a known, a constraint or a relationship. Example: "Clamped: the block can't slide or turn on the rod; it moves with the rod. Adds: its distance from the axis stays fixed."
- **"Not sure" is always an option.** It explains how to tell from the problem text, and leaves the question open (shown as open in the knowns list).
- **Nothing is chosen for the student, and there is no ranking to second-guess** (decided 2026-11-08). Each kind of part has a fixed, plain list of what it *can* have (a mass: small/point, has size, rests on something, hangs, is clamped, is fixed…); the student ticks what applies.
- **Context adds suggestions, never picks them.** Basic assumptions are always listed. Drawn vectors and contacts add the ones that only make sense then: a v or a arrow, or a body on a surface, adds friction (kinetic or static), the normal force, “moves at constant speed”; a string adds inextensible and massless; a pivot adds the hinge force.
- **Grouped by question, one choice per group** (decided 2026-11-08). For a block: *Size* (point mass / has size), *Held by* (clamped / hanging / resting / fixed / free), *Where* (left end / centre / right end / at a distance). Groups that don't apply yet are hidden.
- **Suggestions brought by later drawing wait for the next Done drawing** (decided 2026-11-08). A vector or contact drawn after the popup doesn't interrupt; its suggestions appear, marked new, the next time the student presses Done drawing.
- **No symbol bank** (decided 2026-11-08): values are typed on each part's card, with the Python-style names.
- **Cards offer mass, size and position**, and only what fits what's drawn (decided 2026-11-08): a block with no vectors gets the stationary groups (Size, Mass, Held by, Where). Motion groups and their suggestions (friction, constant speed) appear only once a v or a arrow is drawn.
- **A rod's length and the positions along it: marks and segment labels** (decided 2026-11-08). The rod shows a tick at every point of interest: its ends, its centre, each linked block and the pivot (the student can add a tick, for a point at distance d). The rod's card asks its length (L_rod = L); the student labels the gaps between ticks with dimension lines (L/2 and L/2), as on paper. The app writes no distances itself; that the gaps add up to the whole rod is checked when the student uses a check. Any tick can be given a letter (A, B, C, as in textbook figures), shown on the drawing and usable for distances and axes ("from A to B").
```
  block1      block2      block3
    ■           ■           ■
    |===========|===========|
    |<-- L/2 -->|<-- L/2 -->|     gaps labelled by the student
    |<--------  L  -------->|     the rod's length (its card)
```
- **Connections** (decided 2026-11-08): one connect tool. Drag from one part to another (a block to a point on the rod); a connector appears with its own dot and card, which asks what it is: clamped, resting on, hangs by a string, sliding along. A connection to a rod adds a tick there.
- **Strings** (decided 2026-11-08): drawn with the same tool, dragged from the first body over each pulley to the last. A string snaps to a pulley's rim and leaves a disc's rim along a tangent; the pen can sketch it too and it snaps the same way. Each string has its own tension name (T₁, T₂ …). The ideal-string assumption gives one tension all along a string, even over a massless pulley. The student types what it is (T, or a number) only if the problem gives it; otherwise it is an unknown.
- **A block hung by a string is a body of its own** (decided 2026-11-08): it gets its own card and free-body diagram (weight down, tension up), so the student works out the tension from it and uses it at the beam's hook. (Guided mode keeps treating it as a load.)
- **A string's slant** comes from its drawn direction (it snaps to vertical, horizontal or a slant). For a slant the student uses the angle tool between the string and the beam or the axes, and names the angle (φ) or gives a number (decided 2026-11-08).
- **No slip on a disc** (a = Rα) is an assumed default, listed in the summary ("overturned by: slips, slides on the rim") and changeable (decided 2026-11-08).
- **A pulley's card asks nothing in the first scope** (decided 2026-11-08): massless and frictionless are assumed and listed. Changing them (a pulley of mass M turns like a disc) is a later scope.
- **The rotation axis is a marker the student places** (decided 2026-11-08): the axis tool puts ⊙ (an axis out of the page, like Part A's "through the centre, perpendicular to the rod") or a dashed line in the page (an axis along or across a rod) anywhere on the drawing. A pivot drawn under a body offers itself as the axis, but the marker is always the student's choice. The torque reference point for Στ is chosen the same way.
- **Hinge forces: the student chooses how to draw them** (decided 2026-11-08): two component arrows along their axes (H_x, H_y, in any direction; a negative answer means that part points the other way, and the app says so), or one arrow at a guessed angle, split onto the axes like any force (unknowns H and θ). Both are accepted.
- **A pivot's card asks its kind**, with the force each kind can give (decided 2026-11-08): hinge or pin (any direction: two components) · knife edge or fulcrum (pushes up only: one normal force) · axle (holds a disc at its centre). Frictionless is assumed and listed.
- **A disc's shape adds its I** (decided 2026-11-08): picking solid disc, ring, solid or hollow sphere records the shape, redraws it (a ring as a thick rim, a sphere shaded) and adds its I_cm (½MR², MR², ⅖MR², ⅔MR²) to the knowns as a relationship from the card. This is the one place a card adds a relationship; the parallel-axis step to another axis is still the student's.
- **A choice that needs a missing part** ("hangs by a string" with no string drawn) is named at the summary like any conflict; the student draws it or changes the choice.
- **Conflicts are named at the summary** (decided 2026-11-08), with the reason ("block 2 is linked to the rod but marked free"); the student fixes one before closing.
- **A summary at the end** lists every choice, each clickable to change, before the popup closes.

Vocabulary for the first scope (torque unit, rod and point masses). **Draft 2, being workshopped.** Each part has groups; each group asks one question and takes one answer.

*Assumed* lines (decided 2026-11-08) are not asked one by one. They are the standard ideal model intro textbooks use unless a problem says otherwise: a fixed, hand-written default per part, not a statistical guess. The summary lists each one with a one-line reason and the words that would overturn it (e.g. "a pulley of mass M" → the pulley has mass), and the student can open any of them and change it.

**Rod or beam**
| Group | Choices | What each adds |
|---|---|---|
| Mass | negligible · uniform, mass M · given in pieces | M = 0 · weight Mg at the centre, I from the shape table · each piece's mass and place |
| Held by | a pivot or hinge · a cable · rests on supports · nothing (free) | a hinge force (H_x, H_y) · a tension · normal forces · no support forces |
| Turns about | where the student puts the axis marker (⊙ or a dashed line) | the rotation axis: r is measured from here |
| Assumed | rigid | every point turns through the same θ, with the same ω and α |

**Block (small mass)**
| Group | Choices | What each adds |
|---|---|---|
| Size | point mass · has size | I = mr² about the axis · needs its shape: I_cm + md² |
| Mass | has mass → what is it? a symbol (m) or a number with units | m₁ = m (block 1's own name equals what was typed); the same value on several blocks means equal masses |
| Held by | clamped to the rod · hangs from it by a string · rests on it · sits on a surface · free | moves with the rod, fixed r · its weight acts at the hook · a normal force · a surface contact · no link |
| Where (if linked to a rod) | left end · centre · right end · at a distance d from an end | its coordinate on the axes, typed by the student later |

**Disc or wheel**
| Group | Choices | What each adds |
|---|---|---|
| Shape | solid disc or cylinder · thin ring or hoop · solid sphere · hollow sphere | its I_cm, added to the knowns: ½MR² · MR² · ⅖MR² · ⅔MR² |
| Mass | negligible · mass M | I = 0 · M |
| Turns about | where the student puts the axis marker | the rotation axis (I = I_cm at the centre; elsewhere the student uses the parallel-axis theorem) |
| Assumed | frictionless axle | the axle's force has no torque |

**String or cord**
| Group | Choices | What each adds |
|---|---|---|
| Runs (from the drawing) | over a pulley · wound on a disc · tied to a beam · between two bodies | one tension T₁ along it · no slip assumed: a = Rα · a force at the knot · its pull on each body |
| Direction | from the drawing: vertical · horizontal · a slant, named with the angle tool | which component of T has a lever arm |
| Assumed | massless, doesn't stretch; doesn't slip on a disc | one tension along it; tied bodies share their acceleration along it; a = Rα |

**Pivot or support**
| Group | Choices | What each adds |
|---|---|---|
| Kind | hinge or pin · knife edge (fulcrum) · axle | pushes or pulls any way (two components, or one force at an angle) · pushes up only: N · holds a disc at its centre |
| Assumed | frictionless | no torque from the pivot itself |

**The whole system**
| Group | Choices | What each adds |
|---|---|---|
| Gravity | on Earth (g = 9.81 m/s²) · g as a symbol · not needed | g known · g a symbol · no weights |
| Motion | in equilibrium · spinning up or slowing (α ≠ 0) · turning steadily (constant ω) | ΣF = 0, Στ = 0 · Στ = Iα · Στ = 0, α = 0 |
| Added by context | friction on a contact (kinetic or static) once a v or a arrow is drawn on a sliding body; "moves at constant speed" once a v arrow is drawn | μ, f = μN · a = 0 |

Conditions are clicked, never typed, so there is no word matching.

## 4. Degrees of freedom, constraints and the counter

- For each body the student declares what it can do: **fixed**, **slide along x**, **slide along y**, **turn by θ**. Constraints from the popup remove freedoms and add their equations: clamped blocks share the rod's θ; an inextensible string links accelerations; no slipping gives a = Rα.
- A **live counter** shows unknowns against independent relationships chosen so far: "2 unknowns, 1 relationship: one more is needed". It never says which one is missing.
- For the worked example: the rod turns about a fixed axis (1 freedom, θ); the blocks are clamped (no freedoms of their own). Nothing about the motion is unknown, the unknown is I, and one relationship (I = Σmr²) is needed.

## 5. The toolkit

Tools beside the canvas for defining the system further:

- **Dimension lines** (decided 2026-11-08): like an engineering drawing, drag between two points and a line with end ticks appears with a label the student types (L, L/2, d). Lengths can come from dimension lines or from coordinates on the axes.
- **Distance:** drag between two points (the axis and a block, say) to define a distance. Write it from what's already known (L/2, L − d) or as a new symbol. It becomes a known or a relationship.
- **Axes on the diagram** (decided 2026-11-08): students superimpose x and y axes on the drawing and the free-body diagram because components become simple. Placing axes (origin and direction) does two things: forces can be split into components along them, and points on the drawing get coordinates the student names symbolically (the blocks at x = −L/2, 0, L/2 with the origin at the rod's centre). Directions on the drawing then give signs. The axis of rotation is placed the same way. Decided 2026-11-08:
  - **Sets of axes:** one set per drawing. More sets are left out for now (decided 2026-11-08): intro problems rarely need them.
  - **Placing:** drag the origin onto a point (a body's centre, a pivot, the rod's centre); turn by dragging the end of x. The axes click onto meaningful directions (horizontal, along a ramp, rod or string) and show the angle, which can be named (θ) or given a number.
  - **Components:** the student taps a force and chooses "split onto these axes". Dashed projections appear on x and y, and the student labels each one (W sin θ, −W cos θ, or types it). Labels are checked when the student uses a check, not right away.
  - **Coordinates:** the student taps a point and types its coordinate (L/2, −L/2, 0, d, L − d) from names already defined. The drawing gives no hints for now (a "stuck?" hint may come later). Distances such as r = L/2 then follow from the coordinates.
- **Angle:** name the angle between two drawn lines (φ between a cord and a beam).
- **Free-body diagrams** (decided 2026-11-08): forces go on the drawing itself, with the axes superimposed. There is no separate pulled-out view. Instead, a **fade control** sets how see-through the setup lines are (rods, blocks, surfaces), from solid to hidden, so the forces and axes can stand alone when wanted. It changes only the look, never the physics.

## 6. Knowns, unknowns, targets

- One list, filled from the drawing (names on parts: m, L), the popup (hidden knowns: M_rod = 0, g = 9.81 m/s²) and the toolkit (r = L/2). Each entry says where it came from, and the student can edit it.
- The student marks the **targets** (I) and can mark anything **not needed**. Not-needed items stay visible but greyed, so nothing is silently dropped.
- Values can be symbols or numbers, as today. Units come with numbers.

## 7. The formula sheet

- Opens as a quick popup (a button, or `/` while typing) with search by name, symbol or idea ("moment of inertia", "I", "point mass"). It is the current library, regrouped by idea.
- The student picks a relationship, which lands in the workspace as a new line. Or they type one; it is checked for units only when written, and against physics when the student uses a check.
- The sheet is neutral (decided 2026-11-08). Only after a check fails because a relationship is missing or wrong can the student ask, and then the sheet highlights the group to look in ("moments of inertia"), never the equation.
- Needed for the first scope: I = Σmr² for several point masses, written with as many terms as the student has masses. This is new; today only I = mr² for one mass exists.

## 8. The algebra workspace

Lines of algebra, one under the other, like paper. The student does every step; the code carries out exactly the operation asked for and keeps the student's form (no silent simplifying).

**With the mouse:**
- **Tap a term** → a menu: divide by it, multiply by it, add, subtract, square, square-root, substitute what it equals.
  - With **Shift**, the operation applies to both sides.
  - Without Shift, it applies to that term only. That is allowed even when it makes the equation untrue: the checks catch it (section 10), so the student learns to check.
- **Drag a term across =**: it moves to the other side with its sign flipped, or from top to bottom of a fraction. Shown as its own line.
- **Select a group** (drag over part of an expression) to act on it as one: divide by it, name it, simplify it, or work it out in numbers.
- **Drag a known onto a symbol** (from the knowns list or the toolkit) to substitute it.

**With the keyboard:**
- Type a whole new line, or an operation applied to the line (`/ 2` divides the selected term; with Shift held, both sides).
- Names in the Python convention: `m_1` → m₁, `I_cm` → I_cm, `theta` → θ, `**` or `^` for powers, `sqrt(...)`. Autocomplete offers only symbols defined in this problem, so a typo can't create a new variable silently.

**Condensing** (all three, whichever helps):
- **Name a piece:** select it and call it A, so A = m(L/2)². It can be expanded back any time.
- **Work a piece out in numbers** early and carry the number forward.
- **Simplify a selected part:** collect like terms or cancel, shown as its own line.

**Undo and branch:** any line can be undone; going back keeps the later lines greyed out until the student continues from there.

## 9. Numbers last

When the target is isolated in symbols, the student drags knowns (with units) onto it, or presses "Put in my values". The code converts units and evaluates. The unit check is shown: every term must work out to the target's unit.

## 10. Checks: two whenever, one at the end

Decided 2026-11-08 (replaces the earlier three fixed checkpoints). There are no line-by-line marks while working. Instead:

- **Two checks before the answer, used whenever the student wants.** A "Check my work" button can be pressed twice per problem, at any moment (after choosing relationships, halfway through the algebra…). It looks at everything so far: do the relationships fit the setup (freedoms, constraints, conditions), does every line follow from the one before, and are the labels on drawn components right?
- **One final check** when the student says they're done: does the answer agree with the code's own result for this setup?

Each check shows **pass** or **something to look at**. The student can then **revise on their own** or **ask for a correction**, which points to the first thing that doesn't follow and says why ("the left side was divided by 2 but the right side wasn't"). The correction never writes the fixed line for them. A passed check earns a star; SOLVED comes only with the final one, and asking for a correction doesn't take a star away.

How lines are checked: the code compares the two sides as exact expressions (the current `expr.js` canonical forms; the difference must simplify to 0), and checks at random values as a second test, as Show me does today.

## 11. What changes in the code (high level)

- **New `js/setup.js`:** the popup vocabulary (the table in section 3 as data), the matching of typed words, and what each condition adds.
- **New `js/algebra.js`:** a structural expression tree that keeps the student's form (`expr.js` turns everything into canonical rationals, which is right for checking but loses the written form). Operations on it (divide both sides, move a term across, substitute, name a group, simplify a part) are each exact. Equivalence is checked through `expr.js`.
- **Canvas:** a **Done drawing** button; a highlight-one-part mode for the popup; the distance, axis and angle tools; blocks that can be clamped onto a rod at a point.
- **app.js:** the mode switch; drawing-first panels (knowns list with sources, the counter, formula-sheet popup, workspace). Guided mode keeps today's code paths.
- **Library:** I = Σmr² with any number of terms; the vocabulary's relationships.
- **Tests:** guided-mode tests stay as they are. New gates per phase below.

## 12. Phases

The build is split into phases 6a, 6b, 7, 8a, 8b and an optional 9 (the new look becomes phase 10). Each has its own short spec, the plan sections to read and a test gate in `ROADMAP.md`, which is the source of truth for the order and the gates.

## 13. Open questions

Everything asked so far is decided (sections 3 to 10 record each decision with its date). Still open:

1. Whether a "stuck?" coordinate hint is ever added, and what counts as stuck.
2. The vocabulary beyond the first scope (ramps, pulleys with mass, springs), when those units move to drawing-first.
