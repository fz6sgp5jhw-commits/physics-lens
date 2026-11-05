// Rotation Lab — physics data: variables, equations with hand-checked isolation steps, setups.
// All values are stored in SI units. Every solver is written out by hand so each step is exact.

import { parse, hasPM, evalNum, MathError, parseUnit, dimOf, dimEq, dimStr } from './expr.js';

const TAU = 2 * Math.PI;

export const VARS = {
  // inclines + Newton's laws (+ is DOWN the slope)
  dx:    { sym: 'Δx', plain: 'Δx', name: 'distance along the ramp', unit: 'm', units: { m: 1, cm: 0.01 }, dir: ['down the slope', 'up the slope'] },
  v0:    { sym: 'v<sub>0</sub>', plain: 'v₀', name: 'initial velocity', unit: 'm/s', units: { 'm/s': 1, 'km/h': 1 / 3.6 }, dir: ['down the slope', 'up the slope'] },
  vf:    { sym: 'v', plain: 'v', name: 'final velocity', unit: 'm/s', units: { 'm/s': 1, 'km/h': 1 / 3.6 }, dir: ['down the slope', 'up the slope'] },
  a:     { sym: 'a', plain: 'a', name: 'acceleration', unit: 'm/s²', units: { 'm/s²': 1 }, dir: ['down the slope', 'up the slope'] },
  t:     { sym: 't', plain: 't', name: 'elapsed time', unit: 's', units: { s: 1, min: 60 } },
  m:     { sym: 'm', plain: 'm', name: 'mass', unit: 'kg', units: { kg: 1, g: 0.001 } },
  g:     { sym: 'g', plain: 'g', name: 'gravitational field strength', unit: 'm/s²', units: { 'm/s²': 1 } },
  inc:   { sym: 'θ', plain: 'θ', name: 'ramp angle (from horizontal)', unit: '°', units: { '°': 1, rad: 180 / Math.PI } },
  W:     { sym: 'W', plain: 'W', name: 'weight (mg, straight down)', unit: 'N', units: { N: 1 } },
  Wpar:  { sym: 'W<sub>∥</sub>', plain: 'W∥', name: 'weight component along the ramp', unit: 'N', units: { N: 1 } },
  Wperp: { sym: 'W<sub>⊥</sub>', plain: 'W⊥', name: 'weight component into the ramp', unit: 'N', units: { N: 1 } },
  N:     { sym: 'N', plain: 'N', name: 'normal force (ramp pushing back)', unit: 'N', units: { N: 1 } },
  f:     { sym: 'f', plain: 'f', name: 'kinetic friction force (size)', unit: 'N', units: { N: 1 } },
  mu:    { sym: 'μ<sub>k</sub>', plain: 'μk', name: 'coefficient of kinetic friction', unit: '', units: { 'no unit': 1 } },
  F:     { sym: 'F<sub>net</sub>', plain: 'Fnet', name: 'net force along the ramp', unit: 'N', units: { N: 1 }, dir: ['down the slope', 'up the slope'] },
  // tension + pulleys (+ = the way the system moves when m2 falls)
  m1:    { sym: 'm<sub>1</sub>', plain: 'm₁', name: 'mass of the block on the table', unit: 'kg', units: { kg: 1, g: 0.001 } },
  m2:    { sym: 'm<sub>2</sub>', plain: 'm₂', name: 'hanging mass', unit: 'kg', units: { kg: 1, g: 0.001 } },
  W1:    { sym: 'W<sub>1</sub>', plain: 'W₁', name: 'weight of the block on the table', unit: 'N', units: { N: 1 } },
  W2:    { sym: 'W<sub>2</sub>', plain: 'W₂', name: 'weight of the hanging mass', unit: 'N', units: { N: 1 } },
  N1:    { sym: 'N<sub>1</sub>', plain: 'N₁', name: 'normal force from the table on m₁', unit: 'N', units: { N: 1 } },
  Tn:    { sym: 'T', plain: 'T', name: 'tension in the string', unit: 'N', units: { N: 1 } },
  // rotation (+ is counterclockwise)
  theta: { sym: 'θ', plain: 'θ', name: 'angle turned', unit: 'rad', units: { rad: 1, rev: TAU, '°': Math.PI / 180 }, dir: ['counterclockwise', 'clockwise'] },
  w0:    { sym: 'ω<sub>0</sub>', plain: 'ω₀', name: 'initial angular velocity', unit: 'rad/s', units: { 'rad/s': 1, rpm: TAU / 60, 'rev/s': TAU }, dir: ['counterclockwise', 'clockwise'] },
  w:     { sym: 'ω', plain: 'ω', name: 'final angular velocity', unit: 'rad/s', units: { 'rad/s': 1, rpm: TAU / 60, 'rev/s': TAU }, dir: ['counterclockwise', 'clockwise'] },
  alpha: { sym: 'α', plain: 'α', name: 'angular acceleration', unit: 'rad/s²', units: { 'rad/s²': 1, 'rev/s²': TAU }, dir: ['counterclockwise', 'clockwise'] },
  r:     { sym: 'r', plain: 'r', name: 'distance of the point from the axis', unit: 'm', units: { m: 1, cm: 0.01 } },
  s:     { sym: 's', plain: 's', name: 'arc length the point travels', unit: 'm', units: { m: 1, cm: 0.01 } },
  v:     { sym: 'v', plain: 'v', name: 'speed of the point (at the end)', unit: 'm/s', units: { 'm/s': 1 } },
  at:    { sym: 'a<sub>t</sub>', plain: 'aₜ', name: 'tangential acceleration of the point', unit: 'm/s²', units: { 'm/s²': 1 } },
  ac:    { sym: 'a<sub>c</sub>', plain: 'a꜀', name: 'centripetal acceleration (at the end)', unit: 'm/s²', units: { 'm/s²': 1 } },
};

export const V = (id) => `<span class="sym" data-v="${id}">${VARS[id].sym}</span>`;
const P = (id) => VARS[id].plain;
const err = (msg) => ({ error: msg });
const div0 = (id) => err(`${P(id)} is zero, so you can’t divide by it.`);

// real roots of a·x² + b·x + c = 0, positive ones only, smallest first; null if no real roots
export function posRoots(a, b, c){
  if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b].filter(x => x > 1e-12);
  const D = b * b - 4 * a * c;
  if (D < -1e-12) return null;
  const sq = Math.sqrt(Math.max(0, D));
  const r1 = (-b + sq) / (2 * a), r2 = (-b - sq) / (2 * a);
  return [r1, r2].filter(x => x > 1e-12).sort((x, y) => x - y);
}

// The five constant-acceleration equations, built once for linear (x or y) and once for rotation.
// k = { p: position, u0: initial velocity, u: final velocity, a: acceleration, t: time }
function kinematics(prefix, k, words){
  const { p, u0, u, a, t } = k;
  const [Vp, Vu0, Vu, Va, Vt] = [p, u0, u, a, t].map(V);
  const tUnit = 's';
  // pick the first positive time among the two roots of a quadratic (cands = [+ branch, − branch])
  const firstPositive = (msgNone) => (v, cands) => {
    const pos = cands.map((x, i) => ({ x, b: i ? -1 : 1 })).filter(o => isFinite(o.x) && o.x > 1e-12).sort((p, q) => p.x - q.x);
    if (!pos.length) return err(msgNone);
    const two = pos.length > 1 && Math.abs(pos[1].x - pos[0].x) > 1e-9 * pos[1].x;
    return { branch: pos[0].b, note: two ? `Two positive roots (${fmt(pos[0].x)} ${tUnit} and ${fmt(pos[1].x)} ${tUnit}): it passes this ${words.pos} twice. The first time is kept; check which one the problem means.` : '' };
  };
  const neverSq = (q) => q < -1e-12 ? err(`The square root is of a negative number: ${words.never}`) : null;
  // sign of the final velocity = direction of motion when it first reaches p
  const finalSign = (v) => {
    const r = posRoots(0.5 * v[a], v[u0], -v[p]);
    if (!r || !r.length) return 1;
    return (v[u0] + v[a] * r[0]) < 0 ? -1 : 1;
  };
  return {
    [prefix + '1']: {
      vars: [u, u0, a, t], form: `${Vu} = ${Vu0} + ${Va}${Vt}`,
      meaning: words.m1, condition: `constant ${P(a)}`, calc: `Integrate ${P(a)} = d${P(u)}/dt from 0 to t with ${P(a)} constant: ${P(u)} − ${P(u0)} = ${P(a)}t.`,
      solve: {
        [u]: { steps: [], sub: `{${u0}} + {${a}}{${t}}` },
        [u0]: { steps: [{ eq: `${Vu} − ${Va}${Vt} = ${Vu0}`, why: `subtract ${P(a)}t from both sides` }], sub: `{${u}} − {${a}}{${t}}` },
        [a]: { steps: [{ eq: `${Vu} − ${Vu0} = ${Va}${Vt}`, why: `subtract ${P(u0)} from both sides` }, { eq: `${Va} = (${Vu} − ${Vu0}) / ${Vt}`, why: 'divide both sides by t' }],
               sub: `({${u}} − {${u0}}) / {${t}}` },
        [t]: { steps: [{ eq: `${Vu} − ${Vu0} = ${Va}${Vt}`, why: `subtract ${P(u0)} from both sides` }, { eq: `${Vt} = (${Vu} − ${Vu0}) / ${Va}`, why: `divide both sides by ${P(a)}` }],
               sub: `({${u}} − {${u0}}) / {${a}}`, guard: v => v[a] === 0 ? err(`${P(a)} is zero: the velocity never changes, so no time gets you there.`) : null },
      },
    },
    [prefix + '2']: {
      vars: [p, u0, a, t], form: `${Vp} = ${Vu0}${Vt} + ½${Va}${Vt}²`,
      meaning: words.m2, condition: `constant ${P(a)}`, calc: `Integrate ${P(u)}(t) = ${P(u0)} + ${P(a)}t from 0 to t: ${P(p)} = ${P(u0)}t + ½${P(a)}t².`,
      solve: {
        [p]: { steps: [], sub: `{${u0}}{${t}} + ½{${a}}{${t}}²` },
        [u0]: { steps: [{ eq: `${Vp} − ½${Va}${Vt}² = ${Vu0}${Vt}`, why: `subtract ½${P(a)}t² from both sides` }, { eq: `${Vu0} = (${Vp} − ½${Va}${Vt}²) / ${Vt}`, why: 'divide both sides by t' }],
                sub: `({${p}} − ½{${a}}{${t}}²) / {${t}}` },
        [a]: { steps: [{ eq: `${Vp} − ${Vu0}${Vt} = ½${Va}${Vt}²`, why: `subtract ${P(u0)}t from both sides` }, { eq: `${Va} = 2(${Vp} − ${Vu0}${Vt}) / ${Vt}²`, why: 'multiply by 2, divide by t²' }],
               sub: `2({${p}} − {${u0}}{${t}}) / {${t}}²` },
        [t]: { steps: [{ eq: `½${Va}${Vt}² + ${Vu0}${Vt} − ${Vp} = 0`, why: 'move everything to one side: it’s a quadratic in t' },
                       { eq: `${Vt} = [−${Vu0} ± √(${Vu0}² + 2${Va}${Vp})] / ${Va}`, why: `quadratic formula (a = ½${P(a)}, b = ${P(u0)}, c = −${P(p)}); keep the first positive time` }],
               sub: `[−{${u0}} ± √({${u0}}² + 2{${a}}{${p}})] / {${a}}`,
               guard: v => Math.abs(v[a]) < 1e-12 ? (v[u0] === 0 || v[p] / v[u0] <= 0 ? err(`No positive time works: with these values it never reaches this ${words.pos}.`) : null) : neverSq(v[u0] ** 2 + 2 * v[a] * v[p]),
               alt: [{ when: v => Math.abs(v[a]) < 1e-12, sub: `{${p}} / {${u0}}`, note: `${P(a)} is zero, so it moves steadily: t = ${P(p)} / ${P(u0)}.` }],
               pick: firstPositive(`No positive time works: with these values it never reaches this ${words.pos}.`) },
      },
    },
    [prefix + '3']: {
      vars: [u, u0, a, p], form: `${Vu}² = ${Vu0}² + 2${Va}${Vp}`,
      meaning: words.m3, condition: `constant ${P(a)}`, calc: `Eliminate t between the first two equations (or use ${P(a)} = ${P(u)} d${P(u)}/d${P(p)} and integrate).`,
      solve: {
        [u]: { steps: [{ eq: `${Vu} = ±√(${Vu0}² + 2${Va}${Vp})`, why: 'take the square root; the sign is the direction of motion at the end' }],
               sub: `±√({${u0}}² + 2{${a}}{${p}})`,
               guard: v => v[u0] ** 2 + 2 * v[a] * v[p] < -1e-12 ? err(`${P(u)}² would be negative: ${words.never}`) : null,
               pick: (v, cands) => {
                 const mag = Math.abs(cands[0]), sg = finalSign(v), r = posRoots(0.5 * v[a], v[u0], -v[p]);
                 let note = sg < 0 ? `The root gives ±${fmt(mag)}. When it first gets there it’s moving in the − direction, so ${P(u)} is negative.` : `The root gives ±${fmt(mag)}. When it first gets there it’s moving in the + direction, so the positive root is kept.`;
                 if (r && r.length > 1) note += ` Careful: it passes this ${words.pos} twice, and the second time ${P(u)} = ${fmt(-sg * mag)}. Pick the one the problem means.`;
                 return { branch: sg, note }; } },
        [u0]: { steps: [{ eq: `${Vu0}² = ${Vu}² − 2${Va}${Vp}`, why: `subtract 2${P(a)}${P(p)} from both sides` }, { eq: `${Vu0} = ±√(${Vu}² − 2${Va}${Vp})`, why: 'take the square root' }],
                sub: `±√({${u}}² − 2{${a}}{${p}})`,
                guard: v => v[u] ** 2 - 2 * v[a] * v[p] < -1e-12 ? err(`${P(u0)}² would be negative: these numbers can’t happen together.`) : null,
                pick: (v, cands) => { const mag = Math.abs(cands[0]), sg = v.__u0sign || 1;
                  return { branch: sg, note: v.__u0sign ? `The root gives ±${fmt(mag)}. Your conditions say it starts out moving ${sg < 0 ? 'in the − direction' : 'in the + direction'}, so ${P(u0)} = ${fmt(sg * mag)}.` : `The positive root is kept. If it started out moving in the − direction, ${P(u0)} is the negative of this.` }; } },
        [a]: { steps: [{ eq: `${Vu}² − ${Vu0}² = 2${Va}${Vp}`, why: `subtract ${P(u0)}² from both sides` }, { eq: `${Va} = (${Vu}² − ${Vu0}²) / (2${Vp})`, why: `divide both sides by 2${P(p)}` }],
               sub: `({${u}}² − {${u0}}²) / (2{${p}})` },
        [p]: { steps: [{ eq: `${Vu}² − ${Vu0}² = 2${Va}${Vp}`, why: `subtract ${P(u0)}² from both sides` }, { eq: `${Vp} = (${Vu}² − ${Vu0}²) / (2${Va})`, why: `divide both sides by 2${P(a)}` }],
               sub: `({${u}}² − {${u0}}²) / (2{${a}})`, guard: v => v[a] === 0 ? err(`${P(a)} is zero, so you can’t divide by it. (With ${P(a)} = 0 the velocity never changes.)`) : null },
      },
    },
    [prefix + '4']: {
      vars: [p, u0, u, t], form: `${Vp} = ½(${Vu0} + ${Vu})${Vt}`,
      meaning: words.m4, condition: `constant ${P(a)}`, calc: `With ${P(a)} constant, velocity changes linearly, so its average over the interval is (${P(u0)} + ${P(u)})/2.`,
      solve: {
        [p]: { steps: [], sub: `½({${u0}} + {${u}}){${t}}` },
        [t]: { steps: [{ eq: `2${Vp} = (${Vu0} + ${Vu})${Vt}`, why: 'multiply both sides by 2' }, { eq: `${Vt} = 2${Vp} / (${Vu0} + ${Vu})`, why: `divide both sides by (${P(u0)} + ${P(u)})` }],
               sub: `2{${p}} / ({${u0}} + {${u}})` },
        [u]: { steps: [{ eq: `2${Vp} / ${Vt} = ${Vu0} + ${Vu}`, why: 'multiply by 2, divide by t' }, { eq: `${Vu} = 2${Vp} / ${Vt} − ${Vu0}`, why: `subtract ${P(u0)} from both sides` }],
               sub: `2{${p}} / {${t}} − {${u0}}` },
        [u0]: { steps: [{ eq: `2${Vp} / ${Vt} = ${Vu0} + ${Vu}`, why: 'multiply by 2, divide by t' }, { eq: `${Vu0} = 2${Vp} / ${Vt} − ${Vu}`, why: `subtract ${P(u)} from both sides` }],
                sub: `2{${p}} / {${t}} − {${u}}` },
      },
    },
    [prefix + '5']: {
      vars: [p, u, a, t], form: `${Vp} = ${Vu}${Vt} − ½${Va}${Vt}²`,
      meaning: words.m5, condition: `constant ${P(a)}`, calc: `Substitute ${P(u0)} = ${P(u)} − ${P(a)}t into the second equation.`,
      solve: {
        [p]: { steps: [], sub: `{${u}}{${t}} − ½{${a}}{${t}}²` },
        [u]: { steps: [{ eq: `${Vp} + ½${Va}${Vt}² = ${Vu}${Vt}`, why: `add ½${P(a)}t² to both sides` }, { eq: `${Vu} = (${Vp} + ½${Va}${Vt}²) / ${Vt}`, why: 'divide both sides by t' }],
               sub: `({${p}} + ½{${a}}{${t}}²) / {${t}}` },
        [a]: { steps: [{ eq: `${Vu}${Vt} − ${Vp} = ½${Va}${Vt}²`, why: `add ½${P(a)}t² and subtract ${P(p)} on both sides` }, { eq: `${Va} = 2(${Vu}${Vt} − ${Vp}) / ${Vt}²`, why: 'multiply by 2, divide by t²' }],
               sub: `2({${u}}{${t}} − {${p}}) / {${t}}²` },
        [t]: { steps: [{ eq: `½${Va}${Vt}² − ${Vu}${Vt} + ${Vp} = 0`, why: 'move everything to one side: a quadratic in t' },
                       { eq: `${Vt} = [${Vu} ± √(${Vu}² − 2${Va}${Vp})] / ${Va}`, why: 'quadratic formula; keep the first positive time' }],
               sub: `[{${u}} ± √({${u}}² − 2{${a}}{${p}})] / {${a}}`,
               guard: v => Math.abs(v[a]) < 1e-12 ? (v[u] === 0 || v[p] / v[u] <= 0 ? err('No positive time works with these values.') : null) : neverSq(v[u] ** 2 - 2 * v[a] * v[p]),
               alt: [{ when: v => Math.abs(v[a]) < 1e-12, sub: `{${p}} / {${u}}`, note: `${P(a)} is zero, so it moves steadily: t = ${P(p)} / ${P(u)}.` }],
               pick: firstPositive('No positive time works with these values.') },
      },
    },
  };
}

const LIN_WORDS = (pos) => ({
  pos: 'spot on the ramp', never: 'it turns around before it ever gets there.',
  m1: 'Velocity changes by a every second.',
  m2: `Displacement = the part from the starting velocity + the extra from accelerating.`,
  m3: 'Links speed and distance directly. No time needed.',
  m4: 'Displacement = average velocity × time. No a needed.',
  m5: 'Like the second one, measured back from the final velocity. No v₀ needed.',
});
const ROT_WORDS = {
  pos: 'angle', never: 'the wheel turns back before it ever reaches this angle.',
  m1: 'Angular velocity grows by α every second.',
  m2: 'Angle turned = the part from the starting spin + the extra from speeding up.',
  m3: 'Links spin rate and angle directly. No time needed.',
  m4: 'Angle = average angular velocity × time. No α needed.',
  m5: 'Like the second one, measured back from the final spin. No ω₀ needed.',
};

const label = (o, prefix) => { Object.entries(o).forEach(([id, e]) => { e.label = prefix + id.slice(-1); }); return o; };
const d2r = (d) => d * Math.PI / 180, r2d = (r) => r * 180 / Math.PI;
const sin = (d) => Math.sin(d2r(d)), cos = (d) => Math.cos(d2r(d));

export const EQS = {
  ...label(kinematics('X', { p: 'dx', u0: 'v0', u: 'vf', a: 'a', t: 't' }, LIN_WORDS('x')), 'K'),
  ...label(kinematics('E', { p: 'theta', u0: 'w0', u: 'w', a: 'alpha', t: 't' }, ROT_WORDS), 'R'),

  // ---- forces on a ramp (+ is down the slope) ----
  N2: {
    label: 'F1', vars: ['W', 'm', 'g'], form: `${V('W')} = ${V('m')}${V('g')}`,
    meaning: 'Weight: gravity pulls straight down with a force proportional to mass.', condition: 'near Earth’s surface',
    calc: 'Newton’s law of gravitation with Earth’s mass and radius rolled into g ≈ 9.81 m/s².',
    solve: {
      W: { steps: [], sub: '{m}{g}' },
      m: { steps: [{ eq: `${V('m')} = ${V('W')} / ${V('g')}`, why: 'divide both sides by g' }], sub: '{W} / {g}' },
      g: { steps: [{ eq: `${V('g')} = ${V('W')} / ${V('m')}`, why: 'divide both sides by m' }], sub: '{W} / {m}' },
    },
  },
  I1: {
    label: 'F2', vars: ['Wpar', 'W', 'inc'], form: `${V('Wpar')} = ${V('W')} sin ${V('inc')}`,
    meaning: 'The part of the weight that pulls the object down the slope.', condition: 'ramp at angle θ',
    calc: 'Tilt the axes to match the ramp. The angle between the weight and the “into the ramp” axis equals the ramp angle θ, so the along-ramp part is W sin θ.',
    solve: {
      Wpar: { steps: [], sub: '{W} sin {inc}' },
      W: { steps: [{ eq: `${V('W')} = ${V('Wpar')} / sin ${V('inc')}`, why: 'divide both sides by sin θ' }], sub: '{Wpar} / sin {inc}', guard: v => sin(v.inc) === 0 ? err('sin θ is zero: on flat ground there’s no along-ramp pull.') : null },
      inc: { steps: [{ eq: `sin ${V('inc')} = ${V('Wpar')} / ${V('W')}`, why: 'divide both sides by W' }, { eq: `${V('inc')} = sin⁻¹(${V('Wpar')} / ${V('W')})`, why: 'undo the sine with inverse sine' }],
             sub: 'sin⁻¹({Wpar} / {W})', guard: v => Math.abs(v.Wpar / v.W) > 1 ? err('W∥ can’t be bigger than W: one of them is mistyped.') : null },
    },
  },
  I2: {
    label: 'F3', vars: ['Wperp', 'W', 'inc'], form: `${V('Wperp')} = ${V('W')} cos ${V('inc')}`,
    meaning: 'The part of the weight that presses the object into the ramp.', condition: 'ramp at angle θ',
    calc: 'Same tilted axes: the into-the-ramp part is the side adjacent to θ, so W cos θ.',
    solve: {
      Wperp: { steps: [], sub: '{W} cos {inc}' },
      W: { steps: [{ eq: `${V('W')} = ${V('Wperp')} / cos ${V('inc')}`, why: 'divide both sides by cos θ' }], sub: '{Wperp} / cos {inc}', guard: v => cos(v.inc) === 0 ? err('cos θ is zero: a vertical wall isn’t a ramp.') : null },
      inc: { steps: [{ eq: `cos ${V('inc')} = ${V('Wperp')} / ${V('W')}`, why: 'divide both sides by W' }, { eq: `${V('inc')} = cos⁻¹(${V('Wperp')} / ${V('W')})`, why: 'undo the cosine with inverse cosine' }],
             sub: 'cos⁻¹({Wperp} / {W})', guard: v => Math.abs(v.Wperp / v.W) > 1 ? err('W⊥ can’t be bigger than W: one of them is mistyped.') : null },
    },
  },
  I3: {
    label: 'F4', vars: ['N', 'Wperp'], form: `${V('N')} = ${V('Wperp')}`,
    meaning: 'The ramp pushes back exactly as hard as the object presses in, so nothing moves into the ramp.', condition: 'stays on the surface, no other push into it',
    calc: 'Newton’s second law perpendicular to the ramp: there’s no acceleration that way, so N − W⊥ = 0.',
    solve: {
      N: { steps: [], sub: '{Wperp}' },
      Wperp: { steps: [{ eq: `${V('Wperp')} = ${V('N')}`, why: 'swap sides' }], sub: '{N}' },
    },
  },
  I4: {
    label: 'F5', vars: ['f', 'mu', 'N'], form: `${V('f')} = ${V('mu')}${V('N')}`,
    meaning: 'Sliding friction grows with how hard the surfaces press together.', condition: 'sliding (kinetic friction)', applies: c => c.friction, needs: 'kinetic friction',
    calc: 'An experimental rule (Coulomb’s law of friction), not derived: μk depends on the two surfaces.',
    solve: {
      f: { steps: [], sub: '{mu}{N}' },
      mu: { steps: [{ eq: `${V('mu')} = ${V('f')} / ${V('N')}`, why: 'divide both sides by N' }], sub: '{f} / {N}' },
      N: { steps: [{ eq: `${V('N')} = ${V('f')} / ${V('mu')}`, why: 'divide both sides by μk' }], sub: '{f} / {mu}' },
    },
  },
  I5d: {
    label: 'F6', vars: ['F', 'Wpar', 'f'], form: `${V('F')} = ${V('Wpar')} − ${V('f')}`,
    meaning: 'Sliding down: gravity’s pull along the slope minus friction holding it back.', condition: 'friction, moving down the slope', applies: c => c.friction && !c.up, needs: 'friction + moving down',
    calc: 'Add the along-ramp forces with + down the slope: W∥ points down (+), friction opposes the motion so it points up (−).',
    solve: {
      F: { steps: [], sub: '{Wpar} − {f}' },
      Wpar: { steps: [{ eq: `${V('Wpar')} = ${V('F')} + ${V('f')}`, why: 'add f to both sides' }], sub: '{F} + {f}' },
      f: { steps: [{ eq: `${V('f')} = ${V('Wpar')} − ${V('F')}`, why: 'add f, subtract Fnet on both sides' }], sub: '{Wpar} − {F}' },
    },
  },
  I5u: {
    label: 'F6', vars: ['F', 'Wpar', 'f'], form: `${V('F')} = ${V('Wpar')} + ${V('f')}`,
    meaning: 'Sliding up: gravity and friction both point down the slope, so they add.', condition: 'friction, moving up the slope', applies: c => c.friction && c.up, needs: 'friction + moving up',
    calc: 'Moving up the slope, friction opposes the motion, so it points down the slope (+), the same way as W∥.',
    solve: {
      F: { steps: [], sub: '{Wpar} + {f}' },
      Wpar: { steps: [{ eq: `${V('Wpar')} = ${V('F')} − ${V('f')}`, why: 'subtract f from both sides' }], sub: '{F} − {f}' },
      f: { steps: [{ eq: `${V('f')} = ${V('F')} − ${V('Wpar')}`, why: 'subtract W∥ from both sides' }], sub: '{F} − {Wpar}' },
    },
  },
  I6: {
    label: 'F6', vars: ['F', 'Wpar'], form: `${V('F')} = ${V('Wpar')}`,
    meaning: 'No friction: the only force along the slope is gravity’s pull.', condition: 'frictionless', applies: c => !c.friction, needs: 'frictionless',
    calc: 'Along the ramp, N and W⊥ have no component, so the net force is just W∥.',
    solve: {
      F: { steps: [], sub: '{Wpar}' },
      Wpar: { steps: [{ eq: `${V('Wpar')} = ${V('F')}`, why: 'swap sides' }], sub: '{F}' },
    },
  },
  N1: {
    label: 'F7', vars: ['F', 'm', 'a'], form: `${V('F')} = ${V('m')}${V('a')}`,
    meaning: 'Newton’s second law: the net force sets the acceleration.', condition: 'net force, constant mass',
    calc: 'F = dp/dt with p = mv and m constant.',
    solve: {
      F: { steps: [], sub: '{m}{a}' },
      m: { steps: [{ eq: `${V('m')} = ${V('F')} / ${V('a')}`, why: 'divide both sides by a' }], sub: '{F} / {a}' },
      a: { steps: [{ eq: `${V('a')} = ${V('F')} / ${V('m')}`, why: 'divide both sides by m' }], sub: '{F} / {m}' },
    },
  },
  S1: {
    label: 'S1', vars: ['a', 'g', 'inc'], form: `${V('a')} = ${V('g')} sin ${V('inc')}`,
    meaning: 'Frictionless ramp: the mass cancels, so every object slides with the same acceleration.', condition: 'frictionless', applies: c => !c.friction, needs: 'frictionless',
    calc: 'Chain F7 → F6 → F2 → F1: ma = W∥ = mg sin θ, and m cancels.',
    solve: {
      a: { steps: [], sub: '{g} sin {inc}' },
      g: { steps: [{ eq: `${V('g')} = ${V('a')} / sin ${V('inc')}`, why: 'divide both sides by sin θ' }], sub: '{a} / sin {inc}', guard: v => sin(v.inc) === 0 ? err('sin θ is zero.') : null },
      inc: { steps: [{ eq: `sin ${V('inc')} = ${V('a')} / ${V('g')}`, why: 'divide both sides by g' }, { eq: `${V('inc')} = sin⁻¹(${V('a')} / ${V('g')})`, why: 'undo the sine' }],
             sub: 'sin⁻¹({a} / {g})', guard: v => Math.abs(v.a / v.g) > 1 ? err('a can’t be bigger than g on a frictionless ramp.') : null },
    },
  },
  S2: {
    label: 'S2', vars: ['a', 'g', 'inc', 'mu'], form: `${V('a')} = ${V('g')}(sin ${V('inc')} − ${V('mu')} cos ${V('inc')})`,
    meaning: 'Sliding down with friction: the mass cancels here too.', condition: 'friction, moving down', applies: c => c.friction && !c.up, needs: 'friction + moving down',
    calc: 'ma = W∥ − f = mg sin θ − μk mg cos θ; divide by m.',
    solve: {
      a: { steps: [], sub: '{g}(sin {inc} − {mu} cos {inc})' },
      g: { steps: [{ eq: `${V('g')} = ${V('a')} / (sin ${V('inc')} − ${V('mu')} cos ${V('inc')})`, why: 'divide both sides by the bracket' }], sub: '{a} / (sin {inc} − {mu} cos {inc})', guard: v => Math.abs(sin(v.inc) - v.mu * cos(v.inc)) < 1e-12 ? err('The bracket is zero: friction exactly balances gravity.') : null },
      mu: { steps: [{ eq: `${V('a')} / ${V('g')} = sin ${V('inc')} − ${V('mu')} cos ${V('inc')}`, why: 'divide both sides by g' }, { eq: `${V('mu')} = (sin ${V('inc')} − ${V('a')} / ${V('g')}) / cos ${V('inc')}`, why: 'move μk cos θ over, then divide by cos θ' }],
            sub: '(sin {inc} − {a} / {g}) / cos {inc}' },
    },
  },
  S3: {
    label: 'S2', vars: ['a', 'g', 'inc', 'mu'], form: `${V('a')} = ${V('g')}(sin ${V('inc')} + ${V('mu')} cos ${V('inc')})`,
    meaning: 'Sliding up with friction: gravity and friction both slow it, so the mass cancels and they add.', condition: 'friction, moving up', applies: c => c.friction && c.up, needs: 'friction + moving up',
    calc: 'ma = W∥ + f = mg sin θ + μk mg cos θ; divide by m.',
    solve: {
      a: { steps: [], sub: '{g}(sin {inc} + {mu} cos {inc})' },
      g: { steps: [{ eq: `${V('g')} = ${V('a')} / (sin ${V('inc')} + ${V('mu')} cos ${V('inc')})`, why: 'divide both sides by the bracket' }], sub: '{a} / (sin {inc} + {mu} cos {inc})' },
      mu: { steps: [{ eq: `${V('a')} / ${V('g')} = sin ${V('inc')} + ${V('mu')} cos ${V('inc')}`, why: 'divide both sides by g' }, { eq: `${V('mu')} = (${V('a')} / ${V('g')} − sin ${V('inc')}) / cos ${V('inc')}`, why: 'subtract sin θ, then divide by cos θ' }],
            sub: '({a} / {g} − sin {inc}) / cos {inc}' },
    },
  },


  // ---- tension + pulleys ----
  P1: { label: 'T1', vars: ['W1', 'm1', 'g'], form: `${V('W1')} = ${V('m1')}${V('g')}`, meaning: 'Weight of the block on the table.', condition: 'near Earth’s surface', calc: 'W = mg for block 1.',
    solve: { W1: { steps: [], sub: '{m1}{g}' }, m1: { steps: [{ eq: `${V('m1')} = ${V('W1')} / ${V('g')}`, why: 'divide both sides by g' }], sub: '{W1} / {g}' }, g: { steps: [{ eq: `${V('g')} = ${V('W1')} / ${V('m1')}`, why: 'divide both sides by m₁' }], sub: '{W1} / {m1}' } } },
  P2: { label: 'T2', vars: ['W2', 'm2', 'g'], form: `${V('W2')} = ${V('m2')}${V('g')}`, meaning: 'Weight of the hanging mass.', condition: 'near Earth’s surface', calc: 'W = mg for block 2.',
    solve: { W2: { steps: [], sub: '{m2}{g}' }, m2: { steps: [{ eq: `${V('m2')} = ${V('W2')} / ${V('g')}`, why: 'divide both sides by g' }], sub: '{W2} / {g}' }, g: { steps: [{ eq: `${V('g')} = ${V('W2')} / ${V('m2')}`, why: 'divide both sides by m₂' }], sub: '{W2} / {m2}' } } },
  P3: { label: 'T3', vars: ['N1', 'W1'], form: `${V('N1')} = ${V('W1')}`, meaning: 'The flat table pushes up exactly as hard as the block presses down.', condition: 'flat table, string horizontal', calc: 'Newton’s second law vertically for block 1: no vertical acceleration, so N₁ − W₁ = 0.',
    solve: { N1: { steps: [], sub: '{W1}' }, W1: { steps: [{ eq: `${V('W1')} = ${V('N1')}`, why: 'swap sides' }], sub: '{N1}' } } },
  P4: { label: 'T4', vars: ['f', 'mu', 'N1'], form: `${V('f')} = ${V('mu')}${V('N1')}`, meaning: 'Sliding friction on the block, proportional to how hard the table pushes.', condition: 'sliding (kinetic friction)', applies: c => c.friction, needs: 'kinetic friction', calc: 'Coulomb’s law of friction, applied to block 1.',
    solve: { f: { steps: [], sub: '{mu}{N1}' }, mu: { steps: [{ eq: `${V('mu')} = ${V('f')} / ${V('N1')}`, why: 'divide both sides by N₁' }], sub: '{f} / {N1}' }, N1: { steps: [{ eq: `${V('N1')} = ${V('f')} / ${V('mu')}`, why: 'divide both sides by μk' }], sub: '{f} / {mu}' } } },
  P5: { label: 'T5', vars: ['Tn', 'm1', 'a'], form: `${V('Tn')} = ${V('m1')}${V('a')}`, meaning: 'Block 1: the tension is the only horizontal force, so it alone accelerates the block.', condition: 'frictionless table', applies: c => !c.friction, needs: 'frictionless table', calc: 'Newton’s second law horizontally for block 1 (+ toward the pulley).',
    solve: { Tn: { steps: [], sub: '{m1}{a}' }, m1: { steps: [{ eq: `${V('m1')} = ${V('Tn')} / ${V('a')}`, why: 'divide both sides by a' }], sub: '{Tn} / {a}' }, a: { steps: [{ eq: `${V('a')} = ${V('Tn')} / ${V('m1')}`, why: 'divide both sides by m₁' }], sub: '{Tn} / {m1}' } } },
  P5f: { label: 'T5', vars: ['Tn', 'f', 'm1', 'a'], form: `${V('Tn')} − ${V('f')} = ${V('m1')}${V('a')}`, meaning: 'Block 1: the string pulls it forward, friction drags it back.', condition: 'kinetic friction', applies: c => c.friction, needs: 'kinetic friction', calc: 'Newton’s second law horizontally for block 1 (+ toward the pulley): T forward, f backward.',
    solve: { Tn: { steps: [{ eq: `${V('Tn')} = ${V('m1')}${V('a')} + ${V('f')}`, why: 'add f to both sides' }], sub: '{m1}{a} + {f}' },
      f: { steps: [{ eq: `${V('f')} = ${V('Tn')} − ${V('m1')}${V('a')}`, why: 'add f, subtract m₁a on both sides' }], sub: '{Tn} − {m1}{a}' },
      m1: { steps: [{ eq: `${V('m1')} = (${V('Tn')} − ${V('f')}) / ${V('a')}`, why: 'divide both sides by a' }], sub: '({Tn} − {f}) / {a}' },
      a: { steps: [{ eq: `${V('a')} = (${V('Tn')} − ${V('f')}) / ${V('m1')}`, why: 'divide both sides by m₁' }], sub: '({Tn} − {f}) / {m1}' } } },
  P6: { label: 'T6', vars: ['W2', 'Tn', 'm2', 'a'], form: `${V('W2')} − ${V('Tn')} = ${V('m2')}${V('a')}`, meaning: 'Hanging mass: gravity pulls it down, the string holds it up. The difference accelerates it.', condition: 'ideal string and pulley', calc: 'Newton’s second law vertically for block 2 (+ downward): W₂ down, T up.',
    solve: { W2: { steps: [{ eq: `${V('W2')} = ${V('m2')}${V('a')} + ${V('Tn')}`, why: 'add T to both sides' }], sub: '{m2}{a} + {Tn}' },
      Tn: { steps: [{ eq: `${V('Tn')} = ${V('W2')} − ${V('m2')}${V('a')}`, why: 'add T, subtract m₂a on both sides' }], sub: '{W2} − {m2}{a}' },
      m2: { steps: [{ eq: `${V('m2')} = (${V('W2')} − ${V('Tn')}) / ${V('a')}`, why: 'divide both sides by a' }], sub: '({W2} − {Tn}) / {a}' },
      a: { steps: [{ eq: `${V('a')} = (${V('W2')} − ${V('Tn')}) / ${V('m2')}`, why: 'divide both sides by m₂' }], sub: '({W2} − {Tn}) / {m2}' } } },
  P7: { label: 'S1', vars: ['a', 'm1', 'm2', 'g'], form: `${V('a')} = ${V('m2')}${V('g')} / (${V('m1')} + ${V('m2')})`, meaning: 'Treat both blocks as one system: only the hanging weight drives the total mass.', condition: 'frictionless table', applies: c => !c.friction, needs: 'frictionless table', calc: 'Add T5 and T6: T cancels, leaving m₂g = (m₁ + m₂)a.',
    solve: { a: { steps: [], sub: '{m2}{g} / ({m1} + {m2})' },
      m2: { steps: [{ eq: `${V('a')}(${V('m1')} + ${V('m2')}) = ${V('m2')}${V('g')}`, why: 'multiply both sides by (m₁ + m₂)' }, { eq: `${V('m2')}(${V('g')} − ${V('a')}) = ${V('a')}${V('m1')}`, why: 'collect the m₂ terms on one side' }, { eq: `${V('m2')} = ${V('a')}${V('m1')} / (${V('g')} − ${V('a')})`, why: 'divide by (g − a)' }], sub: '{a}{m1} / ({g} − {a})', guard: v => v.g === v.a ? err('a = g would need an infinite hanging mass.') : null },
      m1: { steps: [{ eq: `${V('a')}(${V('m1')} + ${V('m2')}) = ${V('m2')}${V('g')}`, why: 'multiply both sides by (m₁ + m₂)' }, { eq: `${V('m1')} = ${V('m2')}(${V('g')} − ${V('a')}) / ${V('a')}`, why: 'subtract am₂, then divide by a' }], sub: '{m2}({g} − {a}) / {a}' },
      g: { steps: [{ eq: `${V('g')} = ${V('a')}(${V('m1')} + ${V('m2')}) / ${V('m2')}`, why: 'multiply by (m₁ + m₂), divide by m₂' }], sub: '{a}({m1} + {m2}) / {m2}' } } },
  P7f: { label: 'S1', vars: ['a', 'm1', 'm2', 'g', 'mu'], form: `${V('a')} = ${V('g')}(${V('m2')} − ${V('mu')}${V('m1')}) / (${V('m1')} + ${V('m2')})`, meaning: 'Whole system: the hanging weight minus the friction on block 1, shared by both masses.', condition: 'kinetic friction', applies: c => c.friction, needs: 'kinetic friction', calc: 'Add T5 and T6 with f = μk m₁g: T cancels, leaving m₂g − μk m₁g = (m₁ + m₂)a.',
    solve: { a: { steps: [], sub: '{g}({m2} − {mu}{m1}) / ({m1} + {m2})', note: (v, a) => a < 0 ? 'Negative: friction is stronger than the hanging weight. Starting from rest the blocks would not move at all; this only describes blocks already sliding forward and slowing down.' : '' },
      mu: { steps: [{ eq: `${V('a')}(${V('m1')} + ${V('m2')}) / ${V('g')} = ${V('m2')} − ${V('mu')}${V('m1')}`, why: 'multiply by (m₁ + m₂), divide by g' }, { eq: `${V('mu')} = [${V('m2')} − ${V('a')}(${V('m1')} + ${V('m2')}) / ${V('g')}] / ${V('m1')}`, why: 'move μk m₁ over, then divide by m₁' }], sub: '[{m2} − {a}({m1} + {m2}) / {g}] / {m1}' },
      m2: { steps: [{ eq: `${V('a')}(${V('m1')} + ${V('m2')}) = ${V('g')}${V('m2')} − ${V('mu')}${V('g')}${V('m1')}`, why: 'multiply both sides by (m₁ + m₂)' }, { eq: `${V('m2')} = ${V('m1')}(${V('a')} + ${V('mu')}${V('g')}) / (${V('g')} − ${V('a')})`, why: 'collect the m₂ terms, then divide by (g − a)' }], sub: '{m1}({a} + {mu}{g}) / ({g} − {a})', guard: v => v.g === v.a ? err('a = g is impossible here.') : null },
      m1: { steps: [{ eq: `${V('a')}(${V('m1')} + ${V('m2')}) = ${V('g')}${V('m2')} − ${V('mu')}${V('g')}${V('m1')}`, why: 'multiply both sides by (m₁ + m₂)' }, { eq: `${V('m1')} = ${V('m2')}(${V('g')} − ${V('a')}) / (${V('a')} + ${V('mu')}${V('g')})`, why: 'collect the m₁ terms, then divide' }], sub: '{m2}({g} − {a}) / ({a} + {mu}{g})', guard: v => (v.a + v.mu * v.g) === 0 ? err('The bracket a + μk g is zero.') : null },
      g: { steps: [{ eq: `${V('g')} = ${V('a')}(${V('m1')} + ${V('m2')}) / (${V('m2')} − ${V('mu')}${V('m1')})`, why: 'multiply by (m₁ + m₂), divide by the bracket' }], sub: '{a}({m1} + {m2}) / ({m2} − {mu}{m1})', guard: v => (v.m2 - v.mu * v.m1) === 0 ? err('m₂ − μk m₁ is zero.') : null } } },
  P8: { label: 'S2', vars: ['Tn', 'm1', 'm2', 'g'], form: `${V('Tn')} = ${V('m1')}${V('m2')}${V('g')} / (${V('m1')} + ${V('m2')})`, meaning: 'Tension straight from the masses: always less than the hanging weight.', condition: 'frictionless table', applies: c => !c.friction, needs: 'frictionless table', calc: 'Put a = m₂g / (m₁ + m₂) into T = m₁a.',
    solve: { Tn: { steps: [], sub: '{m1}{m2}{g} / ({m1} + {m2})' },
      m1: { steps: [{ eq: `${V('Tn')}(${V('m1')} + ${V('m2')}) = ${V('m1')}${V('m2')}${V('g')}`, why: 'multiply both sides by (m₁ + m₂)' }, { eq: `${V('m1')} = ${V('Tn')}${V('m2')} / (${V('m2')}${V('g')} − ${V('Tn')})`, why: 'collect the m₁ terms, then divide' }], sub: '{Tn}{m2} / ({m2}{g} − {Tn})', guard: v => (v.m2 * v.g - v.Tn) <= 0 ? err('T can’t be as big as the hanging weight unless m₁ is infinite.') : null },
      m2: { steps: [{ eq: `${V('Tn')}(${V('m1')} + ${V('m2')}) = ${V('m1')}${V('m2')}${V('g')}`, why: 'multiply both sides by (m₁ + m₂)' }, { eq: `${V('m2')} = ${V('Tn')}${V('m1')} / (${V('m1')}${V('g')} − ${V('Tn')})`, why: 'collect the m₂ terms, then divide' }], sub: '{Tn}{m1} / ({m1}{g} − {Tn})', guard: v => (v.m1 * v.g - v.Tn) <= 0 ? err('T can’t be as big as m₁g here.') : null } } },
  P8f: { label: 'S2', vars: ['Tn', 'm1', 'm2', 'g', 'mu'], form: `${V('Tn')} = ${V('m1')}${V('m2')}${V('g')}(1 + ${V('mu')}) / (${V('m1')} + ${V('m2')})`, meaning: 'Tension with friction on the table.', condition: 'kinetic friction', applies: c => c.friction, needs: 'kinetic friction', calc: 'Put the system acceleration into T = W₂ − m₂a and simplify.',
    solve: { Tn: { steps: [], sub: '{m1}{m2}{g}(1 + {mu}) / ({m1} + {m2})' },
      mu: { steps: [{ eq: `1 + ${V('mu')} = ${V('Tn')}(${V('m1')} + ${V('m2')}) / (${V('m1')}${V('m2')}${V('g')})`, why: 'multiply by (m₁ + m₂), divide by m₁m₂g' }, { eq: `${V('mu')} = ${V('Tn')}(${V('m1')} + ${V('m2')}) / (${V('m1')}${V('m2')}${V('g')}) − 1`, why: 'subtract 1' }], sub: '{Tn}({m1} + {m2}) / ({m1}{m2}{g}) − 1' } } },

  // ---- rotation: a point at radius r ----
  E6: {
    label: 'R6', vars: ['s', 'r', 'theta'], form: `${V('s')} = ${V('r')}${V('theta')}`,
    meaning: 'Arc length = radius × angle (angle in radians!).', condition: 'θ in radians', calc: 'This is the definition of the radian: θ = s/r.',
    solve: {
      s: { steps: [], sub: '{r}{theta}' },
      r: { steps: [{ eq: `${V('r')} = ${V('s')} / ${V('theta')}`, why: 'divide both sides by θ' }], sub: '{s} / {theta}' },
      theta: { steps: [{ eq: `${V('theta')} = ${V('s')} / ${V('r')}`, why: 'divide both sides by r' }], sub: '{s} / {r}' },
    },
  },
  E7: {
    label: 'R7', vars: ['v', 'r', 'w'], form: `${V('v')} = ${V('r')}${V('w')}`,
    meaning: 'Points farther from the axis move faster.', condition: 'ω in rad/s', calc: 'Differentiate s = rθ with r fixed: ds/dt = r dθ/dt.',
    solve: {
      v: { steps: [], sub: '{r}{w}' },
      r: { steps: [{ eq: `${V('r')} = ${V('v')} / ${V('w')}`, why: 'divide both sides by ω' }], sub: '{v} / {w}' },
      w: { steps: [{ eq: `${V('w')} = ${V('v')} / ${V('r')}`, why: 'divide both sides by r' }], sub: '{v} / {r}' },
    },
  },
  E8: {
    label: 'R8', vars: ['at', 'r', 'alpha'], form: `${V('at')} = ${V('r')}${V('alpha')}`,
    meaning: 'Speeding up the spin speeds up the point along its path.', condition: 'α in rad/s²', calc: 'Differentiate v = rω: dv/dt = r dω/dt.',
    solve: {
      at: { steps: [], sub: '{r}{alpha}' },
      r: { steps: [{ eq: `${V('r')} = ${V('at')} / ${V('alpha')}`, why: 'divide both sides by α' }], sub: '{at} / {alpha}' },
      alpha: { steps: [{ eq: `${V('alpha')} = ${V('at')} / ${V('r')}`, why: 'divide both sides by r' }], sub: '{at} / {r}' },
    },
  },
  E9: {
    label: 'R9', vars: ['ac', 'w', 'r'], form: `${V('ac')} = ${V('w')}²${V('r')}`,
    meaning: 'Even at steady spin, the point accelerates toward the centre.', condition: 'ω in rad/s', calc: 'From a = v²/r with v = rω: a = (rω)²/r = ω²r.',
    solve: {
      ac: { steps: [], sub: '{w}²{r}' },
      r: { steps: [{ eq: `${V('r')} = ${V('ac')} / ${V('w')}²`, why: 'divide both sides by ω²' }], sub: '{ac} / {w}²' },
      w: { steps: [{ eq: `${V('w')}² = ${V('ac')} / ${V('r')}`, why: 'divide both sides by r' }, { eq: `${V('w')} = ±√(${V('ac')} / ${V('r')})`, why: 'take the square root; a꜀ only tells you how fast it spins, not which way' }],
           sub: '±√({ac} / {r})',
           pick: (v, cands) => { const mag = Math.abs(cands[0]);
             return { branch: 1, note: `The root gives ±${fmt(mag)}. Centripetal acceleration points to the centre whichever way the wheel turns, so it can’t tell you the direction. The positive root (counterclockwise) is kept. If it spins clockwise, ω is the negative of this.` }; } },
    },
  },
};
// rename labels of the kinematics families: K1..K5, R1..R5
for (const n of [1, 2, 3, 4, 5]){ EQS['X' + n].label = 'K' + n; EQS['E' + n].label = 'R' + n; }

// ---------- chapters ----------
export const CHAPTERS = {
  incline: {
    title: 'Inclines & Newton’s laws', short: 'Inclines',
    kin: { p: 'dx', u0: 'v0', u: 'vf', a: 'a', t: 't' }, diagram: 'incline',
    vars: ['dx', 'v0', 'vf', 'a', 't', 'inc', 'm', 'g', 'W', 'Wpar', 'Wperp', 'N', 'f', 'mu', 'F'],
    axis: '+ is <b>down the slope</b>. Pick the direction for each vector; the lab sets the sign.',
    intro: `<p>On a ramp, tilt your axes so one runs <b>along the slope</b> and one runs <b>into it</b>. Gravity then splits into two parts: W∥ pulls the object down the slope, and W⊥ presses it into the ramp, where the normal force N cancels it.</p>
      <p>Only the forces along the slope change the motion. Once you know the acceleration, the constant-acceleration equations describe the slide.</p>`,
    sections: [
      { title: 'Kinematics along the ramp', note: 'Five quantities: Δx, v₀, v, a, t. Each equation leaves one of them out.', eqs: ['X1', 'X2', 'X3', 'X4', 'X5'] },
      { title: 'Forces on a ramp', note: 'Weight, its two components, the normal force, friction and Newton’s second law.', eqs: ['N2', 'I1', 'I2', 'I3', 'I4', 'I5d', 'I5u', 'I6', 'N1'] },
      { title: 'Shortcuts (the mass cancels)', note: 'These combine the force equations. Use them when the problem gives no mass.', eqs: ['S1', 'S2', 'S3'] },
    ],
    conditions: [
      { key: 'friction', type: 'choice', label: 'Surface', options: [[false, 'Frictionless'], [true, 'Kinetic friction (it slides)']] },
      { key: 'up', type: 'choice', label: 'Moving', options: [[false, 'Down the slope'], [true, 'Up the slope']] },
      { key: 'constA', type: 'locked', label: 'Constant acceleration', note: 'True on a uniform ramp: the forces don’t change as it slides.' },
      { key: 'rest', type: 'hidden', label: 'Starts from rest', sets: { v0: 0 } },
      { key: 'stop', type: 'hidden', label: 'Comes to a stop', sets: { vf: 0 } },
      { key: 'earth', type: 'hidden', label: 'On Earth (g = 9.81 m/s²)', sets: { g: 9.81 }, default: true },
    ],
    defaults: { inc: 30, v0: 0, mu: 0.2, m: 2 },
  },
  pulley: {
    title: 'Tension & pulleys', short: 'Pulleys',
    kin: { p: 'dx', u0: 'v0', u: 'vf', a: 'a', t: 't' }, diagram: 'pulley',
    vars: ['m1', 'm2', 'g', 'a', 'Tn', 'W1', 'W2', 'N1', 'f', 'mu', 'dx', 'v0', 'vf', 't'],
    dirs: { dx: ['forward (m₂ falls)', 'backward (m₂ rises)'], v0: ['forward (m₂ falls)', 'backward (m₂ rises)'], vf: ['forward (m₂ falls)', 'backward (m₂ rises)'], a: ['forward (m₂ falls)', 'backward (m₂ rises)'] },
    names: { dx: 'distance each block moves', v0: 'initial speed of the blocks', vf: 'final speed of the blocks', a: 'acceleration of both blocks', f: 'kinetic friction on m₁ (size)' },
    axis: '+ is <b>forward</b>: the way things move when m₂ falls (m₁ slides toward the pulley).',
    stuck: 'Hidden givens? “Released from rest” means v₀ = 0, and “moves at constant speed” means a = 0. Is “On Earth” ticked so g is known?',
    intro: `<p>The string ties the blocks together: they move the <b>same distance</b> with the <b>same speed and acceleration</b>, and an ideal string pulls with the <b>same tension T</b> on both ends.</p>
      <p>Draw a free-body diagram for <b>each block</b> and write Newton’s second law for each, along its own direction of motion (sideways for m₁, down for m₂). Adding the two equations cancels T and gives the acceleration of the whole system.</p>`,
    sections: [
      { title: 'Forces on each block', note: 'Weights, the table’s push, friction, and Newton’s second law for block 1 and block 2.', eqs: ['P1', 'P2', 'P3', 'P4', 'P5', 'P5f', 'P6'] },
      { title: 'Shortcuts (whole system)', note: 'These combine the two Newton equations so T cancels out.', eqs: ['P7', 'P7f', 'P8', 'P8f'] },
      { title: 'Kinematics (both blocks move together)', note: 'Five quantities: Δx, v₀, v, a, t, shared by both blocks.', eqs: ['X1', 'X2', 'X3', 'X4', 'X5'] },
    ],
    conditions: [
      { key: 'friction', type: 'choice', label: 'Table surface', options: [[false, 'Frictionless'], [true, 'Kinetic friction (it slides)']] },
      { key: 'ideal', type: 'locked', label: 'Ideal string and pulley', note: 'Massless string that doesn’t stretch, frictionless pulley: same T on both sides, same a for both blocks.' },
      { key: 'fwd', type: 'locked', label: 'm₂ falls, m₁ slides toward the pulley', note: 'Friction on m₁ points back, away from the pulley.' },
      { key: 'rest', type: 'hidden', label: 'Released from rest', sets: { v0: 0 } },
      { key: 'steady', type: 'hidden', label: 'Moves at constant speed', sets: { a: 0 } },
      { key: 'earth', type: 'hidden', label: 'On Earth (g = 9.81 m/s²)', sets: { g: 9.81 }, default: true },
    ],
    defaults: { m1: 2, m2: 1, mu: 0.2, v0: 0 },
    systems: [
      { eqs: ['P5', 'P6'], pair: ['Tn', 'a'], gives: 'P7', text: 'T5 and T6 share the same two unknowns, T and a: that’s a <b>system of two equations</b>. Add them together: T appears as +T in one and −T in the other, so it cancels, leaving m₂g = (m₁ + m₂)a. That combined equation is shortcut S1.' },
      { eqs: ['P5f', 'P6'], pair: ['Tn', 'a'], gives: 'P7f', text: 'T5 and T6 share the same two unknowns, T and a: that’s a <b>system of two equations</b>. Add them together: T cancels, leaving m₂g − f = (m₁ + m₂)a. With f = μk m₁g, that’s shortcut S1.' },
    ],
  },
  rotation: {
    title: 'Rotation kinematics', short: 'Rotation',
    kin: { p: 'theta', u0: 'w0', u: 'w', a: 'alpha', t: 't' }, diagram: 'wheel',
    vars: ['theta', 'w0', 'w', 'alpha', 't'], rimVars: ['r', 's', 'v', 'at', 'ac'],
    axis: '+ is <b>counterclockwise</b>. Pick the direction for each vector; the lab sets the sign.',
    intro: `<p>A rigid wheel turns as one piece: every point sweeps the <b>same angle</b> in the same time. Its motion is described by angle θ, angular velocity ω and angular acceleration α.</p>
      <p>These are the rotational twins of position, velocity and acceleration, so the equations have the same shape. The radius r converts to a point’s path: s = rθ, v = rω.</p>`,
    sections: [
      { title: 'Angular kinematics', note: 'Five quantities: θ, ω₀, ω, α, t. Each equation leaves one of them out.', eqs: ['E1', 'E2', 'E3', 'E4', 'E5'] },
      { title: 'A point at radius r', note: 'Turn on “Track a point” in the conditions to use these.', eqs: ['E6', 'E7', 'E8', 'E9'], applies: c => c.rim, needs: 'track a point at radius r' },
    ],
    conditions: [
      { key: 'constA', type: 'locked', label: 'Constant angular acceleration', note: 'Needed for every equation in this chapter.' },
      { key: 'rim', type: 'toggle', label: 'Track a point at distance r from the axis' },
      { key: 'rest', type: 'hidden', label: 'Starts from rest', sets: { w0: 0 } },
      { key: 'stop', type: 'hidden', label: 'Comes to a stop', sets: { w: 0 } },
    ],
    defaults: { w0: 1.5, alpha: 1.2, r: 0.5 },
  },
};

// ---------- practice bank: text only for the student; the key is for “Check my setup” ----------
// givens: id → [size, unit, directionIndex (0 = first direction word = +)]
export const PRACTICE = [
  { ch: 'incline', title: 'Frictionless slide', text: 'A block starts from rest at the top of a frictionless ramp inclined at 25°. How fast is it moving after it has slid 3.0 m down the ramp?',
    key: { givens: { v0: [0, 'm/s', 0], inc: [25, '°'], dx: [3, 'm', 0], g: [9.81, 'm/s²'] }, cond: { friction: false, up: false }, targets: ['vf'] } },
  { ch: 'incline', title: 'Crate with friction', text: 'A 4.0 kg crate slides down a 30° ramp. The coefficient of kinetic friction between the crate and the ramp is 0.20. What is the crate’s acceleration?',
    key: { givens: { m: [4, 'kg'], inc: [30, '°'], mu: [0.2, 'no unit'], g: [9.81, 'm/s²'] }, cond: { friction: true, up: false }, targets: ['a'] } },
  { ch: 'incline', title: 'Shoved up the ramp', text: 'A hockey puck is shoved up a frictionless ramp inclined at 15°, starting at 6.0 m/s. How far up the ramp does it slide before it stops?',
    key: { givens: { v0: [6, 'm/s', 1], vf: [0, 'm/s', 0], inc: [15, '°'], g: [9.81, 'm/s²'] }, cond: { friction: false, up: true }, targets: ['dx'] } },
  { ch: 'incline', title: 'How hard does the ramp push?', text: 'A 10 kg box rests on a 20° ramp. What is the normal force from the ramp on the box?',
    key: { givens: { m: [10, 'kg'], inc: [20, '°'], g: [9.81, 'm/s²'] }, cond: {}, targets: ['N'] } },
  { ch: 'incline', title: 'Two-part problem', text: 'A sled starts from rest and slides 12 m down a 35° hill with μk = 0.10. (a) What is its acceleration? (b) How long does the slide take?',
    key: { givens: { v0: [0, 'm/s', 0], dx: [12, 'm', 0], inc: [35, '°'], mu: [0.1, 'no unit'], g: [9.81, 'm/s²'] }, cond: { friction: true, up: false }, targets: ['a', 't'] } },
  { ch: 'pulley', title: 'Frictionless table', text: 'A 4.0 kg block on a frictionless table is tied by a string over a pulley at the table’s edge to a 2.0 kg mass hanging in the air. Released, (a) what is the acceleration of the blocks and (b) what is the tension in the string?',
    key: { givens: { m1: [4, 'kg'], m2: [2, 'kg'], g: [9.81, 'm/s²'] }, cond: { friction: false }, targets: ['a', 'Tn'] } },
  { ch: 'pulley', title: 'With friction', text: 'A 5.0 kg block on a table is connected over a pulley to a 3.0 kg hanging mass. The coefficient of kinetic friction between the block and the table is 0.25. What is the acceleration of the system?',
    key: { givens: { m1: [5, 'kg'], m2: [3, 'kg'], mu: [0.25, 'no unit'], g: [9.81, 'm/s²'] }, cond: { friction: true }, targets: ['a'] } },
  { ch: 'pulley', title: 'Constant speed', text: 'A 6.0 kg box is pulled across a table by a string running over a pulley to a 1.5 kg hanging mass. Once nudged, the box slides at constant speed. What is the coefficient of kinetic friction?',
    key: { givens: { m1: [6, 'kg'], m2: [1.5, 'kg'], a: [0, 'm/s²', 0], g: [9.81, 'm/s²'] }, cond: { friction: true }, targets: ['mu'] } },
  { ch: 'pulley', title: 'How far does it fall?', text: 'A 3.0 kg block rests on a frictionless table, tied over a pulley to a 1.0 kg hanging mass. The system is released from rest. How far does the hanging mass fall in 1.2 s?',
    key: { givens: { m1: [3, 'kg'], m2: [1, 'kg'], v0: [0, 'm/s', 0], t: [1.2, 's'], g: [9.81, 'm/s²'] }, cond: { friction: false }, targets: ['dx'] } },
  { ch: 'pulley', title: 'Measuring friction', text: 'In a lab, a 2.0 kg block on a table is pulled by a 1.0 kg hanging mass over a pulley. The blocks accelerate at 1.5 m/s². Find (a) the coefficient of kinetic friction and (b) the tension in the string.',
    key: { givens: { m1: [2, 'kg'], m2: [1, 'kg'], a: [1.5, 'm/s²', 0], g: [9.81, 'm/s²'] }, cond: { friction: true }, targets: ['mu', 'Tn'] } },
  { ch: 'rotation', title: 'Fan winding down', text: 'A fan spinning at 1200 rpm is switched off and comes to a stop after turning 50 revolutions. How long does it take to stop?',
    key: { givens: { w0: [1200, 'rpm', 0], w: [0, 'rad/s', 0], theta: [50, 'rev', 0] }, cond: {}, targets: ['t'] } },
  { ch: 'rotation', title: 'Wheel spinning up', text: 'A wheel spinning counterclockwise at 2 rad/s speeds up at 3 rad/s² until it reaches 8 rad/s. Through what angle does it turn?',
    key: { givens: { w0: [2, 'rad/s', 0], alpha: [3, 'rad/s²', 0], w: [8, 'rad/s', 0] }, cond: {}, targets: ['theta'] } },
  { ch: 'rotation', title: 'Point on a disk', text: 'A disk of radius 0.50 m starts from rest and spins up with an angular acceleration of 4.0 rad/s². How fast is a point on its rim moving after 3.0 s?',
    key: { givens: { r: [0.5, 'm'], w0: [0, 'rad/s', 0], alpha: [4, 'rad/s²', 0], t: [3, 's'] }, cond: { rim: true }, targets: ['v'] } },
];

export function fmt(x){
  if (!isFinite(x)) return String(x);
  if (Math.abs(x) < 1e-10) return '0';
  const a = Math.abs(x);
  if (a >= 1e5 || a < 1e-3) return x.toExponential(3).replace(/\.?0+e/, 'e').replace('e+', '×10^').replace('e-', '×10^-');
  return String(+x.toPrecision(4));
}

// ---------- units, sample values and print order (Phase A: symbolic core) ----------
// SI dimension of every quantity, from its unit. Angles are dimensionless.
export const DIMS = Object.fromEntries(Object.entries(VARS).map(([id, d]) => [id, parseUnit(d.unit)]));
// A typical size for each quantity. A symbol given without a number uses it to pick roots and signs
// (and to draw the diagram); the answer itself stays symbolic.
export const SAMPLE = {
  dx: 4, v0: 3, vf: 5, a: 2, t: 2, m: 3, g: 9.81, inc: 30, W: 29.4, Wpar: 14.7, Wperp: 25.5, N: 25.5, f: 5, mu: 0.15, F: 10,
  m1: 4, m2: 2, W1: 39.2, W2: 19.6, N1: 39.2, Tn: 12,
  theta: 8, w0: 2, w: 6, alpha: 1.5, r: 0.5, s: 4, v: 3, at: 0.75, ac: 18,
};
// Order symbols are written in a product: coefficient-like first (μk m g), then the rest.
export const PRINT_ORDER = ['mu', 'r', 'm', 'm1', 'm2', 'g', 'W', 'W1', 'W2', 'Wpar', 'Wperp', 'N', 'N1', 'f', 'F', 'Tn', 'inc',
  'dx', 'theta', 's', 'v0', 'w0', 'vf', 'w', 'v', 'a', 'alpha', 'at', 'ac', 't'];

// ---------- every solver's numbers come from its `sub` template ----------
// A solver is { steps, sub, guard?, pick?, alt?, note? }:
//   sub     the plug-in template; parsed once, it gives both the numeric and the symbolic answer
//   guard   v → error or null: a physics-specific message before the generic “… is zero” ones
//   pick    for templates with ±: (v, [plus, minus]) → { branch: ±1, note } or an error
//   alt     [{ when(v), sub, note }]: a different template for a special case (a = 0 in a quadratic)
//   note    (v, value) → string shown under the answer
// sol.f(v) returns { value, note, branch, tree } or { error }.
const NAME = (id) => VARS[id] ? VARS[id].plain : id;
export function runSolver(sol, v){
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
    sol.unitText = dimStr(DIMS[x]);
    sol.f = (v) => runSolver(sol, v);
  }
}
