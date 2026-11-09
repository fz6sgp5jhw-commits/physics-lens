// Physics Lens — physics data: variables, equations (one line each, rearranged by code), setups.
// All values are stored in SI units.

import { parse, parseEq, isolate, showTree, hasPM, evalNum, MathError, parseUnit, dimOf, dimEq, dimStr, setSamples } from './expr.js';

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
  mus:   { sym: 'μ<sub>s</sub>', plain: 'μs', name: 'coefficient of static friction', unit: '', units: { 'no unit': 1 } },
  F:     { sym: 'F<sub>net</sub>', plain: 'Fnet', name: 'net force along the ramp', unit: 'N', units: { N: 1 }, dir: ['down the slope', 'up the slope'] },
  Fp:    { sym: 'F', plain: 'F', name: 'applied force (push or pull, size)', unit: 'N', units: { N: 1 } },
  // tension + pulleys (+ = the way the system moves when m2 falls)
  m1:    { sym: 'm<sub>1</sub>', plain: 'm₁', name: 'mass of the block on the table', unit: 'kg', units: { kg: 1, g: 0.001 } },
  m2:    { sym: 'm<sub>2</sub>', plain: 'm₂', name: 'hanging mass', unit: 'kg', units: { kg: 1, g: 0.001 } },
  W1:    { sym: 'W<sub>1</sub>', plain: 'W₁', name: 'weight of the block on the table', unit: 'N', units: { N: 1 } },
  W2:    { sym: 'W<sub>2</sub>', plain: 'W₂', name: 'weight of the hanging mass', unit: 'N', units: { N: 1 } },
  N1:    { sym: 'N<sub>1</sub>', plain: 'N₁', name: 'normal force from the table on m₁', unit: 'N', units: { N: 1 } },
  Tn:    { sym: 'T', plain: 'T', name: 'tension in the string', unit: 'N', units: { N: 1 } },
  // pushed blocks (+ is forward: the way F pushes)
  mA:    { sym: 'm<sub>A</sub>', plain: 'm_A', name: 'mass of block A (the one F pushes)', unit: 'kg', units: { kg: 1, g: 0.001 } },
  mB:    { sym: 'm<sub>B</sub>', plain: 'm_B', name: 'mass of block B (in front)', unit: 'kg', units: { kg: 1, g: 0.001 } },
  P:     { sym: 'P', plain: 'P', name: 'contact force between the blocks (size)', unit: 'N', units: { N: 1 } },
  NA:    { sym: 'N<sub>A</sub>', plain: 'N_A', name: 'normal force from the floor on A', unit: 'N', units: { N: 1 } },
  NB:    { sym: 'N<sub>B</sub>', plain: 'N_B', name: 'normal force from the floor on B', unit: 'N', units: { N: 1 } },
  fA:    { sym: 'f<sub>A</sub>', plain: 'f_A', name: 'kinetic friction on A (size)', unit: 'N', units: { N: 1 } },
  fB:    { sym: 'f<sub>B</sub>', plain: 'f_B', name: 'kinetic friction on B (size)', unit: 'N', units: { N: 1 } },
  // rotation (+ is counterclockwise)
  theta: { sym: 'θ', plain: 'θ', name: 'angle turned', unit: 'rad', units: { rad: 1, rev: TAU, '°': Math.PI / 180 }, dir: ['counterclockwise', 'clockwise'] },
  w0:    { sym: 'ω<sub>0</sub>', plain: 'ω₀', name: 'initial angular velocity', unit: 'rad/s', units: { 'rad/s': 1, rpm: TAU / 60, 'rev/s': TAU }, dir: ['counterclockwise', 'clockwise'] },
  w:     { sym: 'ω', plain: 'ω', name: 'final angular velocity', unit: 'rad/s', units: { 'rad/s': 1, rpm: TAU / 60, 'rev/s': TAU }, dir: ['counterclockwise', 'clockwise'] },
  alpha: { sym: 'α', plain: 'α', name: 'angular acceleration', unit: 'rad/s²', units: { 'rad/s²': 1, 'rev/s²': TAU }, dir: ['counterclockwise', 'clockwise'] },
  r:     { sym: 'r', plain: 'r', name: 'distance of the point from the axis', unit: 'm', units: { m: 1, cm: 0.01 } },
  s:     { sym: 's', plain: 's', name: 'arc length the point travels', unit: 'm', units: { m: 1, cm: 0.01 } },
  v:     { sym: 'v', plain: 'v', name: 'speed of the point (at the end)', unit: 'm/s', units: { 'm/s': 1 } },
  at:    { sym: 'a<sub>t</sub>', plain: 'aₜ', name: 'tangential acceleration of the point', unit: 'm/s²', units: { 'm/s²': 1 } },
  ac:    { sym: 'a<sub>c</sub>', plain: 'a꜀', name: 'radial (centripetal) acceleration, toward the centre (at the end)', unit: 'm/s²', units: { 'm/s²': 1 } },
  atot:  { sym: 'a', plain: 'a', name: 'resultant (total) acceleration of the point (size)', unit: 'm/s²', units: { 'm/s²': 1 } },
  // between two moments the student picks (Phase 3): worked out from functions of time
  dth:   { sym: 'Δθ', plain: 'Δθ', name: 'angle turned between the two moments', unit: 'rad', units: { rad: 1, rev: TAU, '°': Math.PI / 180 }, dir: ['counterclockwise', 'clockwise'] },
  dtrav: { sym: 'θ<sub>trav</sub>', plain: 'θ_trav', name: 'total angle travelled between the two moments (both ways counted)', unit: 'rad', units: { rad: 1, rev: TAU } },
  nrev:  { sym: 'N', plain: 'N', name: 'revolutions turned between two moments (like “in the first 5 s”)', unit: 'rev', units: { rev: 1 } },
  wavg:  { sym: 'ω<sub>avg</sub>', plain: 'ω_avg', name: 'average angular velocity between the two moments', unit: 'rad/s', units: { 'rad/s': 1, rpm: TAU / 60 }, dir: ['counterclockwise', 'clockwise'] },
  aavg:  { sym: 'α<sub>avg</sub>', plain: 'α_avg', name: 'average angular acceleration between the two moments', unit: 'rad/s²', units: { 'rad/s²': 1 }, dir: ['counterclockwise', 'clockwise'] },
  // torque, statics and rotational dynamics (+ is counterclockwise). Distances along a beam are measured from one end
  // (the student picks which end for each point); the hinge force is two components whose signs come out of the algebra.
  L:     { sym: 'L', plain: 'L', name: 'length of the beam or rod', unit: 'm', units: { m: 1, cm: 0.01 } },
  M:     { sym: 'M', plain: 'M', name: 'mass of the beam, rod or disc', unit: 'kg', units: { kg: 1, g: 0.001 } },
  R:     { sym: 'R', plain: 'R', name: 'radius of the disc (where the string unwinds)', unit: 'm', units: { m: 1, cm: 0.01 } },
  Hx:    { sym: 'H<sub>x</sub>', plain: 'H_x', name: 'hinge force, horizontal part', unit: 'N', units: { N: 1 }, dir: ['toward the right end', 'toward the left end'] },
  Hy:    { sym: 'H<sub>y</sub>', plain: 'H_y', name: 'hinge force, vertical part', unit: 'N', units: { N: 1 }, dir: ['up', 'down'] },
  dP:    { sym: 'd<sub>P</sub>', plain: 'd_P', name: 'distance from the end of the beam to the pivot', unit: 'm', units: { m: 1, cm: 0.01 } },
  dm:    { sym: 'd<sub>m</sub>', plain: 'd_m', name: 'distance from the end of the beam to where the mass hangs', unit: 'm', units: { m: 1, cm: 0.01 } },
  dT:    { sym: 'd<sub>T</sub>', plain: 'd_T', name: 'distance from the end of the beam to where the cord is tied', unit: 'm', units: { m: 1, cm: 0.01 } },
  dF:    { sym: 'd<sub>F</sub>', plain: 'd_F', name: 'distance from the end of the beam to where the push acts', unit: 'm', units: { m: 1, cm: 0.01 } },
  phi:   { sym: 'φ', plain: 'φ', name: 'angle between the force and the beam', unit: '°', units: { '°': 1, rad: 180 / Math.PI } },
  beta:  { sym: 'β', plain: 'β', name: 'tilt of the beam from horizontal', unit: '°', units: { '°': 1, rad: 180 / Math.PI } },
  xh:    { sym: 'x', plain: 'x', name: 'horizontal distance from the hinge to where the cable hangs', unit: 'm', units: { m: 1, cm: 0.01 } },
  hc:    { sym: 'h', plain: 'h', name: 'length of the vertical cable (how far the beam drops below the hinge there)', unit: 'm', units: { m: 1, cm: 0.01 } },
  tau:   { sym: 'τ', plain: 'τ', name: 'torque of one force about the axis', unit: 'N·m', units: { 'N·m': 1 }, dir: ['counterclockwise', 'clockwise'] },
  rt:    { sym: 'r', plain: 'r', name: 'distance from the axis to where the force acts', unit: 'm', units: { m: 1, cm: 0.01 } },
  tnet:  { sym: 'Στ', plain: 'Στ', name: 'net torque about the axis', unit: 'N·m', units: { 'N·m': 1 }, dir: ['counterclockwise', 'clockwise'] },
  I:     { sym: 'I', plain: 'I', name: 'moment of inertia about the rotation axis', unit: 'kg·m²', units: { 'kg·m²': 1 } },
  Icm:   { sym: 'I<sub>cm</sub>', plain: 'I_cm', name: 'moment of inertia about a parallel axis through the centre of mass', unit: 'kg·m²', units: { 'kg·m²': 1 } },
  dpa:   { sym: 'd', plain: 'd', name: 'distance between the rotation axis and the parallel axis through the centre of mass', unit: 'm', units: { m: 1, cm: 0.01 } },
};

export const V = (id) => `<span class="sym" data-v="${id}">${VARS[id].sym}</span>`;
const P = (id) => VARS[id].plain;
const err = (msg) => ({ error: msg });

// real roots of a·x² + b·x + c = 0, positive ones only, smallest first; null if no real roots
function posRoots(a, b, c){
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
      eq: `{${u}} = {${u0}} + {${a}}{${t}}`, kind: 'rel', cue: `constant ${P(a)}`,
      applies: c => !c.varA, needs: 'constant acceleration',
      vars: [u, u0, a, t],
      meaning: words.m1, condition: `constant ${P(a)}`, calc: `Integrate ${P(a)} = d${P(u)}/dt from 0 to t with ${P(a)} constant: ${P(u)} − ${P(u0)} = ${P(a)}t.`,
      solve: {
        [t]: { guard: v => v[a] === 0 ? err(`${P(a)} is zero: the velocity never changes, so no time gets you there.`) : null },
      },
    },
    [prefix + '2']: {
      eq: `{${p}} = {${u0}}{${t}} + ½{${a}}{${t}}²`, kind: 'rel', cue: `constant ${P(a)}`,
      applies: c => !c.varA, needs: 'constant acceleration',
      vars: [p, u0, a, t],
      meaning: words.m2, condition: `constant ${P(a)}`, calc: `Integrate ${P(u)}(t) = ${P(u0)} + ${P(a)}t from 0 to t: ${P(p)} = ${P(u0)}t + ½${P(a)}t².`,
      solve: {
        [t]: { guard: v => Math.abs(v[a]) < 1e-12 ? (v[u0] === 0 || v[p] / v[u0] <= 0 ? err(`No positive time works: with these values it never reaches this ${words.pos}.`) : null) : neverSq(v[u0] ** 2 + 2 * v[a] * v[p]),
               alt: [{ when: v => Math.abs(v[a]) < 1e-12, sub: `{${p}} / {${u0}}`, note: `${P(a)} is zero, so it moves steadily: t = ${P(p)} / ${P(u0)}.` }],
               pick: firstPositive(`No positive time works: with these values it never reaches this ${words.pos}.`) },
      },
    },
    [prefix + '3']: {
      eq: `{${u}}² = {${u0}}² + 2{${a}}{${p}}`, kind: 'rel', cue: `constant ${P(a)}`,
      applies: c => !c.varA, needs: 'constant acceleration',
      vars: [u, u0, a, p],
      meaning: words.m3, condition: `constant ${P(a)}`, calc: `Eliminate t between the first two equations (or use ${P(a)} = ${P(u)} d${P(u)}/d${P(p)} and integrate).`,
      solve: {
        [u]: { guard: v => v[u0] ** 2 + 2 * v[a] * v[p] < -1e-12 ? err(`${P(u)}² would be negative: ${words.never}`) : null,
               pick: (v, cands) => {
                 const mag = Math.abs(cands[0]), sg = finalSign(v), r = posRoots(0.5 * v[a], v[u0], -v[p]);
                 let note = sg < 0 ? `The root gives ±${fmt(mag)}. When it first gets there it’s moving in the − direction, so ${P(u)} is negative.` : `The root gives ±${fmt(mag)}. When it first gets there it’s moving in the + direction, so the positive root is kept.`;
                 if (r && r.length > 1) note += ` Careful: it passes this ${words.pos} twice, and the second time ${P(u)} = ${fmt(-sg * mag)}. Pick the one the problem means.`;
                 return { branch: sg, note }; } },
        [u0]: { guard: v => v[u] ** 2 - 2 * v[a] * v[p] < -1e-12 ? err(`${P(u0)}² would be negative: these numbers can’t happen together.`) : null,
               pick: (v, cands) => { const mag = Math.abs(cands[0]), sg = v.__u0sign || 1;
                  return { branch: sg, note: v.__u0sign ? `The root gives ±${fmt(mag)}. Your conditions say it starts out moving ${sg < 0 ? 'in the − direction' : 'in the + direction'}, so ${P(u0)} = ${fmt(sg * mag)}.` : `The positive root is kept. If it started out moving in the − direction, ${P(u0)} is the negative of this.` }; } },
        [p]: { guard: v => v[a] === 0 ? err(`${P(a)} is zero, so you can’t divide by it. (With ${P(a)} = 0 the velocity never changes.)`) : null },
      },
    },
    [prefix + '4']: {
      eq: `{${p}} = ½({${u0}} + {${u}}){${t}}`, kind: 'rel', cue: `constant ${P(a)}`,
      applies: c => !c.varA, needs: 'constant acceleration',
      vars: [p, u0, u, t],
      meaning: words.m4, condition: `constant ${P(a)}`, calc: `With ${P(a)} constant, velocity changes linearly, so its average over the interval is (${P(u0)} + ${P(u)})/2.`,
    },
    [prefix + '5']: {
      eq: `{${p}} = {${u}}{${t}} − ½{${a}}{${t}}²`, kind: 'rel', cue: `constant ${P(a)}`,
      applies: c => !c.varA, needs: 'constant acceleration',
      vars: [p, u, a, t],
      meaning: words.m5, condition: `constant ${P(a)}`, calc: `Substitute ${P(u0)} = ${P(u)} − ${P(a)}t into the second equation.`,
      solve: {
        [t]: { guard: v => Math.abs(v[a]) < 1e-12 ? (v[u] === 0 || v[p] / v[u] <= 0 ? err('No positive time works with these values.') : null) : neverSq(v[u] ** 2 - 2 * v[a] * v[p]),
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
    label: 'F1', eq: '{W} = {m}{g}', kind: 'rel', cue: 'a mass near Earth’s surface', meaning: 'Weight: gravity pulls straight down with a force proportional to mass.',
    condition: 'near Earth’s surface', calc: 'Newton’s law of gravitation with Earth’s mass and radius rolled into g ≈ 9.81 m/s².',
  },
  I1: {
    label: 'F2', eq: '{Wpar} = {W} sin {inc}', kind: 'rel', cue: 'weight on a tilted surface, along the slope',
    meaning: 'The part of the weight that pulls the object down the slope.', condition: 'ramp at angle θ',
    calc: 'Tilt the axes to match the ramp. The angle between the weight and the “into the ramp” axis equals the ramp angle θ, so the along-ramp part is W sin θ.',
    solve: {
      W: { guard: v => sin(v.inc) === 0 ? err('sin θ is zero: on flat ground there’s no along-ramp pull.') : null },
      inc: { guard: v => Math.abs(v.Wpar / v.W) > 1 ? err('W∥ can’t be bigger than W: one of them is mistyped.') : null },
    },
  },
  I2: {
    label: 'F3', eq: '{Wperp} = {W} cos {inc}', kind: 'rel', cue: 'weight on a tilted surface, into the slope',
    meaning: 'The part of the weight that presses the object into the ramp.', condition: 'ramp at angle θ',
    calc: 'Same tilted axes: the into-the-ramp part is the side adjacent to θ, so W cos θ.',
    solve: {
      W: { guard: v => cos(v.inc) === 0 ? err('cos θ is zero: a vertical wall isn’t a ramp.') : null },
      inc: { guard: v => Math.abs(v.Wperp / v.W) > 1 ? err('W⊥ can’t be bigger than W: one of them is mistyped.') : null },
    },
  },
  I3: {
    label: 'F4', eq: '{N} = {Wperp}', kind: 'law', cue: 'it stays on the surface: no acceleration into it',
    meaning: 'The ramp pushes back exactly as hard as the object presses in, so nothing moves into the ramp.', condition: 'stays on the surface, no other push into it',
    calc: 'Newton’s second law perpendicular to the ramp: there’s no acceleration that way, so N − W⊥ = 0.',
  },
  I4: {
    label: 'F5', eq: '{f} = {mu}{N}', kind: 'rel', cue: 'it slides on a rough surface', meaning: 'Sliding friction grows with how hard the surfaces press together.',
    condition: 'sliding (kinetic friction)', applies: c => !c.still && (c.friction), needs: 'kinetic friction, while it slides',
    calc: 'An experimental rule (Coulomb’s law of friction), not derived: μk depends on the two surfaces.',
  },
  I5d: {
    label: 'F6', eq: '{F} = {Wpar} − {f}', kind: 'def', cue: 'the forces along the slope, sliding down with friction',
    meaning: 'Sliding down: gravity’s pull along the slope minus friction holding it back.', condition: 'friction, moving down the slope',
    applies: c => !c.upAxis && (c.friction && !c.up), needs: 'friction + moving down, with + down the slope',
    calc: 'Add the along-ramp forces with + down the slope: W∥ points down (+), friction opposes the motion so it points up (−).',
  },
  I5u: {
    label: 'F6', eq: '{F} = {Wpar} + {f}', kind: 'def', cue: 'the forces along the slope, sliding up with friction',
    meaning: 'Sliding up: gravity and friction both point down the slope, so they add.', condition: 'friction, moving up the slope',
    applies: c => !c.upAxis && (c.friction && c.up), needs: 'friction + moving up, with + down the slope',
    calc: 'Moving up the slope, friction opposes the motion, so it points down the slope (+), the same way as W∥.',
  },
  I6: {
    label: 'F6', eq: '{F} = {Wpar}', kind: 'def', cue: 'the forces along a frictionless slope', meaning: 'No friction: the only force along the slope is gravity’s pull.',
    condition: 'frictionless', applies: c => !c.upAxis && (!c.friction), needs: 'frictionless, with + down the slope',
    calc: 'Along the ramp, N and W⊥ have no component, so the net force is just W∥.',
  },
  N1: {
    label: 'F7', eq: '{F} = {m}{a}', kind: 'law', cue: 'a net force and an acceleration', meaning: 'Newton’s second law: the net force sets the acceleration.',
    condition: 'net force, constant mass', calc: 'F = dp/dt with p = mv and m constant.',
  },
  S1: {
    label: 'S1', eq: '{a} = {g} sin {inc}', kind: 'rel', cue: 'a smooth (frictionless) ramp',
    meaning: 'Frictionless ramp: the mass cancels, so every object slides with the same acceleration.', condition: 'frictionless', applies: c => !c.upAxis && (!c.friction),
    needs: 'frictionless, with + down the slope', calc: 'Chain F7 → F6 → F2 → F1: ma = W∥ = mg sin θ, and m cancels.',
    solve: {
      g: { guard: v => sin(v.inc) === 0 ? err('sin θ is zero.') : null },
      inc: { guard: v => Math.abs(v.a / v.g) > 1 ? err('a can’t be bigger than g on a frictionless ramp.') : null },
    },
  },
  S2: {
    label: 'S2', eq: '{a} = {g}(sin {inc} − {mu} cos {inc})', kind: 'rel', cue: 'sliding down a rough ramp',
    meaning: 'Sliding down with friction: the mass cancels here too.', condition: 'friction, moving down', applies: c => !c.still && (!c.upAxis && (c.friction && !c.up)),
    needs: 'friction + moving down, with + down the slope, while it slides', calc: 'ma = W∥ − f = mg sin θ − μk mg cos θ; divide by m.',
    solve: {
      g: { guard: v => Math.abs(sin(v.inc) - v.mu * cos(v.inc)) < 1e-12 ? err('The bracket is zero: friction exactly balances gravity.') : null },
      inc: null,
    },
  },
  S3: {
    label: 'S2', eq: '{a} = {g}(sin {inc} + {mu} cos {inc})', kind: 'rel', cue: 'sliding up a rough ramp',
    meaning: 'Sliding up with friction: gravity and friction both slow it, so the mass cancels and they add.', condition: 'friction, moving up',
    applies: c => !c.still && (!c.upAxis && (c.friction && c.up)), needs: 'friction + moving up, with + down the slope, while it slides',
    calc: 'ma = W∥ + f = mg sin θ + μk mg cos θ; divide by m.',
    solve: {
      inc: null,
    },
  },


  // ---- tension + pulleys ----
  P1: {
    label: 'T1', eq: '{W1} = {m1}{g}', kind: 'rel', cue: 'the block on the table has weight', meaning: 'Weight of the block on the table.', condition: 'near Earth’s surface',
    calc: 'W = mg for block 1.',
  },
  P2: {
    label: 'T2', eq: '{W2} = {m2}{g}', kind: 'rel', cue: 'the hanging mass has weight', meaning: 'Weight of the hanging mass.', condition: 'near Earth’s surface',
    calc: 'W = mg for block 2.',
  },
  P3: {
    label: 'T3', eq: '{N1} = {W1}', kind: 'law', cue: 'a block on a flat table: no vertical acceleration',
    meaning: 'The flat table pushes up exactly as hard as the block presses down.', condition: 'flat table, string horizontal',
    calc: 'Newton’s second law vertically for block 1: no vertical acceleration, so N₁ − W₁ = 0.',
  },
  P4: {
    label: 'T4', eq: '{f} = {mu}{N1}', kind: 'rel', cue: 'the block slides on a rough table',
    meaning: 'Sliding friction on the block, proportional to how hard the table pushes.', condition: 'sliding (kinetic friction)', applies: c => c.friction,
    needs: 'kinetic friction', calc: 'Coulomb’s law of friction, applied to block 1.',
  },
  P5: {
    label: 'T5', eq: '{Tn} = {m1}{a}', kind: 'law', cue: 'the string is the only sideways force on the block',
    meaning: 'Block 1: the tension is the only horizontal force, so it alone accelerates the block.', condition: 'frictionless table', applies: c => !c.friction,
    needs: 'frictionless table', calc: 'Newton’s second law horizontally for block 1 (+ toward the pulley).',
  },
  P5f: {
    label: 'T5', eq: '{Tn} − {f} = {m1}{a}', kind: 'law', cue: 'the string pulls the block, friction drags it',
    meaning: 'Block 1: the string pulls it forward, friction drags it back.', condition: 'kinetic friction', applies: c => c.friction, needs: 'kinetic friction',
    calc: 'Newton’s second law horizontally for block 1 (+ toward the pulley): T forward, f backward.',
  },
  P6: {
    label: 'T6', eq: '{W2} − {Tn} = {m2}{a}', kind: 'law', cue: 'the hanging mass: weight down, string up',
    meaning: 'Hanging mass: gravity pulls it down, the string holds it up. The difference accelerates it.', condition: 'ideal string and pulley',
    calc: 'Newton’s second law vertically for block 2 (+ downward): W₂ down, T up.',
  },
  P7: {
    label: 'S1', eq: '{a} = {m2}{g} / ({m1} + {m2})', kind: 'rel', cue: 'both blocks as one system, smooth table', vars: ['a', 'm1', 'm2', 'g'],
    meaning: 'Treat both blocks as one system: only the hanging weight drives the total mass.', condition: 'frictionless table', applies: c => !c.friction,
    needs: 'frictionless table', calc: 'Add T5 and T6: T cancels, leaving m₂g = (m₁ + m₂)a.',
    solve: {
      m2: { guard: v => v.g === v.a ? err('a = g would need an infinite hanging mass.') : null },
    },
  },
  P7f: {
    label: 'S1', eq: '{a} = {g}({m2} − {mu}{m1}) / ({m1} + {m2})', kind: 'rel', cue: 'both blocks as one system, rough table', vars: ['a', 'm1', 'm2', 'g', 'mu'],
    meaning: 'Whole system: the hanging weight minus the friction on block 1, shared by both masses.', condition: 'kinetic friction', applies: c => c.friction,
    needs: 'kinetic friction', calc: 'Add T5 and T6 with f = μk m₁g: T cancels, leaving m₂g − μk m₁g = (m₁ + m₂)a.',
    solve: {
      a: { note: (v, a) => a < 0 ? 'Negative: friction is stronger than the hanging weight. Starting from rest the blocks would not move at all; this only describes blocks already sliding forward and slowing down.' : '' },
      m2: { guard: v => v.g === v.a ? err('a = g is impossible here.') : null },
      m1: { guard: v => (v.a + v.mu * v.g) === 0 ? err('The bracket a + μk g is zero.') : null },
      g: { guard: v => (v.m2 - v.mu * v.m1) === 0 ? err('m₂ − μk m₁ is zero.') : null },
    },
  },
  P8: {
    label: 'S2', eq: '{Tn} = {m1}{m2}{g} / ({m1} + {m2})', kind: 'rel', cue: 'the tension, smooth table',
    meaning: 'Tension straight from the masses: always less than the hanging weight.', condition: 'frictionless table', applies: c => !c.friction,
    needs: 'frictionless table', calc: 'Put a = m₂g / (m₁ + m₂) into T = m₁a.',
    solve: {
      m1: { guard: v => (v.m2 * v.g - v.Tn) <= 0 ? err('T can’t be as big as the hanging weight unless m₁ is infinite.') : null },
      m2: { guard: v => (v.m1 * v.g - v.Tn) <= 0 ? err('T can’t be as big as m₁g here.') : null },
      g: null,
    },
  },
  P8f: {
    label: 'S2', eq: '{Tn} = {m1}{m2}{g}(1 + {mu}) / ({m1} + {m2})', kind: 'rel', cue: 'the tension, rough table', meaning: 'Tension with friction on the table.',
    condition: 'kinetic friction', applies: c => c.friction, needs: 'kinetic friction', calc: 'Put the system acceleration into T = W₂ − m₂a and simplify.',
    solve: {
      m1: null,
      m2: null,
      g: null,
    },
  },

  // ---- pushed blocks: friction on each block ----
  Q1: {
    label: 'B1', eq: '{fA} = {mu}{NA}', kind: 'rel', cue: 'block A slides on a rough floor',
    meaning: 'Sliding friction on block A, proportional to how hard the floor pushes up on it.', condition: 'sliding (kinetic friction)', applies: c => c.friction,
    needs: 'kinetic friction', calc: 'Coulomb’s law of friction for block A.',
  },
  Q2: {
    label: 'B2', eq: '{fB} = {mu}{NB}', kind: 'rel', cue: 'block B slides on a rough floor', meaning: 'Sliding friction on block B.', condition: 'sliding (kinetic friction)',
    applies: c => c.friction, needs: 'kinetic friction', calc: 'Coulomb’s law of friction for block B.',
  },

  // ---- rotation: a point at radius r ----
  E6: {
    label: 'R6', eq: '{s} = {r}{theta}', kind: 'def', cue: 'a distance along the rim and an angle', meaning: 'Arc length = radius × angle (angle in radians!).',
    condition: 'θ in radians', calc: 'This is the definition of the radian: θ = s/r.',
  },
  E7: {
    label: 'R7', eq: '{v} = {r}{w}', kind: 'rel', cue: 'the speed of a point on a spinning body', meaning: 'Points farther from the axis move faster.',
    condition: 'ω in rad/s', calc: 'Differentiate s = rθ with r fixed: ds/dt = r dθ/dt.',
  },
  E8: {
    label: 'R8', eq: '{at} = {r}{alpha}', kind: 'rel', cue: 'a point on a body whose spin speeds up or slows',
    meaning: 'Speeding up the spin speeds up the point along its path.', condition: 'α in rad/s²', calc: 'Differentiate v = rω: dv/dt = r dω/dt.',
  },
  E9: {
    label: 'R9', eq: '{ac} = {w}²{r}', kind: 'rel', cue: 'a point going round: acceleration toward the centre',
    meaning: 'Even at steady spin, the point accelerates toward the centre.', condition: 'ω in rad/s', calc: 'From a = v²/r with v = rω: a = (rω)²/r = ω²r.',
    solve: {
      w: { pick: (v, cands) => { const mag = Math.abs(cands[0]);
             return { branch: 1, note: `The root gives ±${fmt(mag)}. Centripetal acceleration points to the centre whichever way the wheel turns, so it can’t tell you the direction. The positive root (counterclockwise) is kept. If it spins clockwise, ω is the negative of this.` }; } },
    },
  },
  E10: {
    label: 'R10', eq: '{ac} = {v}² / {r}', kind: 'rel', cue: 'moving on a circle at speed v', meaning: 'The same centripetal acceleration, written with the point’s speed.',
    condition: 'circular path of radius r', calc: 'Put ω = v/r into a꜀ = ω²r: a꜀ = (v/r)²r = v²/r.',
    solve: {
      v: { pick: () => ({ branch: 1, note: 'a꜀ gives the speed, not the direction, so the positive root is kept. If the point moves clockwise, v is the negative of this.' }) },
    },
  },
  E11: {
    label: 'R11', eq: '{atot} = √({at}² + {ac}²)', kind: 'def', cue: 'the total acceleration of a point going round',
    meaning: 'The point’s total acceleration: aₜ along its path and a꜀ toward the centre are at right angles, so they add like the sides of a right triangle.',
    condition: 'aₜ ⊥ a꜀', calc: 'Pythagoras on the two perpendicular components.',
    solve: {
      at: { pick: () => ({ branch: 1, note: 'The total acceleration is a size, so it can’t say whether the spin speeds up or slows down. The positive root is kept; if the spin is slowing, aₜ is the negative of this.' }) },
    },
  },

  // ---- torque (+ is counterclockwise) ----
  D1: {
    label: 'D1', eq: '{tau} = {rt}{Fp} sin {phi}', kind: 'def', cue: 'a force that turns a body about an axis',
    meaning: 'Torque: how hard a force turns a body. Only the part of F perpendicular to r turns it, so a force through the axis gives no torque.',
    condition: 'φ is the angle between r and F', calc: 'τ = r × F: its size is rF sin φ, and it is + when the force turns the body counterclockwise.',
    solve: {
      rt: { guard: v => sin(v.phi) === 0 ? err('sin φ is zero: a force along the line to the axis has no torque, whatever r is.') : null },
      Fp: { guard: v => sin(v.phi) === 0 ? err('sin φ is zero: a force along the line to the axis has no torque, whatever its size.') : null },
      phi: { guard: v => Math.abs(v.tau / (v.rt * v.Fp)) > 1 ? err('τ can’t be bigger than rF: one of them is mistyped.') : null },
    },
  },
  // ---- moments of inertia: standard shapes (I_cm about the centre) and the parallel-axis theorem ----
  J1: {
    label: 'I1', eq: '{Icm} = {M}{L}² / 12', kind: 'rel', cue: 'a thin rod turning about its middle', form: `${V('Icm')} = <sup>1</sup>⁄<sub>12</sub> ${V('M')}${V('L')}²`,
    meaning: 'Thin rod about an axis through its centre, perpendicular to the rod.', condition: 'thin rod', applies: c => c.shape === 'rod', needs: 'a thin rod',
    calc: 'Add up r² dm along the rod: ∫ x² (M/L) dx from −L/2 to L/2 = ML²/12.',
  },
  J2: {
    label: 'I2', eq: '{I} = {M}{L}² / 3', kind: 'rel', cue: 'a thin rod turning about one end', form: `${V('I')} = ⅓${V('M')}${V('L')}²`,
    meaning: 'Thin rod about an axis through one end: four times harder to turn than about its centre.', condition: 'thin rod, axis at one end',
    applies: c => c.shape === 'rod' && c.axis === 'other', needs: 'a thin rod turning about one end',
    calc: '∫ x² (M/L) dx from 0 to L = ML²/3. The parallel-axis theorem agrees: ML²/12 + M(L/2)² = ML²/3.',
  },
  J3: {
    label: 'I3', eq: '{Icm} = ½{M}{R}²', kind: 'rel', cue: 'a solid disc or cylinder', meaning: 'Solid disc or cylinder about its axle.', condition: 'solid disc or cylinder',
    applies: c => c.shape === 'disc', needs: 'a solid disc or cylinder', calc: 'Add up thin rings: ∫ r² (2M r/R²) dr from 0 to R = ½MR².',
  },
  J4: {
    label: 'I4', eq: '{Icm} = {M}{R}²', kind: 'rel', cue: 'a thin ring or hoop', meaning: 'Thin ring or hoop about its centre: all the mass is at the rim.',
    condition: 'thin ring or hoop', applies: c => c.shape === 'ring', needs: 'a thin ring or hoop', calc: 'Every bit of mass is at distance R, so Σ r² dm = MR².',
  },
  J5: {
    label: 'I5', eq: '{Icm} = 2{M}{R}² / 5', kind: 'rel', cue: 'a solid sphere', form: `${V('Icm')} = <sup>2</sup>⁄<sub>5</sub> ${V('M')}${V('R')}²`,
    meaning: 'Solid sphere about a diameter.', condition: 'solid sphere', applies: c => c.shape === 'sphere', needs: 'a solid sphere',
    calc: 'Add up thin discs stacked along a diameter: ∫ ½ r² dm = ⅖MR².',
  },
  J6: {
    label: 'I6', eq: '{Icm} = 2{M}{R}² / 3', kind: 'rel', cue: 'a hollow sphere', form: `${V('Icm')} = ⅔${V('M')}${V('R')}²`,
    meaning: 'Hollow sphere (thin shell) about a diameter.', condition: 'hollow sphere', applies: c => c.shape === 'shell', needs: 'a hollow sphere',
    calc: 'Add up thin rings over the shell: ∫ (R sin θ)² dm = ⅔MR².',
  },
  J7: {
    label: 'I7', eq: '{I} = {m}{rt}²', kind: 'def', cue: 'a small mass at a distance from the axis', meaning: 'A point mass at distance r from the axis.',
    condition: 'point mass', applies: c => c.shape === 'point', needs: 'a point mass', calc: 'The definition I = Σ m r² with one mass.',
  },
  J8: {
    label: 'I8', eq: '{I} = {Icm} + {M}{dpa}²', kind: 'rel', cue: 'the axis doesn’t pass through the centre of mass',
    meaning: 'The parallel-axis theorem: turning about any axis is harder than about the parallel one through the centre of mass, by Md².',
    condition: 'the two axes are parallel, d apart',
    calc: 'Write each bit’s position as (centre of mass) + (offset): the cross term vanishes because the offsets average to zero.',
    solve: {
      dpa: { guard: v => v.I < v.Icm ? err('I is smaller than I_cm: no axis is easier to turn about than the one through the centre of mass.') : null },
    },
  },
  J9: {
    label: 'I9', eq: '{I} = {Icm}', kind: 'rel', cue: 'the axis passes through the centre of mass',
    meaning: 'The body turns about its own centre of mass, so its I is the centre value.', condition: 'axis through the centre of mass', applies: c => c.axis === 'centre',
    needs: 'an axis through the centre of mass', calc: 'The parallel-axis theorem with d = 0.',
  },
  // ---- rotational dynamics: Στ = Iα, and a string unwinding from a disc ----
  D2: {
    label: 'D2', eq: '{tnet} = {I}{alpha}', kind: 'law', cue: 'a net torque and an angular acceleration',
    meaning: 'Newton’s second law for turning: the net torque sets the angular acceleration.', condition: 'rigid body, fixed axis',
    calc: 'Add F = ma for every bit of the body, times its distance from the axis: Σ r F⊥ = Σ m r² α.',
  },
  D3: {
    label: 'D3', eq: '{a} = {R}{alpha}', kind: 'rel', cue: 'a string unwinds from a disc without slipping',
    meaning: 'The string unwinds without slipping, so the hanging mass moves with the rim: a = Rα (the aₜ = rα link).',
    condition: 'string doesn’t slip; the mass hangs from the left of the disc (falling turns it counterclockwise)',
    calc: 'The rim’s tangential acceleration is Rα, and the string carries it to the mass.',
  },
  D4: {
    label: 'D4', eq: '{Tn}{R} = {I}{alpha}', kind: 'law', cue: 'only the string turns the disc',
    meaning: 'The disc: only the string turns it (the axle’s force and the weight act at the centre, with no lever arm).', condition: 'frictionless axle, string at the rim',
    calc: 'Στ = Iα with one torque: the tension at the rim, lever arm R, perpendicular to the radius.',
  },
  D5: {
    label: 'D5', eq: '{m}{g} − {Tn} = {m}{a}', kind: 'law', cue: 'the hanging mass: weight down, string up',
    meaning: 'The hanging mass: gravity down, the string up; the difference accelerates it.', condition: '+ down for the hanging mass',
    calc: 'Newton’s second law for the hanging mass, + down.',
    solve: {
      m: { guard: v => v.g === v.a ? err('a = g means the string is slack: then T = 0 and m can be anything.') : null },
    },
  },
  D6: {
    label: 'D6', eq: '{a} = {m}{g} / ({m} + {I} / {R}²)', kind: 'rel', cue: 'the hanging mass and the disc as one system',
    meaning: 'Whole system: the hanging weight accelerates the mass and spins the disc, which acts like an extra mass I/R².',
    condition: 'frictionless axle, string doesn’t slip', calc: 'Put T = Iα/R and α = a/R into mg − T = ma: mg − Ia/R² = ma.',
    solve: {
      m: { guard: v => v.g === v.a ? err('a = g would need an infinite hanging mass.') : null },
      g: null,
      R: null,
    },
  },
  // ---- beam geometry: where a vertical cable meets a tilted beam ----
  GEO1: {
    label: 'G1', eq: '{dT} = √({xh}² + {hc}²)', kind: 'rel', cue: 'a right triangle from the hinge to the cable',
    meaning: 'Pythagoras: the beam from the hinge to the cable is the long side of a right triangle with x across and h down.',
    condition: 'hinge at the end, cable vertical, x measured horizontally from the hinge',
    calc: 'The hinge, the point under it at the cable’s height and the cable’s knot make a right triangle.',
  },
  GEO2: {
    label: 'G2', eq: 'sin {beta} = {hc} / {dT}', kind: 'rel', cue: 'the beam’s tilt in the same right triangle',
    meaning: 'The beam’s tilt: the drop h over the length along the beam d_T.', condition: 'same right triangle as G1',
    calc: 'In the right triangle, h is opposite the tilt angle β and d_T is the hypotenuse.',
    solve: {
      beta: { guard: v => v.hc > v.dT ? err('h can’t be longer than d_T: the drop is one side of the triangle, d_T the longest.') : null },
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
    ladder: { rungs: ['dx', 'vf', 'a'], start: { dx: null, vf: 'v0' }, zeroNote: { dx: 'Δx is measured from where it starts, so Δx(0) = 0.' } },
    vars: ['dx', 'v0', 'vf', 'a', 't', 'inc', 'm', 'g', 'W', 'Wpar', 'Wperp', 'N', 'f', 'mu', 'mus', 'F', 'Fp'],
    axis: '+ is <b>down the slope</b>. Pick the direction for each vector; the app sets the sign.',
    intro: `<p>On a ramp, tilt your axes so one runs <b>along the slope</b> and one runs <b>into it</b>. Gravity then splits into two parts: W∥ pulls the object down the slope, and W⊥ presses it into the ramp, where the normal force N cancels it.</p>
      <p>Only the forces along the slope change the motion. Once you know the acceleration, the constant-acceleration equations describe the slide.</p>`,
    sections: [
      { title: 'Kinematics along the ramp', note: 'Five quantities: Δx, v₀, v, a, t. Each equation leaves one of them out.', eqs: ['X1', 'X2', 'X3', 'X4', 'X5'] },
      { title: 'Forces on a ramp', note: 'Weight, its two components, the normal force, friction and Newton’s second law.', eqs: ['N2', 'I1', 'I2', 'I3', 'I4', 'I5d', 'I5u', 'I6', 'N1'] },
      { title: 'Shortcuts (the mass cancels)', note: 'These combine the force equations. Use them when the problem gives no mass.', eqs: ['S1', 'S2', 'S3'] },
    ],
    conditions: [
      { key: 'friction', type: 'choice', label: 'Surface', options: [[false, 'Frictionless'], [true, 'Rough (friction)']] },
      { key: 'up', type: 'choice', label: 'Moving', options: [[false, 'Down the slope'], [true, 'Up the slope']] },
      { key: 'upAxis', type: 'choice', label: 'Positive direction (your axis)', options: [[false, 'Down the slope'], [true, 'Up the slope']] },
      { key: 'varA', type: 'choice', label: 'Acceleration', options: [[false, 'Constant'], [true, 'Varies with time']], ask: ['Acceleration:', [[false, 'constant'], [true, 'varies with time (a function or a graph)']]] },
      { key: 'rest', type: 'hidden', label: 'Starts from rest', sets: { v0: 0 } },
      { key: 'stop', type: 'hidden', label: 'Comes to a stop', sets: { vf: 0 } },
      { key: 'still', type: 'hidden', label: 'At rest: does it stay put? (static friction)', sets: { a: 0 } },
      { key: 'earth', type: 'hidden', label: 'On Earth (g = 9.81 m/s²)', sets: { g: 9.81 }, default: true },
    ],
    // at rest, friction is static: it is whatever holding the block needs, up to μs N
    statics: { when: c => c.friction && c.still, need: 'f', most: ['mus', 'N'] },
    defaults: { inc: 30, v0: 0, mu: 0.2, m: 2 },
  },
  pulley: {
    title: 'Tension & pulleys', short: 'Pulleys',
    kin: { p: 'dx', u0: 'v0', u: 'vf', a: 'a', t: 't' }, diagram: 'pulley',
    ladder: { rungs: ['dx', 'vf', 'a'], start: { dx: null, vf: 'v0' }, zeroNote: { dx: 'Δx is measured from where it starts, so Δx(0) = 0.' } },
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
  },
  blocks: {
    title: 'Pushed blocks', short: 'Blocks',
    kin: { p: 'dx', u0: 'v0', u: 'vf', a: 'a', t: 't' }, diagram: 'blocks',
    ladder: { rungs: ['dx', 'vf', 'a'], start: { dx: null, vf: 'v0' }, zeroNote: { dx: 'Δx is measured from where it starts, so Δx(0) = 0.' } },
    vars: ['mA', 'mB', 'Fp', 'P', 'g', 'mu', 'NA', 'NB', 'fA', 'fB', 'a', 'dx', 'v0', 'vf', 't'],
    dirs: { dx: ['forward', 'backward'], v0: ['forward', 'backward'], vf: ['forward', 'backward'], a: ['forward', 'backward'] },
    names: { dx: 'distance the blocks move', v0: 'initial speed of the blocks', vf: 'final speed of the blocks', a: 'acceleration of both blocks', Fp: 'push on block A (size)' },
    axis: '+ is <b>forward</b>: the way F pushes.',
    stuck: 'Draw a free-body diagram for each block (Forces tab): it writes Newton’s second law for both. Is “On Earth” ticked so g is known?',
    intro: `<p>Two blocks touch on a floor and F pushes block A, which pushes block B. They move together, so they share the same acceleration.</p>
      <p>The forces between them are a <b>Newton’s third-law pair</b>: A pushes B forward with P, and B pushes A back with the same P. Draw a free-body diagram for <b>each block</b>, then treat the two ΣF equations as a system.</p>`,
    sections: [
      { title: 'Friction on each block', note: 'Kinetic friction on each block, from its own normal force.', eqs: ['Q1', 'Q2'] },
      { title: 'Kinematics (both blocks move together)', note: 'Five quantities: Δx, v₀, v, a, t. Newton’s second law for each block comes from your free-body diagrams.', eqs: ['X1', 'X2', 'X3', 'X4', 'X5'] },
    ],
    conditions: [
      { key: 'friction', type: 'choice', label: 'Floor', options: [[false, 'Frictionless'], [true, 'Kinetic friction (both slide)']] },
      { key: 'together', type: 'locked', label: 'They move together', note: 'Block A pushes block B, so both have the same acceleration a.' },
      { key: 'rest', type: 'hidden', label: 'Starts from rest', sets: { v0: 0 } },
      { key: 'earth', type: 'hidden', label: 'On Earth (g = 9.81 m/s²)', sets: { g: 9.81 }, default: true },
    ],
    // per-scenario assumption checks: kinetic friction only holds while the blocks actually slide
    checks: [{ when: c => c.friction, sub: '{Fp} − {mu}({mA} + {mB}){g}', what: 'the push minus the friction on both blocks',
      judge: (x, v) => x <= 0 ? ['fail', 'doesn’t slide: friction can hold it, so kinetic friction can’t be assumed'] : x < 0.1 * v.Fp ? ['barely', 'barely sliding: the push only just beats friction, so small changes in μk decide whether it moves at all'] : ['ok', 'slides'] }],
    defaults: { mA: 2, mB: 1, Fp: 12, mu: 0.1, v0: 0 },
  },
  rotation: {
    title: 'Rotation kinematics', short: 'Rotation',
    kin: { p: 'theta', u0: 'w0', u: 'w', a: 'alpha', t: 't' }, diagram: 'wheel',
    // kinematics only (no forces or torques yet): the Forces stage is optional; ω or α drawn on a wheel earns its star
    forcesOptional: true,
    ladder: { rungs: ['theta', 'w', 'alpha'], start: { theta: null, w: 'w0' }, zeroNote: { theta: 'θ is the angle turned since t = 0, so θ(0) = 0.' } },
    vars: ['theta', 'w0', 'w', 'alpha', 't'], rimVars: ['r', 's', 'v', 'at', 'ac', 'atot'],
    // between two moments: worked out from θ(t) (or ω(t) for α_avg), see span() in app.js
    spanVars: { dth: 'theta', nrev: 'theta', dtrav: 'theta', wavg: 'theta', aavg: 'w' },
    axis: '+ is <b>counterclockwise</b>. Pick the direction for each vector; the app sets the sign.',
    intro: `<p>A rigid wheel turns as one piece: every point sweeps the <b>same angle</b> in the same time. Its motion is described by angle θ, angular velocity ω and angular acceleration α.</p>
      <p>These are the rotational twins of position, velocity and acceleration, so the equations have the same shape. The radius r converts to a point’s path: s = rθ, v = rω.</p>`,
    sections: [
      { title: 'Angular kinematics (constant α)', note: 'Five quantities: θ, ω₀, ω, α, t. Each equation leaves one of them out. If α varies with time, use the motion ladder on your sheet instead.', eqs: ['E1', 'E2', 'E3', 'E4', 'E5'] },
      { title: 'A point at radius r', note: 'Turn on “Track a point” in the conditions to use these. The point’s acceleration has two parts at right angles: aₜ = rα along its path (the spin speeding up or slowing down) and a꜀ = ω²r toward the centre.', eqs: ['E6', 'E7', 'E8', 'E9', 'E10', 'E11'], applies: c => c.rim, needs: 'track a point at radius r' },
    ],
    conditions: [
      { key: 'varA', type: 'choice', label: 'Angular acceleration', options: [[false, 'Constant'], [true, 'Varies with time']], ask: ['Angular acceleration:', [[false, 'constant'], [true, 'varies with time (a function or a graph)']]] },
      { key: 'rim', type: 'toggle', label: 'Track a point at distance r from the axis', ask: ['The question is about:', [[false, 'the whole body (θ, ω, α)'], [true, 'a point on it, at radius r (v, aₜ, radial a)']]] },
      { key: 'rest', type: 'hidden', label: 'Starts from rest', sets: { w0: 0 } },
      { key: 'stop', type: 'hidden', label: 'Comes to a stop', sets: { w: 0 } },
    ],
    defaults: { w0: 1.5, alpha: 1.2, r: 0.5 },
  },
  torque: {
    title: 'Torque & equilibrium', short: 'Torque',
    kin: { p: 'theta', u0: 'w0', u: 'w', a: 'alpha', t: 't' }, diagram: 'beam',
    vars: ['L', 'M', 'm', 'g', 'Tn', 'Hx', 'Hy', 'dP', 'dm', 'dT', 'dF', 'phi', 'beta', 'xh', 'hc', 'Fp', 'tau', 'rt', 'tnet', 'I', 'Icm', 'dpa', 'R', 'alpha', 'a'],
    names: { m: 'hung mass (or a point mass)', Tn: 'tension in the cord or string', a: 'acceleration of the hanging mass', Fp: 'size of the force (or push)' },
    dirs: { a: ['down (the mass falls)', 'up'] },
    axis: '+ is <b>counterclockwise</b> for torques and α. Forces: x toward the beam’s right end, y up.',
    stuck: 'Draw the beam or disc and its forces where they act (Forces), then write ΣF = 0 and Στ = 0 (or Στ = Iα) onto your sheet. Is “On Earth” ticked so g is known? For I, pick the shape and the axis in Conditions.',
    intro: `<p>A force turns a body when it acts away from the axis: its <b>torque</b> is τ = rF sin φ, where r runs from the axis to where the force acts and φ is the angle between r and F. Counterclockwise is +.</p>
      <p>In <b>equilibrium</b> nothing moves or turns, so ΣFx = 0, ΣFy = 0 and Στ = 0 about <i>any</i> axis. Pick the axis where the unknown forces act: they have no lever arm there and drop out. When the body <b>spins up</b>, Στ = Iα, with I from the body’s shape.</p>`,
    sections: [
      { title: 'Torque of one force', note: 'Your free-body diagram writes these for every force on the beam or disc: ΣF = 0 and Στ = 0 (equilibrium) or Στ = Iα (spinning up).', eqs: ['D1'] },
      { title: 'Moments of inertia', note: 'Standard shapes about an axis through the centre (I_cm), a rod about its end, a point mass, and the parallel-axis theorem for any other axis.', eqs: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9'] },
      { title: 'Rotational dynamics (spinning up)', note: 'Στ = Iα, and a string unwinding from a disc to a hanging mass.', eqs: ['D2', 'D3', 'D4', 'D5', 'D6'], applies: c => c.dyn, needs: 'a body spinning up (This problem)' },
      { title: 'Beam geometry', note: 'A beam hinged at one end and hanging from a vertical cable: where the cable meets the beam, and the tilt.', eqs: ['GEO1', 'GEO2'] },
    ],
    conditions: [
      { key: 'dyn', type: 'choice', label: 'The body', options: [[false, 'In equilibrium (α = 0)'], [true, 'Spinning up (Στ = Iα)']], ask: ['The body is:', [[false, 'in equilibrium (nothing turns or accelerates)'], [true, 'spinning up (Στ = Iα)']]] },
      { key: 'shape', type: 'choice', label: 'Shape (for its moment of inertia)', options: [['rod', 'Thin rod'], ['disc', 'Solid disc or cylinder'], ['ring', 'Thin ring or hoop'], ['sphere', 'Solid sphere'], ['shell', 'Hollow sphere'], ['point', 'Point mass']] },
      { key: 'axis', type: 'choice', label: 'It turns about', options: [['centre', 'Its centre of mass'], ['other', 'Another point (an end, a hinge)']] },
      { key: 'earth', type: 'hidden', label: 'On Earth (g = 9.81 m/s²)', sets: { g: 9.81 }, default: true },
    ],
    defaults: {},
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

// ---------- diagram library (Phase 4): the notation for mechanics drawings ----------
// Each component is drawn one standard way and brings named properties (the variables they create), connections,
// the arrows that belong to it and the equations it produces (ids in EQS; `more` names relations not in the library yet).
// `tools`: the toolbar buttons that draw it (their hover card is this entry). `draw`: SVG in a 80 × 50 box.
const BODY = 'fill="rgba(255,107,214,.22)" stroke="#ff6bd6" stroke-width="2.5"', SURF = 'stroke="#8796ff" stroke-width="3"';
const ARW = (x1, y1, x2, y2, c, lab) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 7; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)} ${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)}" fill="${c}"/>${lab ? `<text x="${x2 + 4}" y="${y2 + 4}" font-size="11" font-weight="700" fill="${c}">${lab}</text>` : ''}`; };
// a curved arrow three-quarters round a disc: counterclockwise ends on the left, clockwise on the right, both heading down
const SPIN = (c, lab, cw = false) => { const x = cw ? 58 : 22; return `<circle cx="40" cy="25" r="11" fill="none" stroke="#ff6bd6" stroke-width="2"/><path d="M 40 43 A 18 18 0 1 ${cw ? 1 : 0} ${x} 25" fill="none" stroke="${c}" stroke-width="3"/><polygon points="${x},33 ${x - 5},24 ${x + 5},24" fill="${c}"/><text x="${cw ? 6 : 64}" y="14" font-size="12" font-weight="700" fill="${c}">${lab}</text>`; };
export const COMPONENTS = {
  surface: { label: 'Surface (floor or table)', tools: ['floor', 'table'],
    draw: `<line x1="4" y1="34" x2="76" y2="34" ${SURF}/><path d="M10 44 L16 36 M24 44 L30 36 M38 44 L44 36 M52 44 L58 36 M66 44 L72 36" stroke="#4a5bc4" stroke-width="1.5"/>`,
    means: 'A flat surface a body rests or slides on. Hatching underneath means it is fixed. A dashed edge means rough.',
    props: [['rough or smooth', 'friction: μk (sliding), μs (at rest)']], connects: 'Bodies rest on it. A pulley clamps to a table’s edge.',
    arrows: ['N: perpendicular to the surface, out of it', 'f: along the surface (only if rough)'], eqs: ['I4', 'P3', 'P4'],
    check: 'A normal force is perpendicular to the surface, never straight up on a slope.' },
  ramp: { label: 'Ramp (incline)', tools: ['ramp'],
    draw: `<polygon points="6,42 74,42 74,10" fill="rgba(74,91,196,.22)" ${SURF}/><path d="M28 42 A 22 22 0 0 0 26.5 32.6" fill="none" stroke="#ffd166" stroke-width="2"/><text x="31" y="39" font-size="11" fill="#ffd166">θ</text>`,
    means: 'A fixed surface tilted at angle θ from the horizontal. Tilt your axes with it: one along the slope, one perpendicular.',
    props: [['angle', 'θ'], ['rough or smooth', 'μk, μs']], connects: 'A body rests on its slope. A pulley clamps to its top corner.',
    arrows: ['N: perpendicular to the slope', 'f: along the slope, against the sliding', 'W splits into W∥ and W⊥'], eqs: ['I1', 'I2', 'I3', 'I4'],
    check: 'Gravity is straight down; only its component W∥ = W sin θ runs along the slope.' },
  block: { label: 'Block', tools: ['block'],
    draw: `<rect x="22" y="12" width="36" height="26" ${BODY}/><text x="36" y="30" font-size="12" fill="#fff">m</text>`,
    means: 'A body that slides without rolling. All its mass acts at its centre of mass (⊕), where its forces start.',
    props: [['mass', 'm (m₁, m₂, m_A, m_B)']], connects: 'Rests on a surface or ramp, hangs from a string, touches another block.',
    arrows: ['W = mg straight down', 'v and a along its motion'], eqs: ['N2', 'N1'],
    check: 'Draw every force on the block from the block’s centre; forces it exerts on others go on their diagrams.' },
  particle: { label: 'Particle', tools: ['particle'],
    draw: `<circle cx="40" cy="25" r="5" fill="#ff6bd6"/><text x="48" y="22" font-size="11" fill="#fff">m</text>`,
    means: 'A body so small that its size and turning don’t matter: only its position and mass.',
    props: [['mass', 'm']], connects: 'Rests on a surface or hangs from a string, like a block.',
    arrows: ['W, v and a, all from the dot'], eqs: ['N2', 'N1', 'J7'],
    check: 'A particle can’t spin, so no ω or α on it.' },
  ball: { label: 'Ball', tools: ['ball'],
    draw: `<circle cx="40" cy="25" r="16" ${BODY}/><line x1="40" y1="25" x2="56" y2="25" stroke="#fff" stroke-width="2"/><text x="44" y="22" font-size="10" fill="#fff">r</text>`,
    means: 'A round body of mass m and radius r. The line from the centre marks the radius.',
    props: [['mass', 'm'], ['radius', 'r']], connects: 'Rests or rolls on a surface.',
    arrows: ['W, N, v and a, like a block', 'ω and α if it spins'], eqs: ['N2'],
    check: 'Its centre sits one radius above the surface, along the normal.' },
  wheel: { label: 'Wheel or disc', tools: ['wheel'],
    draw: `<circle cx="40" cy="25" r="18" fill="none" stroke="#ff6bd6" stroke-width="2.5"/><path d="M40 7 V43 M22 25 H58" stroke="#ff6bd6" stroke-width="1.5"/><circle cx="40" cy="25" r="2.5" fill="#ffd98a"/>`,
    means: 'A rigid body that turns about its axle: every point sweeps the same angle θ, with the same ω and α.',
    props: [['radius', 'r (of the point you track)']], connects: 'Turns about a pivot (its axle).',
    arrows: ['ω and α as curved arrows (+ counterclockwise)', 'for a point: v, aₜ along its path, a꜀ toward the centre', 'a string’s pull at the rim (lever arm R)'], eqs: ['E6', 'E7', 'E8', 'E9', 'E11', 'J3', 'D4'],
    check: 'a꜀ points to the centre even when the spin is steady; aₜ is zero unless α isn’t.' },
  rod: { label: 'Rod', tools: ['rod'],
    draw: `<rect x="8" y="22" width="64" height="6" fill="rgba(255,107,214,.22)" stroke="#ff6bd6" stroke-width="2"/><text x="36" y="18" font-size="11" fill="#fff">L</text>`,
    means: 'A thin rigid bar. It can push or pull along its length and, pinned, it turns as one piece.',
    props: [['length', 'L'], ['mass', 'M'], ['points along it', 'd_P, d_m, d_T, d_F (from either end)']], connects: 'Pinned at a pivot, hung from a cable, or holding a hung mass.',
    arrows: ['each force starts where it acts: the weight at the centre, a hung mass at its hook, a cable where it’s tied, the hinge at the pivot', 'ω and α if it turns'], eqs: ['J1', 'J2', 'D1'],
    more: 'In Torque & equilibrium your diagram writes ΣFx = 0, ΣFy = 0 and Στ = 0 about the axis you pick.',
    check: 'Forces on a beam start where they act, not at its centre: that is what gives them a lever arm.' },
  pulley: { label: 'Pulley', tools: ['pulley'],
    draw: `<path d="M40 4 V12" stroke="#ffd98a" stroke-width="2"/><circle cx="40" cy="20" r="9" fill="#151d56" stroke="#ffd98a" stroke-width="2.5"/><path d="M31 20 V46 M49 20 V46" stroke="#e8edff" stroke-width="1.5"/>`,
    means: 'An ideal pulley only turns the string’s direction: the tension is the same on both sides.',
    props: [['ideal', 'massless, frictionless']], connects: 'Clamps to a table’s edge or a ramp’s top; a string runs over it.',
    arrows: ['T on each body, along the string, away from the body'], eqs: ['P5', 'P6'],
    check: 'Same string, same T, and both bodies have the same size of acceleration.' },
  string: { label: 'String', tools: ['string'],
    draw: `<path d="M8 40 L40 12 L72 40" fill="none" stroke="#e6eef8" stroke-width="2"/><circle cx="40" cy="12" r="3" fill="#ffd98a"/>`,
    means: 'An ideal string: massless and it doesn’t stretch. It can only pull.',
    props: [['tension', 'T']], connects: 'Ties bodies together, often over a pulley.',
    arrows: ['T along the string, pulling the body toward the string'], eqs: ['P5', 'P6'],
    check: 'A string pulls, never pushes: T points away from the body along the string.' },
  spring: { label: 'Spring', tools: ['spring'],
    draw: `<path d="M6 25 H16 L20 15 L28 35 L36 15 L44 35 L52 15 L60 35 L64 25 H74" fill="none" stroke="#9be15d" stroke-width="2.5"/>`,
    means: 'Pushes or pulls back toward its natural length, harder the more it is stretched or squashed.',
    props: [['stiffness', 'k'], ['stretch', 'x']], connects: 'Attached to a wall and a body.',
    arrows: ['F on the body, back toward the natural length'], eqs: [], more: 'Hooke’s law, F = kx (size), arrives with energy and spring problems.',
    check: 'The spring force points back toward the natural length: away from the stretch.' },
  pivot: { label: 'Pivot (axle)', tools: ['pivot'],
    draw: `<polygon points="40,18 28,40 52,40" fill="none" stroke="#ffd98a" stroke-width="2.5"/><circle cx="40" cy="18" r="4" fill="#ffd98a"/><path d="M22 44 H58" stroke="#8796ff" stroke-width="2"/>`,
    means: 'A fixed point a body turns about. It can push in any direction but doesn’t turn the body itself.',
    props: [['position', 'the axis']], connects: 'A wheel or rod is pinned at it.',
    arrows: ['the hinge force, as two parts H_x and H_y (signs come out of the algebra)'], eqs: ['D2'], more: 'The pivot is usually the best axis for Στ: the hinge force has no lever arm there.',
    check: 'Don’t guess the hinge force’s direction: draw H_x and H_y, and a negative answer means that part points the other way.' },
  ring: { label: 'Thin ring or hoop', tools: [],
    draw: `<circle cx="40" cy="25" r="18" fill="none" stroke="#ff6bd6" stroke-width="4"/><circle cx="40" cy="25" r="2.5" fill="#ffd98a"/>`,
    means: 'All the mass sits at the rim, distance R from the centre.',
    props: [['mass', 'M'], ['radius', 'R']], connects: 'Turns about its centre.',
    arrows: ['ω, α; a pull at the rim'], eqs: ['J4'],
    check: 'A ring is harder to spin than a disc of the same M and R: all its mass is far out.' },
  sphere: { label: 'Solid sphere', tools: [],
    draw: `<circle cx="40" cy="25" r="18" ${BODY}/><ellipse cx="40" cy="25" rx="18" ry="6" fill="none" stroke="#ff6bd6" stroke-width="1.5"/>`,
    means: 'A ball filled all through, turning about a diameter.',
    props: [['mass', 'M'], ['radius', 'R']], connects: 'Turns about a diameter.',
    arrows: ['ω, α'], eqs: ['J5'],
    check: 'Most of a solid sphere’s mass is near the axis, so I = ⅖MR² is smaller than a shell’s.' },
  shell: { label: 'Hollow sphere', tools: [],
    draw: `<circle cx="40" cy="25" r="18" fill="none" stroke="#ff6bd6" stroke-width="4"/><ellipse cx="40" cy="25" rx="18" ry="6" fill="none" stroke="#ff6bd6" stroke-width="1.5" stroke-dasharray="3 3"/>`,
    means: 'A thin spherical shell, turning about a diameter.',
    props: [['mass', 'M'], ['radius', 'R']], connects: 'Turns about a diameter.',
    arrows: ['ω, α'], eqs: ['J6'],
    check: 'Same M and R as a solid sphere, but I = ⅔MR²: the mass is all at the surface.' },
  axis: { label: 'Axis for torques', tools: ['axis'],
    draw: `<rect x="8" y="22" width="64" height="6" fill="rgba(255,107,214,.22)" stroke="#ff6bd6" stroke-width="2"/><circle cx="20" cy="25" r="6" fill="none" stroke="#9be15d" stroke-width="2.5"/><path d="M20 19 V31 M14 25 H26" stroke="#9be15d" stroke-width="2"/><path d="M20 38 H58" stroke="#ffd166" stroke-width="2" stroke-dasharray="4 3"/><text x="36" y="48" font-size="10" fill="#ffd166">r</text>`,
    means: 'The point torques are measured about. r runs from here to where each force acts.',
    props: [['position', 'any point on the body']], connects: 'Click a point on the beam with the axis tool.',
    arrows: [], eqs: ['D1'],
    check: 'In equilibrium Στ = 0 about every point, so pick the one where the unknown forces act.' },
  force: { label: 'Force arrow', tools: ['force', 'f:gravity', 'f:normal', 'f:friction', 'f:tension', 'f:push', 'f:contact'],
    draw: `<rect x="10" y="18" width="20" height="16" ${BODY}/>${ARW(20, 26, 70, 26, '#3ddc97', 'F')}`,
    means: 'A push or pull on one body, drawn from its centre of mass. Its direction is named (along the slope, perpendicular…), so the signs come from your picture.',
    props: [['kind', 'W, N, f, T, F, P']], connects: 'Starts at the body it acts on.',
    arrows: [], eqs: ['N1'], more: 'Your free-body diagram writes ΣF = ma for each body.',
    check: 'Every force needs something touching the body (or gravity). No “force of motion”.' },
  v: { label: 'Velocity arrow v', tools: ['vel'], draw: `<rect x="10" y="18" width="20" height="16" ${BODY}/>${ARW(20, 26, 70, 26, '#9be15d', 'v')}`,
    means: 'Which way the body is moving right now. On a ramp it settles “Moving: up or down the slope”.',
    props: [['size', 'v']], connects: 'Starts at the body.', arrows: [], eqs: ['X1'],
    check: 'A sliding block’s velocity is along the surface.' },
  a: { label: 'Acceleration arrow a', tools: ['acc'], draw: `<rect x="10" y="18" width="20" height="16" ${BODY}/>${ARW(20, 26, 70, 26, '#ff8f70', 'a')}`,
    means: 'Which way the velocity is changing. It points the same way as the net force.',
    props: [['size', 'a']], connects: 'Starts at the body.', arrows: [], eqs: ['N1'],
    check: 'a can point against v: then the body is slowing down.' },
  omega: { label: 'Angular velocity ω', tools: ['omega'], draw: SPIN('#9be15d', 'ω'),
    means: 'Which way the body spins. Counterclockwise is +.',
    props: [['size', 'ω']], connects: 'Drawn around a wheel or disc.', arrows: [], eqs: ['E1', 'E7'],
    check: 'Every point of a rigid body has the same ω.' },
  alpha: { label: 'Angular acceleration α', tools: ['alpha'], draw: SPIN('#ff8f70', 'α', true),
    means: 'Which way the spin is changing. Against ω means the spin is slowing down.',
    props: [['size', 'α']], connects: 'Drawn around a wheel or disc.', arrows: [], eqs: ['E1', 'E8'],
    check: 'α against ω: the wheel slows; with ω: it speeds up.' },
};

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
  Fp: 10, mus: 0.5, mA: 2, mB: 1, P: 4, NA: 19.6, NB: 9.8, fA: 2, fB: 1, m1: 4, m2: 2, W1: 39.2, W2: 19.6, N1: 39.2, Tn: 12,
  theta: 8, w0: 2, w: 6, alpha: 1.5, r: 0.5, s: 4, v: 3, at: 0.75, ac: 18, atot: 18.02,
  dth: 8, dtrav: 8, nrev: 1.27, wavg: 4, aavg: 1.5,
  L: 2, M: 1.5, R: 0.2, Hx: 5, Hy: 5, dP: 0.3, dm: 0.3, dT: 0.4, dF: 0.5, phi: 30, beta: 20, xh: 0.4, hc: 0.12, tau: 5, rt: 0.5, tnet: 5, I: 0.4, Icm: 0.1, dpa: 0.35,
};
setSamples(SAMPLE); // the engine picks signs and roots at these values
// Order symbols are written in a product: coefficient-like first (μk m g), then the rest.
export const PRINT_ORDER = ['mu', 'mus', 'r', 'rt', 'R', 'm', 'M', 'm1', 'm2', 'mA', 'mB', 'g', 'W', 'W1', 'W2', 'Wpar', 'Wperp', 'N', 'N1', 'NA', 'NB', 'f', 'fA', 'fB', 'F', 'Fp', 'P', 'Tn', 'inc',
  'Hx', 'Hy', 'tau', 'tnet', 'I', 'Icm', 'dpa', 'L', 'dP', 'dm', 'dT', 'dF', 'xh', 'hc', 'phi', 'beta',
  'dx', 'theta', 's', 'v0', 'w0', 'vf', 'w', 'v', 'a', 'alpha', 'at', 'ac', 'atot', 'dth', 'dtrav', 'nrev', 'wavg', 'aavg', 't'];

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
