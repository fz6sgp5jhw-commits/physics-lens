// Physics Lens — physics data, merged from the subject packs (js/packs/): variables, equations, units, practice.
// Here every equation's solvers are derived from its one line (isolate) and checked for units at load.
// All values are stored in SI units.

import { parse, parseEq, isolate, showTree, hasPM, evalNum, MathError, parseUnit, dimOf, dimEq, dimStr, setSamples, toSI, fromSI, fmt } from './expr.js';
import { PACKS, mergePacks } from './packs/index.js';

const ALL = mergePacks(PACKS);
export const { quantities: VARS, equations: EQS, chapters: CHAPTERS, components: COMPONENTS, practice: PRACTICE, lessons: LESSONS, slips: SLIPS, printOrder: PRINT_ORDER, notes: NOTES } = ALL;
export { fmt };
export const V = (id) => `<span class="sym" data-v="${id}">${VARS[id].sym}</span>`;

// ---------- units, sample values and print order (Phase A: symbolic core) ----------
// SI dimension of every quantity, from its unit. Angles are dimensionless.
export const DIMS = Object.fromEntries(Object.entries(VARS).map(([id, d]) => [id, parseUnit(d.unit)]));
// A given's size in SI from the quantity's own conversion table; an absolute temperature (absolute: true) in °C adds 273.15.
export const sizeSI = (id, mag, unit) => VARS[id].absolute ? toSI(mag, unit, { absolute: true }) : mag * VARS[id].units[unit];
// An answer with its unit, and an absolute temperature also in °C: "586.3 K (313.2 °C)".
export const withUnit = (id, x) => `${fmt(x)} ${VARS[id].unit}${VARS[id].absolute && VARS[id].units['°C'] ? ` (${fmt(fromSI(x, '°C', { absolute: true }))} °C)` : ''}`;
// A typical size for each quantity (each pack's `sample`): used to pick roots and signs and to draw.
export const SAMPLE = ALL.samples;
setSamples(SAMPLE); // the engine picks signs and roots at these values


// ---------- one-line equations: every solver comes from `eq` ----------
// An equation is { eq: '{W} = {m}{g}', kind: 'law' | 'rel' | 'def', cue, … }. At load, `vars` (in order of
// appearance), `form` (the HTML line) and, for every variable, `sub` and `steps` come from eq by isolate().
// `solve[x]` keeps only what code can't decide: pick, guard, alt, note, or hand `steps` that read better;
// `solve[x] = null` means x is never solved for with this equation. Can't be rearranged → error at load.
const NAME = (id) => VARS[id] ? VARS[id].plain : id;
const varsOf = (n, out = []) => { if (n.t === 'var'){ if (!out.includes(n.id)) out.push(n.id); } else for (const c of [n.a, n.b, n.n, n.d].flat()) if (c && typeof c === 'object') varsOf(c, out); return out; };
for (const [id, e] of Object.entries(EQS)){
  if (!e.eq) continue;
  const eq = parseEq(e.eq);
  e.vars ||= varsOf(eq.rhs, varsOf(eq.lhs));
  e.form ||= `${showTree(eq.lhs, V)} = ${showTree(eq.rhs, V)}`;
  e.solve ||= {};
  for (const x of e.vars){
    if (e.solve[x] === null){ delete e.solve[x]; continue; }
    const sol = e.solve[x] ||= {};
    if (sol.sub) continue;
    let iso;
    try { iso = isolate(eq, x, { name: NAME, roots: sol.pick ? 'pm' : 'positive' }); }
    catch (err){ throw new Error(`${id} → ${x}: ${err.message}`); }
    sol.auto = true;
    sol.sub = showTree(iso.tree, (y) => `{${y}}`);
    sol.steps ||= iso.steps.map(st => ({ eq: `${showTree(st.lhs, V)} = ${showTree(st.rhs, V)}`, why: st.why }));
  }
}

// ---------- every solver's numbers come from its `sub` template ----------
// A solver is { steps, sub, guard?, pick?, alt?, note? }:
//   sub     the plug-in template; parsed once, it gives both the numeric and the symbolic answer
//   guard   v → error or null: a physics-specific message before the generic “… is zero” ones
//   pick    for templates with ±: (v, [plus, minus]) → { branch: ±1, note } or an error
//   alt     [{ when(v), sub, note }]: a different template for a special case (a = 0 in a quadratic)
//   note    (v, value) → string shown under the answer
// sol.f(v) returns { value, note, branch, tree } or { error }.
function runSolver(sol, v){
  if (sol.guard){ const g = sol.guard(v); if (g) return g; }
  const alt = sol.alt && sol.alt.find(x => x.when(v));
  const tree = alt ? alt.tree : sol.tree;
  try {
    let value, branch = 1, note = alt ? alt.note : '';
    if (hasPM(tree)){
      const cands = [1, -1].map(sg => { try { return evalNum(tree, v, sg, NAME); } catch (e){ if (e instanceof MathError) return NaN; throw e; } });
      const p = sol.pick ? sol.pick(v, cands) : { branch: 1 };
      if (p.error) return p;
      branch = p.branch; note = p.note || note;
      value = evalNum(tree, v, branch, NAME);
    } else value = evalNum(tree, v, 1, NAME);
    if (sol.note){ const n = sol.note(v, value); if (n) note = n; }
    return { value, note, branch, tree };
  } catch (e){ if (e instanceof MathError) return { error: e.message }; throw e; }
}
for (const [id, eq] of Object.entries(EQS)){
  for (const [x, sol] of Object.entries(eq.solve)){
    sol.tree = parse(sol.sub);
    (sol.alt || []).forEach(a => { a.tree = parse(a.sub); });
    // units: every term of the template must agree, and the result must have the unit of x
    for (const t of [sol.tree, ...(sol.alt || []).map(a => a.tree)]){
      const d = dimOf(t, DIMS);
      if (!dimEq(d, DIMS[x])) throw new Error(`${id} → ${x}: template gives ${dimStr(d)}, want ${dimStr(DIMS[x])}`);
    }
    sol.unitText = VARS[x].unit === 'N·m' ? 'N·m' : dimStr(DIMS[x]); // torque has the joule's units but is written N·m
    sol.f = (v) => runSolver(sol, v);
  }
}
