// Physics Lens — multiple-choice aid: the ratio engine (phase Q1). Pure maths on top of expr.js, no DOM.
//   scaling():  "if X becomes k·X, what happens to Y?"  The student picks the equation chain (each equation solved for
//               one quantity) and what is held fixed; the code isolates the target, substitutes down the chain, scales
//               one symbol and shows the ratio, symbols first. A wrong "held fixed" choice comes back as a sentence.
//   rank():     "put these cases in order": each case is a shape from the I table (or point masses); the code puts the
//               shape into the student's deciding formula, shows what cancels and orders the results, with ties flagged.
// A ratio that carries roots (ω → ω/√2) does not always simplify to a plain number, so the constant is confirmed with
// two-point numeric checking: the ratio at two random points must agree. Design: docs/core-plan.md section 3.
import * as X from './expr.js';

const { symbol, toRat, substRat, evalRat, symbolsOf, R } = X;
const same = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

// Standard shapes: I = k·M·S² about the axis named. S is the size symbol the shape uses.
export const SHAPES = {
  ring:   { label: 'thin ring or hoop', k: 1,      size: 'R' },
  disc:   { label: 'solid disc or cylinder', k: 1 / 2, size: 'R' },
  sphere: { label: 'solid sphere', k: 2 / 5,       size: 'R' },
  shell:  { label: 'hollow sphere', k: 2 / 3,       size: 'R' },
  rod:    { label: 'thin rod about its centre', k: 1 / 12, size: 'L' },
  rodEnd: { label: 'thin rod about its end', k: 1 / 3,      size: 'L' },
};

// a plain number as a fraction or a root: 4, 1/2, 2/3, √2, 1/√2, √(3/2); otherwise 4 figures
export function niceRatio(c){
  const frac = (x) => { for (let q = 1; q <= 12; q++){ const p = Math.round(x * q); if (p && same(p / q, x)) return q === 1 ? String(p) : `${p}/${q}`; } return null; };
  const f = frac(c); if (f) return f;
  if (c > 0){
    const sq = frac(c * c);
    if (sq){
      const [p, q] = sq.includes('/') ? sq.split('/').map(Number) : [Number(sq), 1];
      const root = (n) => Number.isInteger(Math.sqrt(n)) ? String(Math.sqrt(n)) : `√${n}`;
      if (q === 1) return root(p);
      if (p === 1) return `1/${root(q)}`;
      return `√(${p}/${q})`;
    }
  }
  return X.fmt(c);
}

function prepare(ids){ // the root-picking engine needs a typical positive value for every symbol it meets
  const have = {};
  ids.forEach(id => { have[id] = 1.7; });
  X.addSamples(have);
}
const idsOfEq = (src) => [...src.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
const plainer = (names) => (id) => names[id] || id;

// two random sets of values for the same symbols
const points = (ids) => [0, 1].map(j => Object.fromEntries([...ids].map((id, i) => [id, 1.3 + 0.37 * i + 0.9 * j + 0.11 * i * j])));

// ---------------------------------------------------------------------------------------------- scaling
// { chain: [{ eq: '{f}{d} = ½{m}{v}²', solve: 'd' }, { eq: '{f} = {mu}{N}', solve: 'f' }, …],  first entry solves the target
//   hold: ['mu', 'N'], change: { id: 'v', k: 2 }, names: { mu: 'μ' } }
// → { ok, problems: [sentence], notes: [sentence], steps: [{ text, why }], expr, ratio: number | null, ratioText }
export function scaling({ chain, hold = [], change, names = {} }){
  const nm = plainer(names), plain = { plain: nm, order: [] };
  prepare(chain.flatMap(c => idsOfEq(c.eq)));
  const problems = [], notes = [], steps = [];
  const target = chain[0].solve;

  // 1 · every equation solved for its quantity, then substituted down the chain
  const defs = {}, order = [];
  for (const c of chain){
    const eq = X.parseEq(c.eq), r = X.isolate(eq, c.solve, { name: nm, roots: 'positive' });
    const env = Object.fromEntries(idsOfEq(c.eq).map(id => [id, symbol(id)]));
    defs[c.solve] = { rat: toRat(r.tree, env), tree: r.tree, steps: r.steps };
    order.push(c.solve);
  }
  const t0 = defs[target];
  steps.push({ text: `${nm(target)} = ${X.showTree(t0.tree, nm)}`, why: `solve the first equation for ${nm(target)}` });
  let rat = t0.rat;
  const held = new Set(hold);
  for (const id of order.slice(1)){
    if (held.has(id)) { notes.push(`${nm(id)} is held fixed, so I stop there and keep it as a symbol.`); continue; }
    if (!symbolsOf(rat).has(id)){ notes.push(`${nm(id)} never appears in what you are solving, so that equation isn’t needed.`); continue; }
    rat = substRat(rat, { [id]: defs[id].rat });
    steps.push({ text: `${nm(target)} = ${X.toText(rat, plain)}`, why: `put in ${nm(id)} = ${X.showTree(defs[id].tree, nm)}` });
  }

  // 2 · is the choice of "held fixed" physical?
  const free = symbolsOf(rat);
  const dependsOn = {}; // intermediate → symbols it is built from (expanded down the chain)
  for (const id of order.slice(1)){
    let r = defs[id].rat;
    for (const other of order.slice(1)) if (other !== id && symbolsOf(r).has(other)) r = substRat(r, { [other]: defs[other].rat });
    dependsOn[id] = symbolsOf(r);
  }
  if (!change || !(change.k > 0)) problems.push('Say what the quantity is multiplied by (a number above zero).');
  if (change){
    if (change.id === target) problems.push(`${nm(target)} is the answer; it can’t also be the thing you change.`);
    else if (order.includes(change.id) && !free.has(change.id)) problems.push(`${nm(change.id)} is built from other quantities (${[...dependsOn[change.id] || []].map(nm).join(', ')}). Change one of those instead.`);
    else if (!chain.some(c => idsOfEq(c.eq).includes(change.id))) problems.push(`${nm(change.id)} isn’t in the equations you chose, so changing it changes nothing.`);
    else if (!free.has(change.id)) notes.push(`${nm(change.id)} cancels out of ${nm(target)} completely, so changing it does nothing.`);
  }
  for (const h of held){
    if (h === target) problems.push(`You can’t hold ${nm(h)} fixed: it is the answer.`);
    else if (change && h === change.id) problems.push(`${nm(h)} is the quantity you change, so it can’t also be held fixed.`);
    else if (change && dependsOn[h] && dependsOn[h].has(change.id)) problems.push(`${nm(h)} is built from ${nm(change.id)} (${nm(h)} = ${X.showTree(defs[h].tree, nm)}), so it can’t stay fixed when ${nm(change.id)} changes. Hold the quantities that make it up instead.`);
  }
  if (problems.length) return { ok: false, problems, notes, steps, expr: X.toText(rat, plain), ratio: null, ratioText: '' };

  // 3 · scale one symbol and divide
  const k = change.k, scaled = substRat(rat, { [change.id]: R.mul(X.number(k), symbol(change.id)) });
  const ratio = R.mul(scaled, R.inv(rat));
  steps.push({ text: `${nm(target)}′ = ${X.toText(scaled, plain)}`, why: `${nm(change.id)} → ${niceRatio(k)}·${nm(change.id)}` });
  const [A, B] = points(free);
  const ca = evalRat(ratio, A), cb = evalRat(ratio, B);
  const loose = [...free].filter(id => id !== change.id && !held.has(id));
  if (!same(ca, cb)){ // the factor still moves with another symbol: a sum, or a quantity that was not held
    const dep = [...symbolsOf(ratio)].filter(id => id !== change.id);
    problems.push(`The ratio still depends on ${dep.map(nm).join(', ')}, so it isn’t one number. ${dep.length ? 'Say how ' + dep.map(nm).join(' and ') + ' behave (held fixed, or changed by a known factor).' : ''}`);
    return { ok: false, problems, notes, steps, expr: X.toText(rat, plain), ratio: null, ratioText: X.toText(ratio, plain) };
  }
  const shown = X.isNumeric(ratio) ? niceRatio(X.numValue(ratio)) : niceRatio(ca);
  steps.push({ text: `${nm(target)}′ / ${nm(target)} = ${shown}`, why: X.isNumeric(ratio) ? 'divide: everything but the change cancels' : 'divide, and check at two random points that the ratio is the same number' });
  if (loose.length) notes.push(`You didn’t say what happens to ${loose.map(nm).join(', ')}. I treated ${loose.length > 1 ? 'them' : 'it'} as unchanged. They cancel from the ratio, so only a change in ${loose.length > 1 ? 'them' : 'it'} would alter the answer.`);
  return { ok: true, problems, notes, steps, expr: X.toText(rat, plain), ratio: ca, ratioText: shown };
}

// ---------------------------------------------------------------------------------------------- ranking
// { eq: '{a} = {g}sin{th}/(1 + {I}/({M}{R}²))', solve: 'a', inertia: 'I', common: { g: 9.81, th: 30 },
//   cases: [{ label, shape: 'sphere', values: { M, R } } | { label, masses: [{ m, r }, …], values }], order: 'high' | 'low' }
// A mass or distance in `masses` is a number or the id of a symbol with a value in `values`.
// → { ok, problems, expr, results: [{ label, expr, value, cancelled }], order: [label], ties: [[label, label]], cancels: [id], steps }
export function rank({ eq, solve, inertia = 'I', common = {}, cases, order = 'high', names = {} }){
  const nm = plainer(names), plain = { plain: nm, order: [] };
  prepare([...idsOfEq(eq), 'M', 'R', 'L']);
  const problems = [], steps = [];
  if (!cases || cases.length < 2) return { ok: false, problems: ['Add at least two cases to compare.'], results: [], order: [], ties: [], cancels: [], steps };
  const base = X.isolate(X.parseEq(eq), solve, { name: nm, roots: 'positive' });
  const rat0 = toRat(base.tree, Object.fromEntries(idsOfEq(eq).map(id => [id, symbol(id)])));
  steps.push({ text: `${nm(solve)} = ${X.toText(rat0, plain)}`, why: 'your deciding formula' });

  const inertiaOf = (c) => {
    if (c.shape){
      const s = SHAPES[c.shape];
      if (!s) throw new X.MathError(`I don’t know the shape “${c.shape}”.`);
      return R.mul(X.number(s.k), R.mul(symbol('M'), R.pow(symbol(s.size), 2)));
    }
    const of = (x) => typeof x === 'string' ? symbol(x) : X.number(x);
    return (c.masses || []).reduce((sum, p) => R.add(sum, R.mul(of(p.m), R.pow(of(p.r), 2))), X.number(0));
  };
  const rows = cases.map(c => {
    const Irat = inertiaOf(c);
    const r = substRat(rat0, { [inertia]: Irat });
    const need = [...symbolsOf(r)].filter(id => !(id in common) && !(c.values && id in c.values));
    if (need.length) problems.push(`${c.label}: give a value for ${need.map(nm).join(', ')}.`);
    const cancelled = [...new Set([...symbolsOf(rat0), ...symbolsOf(Irat)])].filter(id => id !== inertia && !symbolsOf(r).has(id));
    return { label: c.label, expr: X.toText(r, plain), rat: r, cancelled, c };
  });
  if (problems.length) return { ok: false, problems, results: [], order: [], ties: [], cancels: [], steps };
  const results = rows.map(r => ({ label: r.label, expr: r.expr, value: evalRat(r.rat, { ...common, ...(r.c.values || {}) }), cancelled: r.cancelled }));
  // the shape-based cases agree on what drops out; report the ids that left every such case
  const shaped = results.filter((_, i) => cases[i].shape);
  const cancels = shaped.length ? shaped[0].cancelled.filter(id => shaped.every(r => r.cancelled.includes(id))) : [];
  if (cancels.length) steps.push({ text: `${nm(solve)} = ${shaped[0].expr}`, why: `with I put in as (number)·${cancels.map(nm).join('·')}…, ${cancels.map(nm).join(' and ')} cancel: they don’t decide the order` });

  const sorted = [...results].sort((a, b) => order === 'high' ? b.value - a.value : a.value - b.value);
  const ties = [];
  for (let i = 0; i < sorted.length - 1; i++) if (same(sorted[i].value, sorted[i + 1].value)) ties.push([sorted[i].label, sorted[i + 1].label]);
  const labels = sorted.map(r => r.label);
  steps.push({ text: labels.join(order === 'high' ? ' > ' : ' < '), why: `${order === 'high' ? 'largest' : 'smallest'} ${nm(solve)} first${ties.length ? '; equal ones are tied' : ''}` });
  return { ok: true, problems, expr: X.toText(rat0, plain), results, order: labels, ties, cancels, steps };
}
