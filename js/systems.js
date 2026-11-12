// Physics Lens — systems of equations: which equations must be solved together, and in what order (phase C1).
// The method used for large equation sets (Modelica-style causalization): a bipartite graph of equations and unknowns,
// a maximum matching (Hopcroft–Karp) gives each unknown its own equation, then the strongly connected components (Tarjan)
// of "this unknown's equation needs that unknown" are the blocks, listed in solve order. Each block is solved by exact
// elimination over the engine's rational forms. The same graph names what is missing (an unknown no equation can take)
// and what is extra (an equation left over), for hints in phase C5. Design: docs/core-plan.md, section 3.
import * as X from './expr.js';

// Maximum matching between equations and unknowns. unk(e) → the unknowns in equation e.
// Returns { byEq: Map(e → unknown), byUnknown: Map(unknown → e) }.
export function matching(eqs, unk){
  const byEq = new Map(), byUnknown = new Map();
  let dist;
  // layers of equations from the unmatched ones along alternating paths; true if a free unknown can be reached
  const layers = () => {
    dist = new Map(); const q = eqs.filter(e => !byEq.has(e));
    q.forEach(e => dist.set(e, 0));
    let free = false;
    for (let i = 0; i < q.length; i++) for (const u of unk(q[i])){
      const f = byUnknown.get(u);
      if (f === undefined) free = true;
      else if (!dist.has(f)){ dist.set(f, dist.get(q[i]) + 1); q.push(f); }
    }
    return free;
  };
  const augment = (e) => {
    for (const u of unk(e)){
      const f = byUnknown.get(u);
      if (f === undefined || (dist.get(f) === dist.get(e) + 1 && augment(f))){ byEq.set(e, u); byUnknown.set(u, e); return true; }
    }
    dist.set(e, Infinity); return false;
  };
  while (layers()) for (const e of eqs) if (!byEq.has(e)) augment(e);
  return { byEq, byUnknown };
}

// Strongly connected components (Tarjan). A component comes out after every component it reaches, so when an edge
// means "needs", the list is in solve order.
function components(nodes, next){
  let n = 0; const idx = new Map(), low = new Map(), stack = [], on = new Set(), out = [];
  const visit = (v) => {
    idx.set(v, n); low.set(v, n); n++; stack.push(v); on.add(v);
    for (const w of next(v)){
      if (!idx.has(w)){ visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)){ const c = new Set(); let w; do { w = stack.pop(); on.delete(w); c.add(w); } while (w !== v); out.push(c); }
  };
  for (const v of nodes) if (!idx.has(v)) visit(v);
  return out;
}

// The structure of a set of equations. Returns
//   blocks:  [{ eqs, unknowns }] in solve order (each needs only knowns and the blocks before it; size 1 is one equation)
//   missing: unknowns no equation can take ("you still need an equation with X")
//   under:   unknowns that can't be pinned down (missing ones and everything tied to them)
//   extra:   equations left over (redundant, or a check on the others)
// Equations with fewer unknowns are matched first, so small blocks are found before large ones.
export function structure(eqs, unk){
  const list = [...eqs].sort((a, b) => unk(a).length - unk(b).length);
  const { byEq, byUnknown } = matching(list, unk);
  const unknowns = [...new Set(list.flatMap(unk))];
  const missing = unknowns.filter(u => !byUnknown.has(u));
  const holders = new Map(unknowns.map(u => [u, list.filter(e => unk(e).includes(u))]));
  // an equation holding an unknown that can't be pinned down can't pin down its own matched unknown either
  const under = new Set(missing), q = [...missing];
  while (q.length) for (const e of holders.get(q.pop())){ const w = byEq.get(e); if (w !== undefined && !under.has(w)){ under.add(w); q.push(w); } }
  const det = unknowns.filter(u => !under.has(u));
  const blocks = components(det, (u) => unk(byUnknown.get(u)).filter(w => w !== u))
    .map(c => { const us = det.filter(u => c.has(u)); return { unknowns: us, eqs: us.map(u => byUnknown.get(u)) }; });
  return { blocks, missing, under: [...under], extra: list.filter(e => !byEq.has(e)) };
}

// The blocks that can be solved now: every unknown in their equations is one of the block's own.
export const readyBlocks = (eqs, unk) => structure(eqs, unk).blocks.filter(b => b.eqs.every(e => unk(e).every(u => b.unknowns.includes(u))));

// Exact elimination: solve one equation for an unknown and put it into the others that hold it, again and again,
// until one equation with one unknown (keep, if given) is left. list: [{ Z, label }], Z = 0 forms as rationals.
// Returns { Z, x, steps: [{ from, x, iso }] } or null; name(x) names an unknown in the engine's messages.
export function eliminate(list, unknowns, keep, name = (x) => x){
  let work = list.map(q => ({ ...q }));
  const steps = [], has = (q, x) => X.symbolsOf(q.Z).has(x);
  while (work.length > 1){
    let moved = false;
    for (const x of unknowns.filter(u => u !== keep)){
      const holders = work.filter(q => has(q, x));
      if (holders.length < 2) continue;
      for (const src of holders){
        let iso; try { iso = X.solveLinear(src.Z, x, name(x)); } catch (e){ if (e instanceof X.MathError) continue; throw e; }
        steps.push({ from: src.label, x, iso });
        work = work.filter(q => q !== src).map(q => has(q, x) ? { Z: X.substRat(q.Z, { [x]: iso }), label: `${src.label}→${q.label}` } : q);
        moved = true; break;
      }
      if (moved) break;
    }
    if (!moved) return null;
  }
  const left = unknowns.filter(u => has(work[0], u));
  return left.length === 1 && (!keep || left[0] === keep) ? { Z: work[0].Z, x: left[0], steps } : null;
}
