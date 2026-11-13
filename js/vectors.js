// Physics Lens — vector calculator (phase Q2). Components in, dot and cross products out, with the formula and every
// product shown, symbols first, numbers last. Pure maths on expr.js (no DOM); units follow the inputs.
//   dot(a, b, { ua, ub, names })    a·b = a_x b_x + a_y b_y (+ a_z b_z)             → one number
//   cross(a, b, { ua, ub, names })  a×b: two components in the plane give the k̂ part only; three give all of i, j, k
// a, b are arrays of 2 or 3 numbers; ua, ub are unit strings ('kN', 'm'). The result is { value | parts, unit, steps, sign }.
import * as X from './expr.js';

const { R, number, numValue } = X;
const mul = (a, b) => numValue(R.mul(number(a), number(b)));
const add = (a, b) => numValue(R.add(number(a), number(b)));
const sub = (a, b) => numValue(R.add(number(a), R.neg(number(b))));
const AX = ['x', 'y', 'z'], HAT = ['î', 'ĵ', 'k̂'];
const show = (x) => X.fmt(x).replace('-', '−');
const sgn = (x) => Math.abs(x) < 1e-12 ? 'zero' : x > 0 ? 'positive' : 'negative';

// the product unit: kN·m is a kJ (energy) for a dot product; a cross keeps the typed units (N·m is a torque, not a joule)
function productUnit(ua = '', ub = '', dotProduct){
  const text = ua && ub ? `${ua}·${ub}` : ua || ub;
  if (!dotProduct || !ua || !ub) return { unit: text, si: X.unitFactor(ua) * X.unitFactor(ub) };
  const f = X.unitFactor(ua) * X.unitFactor(ub), dim = { ...X.parseUnit(ua) };
  for (const [k, p] of Object.entries(X.parseUnit(ub))) dim[k] = (dim[k] || 0) + p;
  if (X.dimStr(dim) !== 'J') return { unit: text, si: f };
  const prefix = { 0.001: 'mJ', 1: 'J', 1000: 'kJ', 1e6: 'MJ' }[+f.toPrecision(6)];
  return prefix ? { unit: prefix, si: f } : { unit: text, si: f };
}

function check(a, b){
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length < 2 || a.length > 3) throw new Error('Give both vectors the same number of components (2 or 3).');
  if ([...a, ...b].some(x => typeof x !== 'number' || !isFinite(x))) throw new Error('Every component must be a number.');
}

export function dot(a, b, { ua = '', ub = '' } = {}){
  check(a, b);
  const n = a.length, prods = a.map((x, i) => mul(x, b[i]));
  const value = prods.reduce(add, 0), u = productUnit(ua, ub, true);
  const sym = Array.from({ length: n }, (_, i) => `a_${AX[i]} b_${AX[i]}`).join(' + ');
  const steps = [
    { text: `a·b = ${sym}`, why: 'The dot product multiplies matching components and adds. It is a number, not a vector.' },
    { text: `a·b = ${a.map((x, i) => `(${show(x)})(${show(b[i])})`).join(' + ')}`, why: 'Put the numbers in last.' },
    { text: `a·b = ${prods.map(show).join(' + ')} = ${show(value)}`, why: 'Each product, then the sum.' },
  ];
  return { value, unit: u.unit, siFactor: u.si, sign: sgn(value), steps, text: `${show(value)} ${u.unit}`.trim() };
}

export function cross(a, b, { ua = '', ub = '' } = {}){
  check(a, b);
  const u = productUnit(ua, ub, false);
  if (a.length === 2){
    const p = mul(a[0], b[1]), q = mul(a[1], b[0]), z = sub(p, q);
    const steps = [
      { text: '(a×b)_z = a_x b_y − a_y b_x', why: 'Two components in a plane: the cross product points along z (out of or into the page).' },
      { text: `(a×b)_z = (${show(a[0])})(${show(b[1])}) − (${show(a[1])})(${show(b[0])})`, why: 'Put the numbers in last.' },
      { text: `(a×b)_z = ${show(p)} − (${show(q)}) = ${show(z)}`, why: `${sgn(z) === 'positive' ? 'Positive: along +k̂, a counterclockwise turn from a to b.' : sgn(z) === 'negative' ? 'Negative: along −k̂, a clockwise turn from a to b.' : 'Zero: a and b are parallel.'}` },
    ];
    return { parts: [0, 0, z], value: z, unit: u.unit, sign: sgn(z), steps, text: `${show(z)} ${u.unit} (k̂)`.trim() };
  }
  const idx = [[1, 2], [2, 0], [0, 1]], parts = idx.map(([i, j]) => sub(mul(a[i], b[j]), mul(a[j], b[i])));
  const steps = [
    { text: 'a×b = (a_y b_z − a_z b_y) î + (a_z b_x − a_x b_z) ĵ + (a_x b_y − a_y b_x) k̂', why: 'Each part is a 2×2 difference of the other two axes, in turn.' },
    ...idx.map(([i, j], k) => ({ text: `${HAT[k]}: (${show(a[i])})(${show(b[j])}) − (${show(a[j])})(${show(b[i])}) = ${show(parts[k])}`, why: `The ${AX[k]} part.` })),
  ];
  return { parts, value: null, unit: u.unit, sign: null, steps, text: `(${parts.map(show).join(', ')}) ${u.unit}`.trim() };
}

// the angle between two vectors, 0° to 180°, from a·b = |a||b| cos φ (the one place a sine, cosine or arc is needed)
export function angle(a, b){
  check(a, b);
  const len = (v) => numValue(R.sqrt(number(v.reduce((s, x) => add(s, mul(x, x)), 0))));
  const la = len(a), lb = len(b);
  if (!la || !lb) return null;
  const c = Math.max(-1, Math.min(1, dot(a, b).value / (la * lb)));
  return Math.acos(c) * 180 / Math.PI;
}
