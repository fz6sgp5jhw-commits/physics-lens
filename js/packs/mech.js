// Physics Lens — the mechanics pack: quantities, equations (one line each, rearranged by code at load), units
// (chapters), the diagram library and the practice bank. All values are stored in SI units. Mechanics ids stay bare
// (bare: true); every other pack prefixes its ids with its own id and an underscore. Loaded by js/packs/index.js.
import { fmt } from '../expr.js';
import * as NOTES from './mech-notes.js';

const TAU = 2 * Math.PI;

const VARS = {
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
  // energy with rotation, rolling and angular momentum (phase C3). Start values carry 0 (K₀, U₀) or 1 (L₁, I₁, ω₁),
  // like v₀; heights are measured from where the body ends, so U = 0 there unless the problem says otherwise.
  K:     { sym: 'K', plain: 'K', name: 'kinetic energy at the end (moving and turning together)', unit: 'J', units: { J: 1, kJ: 1000 } },
  K0:    { sym: 'K<sub>0</sub>', plain: 'K₀', name: 'kinetic energy at the start', unit: 'J', units: { J: 1, kJ: 1000 } },
  U:     { sym: 'U', plain: 'U', name: 'potential energy at the end', unit: 'J', units: { J: 1, kJ: 1000 } },
  U0:    { sym: 'U<sub>0</sub>', plain: 'U₀', name: 'potential energy at the start (mgh)', unit: 'J', units: { J: 1, kJ: 1000 } },
  Wnc:   { sym: 'W<sub>nc</sub>', plain: 'W_nc', name: 'work by friction (a rough axle) or another non-conservative force', unit: 'J', units: { J: 1 }, dir: ['adds energy (a push)', 'takes energy out (friction)'] },
  Wnet:  { sym: 'W<sub>net</sub>', plain: 'W_net', name: 'net work by all the forces and torques', unit: 'J', units: { J: 1 }, dir: ['speeds it up', 'slows it down'] },
  Ktr:   { sym: 'K<sub>tr</sub>', plain: 'K_tr', name: 'kinetic energy of the centre moving (½Mv²)', unit: 'J', units: { J: 1 } },
  Krot:  { sym: 'K<sub>rot</sub>', plain: 'K_rot', name: 'kinetic energy of turning (½Iω²)', unit: 'J', units: { J: 1 } },
  h:     { sym: 'h', plain: 'h', name: 'height the falling body starts above where it ends', unit: 'm', units: { m: 1, cm: 0.01 }, dir: ['starts above where it ends', 'starts below where it ends'] },
  fs:    { sym: 'f<sub>s</sub>', plain: 'f_s', name: 'static friction from the ground on the rolling body (size)', unit: 'N', units: { N: 1 } },
  D:     { sym: 'D', plain: 'D', name: 'diameter of the disc or wheel', unit: 'm', units: { m: 1, cm: 0.01 } },
  Li:    { sym: 'L<sub>1</sub>', plain: 'L₁', name: 'angular momentum before', unit: 'kg·m²/s', units: { 'kg·m²/s': 1 }, dir: ['counterclockwise', 'clockwise'] },
  Lf:    { sym: 'L<sub>2</sub>', plain: 'L₂', name: 'angular momentum after', unit: 'kg·m²/s', units: { 'kg·m²/s': 1 }, dir: ['counterclockwise', 'clockwise'] },
  Ii:    { sym: 'I<sub>1</sub>', plain: 'I₁', name: 'moment of inertia before', unit: 'kg·m²', units: { 'kg·m²': 1 } },
  If:    { sym: 'I<sub>2</sub>', plain: 'I₂', name: 'moment of inertia after', unit: 'kg·m²', units: { 'kg·m²': 1 } },
  wi:    { sym: 'ω<sub>1</sub>', plain: 'ω₁', name: 'angular velocity before', unit: 'rad/s', units: { 'rad/s': 1, rpm: TAU / 60, 'rev/s': TAU }, dir: ['counterclockwise', 'clockwise'] },
  wf:    { sym: 'ω<sub>2</sub>', plain: 'ω₂', name: 'angular velocity after', unit: 'rad/s', units: { 'rad/s': 1, rpm: TAU / 60, 'rev/s': TAU }, dir: ['counterclockwise', 'clockwise'] },
  // work, energy and momentum for a body that slides, swings or collides (Exam 3 topics). Collision velocities are signed by
  // their direction buttons (+ to the right); energies and work carry their own sign.
  WF:    { sym: 'W<sub>F</sub>', plain: 'W_F', name: 'work done by the force F', unit: 'J', units: { J: 1, kJ: 1000 }, dir: ['adds energy (along the motion)', 'takes energy out (against the motion)'] },
  Pavg:  { sym: 'P<sub>avg</sub>', plain: 'P_avg', name: 'average power', unit: 'W', units: { W: 1, kW: 1000 } },
  ks:    { sym: 'k', plain: 'k', name: 'spring constant (force per metre of stretch)', unit: 'N/m', units: { 'N/m': 1, 'N/cm': 100 } },
  xs:    { sym: 'x<sub>s</sub>', plain: 'x_s', name: 'how far the spring is compressed or stretched', unit: 'm', units: { m: 1, cm: 0.01, mm: 0.001 } },
  Us0:   { sym: 'U<sub>s0</sub>', plain: 'U_s0', name: 'spring potential energy at the start', unit: 'J', units: { J: 1 } },
  Us:    { sym: 'U<sub>s</sub>', plain: 'U_s', name: 'spring potential energy at the end', unit: 'J', units: { J: 1 } },
  v1i:   { sym: 'v<sub>1i</sub>', plain: 'v_1i', name: 'velocity of body 1 before the collision', unit: 'm/s', units: { 'm/s': 1, 'km/h': 1 / 3.6 }, dir: ['to the right', 'to the left'] },
  v2i:   { sym: 'v<sub>2i</sub>', plain: 'v_2i', name: 'velocity of body 2 before the collision', unit: 'm/s', units: { 'm/s': 1, 'km/h': 1 / 3.6 }, dir: ['to the right', 'to the left'] },
  v1f:   { sym: 'v<sub>1f</sub>', plain: 'v_1f', name: 'velocity of body 1 after the collision', unit: 'm/s', units: { 'm/s': 1, 'km/h': 1 / 3.6 }, dir: ['to the right', 'to the left'] },
  v2f:   { sym: 'v<sub>2f</sub>', plain: 'v_2f', name: 'velocity of body 2 after the collision', unit: 'm/s', units: { 'm/s': 1, 'km/h': 1 / 3.6 }, dir: ['to the right', 'to the left'] },
  th1:   { sym: 'θ<sub>1</sub>', plain: 'θ_1', name: 'angle of body 1’s path after the collision, from the line it came in on', unit: '°', units: { '°': 1, rad: 180 / Math.PI } },
  th2:   { sym: 'θ<sub>2</sub>', plain: 'θ_2', name: 'angle of body 2’s path after the collision, on the other side of that line', unit: '°', units: { '°': 1, rad: 180 / Math.PI } },
  Fai:   { sym: 'F<sub>a0</sub>', plain: 'F_a0', name: 'force at the start of stretch a of the graph', unit: 'N', units: { N: 1, kN: 1000 }, dir: ['along the motion', 'against the motion'] },
  Faf:   { sym: 'F<sub>a1</sub>', plain: 'F_a1', name: 'force at the end of stretch a', unit: 'N', units: { N: 1, kN: 1000 }, dir: ['along the motion', 'against the motion'] },
  Fbi:   { sym: 'F<sub>b0</sub>', plain: 'F_b0', name: 'force at the start of stretch b', unit: 'N', units: { N: 1, kN: 1000 }, dir: ['along the motion', 'against the motion'] },
  Fbf:   { sym: 'F<sub>b1</sub>', plain: 'F_b1', name: 'force at the end of stretch b', unit: 'N', units: { N: 1, kN: 1000 }, dir: ['along the motion', 'against the motion'] },
  dxa:   { sym: 'Δx<sub>a</sub>', plain: 'Δx_a', name: 'length of stretch a along the position axis', unit: 'm', units: { m: 1, cm: 0.01 } },
  dxb:   { sym: 'Δx<sub>b</sub>', plain: 'Δx_b', name: 'length of stretch b along the position axis', unit: 'm', units: { m: 1, cm: 0.01 } },
  Wga:   { sym: 'W<sub>a</sub>', plain: 'W_a', name: 'work over stretch a (the area under it)', unit: 'J', units: { J: 1 } },
  Wgb:   { sym: 'W<sub>b</sub>', plain: 'W_b', name: 'work over stretch b (the area under it)', unit: 'J', units: { J: 1 } },
};

const V = (id) => `<span class="sym" data-v="${id}">${VARS[id].sym}</span>`;
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

const EQS = {
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
    condition: 'sliding (kinetic friction)', applies: c => !c.still && (c.friction || c.rough), needs: 'kinetic friction, while it slides',
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
    label: 'I3', eq: '{Icm} = ½{M}{R}²', kind: 'rel', principle: 'I = ½MR² for a solid disc', cue: 'a solid disc or cylinder', meaning: 'Solid disc or cylinder about its axle.', condition: 'solid disc or cylinder',
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
    label: 'I9', eq: '{I} = {Icm}', kind: 'rel', principle: 'the axis is through the centre, so I is the centre value', cue: 'the axis passes through the centre of mass',
    meaning: 'The body turns about its own centre of mass, so its I is the centre value.', condition: 'axis through the centre of mass', applies: c => c.axis === 'centre',
    needs: 'an axis through the centre of mass', calc: 'The parallel-axis theorem with d = 0.',
  },
  // ---- rotational dynamics: Στ = Iα, and a string unwinding from a disc ----
  D2: {
    label: 'D2', eq: '{tnet} = {I}{alpha}', kind: 'law', principle: 'Στ = Iα for a turning body', cue: 'a net torque and an angular acceleration',
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
    label: 'D4', eq: '{Tn}{R} = {I}{alpha}', kind: 'law', principle: 'Στ = Iα for the disc', cue: 'only the string turns the disc',
    meaning: 'The disc: only the string turns it (the axle’s force and the weight act at the centre, with no lever arm).', condition: 'frictionless axle, string at the rim',
    calc: 'Στ = Iα with one torque: the tension at the rim, lever arm R, perpendicular to the radius.',
  },
  D5: {
    label: 'D5', eq: '{m}{g} − {Tn} = {m}{a}', kind: 'law', principle: 'ΣF = ma for the hanging block', cue: 'the hanging mass: weight down, string up',
    meaning: 'The hanging mass: gravity down, the string up; the difference accelerates it.', condition: '+ down for the hanging mass',
    calc: 'Newton’s second law for the hanging mass, + down.',
    solve: {
      m: { guard: v => v.g === v.a ? err('a = g means the string is slack: then T = 0 and m can be anything.') : null },
    },
  },
  D6: {
    label: 'D6', eq: '{a} = {m}{g} / ({m} + {I} / {R}²)', kind: 'rel', shortcut: true, cue: 'the hanging mass and the disc as one system',
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

  // ---- energy with rotation (phase C3) ----
  EN1: {
    label: 'E1', eq: '{K0} + {U0} + {Wnc} = {K} + {U}', kind: 'law', principle: 'energy: what is gained pays for what is lost', cue: 'heights and speeds at two moments, with no time asked',
    meaning: 'Energy is conserved: what it starts with, plus the work friction or a push does, is what it ends with. K counts moving and turning.',
    condition: 'gravity the only other force that does work', calc: 'The work–energy theorem with gravity’s work written as −ΔU: W_nc + W_grav = ΔK and W_grav = U₀ − U.',
  },
  EN2: {
    label: 'E2', eq: '{Wnet} = {K} − {K0}', kind: 'law', cue: 'the work done by every force and torque together',
    meaning: 'The work–energy theorem, now with rotation: the net work (forces moving the centre and torques turning the body) is the change in all the kinetic energy.',
    condition: 'K includes ½Iω²', calc: 'Add ∫F·dx for the centre and ∫τ dθ for the turning: each equals the change in its own kinetic energy.',
  },
  EN3: {
    label: 'E3', eq: '{U0} = {M}{g}{h}', kind: 'def', cue: 'the body (its centre) starts higher up',
    meaning: 'Gravitational potential energy of the body, from the height of its centre above where it ends.', condition: 'h measured from where it ends (U = 0 there)',
    applies: c => c.body !== 'hang' && c.ground !== false, needs: 'the body itself moving up or down (not a hanging mass), with heights measured from where it ends', calc: 'Gravity’s work on the way down is Mgh, stored as U₀.',
  },
  EN4: {
    label: 'E4', eq: '{U0} = {m}{g}{h}', kind: 'def', principle: 'the height the block starts at gives its starting energy', cue: 'the hanging mass starts higher up',
    meaning: 'Gravitational potential energy of the hanging mass, measured from where it ends. The disc’s centre doesn’t move, so its U doesn’t change.',
    condition: 'h measured from where the mass ends (U = 0 there)', applies: c => c.body === 'hang', needs: 'a hanging mass turning a disc (the body: turned by a hanging mass)',
    calc: 'Gravity’s work on the falling mass is mgh, stored as U₀.',
  },
  EN5: {
    label: 'E5', eq: '{Krot} = ½{I}{w}²', kind: 'def', cue: 'a body turning has energy too',
    meaning: 'Kinetic energy of turning: every bit moves at rω, so ½Σmv² = ½(Σmr²)ω² = ½Iω².', condition: 'I about the axis it turns about',
    calc: 'Add ½ m v² over the body with v = rω: ½(Σ m r²)ω² = ½Iω².',
    solve: { w: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the spin rate, not the direction, so the positive root is kept. If it turns clockwise, ω is the negative of this.' }) } },
  },
  EN6: {
    label: 'E6', eq: '{Ktr} = ½{M}{v}²', kind: 'def', cue: 'the centre of a rolling body moves',
    meaning: 'Kinetic energy of the centre of mass moving, as if all the mass were there.', condition: 'v is the speed of the centre of mass',
    applies: c => c.body === 'roll', needs: 'a rolling body', calc: 'The usual ½mv², for the motion of the centre of mass.',
  },
  EN7: {
    label: 'E7', eq: '{K} = {Ktr} + {Krot}', kind: 'def', cue: 'a body that moves and turns at once',
    meaning: 'A rolling body has both: kinetic energy of its centre moving and of its turning about the centre.',
    condition: 'K_rot about the centre of mass', applies: c => c.body === 'roll', needs: 'a rolling body',
    calc: 'Each bit’s velocity is v_cm plus its velocity around the centre; squared and added, the cross term averages to zero.',
  },
  EN8: {
    label: 'E8', eq: '{K} = ½{I}{w}²', kind: 'rel', cue: 'a body spinning in place on a fixed axis',
    meaning: 'On a fixed axis with nothing else moving, all the kinetic energy is turning.', condition: 'fixed axis, nothing else moves',
    applies: c => c.body === 'spin', needs: 'a body spinning on a fixed axis with nothing else moving', calc: 'K_tr = 0 because the centre stays put, so K = K_rot.',
    solve: { w: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the spin rate, not the direction, so the positive root is kept. If it turns clockwise, ω is the negative of this.' }) } },
  },
  // ---- rolling without slipping, and a string that doesn't slip on a disc ----
  RO1: {
    label: 'V1', eq: '{v} = {R}{w}', kind: 'rel', principle: 'v = Rω: the string links the block to the rim', cue: 'rolls without slipping (or a string unwinds without slipping)',
    meaning: 'Rolling without slipping: the point touching the ground is at rest, so the centre moves at v = Rω. A string that doesn’t slip moves with the rim, so the same holds.',
    condition: 'rolls without slipping, or the string doesn’t slip', applies: c => c.body !== 'spin', needs: 'rolling, or a hanging mass on a string',
    calc: 'In one turn the body rolls its circumference 2πR forward, so distance = Rθ; differentiate: v = Rω.',
  },
  RO2: {
    label: 'V2', eq: '{a} = {R}{alpha}', kind: 'rel', principle: 'a = Rα: the string links the block to the rim', cue: 'rolls without slipping and speeds up',
    meaning: 'Rolling without slipping, differentiated once more: the centre’s acceleration is a = Rα.', condition: 'rolls without slipping, or the string doesn’t slip',
    applies: c => c.body !== 'spin', needs: 'rolling, or a hanging mass on a string', calc: 'Differentiate v = Rω: a = Rα.',
  },
  RO3: {
    label: 'V3', eq: '{K} = ½{M}{v}² + ½{Icm}{w}²', kind: 'rel', cue: 'the kinetic energy of a rolling body',
    meaning: 'Rolling: the centre moves at v and the body turns at ω about it, so K is the sum of the two energies.',
    condition: 'rolls without slipping', applies: c => c.body === 'roll', needs: 'a rolling body',
    calc: 'K = K_tr + K_rot, with K_rot about the centre of mass.',
    solve: { v: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the speed, not the direction, so the positive root is kept.' }) },
             w: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the spin rate, not the direction, so the positive root is kept.' }) } },
  },
  RO4: {
    label: 'V4', eq: '{K} = ½({M} + {Icm} / {R}²){v}²', kind: 'rel', cue: 'a rolling body’s energy from its speed alone',
    meaning: 'Shortcut: put ω = v/R into K = ½Mv² + ½I_cmω². Turning acts like an extra mass I_cm/R².',
    condition: 'rolls without slipping', applies: c => c.body === 'roll', needs: 'a rolling body',
    calc: '½I_cm(v/R)² = ½(I_cm/R²)v², added to ½Mv².',
    solve: { v: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the speed, not the direction, so the positive root is kept.' }) }, R: null },
  },
  RO5: {
    label: 'V5', eq: '{K} = ½{m}{v}² + ½{I}{w}²', kind: 'rel', principle: 'the energy of the block and of the disc together', cue: 'a falling mass spins a disc on a string',
    meaning: 'The hanging mass moves and the disc turns: K counts both.', condition: 'the disc turns on a fixed axle',
    applies: c => c.body === 'hang', needs: 'a hanging mass turning a disc',
    calc: 'The mass has ½mv²; the disc’s centre stays put, so it has only ½Iω².',
    solve: { v: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the speed, not the direction, so the positive root is kept.' }) },
             w: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the spin rate, not the direction, so the positive root is kept.' }) } },
  },
  RO6: {
    label: 'V6', eq: '{K} = ½({m} + {I} / {R}²){v}²', kind: 'rel', shortcut: true, cue: 'the mass and the disc’s energy from the mass’s speed',
    meaning: 'Shortcut: put ω = v/R into K = ½mv² + ½Iω². The disc acts like an extra mass I/R².',
    condition: 'string doesn’t slip, fixed axle', applies: c => c.body === 'hang', needs: 'a hanging mass turning a disc',
    calc: '½I(v/R)² = ½(I/R²)v², added to ½mv².',
    solve: { v: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the speed, not the direction, so the positive root is kept.' }) }, R: null },
  },
  // ---- rolling down a ramp by forces (+ is down the slope) ----
  EN9: {
    label: 'E9', eq: '{U} = {M}{g}{h}', kind: 'def', cue: 'the body ends higher up than it started',
    meaning: 'Gravitational potential energy at the end, with heights measured from the start (U₀ = 0 there): rolling up a ramp.', condition: 'h measured from where it starts (U₀ = 0 there)',
    applies: c => c.body === 'roll' && c.ground === false, needs: 'a rolling body, with heights measured from the start (untick “Heights measured from where it ends”)', calc: 'Gravity’s work on the way up is −Mgh, stored as U.',
  },
  RO7: {
    label: 'V7', eq: '{K0} = ½({M} + {Icm} / {R}²){v0}²', kind: 'rel', cue: 'a rolling body’s energy at the start, from its starting speed',
    meaning: 'The shortcut V4 at the start: a body rolling at v₀ has ½Mv₀² + ½I_cm(v₀/R)².',
    condition: 'rolls without slipping', applies: c => c.body === 'roll', needs: 'a rolling body',
    calc: '½I_cm(v₀/R)² = ½(I_cm/R²)v₀², added to ½Mv₀².',
    solve: { v0: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the speed, not the direction, so the positive root is kept.' }) }, R: null },
  },
  RO8: {
    label: 'V8', eq: '{v0} = {R}{w0}', kind: 'rel', cue: 'rolls without slipping, and the start is given as a spin rate',
    meaning: 'Rolling without slipping at the start: the centre’s speed is the radius times the angular speed.', condition: 'rolls without slipping',
    applies: c => c.body === 'roll', needs: 'a rolling body', calc: 'The contact point is at rest, so the centre moves at Rω₀.',
  },
  GEO4: {
    label: 'G4', eq: '{h} = {dx} sin {inc}', kind: 'rel', cue: 'a height and a distance along a ramp', meaning: 'The height gained or lost over a distance Δx along a ramp at angle θ.',
    condition: 'a straight ramp', calc: 'Δx is the hypotenuse of a right triangle; h is the side opposite θ.',
    solve: { inc: null },
  },
  RF1: {
    label: 'D7', eq: '{M}{g} sin {inc} − {fs} = {M}{a}', kind: 'law', cue: 'a body rolling down a ramp: forces along the slope',
    meaning: 'Along the slope: the weight’s part down the slope minus static friction up the slope accelerates the centre.',
    condition: '+ down the slope, friction up the slope', applies: c => c.body === 'roll', needs: 'a rolling body',
    calc: 'Newton’s second law for the centre of mass, along the slope. N and W⊥ cancel across it.',
  },
  RF2: {
    label: 'D8', eq: '{fs}{R} = {Icm}{alpha}', kind: 'law', cue: 'what turns a rolling body about its centre',
    meaning: 'About the centre, only friction has a lever arm (R); the weight and the normal force act through the centre or along a radius.',
    condition: 'rolls without slipping, torques about the centre of mass', applies: c => c.body === 'roll', needs: 'a rolling body',
    calc: 'Στ = I_cm α about the centre of mass, which holds even though the centre accelerates.',
  },
  GEO3: {
    label: 'G3', eq: '{D} = 2{R}', kind: 'def', cue: 'the problem gives a diameter', meaning: 'The diameter is twice the radius.',
    condition: 'a circle', calc: 'The diameter runs through the centre, one radius each side.',
  },
  // ---- angular momentum (+ is counterclockwise) ----
  AM1: {
    label: 'A1', eq: '{Li} = {Ii}{wi}', kind: 'def', cue: 'a body turning, before', meaning: 'Angular momentum of a body turning about a fixed axis: L = Iω.',
    condition: 'I about the same axis', calc: 'Add r × p over the body: each bit has r(m r ω), so L = (Σ m r²)ω.',
  },
  AM2: {
    label: 'A2', eq: '{Lf} = {If}{wf}', kind: 'def', cue: 'a body turning, after', meaning: 'The same L = Iω, after: I can change when the mass moves in or out.',
    condition: 'I about the same axis', calc: 'L = Iω at the second moment.',
  },
  AM3: {
    label: 'A3', eq: '{Li} = {rt}{m}{v} sin {phi}', kind: 'def', cue: 'a particle moving past the axis (it may then stick)',
    meaning: 'A particle has angular momentum about an axis too: L = rp sin φ, with p = mv. Only the part of its motion across r counts.',
    condition: 'φ is the angle between r and v', calc: 'L = r × p, whose size is rp sin φ.',
    solve: {
      rt: { guard: v => sin(v.phi) === 0 ? err('sin φ is zero: a particle moving straight at the axis has no angular momentum about it, whatever r is.') : null },
      m: { guard: v => sin(v.phi) === 0 ? err('sin φ is zero: a particle moving straight at the axis has no angular momentum about it.') : null },
      v: { guard: v => sin(v.phi) === 0 ? err('sin φ is zero: a particle moving straight at the axis has no angular momentum about it.') : null },
      phi: { guard: v => Math.abs(v.Li / (v.rt * v.m * v.v)) > 1 ? err('L can’t be bigger than rmv: one of them is mistyped.') : null },
    },
  },
  AM4: {
    label: 'A4', eq: '{Lf} = {Li}', kind: 'law', cue: 'a body changes shape, or things stick, with no twist from outside',
    meaning: 'With no outside torque about the axis, angular momentum is conserved: pulling mass in lowers I, so ω goes up.',
    condition: 'no outside torque about the axis (an outside torque changes L: Στ_ext = dL/dt)', applies: c => !!c.noTorque, needs: 'no outside torque about the axis',
    calc: 'Στ_ext = dL/dt with Στ_ext = 0: L doesn’t change. Inside forces come in third-law pairs whose torques cancel.',
  },
  AM5: {
    label: 'A5', eq: '{tnet} = ({Lf} − {Li}) / {t}', kind: 'law', cue: 'an outside torque acts for a time',
    meaning: 'Newton’s second law for turning, in terms of L: a steady outside torque changes L by Στ_ext Δt.',
    condition: 'steady outside torque over the time t', calc: 'Στ_ext = dL/dt, integrated over t with the torque constant.',
  },
  // ---- work, energy and momentum for a sliding, swinging or colliding body ----
  WK1: {
    label: 'W1', eq: '{WF} = {Fp}{dx} cos {phi}', kind: 'def', cue: 'a steady force acts while the body moves a distance',
    meaning: 'Work by a constant force: only the part of the force along the motion counts.', condition: 'constant force, straight path; φ is the angle between the force and the motion',
    applies: c => !c.varA, needs: 'a steady force (this one changes with time)',
    calc: 'W = F·d, the dot product: F d cos φ. A force at right angles to the motion (φ = 90°) does no work.',
    solve: { phi: { guard: v => Math.abs(v.WF) > Math.abs(v.Fp * v.dx) ? err('The work can’t be bigger than F times the distance: one of them is mistyped.') : null } },
  },
  WK2: {
    label: 'W2', eq: '{Pavg} = {WF} / {t}', kind: 'def', cue: 'work done in a stated time',
    meaning: 'Average power: how fast the force does work.', condition: 'the work W_F done over the time t', calc: 'Power is the rate of doing work; over a whole interval the average is W / t.',
  },
  WK3: {
    label: 'W6', eq: '{Fp} = {m}{a}', kind: 'law', cue: 'one force along the motion, changing with time',
    meaning: 'Newton’s second law at every moment: the force sets the acceleration, so a force that changes with time gives an acceleration that changes with time.',
    condition: 'F is the only force along the motion (the net force)', applies: c => !!c.varA, needs: 'a force that varies with time',
    calc: 'With F(t) known, a(t) = F(t)/m. The area under a(t) is the change in velocity: v(t) = v₀ + ∫a dt.',
  },
  EW1: {
    label: 'M1', eq: '{K0} + {U0} + {Us0} + {Wnc} = {K} + {U} + {Us}', kind: 'law', cue: 'speeds, heights or a spring at two moments, with no time asked',
    meaning: 'Energy is conserved: kinetic, gravitational and spring energy at the start, plus the work friction or a push does, is what there is at the end.',
    condition: 'gravity and the spring are the only other forces that do work', calc: 'The work–energy theorem with gravity’s and the spring’s work written as −ΔU.',
  },
  EW2: {
    label: 'M2', eq: '{K0} = ½{m}{v0}²', kind: 'def', cue: 'it is already moving at the start', meaning: 'Kinetic energy at the start.', condition: 'v₀ is the speed at the start',
    calc: 'The work needed to bring a mass m from rest to speed v₀.',
    solve: { v0: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the speed, not the direction, so the positive root is kept.' }) } },
  },
  EW3: {
    label: 'M3', eq: '{K} = ½{m}{v}²', kind: 'def', cue: 'it is moving at the end', meaning: 'Kinetic energy at the end.', condition: 'v is the speed at the end',
    calc: 'The work needed to bring a mass m from rest to speed v.',
    solve: { v: { pick: () => ({ branch: 1, note: 'Kinetic energy gives the speed, not the direction, so the positive root is kept.' }) } },
  },
  EW4: {
    label: 'M4', eq: '{U0} = {m}{g}{h}', kind: 'def', cue: 'it starts higher than it ends',
    meaning: 'Gravitational potential energy at the start, with heights measured from where it ends.', condition: 'h measured from where it ends (U = 0 there)',
    applies: c => !c.ground0, needs: 'heights measured from where it ends (not from where it starts)', calc: 'Gravity’s work on the way down is mgh, stored as U₀.',
  },
  EW5: {
    label: 'M5', eq: '{U} = {m}{g}{h}', kind: 'def', cue: 'it ends higher than it started',
    meaning: 'Gravitational potential energy at the end, with heights measured from where it starts.', condition: 'h measured from where it starts (U₀ = 0 there)',
    applies: c => !c.ground, needs: 'heights measured from where it starts (not from where it ends)', calc: 'Gravity’s work on the way up is −mgh, stored as U.',
  },
  EW6: {
    label: 'M6', eq: '{Us0} = ½{ks}{xs}²', kind: 'def', cue: 'a spring is compressed or stretched at the start',
    meaning: 'Energy stored in a spring squeezed or stretched by x_s from its relaxed length.', condition: 'an ideal spring (Hooke’s law), x_s measured from its relaxed length',
    applies: c => !c.relax0, needs: 'a spring that stores energy at the start', calc: 'The spring force kx grows with x, so the work to compress it is ∫kx dx = ½kx².',
    solve: { xs: { pick: () => ({ branch: 1, note: 'The energy is the same compressed or stretched, so the positive root (the size) is kept.' }) } },
  },
  EW7: {
    label: 'M7', eq: '{Us} = ½{ks}{xs}²', kind: 'def', cue: 'a spring is compressed or stretched at the end',
    meaning: 'Energy stored in a spring squeezed or stretched by x_s from its relaxed length, at the end.', condition: 'an ideal spring (Hooke’s law), x_s measured from its relaxed length',
    applies: c => !c.relax1, needs: 'a spring that stores energy at the end', calc: 'The spring force kx grows with x, so the work to compress it is ∫kx dx = ½kx².',
    solve: { xs: { pick: () => ({ branch: 1, note: 'The energy is the same compressed or stretched, so the positive root (the size) is kept.' }) } },
  },
  EW8: {
    label: 'M8', eq: '{Wnc} = −{f}{dx}', kind: 'def', cue: 'it slides a distance on a rough surface',
    meaning: 'Kinetic friction always points against the motion, so over a distance Δx it takes out f Δx of energy.', condition: 'steady kinetic friction along the whole distance',
    applies: c => !!c.rough, needs: 'a rough path (kinetic friction)', calc: 'W = F d cos φ with φ = 180°: friction is opposite to the motion, so its work is −f Δx.',
  },
  MO1: {
    label: 'P1', eq: '{m1}{v1i} + {m2}{v2i} = {m1}{v1f} + {m2}{v2f}', kind: 'law', cue: 'two bodies collide or push apart, with no outside push along the line',
    meaning: 'Momentum is conserved: the total mv just before equals the total just after. Velocities carry their direction as a sign.',
    condition: 'no net outside force along the line during the collision', applies: c => c.collide !== 'glance', needs: 'a collision along one line', calc: 'The bodies push on each other with equal and opposite forces for the same time, so what one gains in mv the other loses.',
  },
  MO2: {
    label: 'P2', eq: '{v1f} = {v2f}', kind: 'rel', cue: 'they stick together', meaning: 'After a perfectly inelastic collision the two bodies move as one.',
    condition: 'they stick together', applies: c => c.collide === 'stick', needs: 'a collision where they stick together', calc: 'Stuck together, they share one velocity.',
  },
  MO3: {
    label: 'P3', eq: '{v1i} − {v2i} = {v2f} − {v1f}', kind: 'rel', cue: 'an elastic collision: no kinetic energy is lost',
    meaning: 'In an elastic collision along a line, the bodies separate as fast as they approached.', condition: 'elastic collision along a line',
    applies: c => c.collide === 'elastic', needs: 'an elastic collision', calc: 'Combine conservation of momentum with conservation of kinetic energy and divide one by the other.',
  },
  MO5: {
    label: 'P5', eq: '{m1}{v1i} = {m1}{v1f} cos {th1} + {m2}{v2f} cos {th2}', kind: 'law', cue: 'a glancing collision: momentum along the line body 1 came in on',
    meaning: 'Momentum is a vector, so it is conserved along each axis. Along the incoming line, body 1’s momentum is shared between the two forward parts.',
    condition: 'body 2 at rest before; angles measured from the incoming line', applies: c => c.collide === 'glance' && !c.equal, needs: 'a glancing collision (two dimensions) between different masses',
    calc: 'Take x along body 1’s incoming velocity: each body’s x part after is its speed times the cosine of its angle.', solve: { th1: null, th2: null },
  },
  MO6: {
    label: 'P6', eq: '{m1}{v1f} sin {th1} = {m2}{v2f} sin {th2}', kind: 'law', cue: 'a glancing collision: momentum across the incoming line',
    meaning: 'There was no sideways momentum before, so the two sideways parts after must cancel: the bodies go off on opposite sides.',
    condition: 'body 2 at rest before; the bodies leave on opposite sides of the incoming line', applies: c => c.collide === 'glance' && !c.equal, needs: 'a glancing collision (two dimensions) between different masses',
    calc: 'Take y across the incoming line: the total y momentum is zero before, so m₁v₁f sin θ₁ − m₂v₂f sin θ₂ = 0.', solve: { th1: null, th2: null },
  },
  MO7: {
    label: 'P7', eq: '{v1i} = {v1f} cos {th1} + {v2f} cos {th2}', kind: 'law', cue: 'a glancing collision between equal masses: along the incoming line',
    meaning: 'Momentum along the incoming line, with the equal masses divided out: the incoming speed is shared between the two forward parts.',
    condition: 'equal masses; body 2 at rest before; angles measured from the incoming line', applies: c => c.collide === 'glance' && !!c.equal, needs: 'a glancing collision between equal masses',
    calc: 'm v₁ᵢ = m v₁f cos θ₁ + m v₂f cos θ₂, and the same m divides out of every term.', solve: { th1: null, th2: null },
  },
  MO8: {
    label: 'P8', eq: '{v1f} sin {th1} = {v2f} sin {th2}', kind: 'law', cue: 'a glancing collision between equal masses: across the incoming line',
    meaning: 'No sideways momentum before, so the two sideways parts after cancel; with equal masses the mass divides out.',
    condition: 'equal masses; body 2 at rest before; the bodies leave on opposite sides of the incoming line', applies: c => c.collide === 'glance' && !!c.equal, needs: 'a glancing collision between equal masses',
    calc: 'm v₁f sin θ₁ − m v₂f sin θ₂ = 0, and the same m divides out.', solve: { th1: null, th2: null },
  },
  GA1: {
    label: 'W3', eq: '{Wga} = ½({Fai} + {Faf}){dxa}', kind: 'def', cue: 'a force–position graph: one straight stretch of it',
    meaning: 'Work is the area under the force–position graph. Under one straight stretch that area is a trapezoid (a triangle if the force starts at zero, a rectangle if it stays level).',
    condition: 'the force changes steadily (or not at all) over the stretch', applies: c => !!c.graph, needs: 'a force given as a force–position graph', calc: 'W = ∫F dx, the area under the graph: the average of the two end forces times the length.',
  },
  GA2: {
    label: 'W4', eq: '{Wgb} = ½({Fbi} + {Fbf}){dxb}', kind: 'def', cue: 'a force–position graph: the next straight stretch',
    meaning: 'The area under the second straight stretch of the graph.', condition: 'the force changes steadily (or not at all) over the stretch',
    applies: c => !!c.graph, needs: 'a force given as a force–position graph', calc: 'W = ∫F dx, the area under the graph: the average of the two end forces times the length.',
  },
  GA3: {
    label: 'W5', eq: '{Wnet} = {Wga} + {Wgb}', kind: 'def', cue: 'the whole area under the graph, stretch by stretch',
    meaning: 'The work over the whole distance is the sum of the areas of its stretches.', condition: 'the graphed force is the only one that does work; two stretches',
    applies: c => !!c.graph, needs: 'a force given as a force–position graph', calc: 'An integral over the whole distance is the sum of the integrals over its parts.',
  },
  MO4: {
    label: 'P4', eq: '½{m2}{v2f}² = {m2}{g}{h}', kind: 'law', cue: 'after the collision, body 2 swings or rises to a height h',
    meaning: 'Energy is conserved on the swing after the collision: the kinetic energy body 2 leaves with becomes mgh at the top.',
    condition: 'after the collision only gravity does work on body 2; it stops for a moment at height h', calc: 'K + U just after the collision equals K + U at the top: ½mv² + 0 = 0 + mgh.',
    solve: { m2: null, v2f: { pick: () => ({ branch: 1, note: 'The height gives the speed, not the direction, so the positive root is kept.' }) } },
  },
};
// rename labels of the kinematics families: K1..K5, R1..R5
for (const n of [1, 2, 3, 4, 5]){ EQS['X' + n].label = 'K' + n; EQS['E' + n].label = 'R' + n; }

// ---------- chapters ----------
// the drawing templates offered in the Build tab: [template, icon]
const SCENES = [['incline', 'incline'], ['pulley', 'tpulley'], ['blocks', 'blocks'], ['wheel', 'twheel']];
const FWD = ['forward', 'backward']; // + and − along the line of motion
const CHAPTERS = {
  incline: {
    // unit hooks (app.js reads them through hook(); missing ones take the default there)
    startCond: { friction: false, up: false, earth: true }, slopeAxis: true, posLabel: 'x(t) along ramp  m', presets: SCENES,
    sim: (d, c) => { d.g = 9.81; if (c.up) d.v0 = -5; if (!c.friction) delete d.mu; },
    stuck: 'Hidden givens? “Starts from rest” means v₀ = 0, “stops” means v = 0. Is “On Earth” ticked so g is known?',
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
    startCond: { friction: false, earth: true }, posLabel: 'x(t) distance moved  m', flatPlus: 'toward the pulley', presets: SCENES,
    sim: (d, c) => { d.g = 9.81; if (!c.friction) delete d.mu; },
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
    startCond: { friction: true, earth: true }, presets: SCENES,
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
    startCond: { rim: false, varA: false }, angular: true, points: true, presets: SCENES,
    stuck: '“Starts from rest” means ω₀ = 0 and “stops” means ω = 0. For a point on the rim, tick “Track a point”.',
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
    startCond: { dyn: false, shape: 'rod', axis: 'centre', earth: true }, extended: true, drawFirst: true,
    presets: [['beam', 'tbeam'], ['disc', 'tdisc']],
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
  // phase C3: energy with rotation, rolling and angular momentum (docs/core-plan.md section 9). No motion picture yet.
  rolling: {
    startCond: { body: 'roll', shape: 'sphere', axis: 'centre', ground: true, smooth: true, earth: true },
    title: 'Energy, rolling & L', short: 'Rolling', forcesOptional: true,
    vars: ['M', 'm', 'R', 'D', 'g', 'h', 'inc', 'a', 'alpha', 'v', 'w', 'fs', 'Tn', 'K0', 'K', 'U0', 'U', 'Wnc', 'Wnet', 'Ktr', 'Krot',
      'I', 'Icm', 'L', 'dpa', 'tnet', 't', 'Li', 'Lf', 'Ii', 'If', 'wi', 'wf', 'rt', 'phi', 'v0', 'w0', 'dx'],
    names: { M: 'mass of the rolling or spinning body', m: 'hanging mass (or a particle)', R: 'radius (where it rolls, or where the string unwinds)',
      a: 'acceleration of the centre (or of the hanging mass)', v: 'speed of the centre (or of the hanging mass, or a particle)', w: 'angular velocity at the end',
      Tn: 'tension in the string', tnet: 'net outside torque about the axis', t: 'time the outside torque acts',
      rt: 'distance from the axis (to the particle or point mass)', phi: 'angle between r and the particle’s velocity',
      v0: 'speed of the centre at the start', w0: 'angular speed at the start', dx: 'distance along the ramp', h: 'height the centre drops (or climbs)' },
    dirs: { a: ['down the slope (or down)', 'up the slope (or up)'] },
    axis: '+ is <b>down the slope</b> (or down) for a, and <b>counterclockwise</b> for L and ω₁, ω₂. Energies carry their own sign: W<sub>nc</sub> is − when friction takes energy out.',
    stuck: 'Is the body set right in Conditions (rolling, a hanging mass on a disc, or spinning in place)? “Starts from rest” means K₀ = 0. For I, pick the shape and the axis. For L₁ = L₂, is there really no outside torque?',
    intro: `<p>A body that turns has kinetic energy of turning, <b>½Iω²</b>. A rolling body has both: its centre moves (½Mv²) and it turns about the centre (½I<sub>cm</sub>ω²). Rolling without slipping ties them together: <b>v = Rω</b>, so a body that turns more is slower down a ramp.</p>
      <p>Energy works when the question gives heights and speeds and no time: K₀ + U₀ + W<sub>nc</sub> = K + U. Static friction on a body rolling without slipping does no work. <b>Angular momentum</b> L = Iω stays the same when <b>no outside torque</b> acts: pull mass in, I drops, ω goes up.</p>`,
    sections: [
      { title: 'Energy with rotation', note: 'Conservation of energy, the work–energy theorem, and the two kinds of kinetic energy.', eqs: ['EN1', 'EN2', 'EN3', 'EN4', 'EN9', 'EN5', 'EN6', 'EN7', 'EN8'] },
      { title: 'Rolling without slipping', note: 'v = Rω and a = Rα, and the kinetic energy of a rolling body or of a disc turned by a hanging mass. The shortcuts put ω = v/R in for you.', eqs: ['RO1', 'RO2', 'RO3', 'RO4', 'RO5', 'RO6', 'RO7', 'RO8', 'GEO4'] },
      { title: 'Forces and torques', note: 'Rolling down a ramp by forces: ΣF along the slope and Στ about the centre. Στ = Iα for any body.', eqs: ['RF1', 'RF2', 'D2'] },
      { title: 'A disc turned by a hanging mass', note: 'Στ = Iα for the disc, ΣF for the mass, and the two as one system.', eqs: ['D4', 'D5', 'D6'], applies: c => c.body === 'hang', needs: 'a hanging mass turning a disc (the body: turned by a hanging mass)' },
      { title: 'Moments of inertia', note: 'Standard shapes about their centre, a rod about its end, a point mass, the parallel-axis theorem, and a diameter.', eqs: ['J5', 'J6', 'J3', 'J4', 'J1', 'J2', 'J7', 'J8', 'J9', 'GEO3'] },
      { title: 'Angular momentum', note: 'L = Iω for a body, L = rmv sin φ for a particle; conserved when no outside torque acts, changed by one that does.', eqs: ['AM1', 'AM2', 'AM3', 'AM4', 'AM5'] },
    ],
    conditions: [
      { key: 'body', type: 'choice', label: 'The body', options: [['roll', 'Rolls without slipping'], ['hang', 'Fixed axis, turned by a hanging mass'], ['spin', 'Fixed axis, spinning on its own']] },
      { key: 'shape', type: 'choice', label: 'Shape (for its moment of inertia)', options: [['sphere', 'Solid sphere'], ['shell', 'Hollow sphere'], ['disc', 'Solid disc or cylinder'], ['ring', 'Thin ring or hoop'], ['rod', 'Thin rod'], ['point', 'Point mass']] },
      { key: 'axis', type: 'choice', label: 'It turns about', options: [['centre', 'Its centre of mass'], ['other', 'Another point (an end, a hinge)']] },
      { key: 'noTorque', type: 'toggle', label: 'No outside torque about the axis (L is conserved)' },
      { key: 'rest', type: 'hidden', label: 'Starts from rest', sets: { K0: 0 } },
      { key: 'ground', type: 'hidden', label: 'Heights measured from where it ends', sets: { U: 0 }, default: true },
      { key: 'smooth', type: 'hidden', label: 'No energy lost: smooth axle, rolls without slipping (untick if a rough axle does work W_nc)', sets: { Wnc: 0 }, default: true },
      { key: 'earth', type: 'hidden', label: 'On Earth (g = 9.81 m/s²)', sets: { g: 9.81 }, default: true },
    ],
    defaults: {},
  },
  // work, energy and momentum for a body that slides, swings or collides. No motion picture yet.
  energy: {
    startCond: { collide: 'free', varA: false },
    title: 'Work, energy & p', short: 'Energy', forcesOptional: true,
    vars: ['m', 'g', 'h', 'inc', 'dx', 't', 'v0', 'v', 'Fp', 'phi', 'WF', 'Pavg', 'Wnet', 'K0', 'K', 'U0', 'U', 'Us0', 'Us', 'Wnc', 'ks', 'xs',
      'mu', 'W', 'Wperp', 'N', 'f', 'm1', 'm2', 'v1i', 'v2i', 'v1f', 'v2f', 'th1', 'th2', 'Fai', 'Faf', 'dxa', 'Fbi', 'Fbf', 'dxb', 'Wga', 'Wgb'],
    names: { m: 'mass of the body', dx: 'distance it moves along its path', v0: 'speed at the start', v: 'speed at the end', Fp: 'the force F (size)',
      phi: 'angle between the force and the direction of motion', h: 'height difference between the start and the end (or the height body 2 rises)',
      U0: 'gravitational potential energy at the start', U: 'gravitational potential energy at the end', Wnc: 'work by friction or another non-conservative force',
      Wnet: 'net work by all the forces', W: 'weight (mg): a force, not work', Wperp: 'weight component into the surface', N: 'normal force',
      inc: 'angle of the slope (from horizontal)', m1: 'mass of body 1', m2: 'mass of body 2', t: 'time the work takes', a: 'acceleration along the motion' },
    condVars: { varA: ['a'] }, // only asked about when the force varies with time
    // a force that varies with time: Δx(t) → v(t) → a(t), with F(t) = m a(t) feeding the bottom rung
    ladder: { rungs: ['dx', 'v', 'a'], start: { dx: null, v: 'v0' }, zeroNote: { dx: 'Δx is measured from where it starts, so Δx(0) = 0.' } },
    dirs: { dx: c => c.varA ? FWD : false, v0: c => c.varA ? FWD : false, v: c => c.varA ? FWD : null, a: FWD, Fp: c => c.varA ? FWD : null, h: false, v1f: c => c.collide === 'glance' ? false : null, v2f: c => c.collide === 'glance' ? false : null }, // speeds in two dimensions
    axis: 'Collision velocities: + is <b>to the right</b>. Work and energies carry their own sign: W<sub>nc</sub> is − when friction takes energy out. Distances, heights and speeds are sizes.',
    stuck: 'Every term of the energy law needs a value or an equation: which are zero (from rest, ends at rest, no spring, where heights are measured from)? For a collision, which way is each body moving?',
    intro: `<p><b>Work</b> is a force acting over a distance: W = F Δx cos φ. Only the part of the force along the motion counts. <b>Power</b> is how fast work is done.</p>
      <p><b>Energy</b> links two moments with no time: K₀ + U₀ + U<sub>s0</sub> + W<sub>nc</sub> = K + U + U<sub>s</sub>. Decide what each term is at the start and the end; friction’s work is −f Δx. <b>Momentum</b> links just before and just after a collision: m₁v₁ + m₂v₂ stays the same. Many problems need both: momentum for the hit, energy for the motion after it.</p>`,
    sections: [
      { title: 'Work and power', note: 'Work by one steady force, the work–energy theorem, and average power. A force that varies with time goes through F = ma and the motion ladder instead.', eqs: ['WK1', 'WK2', 'EN2', 'WK3', 'GA1', 'GA2', 'GA3'] },
      { title: 'Energy at two moments', note: 'Conservation of energy with gravity and a spring. Each term is a definition; the conditions say which are zero.', eqs: ['EW1', 'EW2', 'EW3', 'EW4', 'EW5', 'EW6', 'EW7'] },
      { title: 'Friction along the path', note: 'Friction’s work, and the friction force from the normal force on a slope (θ = 0 on level ground).', eqs: ['EW8', 'I4', 'I3', 'I2', 'N2', 'GEO4'] },
      { title: 'Momentum and collisions', note: 'Momentum is conserved through the collision; energy takes over afterwards.', eqs: ['MO1', 'MO2', 'MO3', 'MO4', 'MO5', 'MO6', 'MO7', 'MO8'] },
    ],
    conditions: [
      { key: 'collide', type: 'choice', label: 'If two bodies collide', options: [['free', 'They bounce apart'], ['stick', 'They stick together'], ['elastic', 'Elastic: no kinetic energy lost'], ['glance', 'Glancing: they leave at angles']] },
      { key: 'equal', type: 'toggle', label: 'The two bodies have equal mass' },
      { key: 'graph', type: 'toggle', label: 'The force is given as a force–position graph' },
      { key: 'varA', type: 'choice', label: 'The force', options: [[false, 'Steady'], [true, 'Varies with time']], ask: ['The force:', [[false, 'steady'], [true, 'varies with time (a function of t)']]] },
      { key: 'rough', type: 'toggle', label: 'Kinetic friction acts along the path' },
      { key: 'along', type: 'hidden', label: 'The force points along the motion (φ = 0)', sets: { phi: 0 } },
      { key: 'rest', type: 'hidden', label: 'Starts from rest', sets: { K0: 0 } },
      { key: 'stops', type: 'hidden', label: 'Ends at rest (even for a moment)', sets: { K: 0 } },
      { key: 'ground', type: 'hidden', label: 'Heights measured from where it ends (U = 0 there)', sets: { U: 0 } },
      { key: 'ground0', type: 'hidden', label: 'Heights measured from where it starts (U₀ = 0 there)', sets: { U0: 0 } },
      { key: 'relax0', type: 'hidden', label: 'No spring energy at the start (relaxed, or no spring)', sets: { Us0: 0 } },
      { key: 'relax1', type: 'hidden', label: 'No spring energy at the end (relaxed, or no spring)', sets: { Us: 0 } },
      { key: 'smooth', type: 'hidden', label: 'No friction and no outside push does work (W_nc = 0)', sets: { Wnc: 0 } },
      { key: 'rest2', type: 'hidden', label: 'Body 2 is at rest before the collision', sets: { v2i: 0 } },
      { key: 'earth', type: 'hidden', label: 'On Earth (g = 9.81 m/s²)', sets: { g: 9.81 } },
    ],
    defaults: {},
  },
};

// ---------- practice bank: text only for the student; the key is for “Check my setup” ----------
// givens: id → [size, unit, directionIndex (0 = first direction word = +)]
const PRACTICE = [
  { original: true, ch: 'incline', title: 'Frictionless slide', text: 'A block starts from rest at the top of a frictionless ramp inclined at 25°. How fast is it moving after it has slid 3.0 m down the ramp?',
    key: { givens: { v0: [0, 'm/s', 0], inc: [25, '°'], dx: [3, 'm', 0], g: [9.81, 'm/s²'] }, cond: { friction: false, up: false }, targets: ['vf'] } },
  { original: true, ch: 'incline', title: 'Crate with friction', text: 'A 4.0 kg crate slides down a 30° ramp. The coefficient of kinetic friction between the crate and the ramp is 0.20. What is the crate’s acceleration?',
    key: { givens: { m: [4, 'kg'], inc: [30, '°'], mu: [0.2, 'no unit'], g: [9.81, 'm/s²'] }, cond: { friction: true, up: false }, targets: ['a'] } },
  { original: true, ch: 'incline', title: 'Shoved up the ramp', text: 'A hockey puck is shoved up a frictionless ramp inclined at 15°, starting at 6.0 m/s. How far up the ramp does it slide before it stops?',
    key: { givens: { v0: [6, 'm/s', 1], vf: [0, 'm/s', 0], inc: [15, '°'], g: [9.81, 'm/s²'] }, cond: { friction: false, up: true }, targets: ['dx'] } },
  { original: true, ch: 'incline', title: 'How hard does the ramp push?', text: 'A 10 kg box rests on a 20° ramp. What is the normal force from the ramp on the box?',
    key: { givens: { m: [10, 'kg'], inc: [20, '°'], g: [9.81, 'm/s²'] }, cond: {}, targets: ['N'] } },
  { original: true, ch: 'incline', title: 'Two-part problem', text: 'A sled starts from rest and slides 12 m down a 35° hill with μk = 0.10. (a) What is its acceleration? (b) How long does the slide take?',
    key: { givens: { v0: [0, 'm/s', 0], dx: [12, 'm', 0], inc: [35, '°'], mu: [0.1, 'no unit'], g: [9.81, 'm/s²'] }, cond: { friction: true, up: false }, targets: ['a', 't'] } },
  { original: true, ch: 'pulley', title: 'Frictionless table', text: 'A 4.0 kg block on a frictionless table is tied by a string over a pulley at the table’s edge to a 2.0 kg mass hanging in the air. Released, (a) what is the acceleration of the blocks and (b) what is the tension in the string?',
    key: { givens: { m1: [4, 'kg'], m2: [2, 'kg'], g: [9.81, 'm/s²'] }, cond: { friction: false }, targets: ['a', 'Tn'] } },
  { original: true, ch: 'pulley', title: 'With friction', text: 'A 5.0 kg block on a table is connected over a pulley to a 3.0 kg hanging mass. The coefficient of kinetic friction between the block and the table is 0.25. What is the acceleration of the system?',
    key: { givens: { m1: [5, 'kg'], m2: [3, 'kg'], mu: [0.25, 'no unit'], g: [9.81, 'm/s²'] }, cond: { friction: true }, targets: ['a'] } },
  { original: true, ch: 'pulley', title: 'Constant speed', text: 'A 6.0 kg box is pulled across a table by a string running over a pulley to a 1.5 kg hanging mass. Once nudged, the box slides at constant speed. What is the coefficient of kinetic friction?',
    key: { givens: { m1: [6, 'kg'], m2: [1.5, 'kg'], a: [0, 'm/s²', 0], g: [9.81, 'm/s²'] }, cond: { friction: true }, targets: ['mu'] } },
  { original: true, ch: 'pulley', title: 'How far does it fall?', text: 'A 3.0 kg block rests on a frictionless table, tied over a pulley to a 1.0 kg hanging mass. The system is released from rest. How far does the hanging mass fall in 1.2 s?',
    key: { givens: { m1: [3, 'kg'], m2: [1, 'kg'], v0: [0, 'm/s', 0], t: [1.2, 's'], g: [9.81, 'm/s²'] }, cond: { friction: false }, targets: ['dx'] } },
  { original: true, ch: 'pulley', title: 'Measuring friction', text: 'In a lab, a 2.0 kg block on a table is pulled by a 1.0 kg hanging mass over a pulley. The blocks accelerate at 1.5 m/s². Find (a) the coefficient of kinetic friction and (b) the tension in the string.',
    key: { givens: { m1: [2, 'kg'], m2: [1, 'kg'], a: [1.5, 'm/s²', 0], g: [9.81, 'm/s²'] }, cond: { friction: true }, targets: ['mu', 'Tn'] } },
  { original: true, ch: 'rotation', title: 'Fan winding down', text: 'A fan spinning at 1200 rpm is switched off and comes to a stop after turning 50 revolutions. How long does it take to stop?',
    key: { givens: { w0: [1200, 'rpm', 0], w: [0, 'rad/s', 0], theta: [50, 'rev', 0] }, cond: {}, targets: ['t'] } },
  { original: true, ch: 'rotation', title: 'Wheel spinning up', text: 'A wheel spinning counterclockwise at 2 rad/s speeds up at 3 rad/s² until it reaches 8 rad/s. Through what angle does it turn?',
    key: { givens: { w0: [2, 'rad/s', 0], alpha: [3, 'rad/s²', 0], w: [8, 'rad/s', 0] }, cond: {}, targets: ['theta'] } },
  { original: true, ch: 'rotation', title: 'Point on a disk', text: 'A disk of radius 0.50 m starts from rest and spins up with an angular acceleration of 4.0 rad/s². How fast is a point on its rim moving after 3.0 s?',
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
const COMPONENTS = {
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


// A typical size for each quantity. A symbol given without a number uses it to pick roots and signs
// (and to draw the diagram); the answer itself stays symbolic.
const SAMPLE = {
  dx: 4, v0: 3, vf: 5, a: 2, t: 2, m: 3, g: 9.81, inc: 30, W: 29.4, Wpar: 14.7, Wperp: 25.5, N: 25.5, f: 5, mu: 0.15, F: 10,
  Fp: 10, mus: 0.5, mA: 2, mB: 1, P: 4, NA: 19.6, NB: 9.8, fA: 2, fB: 1, m1: 4, m2: 2, W1: 39.2, W2: 19.6, N1: 39.2, Tn: 12,
  theta: 8, w0: 2, w: 6, alpha: 1.5, r: 0.5, s: 4, v: 3, at: 0.75, ac: 18, atot: 18.02,
  dth: 8, dtrav: 8, nrev: 1.27, wavg: 4, aavg: 1.5,
  L: 2, M: 1.5, R: 0.2, Hx: 5, Hy: 5, dP: 0.3, dm: 0.3, dT: 0.4, dF: 0.5, phi: 30, beta: 20, xh: 0.4, hc: 0.12, tau: 5, rt: 0.5, tnet: 5, I: 0.4, Icm: 0.1, dpa: 0.35,
  th1: 30, th2: 45, Fai: 5, Faf: 20, Fbi: 20, Fbf: 20, dxa: 2, dxb: 3, Wga: 25, Wgb: 60,
  WF: 30, Pavg: 15, ks: 200, xs: 0.1, Us0: 1, Us: 1, v1i: 3, v2i: 1, v1f: 1, v2f: 2,
  K: 20, K0: 5, U: 2, U0: 20, Wnc: 3, Wnet: 15, Ktr: 14, Krot: 6, h: 1, fs: 3, D: 0.4, Li: 2, Lf: 2, Ii: 0.4, If: 0.2, wi: 5, wf: 10,
};
for (const [id, x] of Object.entries(SAMPLE)) VARS[id].sample = x;
// Order symbols are written in a product: coefficient-like first (μk m g), then the rest.
const PRINT_ORDER = ['mu', 'mus', 'r', 'rt', 'R', 'm', 'M', 'm1', 'm2', 'mA', 'mB', 'g', 'h', 'W', 'W1', 'W2', 'Wpar', 'Wperp', 'N', 'N1', 'NA', 'NB', 'f', 'fA', 'fB', 'F', 'Fp', 'P', 'Tn', 'inc',
  'Hx', 'Hy', 'fs', 'tau', 'tnet', 'Fai', 'Faf', 'Fbi', 'Fbf', 'Wnet', 'Wnc', 'WF', 'Wga', 'Wgb', 'Pavg', 'ks', 'K0', 'K', 'Ktr', 'Krot', 'U0', 'U', 'Us0', 'Us', 'Li', 'Lf', 'I', 'Icm', 'Ii', 'If', 'dpa', 'D', 'L', 'dP', 'dm', 'dT', 'dF', 'xh', 'hc', 'phi', 'beta',
  'dx', 'dxa', 'dxb', 'xs', 'th1', 'th2', 'theta', 's', 'v0', 'w0', 'vf', 'w', 'wi', 'wf', 'v', 'v1i', 'v2i', 'v1f', 'v2f', 'a', 'alpha', 'at', 'ac', 'atot', 'dth', 'dtrav', 'nrev', 'wavg', 'aavg', 't'];

// ---------- course: lessons as data (phase C5, docs/core-plan.md section 8) ----------
// Each lesson: long (full help, two routes that agree) → twin (same pathway, new scenario, no Show me or glow) →
// transfer (looks different, same principle, no help). A stop's problem has the practice format plus `answers`
// (the source's answers as written, compared within their significant figures). Prompts name the decision, never the answer.
// js/packs/local.js (not in the repository: it stays on the student's device) can replace any stop's problem.
const HANG = { body: 'hang', shape: 'disc', axis: 'centre', rest: true, ground: true, smooth: true, earth: true };
const ROLL = { body: 'roll', shape: 'sphere', axis: 'centre', rest: true, ground: true, smooth: true, earth: true };
const FULL = { glow: true, showMe: true, hints: true }, TWIN = { glow: false, showMe: false, hints: true }, NONE = { glow: false, showMe: false, hints: false };
const LESSONS = [
  {
    id: 'disc', chapter: 'rolling', title: 'A disc turned by a hanging mass', objectives: ['Στ = Iα with a = Rα', 'energy with rotation', 'two routes agree'],
    recap: 'The disc and the mass are tied by the string: a = Rα and v = Rω. By forces you need three equations (ΣF on the mass, Στ on the disc, a = Rα) solved together; by energy, one: the mass’s drop pays for ½mv² and ½Iω². Both routes give the same motion (check: v² = 2ah).',
    stops: [
      { kind: 'long', mode: 'guided', help: FULL,
        prompts: [
          { when: 'start', text: 'Draw it first: a disc on an axle, a string off its rim, a block hanging. Then add each given. Which body is it in Conditions?' },
          { when: 'conditions', text: 'The disc turns on a fixed axle and the block hangs from it: that decides which equations apply. Does anything take energy out?' },
          { when: 'solve', text: 'Part (a) asks for an acceleration and no height: forces and torques. Part (b) gives a height and asks a speed: energy.' },
        ],
        route: { laws: ['forces', 'energy'], why: 'The acceleration comes from forces and torques (ΣF on the block, Στ = Iα on the disc); the speed after a drop comes from energy, with no time needed.',
          cues: ['The string doesn’t slip, so a = Rα and v = Rω', 'The disc is a uniform solid disc: I = ½MR²', 'Released from rest: K₀ = 0'],
          decoys: ['The disc rolls along the floor', 'There is no outside torque, so L is conserved'] },
        // the guide (js/guide.js): what to draw and why, and the questions to answer before any equation
        guide: {
          walk: [
            { say: 'Draw the disc on its axle.', needs: { shape: 'wheel' }, why: 'The disc is the body that turns, so Στ = Iα is written for it.' },
            { say: 'Draw the block hanging below it.', needs: { shape: 'block' }, why: 'The block is the body that falls, so ΣF = ma is written for it.' },
            { say: 'Join them with a string from the rim to the block.', needs: { string: ['wheel', 'block'] }, why: 'The string carries the pull between them, and it is why a = Rα.' },
            { say: 'Draw the tension on the disc, at its rim.', needs: { force: { on: 'wheel', kind: 'tension' } }, why: 'It acts at the rim, a distance R from the axle, so it is the one force that turns the disc.' },
            { say: 'Draw the tension on the block, pulling up.', needs: { force: { on: 'block', kind: 'tension' } }, why: 'The string pulls the block up, against its weight.' },
            { say: 'Draw the block’s weight, pulling down.', needs: { force: { on: 'block', kind: 'gravity' } }, why: 'Gravity pulls down; the weight minus the tension is the net force that accelerates it.' },
          ],
          ask: [
            { q: 'What is the block’s net force?', why: 'That is ΣF = ma for the block: weight down minus tension up, so it falls slower than free fall.',
              options: [{ t: 'its weight minus the string’s pull', right: true }, { t: 'its weight alone', why: 'With only its weight it would fall freely at g; the string holds it back.' }, { t: 'the string’s pull alone', why: 'The string pulls up, but gravity pulls down too.' }] },
            { q: 'What turns the disc?', why: 'Only the tension acts at the rim, with lever arm R, so Στ = TR = Iα.',
              options: [{ t: 'the string’s tension at the rim', right: true }, { t: 'the disc’s weight', why: 'Its weight acts at the centre, on the axle: no lever arm, so no torque.' }, { t: 'the axle’s force', why: 'It also acts at the centre, so it has no lever arm either.' }] },
            { q: 'What ties the block’s acceleration to the disc’s?', why: 'The string does not slip on the rim, so the block moves as the rim does: a = Rα.',
              options: [{ t: 'the string doesn’t slip: a = Rα', right: true }, { t: 'they have the same mass', why: 'Mass does not link motions; the string’s length does.' }, { t: 'they both feel gravity', why: 'Gravity acts on both, but it does not say how fast the disc turns.' }] },
          ],
        },
        problem: { original: true, title: 'Block on a disc pulley', text: 'A 3.0 kg uniform solid disc of radius 0.40 m turns on a frictionless axle. A light string wound around its rim holds a 1.2 kg block, which is released from rest. (a) What is the block’s acceleration? (b) How fast is the block moving after it has fallen 1.5 m?',
          key: { givens: { M: [3, 'kg'], R: [0.4, 'm'], m: [1.2, 'kg'], h: [1.5, 'm'], g: [9.81, 'm/s²'], K0: [0, 'J'], U: [0, 'J'], Wnc: [0, 'J'] }, cond: HANG, targets: ['a', 'v'] },
          answers: { a: '4.36', v: '3.62' } } },
      { kind: 'twin', mode: 'guided', help: TWIN,
        prompts: [
          { when: 'start', text: 'Same picture, new numbers and a new question. Show me is off: you choose each equation.' },
          { when: 'solve', text: 'A height and a speed, no time: which law?' },
        ],
        route: { laws: ['energy'], why: 'A drop and a speed with no time asked: energy does it in one law. Forces work too, but need three equations and then kinematics.',
          cues: ['The string doesn’t slip, so v = Rω', 'The disc is a uniform solid disc: I = ½MR²', 'Released from rest: K₀ = 0'],
          decoys: ['The bucket and the cylinder stick together', 'The cylinder rolls without slipping on the ground'] },
        problem: { original: true, title: 'Bucket on a windlass', text: 'A 2.0 kg bucket hangs from a rope wound around a 5.0 kg uniform solid cylinder of radius 0.25 m that turns freely on its axle. The bucket is released from rest. How fast is it moving after it has fallen 0.80 m?',
          key: { givens: { M: [5, 'kg'], R: [0.25, 'm'], m: [2, 'kg'], h: [0.8, 'm'], g: [9.81, 'm/s²'], K0: [0, 'J'], U: [0, 'J'], Wnc: [0, 'J'] }, cond: HANG, targets: ['v'] },
          answers: { v: '2.64' } } },
      { kind: 'transfer', mode: 'guided', help: NONE,
        prompts: [{ when: 'start', text: 'No help this time. A tension is a force: which equations hold a force?' }],
        route: { laws: ['forces'], why: 'A tension is a force, so energy alone can’t give it: ΣF on the bucket and Στ = Iα on the cylinder, tied by a = Rα.',
          cues: ['The rope doesn’t slip, so a = Rα', 'The cylinder is a uniform solid cylinder: I = ½MR²'],
          decoys: ['Released from rest: K₀ = 0 gives the tension', 'The bucket falls at g'] },
        problem: { original: true, title: 'Tension in the well rope', text: 'A 4.0 kg bucket of water hangs from a rope wound around a 10 kg uniform solid cylinder of radius 0.15 m that turns freely on its axle. The bucket is let go. What is the tension in the rope while the bucket falls?',
          key: { givens: { M: [10, 'kg'], R: [0.15, 'm'], m: [4, 'kg'], g: [9.81, 'm/s²'] }, cond: { ...HANG, rest: false, ground: false, smooth: false }, targets: ['Tn'] },
          answers: { Tn: '21.8' } } },
    ],
  },
  {
    id: 'roll', chapter: 'rolling', title: 'Rolling down (and up) a ramp', objectives: ['rolling without slipping', 'K = ½Mv² + ½I_cmω²', 'solid vs hollow'],
    recap: 'A rolling body shares its energy between moving and turning, so it is slower than a sliding one: v = √(2gh / (1 + I_cm/MR²)). Mass and radius cancel; only the shape (I_cm/MR²) matters, so a solid sphere beats a disc, which beats a hollow sphere or a ring.',
    stops: [
      { kind: 'long', mode: 'guided', help: FULL,
        prompts: [
          { when: 'start', text: 'Draw the ramp and the ball, then add the givens. In Conditions: what is the body doing, and what shape is it?' },
          { when: 'conditions', text: 'Rolling without slipping: static friction acts but does no work. Which shape gives I_cm?' },
          { when: 'solve', text: '(a) asks an acceleration: forces and torques about the centre. (b) gives a height: energy. When you’re done, switch the shape to a hollow sphere and solve again: which is faster?' },
        ],
        route: { laws: ['forces', 'energy'], why: 'The acceleration down the slope needs ΣF along the slope and Στ about the centre (friction makes it turn). The speed at the bottom comes from energy: the drop pays for moving and turning.',
          cues: ['Rolls without slipping: a = Rα and v = Rω', 'A uniform solid sphere: I_cm = ⅖MR²', 'Released from rest: K₀ = 0'],
          decoys: ['Friction takes energy out as it rolls', 'The axle is fixed, so all of K is turning'] },
        problem: { original: true, title: 'Ball down a ramp', text: 'A 2.0 kg uniform solid sphere of radius 0.10 m is released from rest on a ramp inclined at 25° and rolls without slipping. (a) What is its acceleration down the ramp? (b) How fast is it moving after its centre has dropped 1.2 m?',
          key: { givens: { M: [2, 'kg'], R: [0.1, 'm'], inc: [25, '°'], h: [1.2, 'm'], g: [9.81, 'm/s²'], K0: [0, 'J'], U: [0, 'J'], Wnc: [0, 'J'] }, cond: ROLL, targets: ['a', 'v'] },
          answers: { a: '2.96', v: '4.10' } } },
      { kind: 'twin', mode: 'guided', help: TWIN,
        prompts: [
          { when: 'start', text: 'Now it rolls up. Where do you measure heights from, and where is K zero?' },
          { when: 'conditions', text: 'It starts at the bottom and ends higher up: untick “Heights measured from where it ends” and give U₀ = 0 at the start.' },
          { when: 'solve', text: 'The start is a spin rate, the answer a distance along the ramp: which relationships turn one into the other?' },
        ],
        route: { laws: ['energy'], why: 'A starting speed and a stopping point, no time: energy. Its kinetic energy at the bottom (moving and turning) becomes height.',
          cues: ['Rolls without slipping: v₀ = Rω₀', 'A uniform solid sphere: I_cm = ⅖MR²', 'A diameter is given: R = D/2', 'It stops at the top: K = 0', 'h = Δx sin θ along the ramp'],
          decoys: ['Static friction takes energy out', 'No outside torque, so L is conserved'] },
        problem: { original: true, title: 'Ball rolling up a ramp', text: 'A 0.50 kg uniform solid sphere of diameter 8.0 cm rolls without slipping up a ramp inclined at 20°, starting with an angular speed of 40 rad/s. How far along the ramp does it roll before it stops?',
          key: { givens: { M: [0.5, 'kg'], D: [8, 'cm'], w0: [40, 'rad/s'], inc: [20, '°'], g: [9.81, 'm/s²'], U0: [0, 'J'], K: [0, 'J'], Wnc: [0, 'J'] }, cond: { ...ROLL, rest: false, ground: false }, targets: ['dx'] },
          answers: { dx: '0.534' } } },
      { kind: 'transfer', mode: 'guided', help: NONE,
        prompts: [{ when: 'start', text: 'No help. It doesn’t roll: it swings about a pivot on its rim. Which I, and how far does the centre drop?' }],
        route: { laws: ['energy'], why: 'A drop and a spin rate, no time: energy. All the kinetic energy is turning about the pivot, with I from the parallel-axis theorem.',
          cues: ['It turns about a fixed pivot: K = ½Iω²', 'The pivot is on the rim: I = I_cm + MR²', 'The centre drops one radius'],
          decoys: ['It rolls without slipping: v = Rω', 'No outside torque, so L is conserved'] },
        problem: { original: true, title: 'Disc swinging on its rim', text: 'A uniform solid disc of radius 0.30 m hangs from a frictionless pivot at a point on its rim, so it can swing in its own plane. It is held with its centre level with the pivot and released from rest. What is its angular speed as its centre passes the lowest point?',
          key: { givens: { M: [null, 'kg'], R: [0.3, 'm'], dpa: [0.3, 'm'], h: [0.3, 'm'], g: [9.81, 'm/s²'], K0: [0, 'J'], U: [0, 'J'], Wnc: [0, 'J'] }, cond: { body: 'spin', shape: 'disc', axis: 'other', rest: true, ground: true, smooth: true, earth: true }, targets: ['w'] },
          answers: { w: '6.60' } } },
    ],
  },
  {
    id: 'work', chapter: 'energy', title: 'Work and power', objectives: ['W = F Δx cos φ', 'which angle is φ', 'P = W / t'],
    recap: 'Work is the part of a force along the motion, times the distance: W = F Δx cos φ. The angle is between the force and the direction the body moves, wherever the slope is. Power is how fast the work is done, P = W / t, so a force follows from a power, a time and a distance.',
    stops: [
      { kind: 'long', mode: 'guided', help: FULL,
        prompts: [
          { when: 'start', text: 'Draw the sled, the rope and the direction it moves. Which angle sits between the rope and the motion?' },
          { when: 'conditions', text: 'Is the force along the motion, or at an angle to it? Nothing here needs gravity.' },
          { when: 'solve', text: 'Part (a) is one definition. Part (b) needs the work from (a) and the time.' },
        ],
        route: { laws: ['work'], why: 'One steady force, a distance and a time: the definitions of work and power are all it takes. No speeds or heights are asked.',
          cues: ['The rope is at 25° to the direction the sled moves', 'The force is constant over the whole 8.0 m', 'The work is done in 5.0 s'],
          decoys: ['The sled starts from rest: K₀ = 0', 'The snow is level, so the rope does no work'] },
        problem: { original: true, title: 'Sled pulled by a rope', text: 'You pull a sled 8.0 m across level snow with a rope that makes a 25° angle above the horizontal. The tension in the rope is 40 N, and the pull takes 5.0 s. (a) How much work does the rope do on the sled? (b) What is your average power?',
          key: { givens: { Fp: [40, 'N'], dx: [8, 'm'], phi: [25, '°'], t: [5, 's'] }, cond: { along: false }, targets: ['WF', 'Pavg'] },
          answers: { WF: '290', Pavg: '58' } } },
      { kind: 'twin', mode: 'guided', help: TWIN,
        prompts: [
          { when: 'start', text: 'Same idea on a ramp. Draw the force and the direction the crate moves: what is the angle between them?' },
          { when: 'solve', text: 'One force, one distance, one angle.' },
        ],
        route: { laws: ['work'], why: 'The work done by one named force: W = F Δx cos φ. The other forces (gravity, friction, the normal force) do their own work, but the question doesn’t ask for it.',
          cues: ['The force is horizontal and the crate moves along the ramp, so φ is the ramp angle', 'The force is constant over the 4.0 m'],
          decoys: ['The force is along the motion: φ = 0', 'Friction on the ramp changes the work this force does'] },
        problem: { original: true, title: 'Crate pushed up a ramp', text: 'A worker pushes a crate up a ramp inclined at 20° with a constant horizontal force of 310 N. How much work does that force do on the crate as it slides 4.0 m up the ramp?',
          key: { givens: { Fp: [310, 'N'], dx: [4, 'm'], phi: [20, '°'] }, cond: { along: false }, targets: ['WF'] },
          answers: { WF: '1.2e3' } } },
      { kind: 'transfer', mode: 'guided', help: NONE,
        prompts: [{ when: 'start', text: 'A power, a time and a distance. What does the power tell you first?' }],
        route: { laws: ['work'], why: 'Power times time is the work done; the work is the force times the distance when the force is along the motion.',
          cues: ['The cable is parallel to the slipway: the force is along the motion', 'The power is an average over the 24 s'],
          decoys: ['The boat moves at a steady speed, so no work is done', 'The slope’s angle is needed'] },
        problem: { original: true, title: 'Winch on a slipway', text: 'A winch pulls a boat 15 m up a slipway at a steady speed, with the cable parallel to the slipway. The pull takes 24 s and the winch’s average power output is 450 W. What force does the cable exert on the boat?',
          key: { givens: { dx: [15, 'm'], t: [24, 's'], Pavg: [450, 'W'], phi: [0, '°'] }, cond: { along: true }, targets: ['Fp'] },
          answers: { Fp: '720' } } },
    ],
  },
  {
    id: 'launch', chapter: 'energy', title: 'A spring, a rough ramp and a collision', objectives: ['energy with a spring and friction', 'which terms are zero', 'momentum for the hit, energy after it'],
    recap: 'Write the energy law term by term and decide each one: K₀ + U₀ + U_s0 + W_nc = K + U + U_s. A spring stores ½kx²; friction takes out f Δx; a climb stores mgh with h = Δx sin θ. A collision is different: energy is lost in the hit, so momentum carries you through it and energy takes over afterwards.',
    stops: [
      { kind: 'long', mode: 'guided', help: FULL,
        prompts: [
          { when: 'start', text: 'Draw the two moments: spring squeezed and block at rest; block stopped up the ramp. What kinds of energy are there at each?' },
          { when: 'conditions', text: 'Go through the energy terms one at a time: which are zero at the start, and which at the end? Where will you measure heights from?' },
          { when: 'solve', text: 'The distance appears twice: in the height gained and in friction’s work. Those equations have to be solved together.' },
        ],
        route: { laws: ['energy'], why: 'A start and an end with no time asked: energy. The spring’s energy pays for the climb and for what friction takes out.',
          cues: ['Released from rest and stops at the top: K₀ = 0 and K = 0', 'The spring is relaxed at the end: U_s = 0', 'Kinetic friction acts over the whole distance', 'The height gained is Δx sin θ'],
          decoys: ['The ramp is smooth, so W_nc = 0', 'Momentum is conserved along the ramp'] },
        problem: { original: true, title: 'Spring launcher on a rough ramp', text: 'A spring with force constant 180 N/m sits at the bottom of a ramp inclined at 25°. It is compressed 0.12 m and launches a 0.40 kg block from rest. The coefficient of kinetic friction between the block and the ramp is 0.15. (a) How much energy does the spring store? (b) How far along the ramp does the block travel before it stops?',
          key: { givens: { ks: [180, 'N/m'], xs: [0.12, 'm'], m: [0.4, 'kg'], inc: [25, '°'], mu: [0.15, 'no unit'], g: [9.81, 'm/s²'], K0: [0, 'J'], K: [0, 'J'], U0: [0, 'J'], Us: [0, 'J'] },
            cond: { rough: true, rest: true, stops: true, ground: false, ground0: true, relax0: false, relax1: true, smooth: false, earth: true }, targets: ['Us0', 'dx'] },
          answers: { Us0: '1.3', dx: '0.59' } } },
      { kind: 'twin', mode: 'guided', help: TWIN,
        prompts: [
          { when: 'start', text: 'Same picture, new numbers. Watch the units: centimetres and grams.' },
          { when: 'solve', text: 'Which terms of the energy law are zero? Which equations share the unknown distance?' },
        ],
        route: { laws: ['energy'], why: 'Spring energy at the start becomes height and friction’s loss at the end. No time is asked, so energy does it.',
          cues: ['Released from rest and stops at the top: K₀ = 0 and K = 0', 'The spring is relaxed at the end: U_s = 0', 'Kinetic friction acts over the whole distance', 'The height gained is Δx sin θ'],
          decoys: ['The board is nearly level, so gravity can be ignored', 'The puck leaves the spring at a known speed'] },
        problem: { original: true, title: 'Puck launcher', text: 'A spring of force constant 75 N/m launches a 90 g puck up a board tilted at 10°. The spring is compressed 6.0 cm and released from rest. The coefficient of kinetic friction between the puck and the board is 0.10. How far along the board does the puck travel before it stops?',
          key: { givens: { ks: [75, 'N/m'], xs: [6, 'cm'], m: [90, 'g'], inc: [10, '°'], mu: [0.1, 'no unit'], g: [9.81, 'm/s²'], K0: [0, 'J'], K: [0, 'J'], U0: [0, 'J'], Us: [0, 'J'] },
            cond: { rough: true, rest: true, stops: true, ground: false, ground0: true, relax0: false, relax1: true, smooth: false, earth: true }, targets: ['dx'] },
          answers: { dx: '0.56' } } },
      { kind: 'transfer', mode: 'guided', help: NONE,
        prompts: [{ when: 'start', text: 'Two stages: the hit, then the swing. Which law holds through the hit? Which one after it?' }],
        route: { laws: ['pmomentum', 'energy'], why: 'Kinetic energy is lost when the clay sticks, so only momentum holds through the hit. After it, only gravity does work, so energy gives the height.',
          cues: ['They stick together: one velocity after the hit', 'The block hangs at rest before the hit', 'After the hit only gravity does work on the swing'],
          decoys: ['Kinetic energy is conserved through the hit', 'The clay’s ½mv² becomes mgh directly'] },
        problem: { original: true, title: 'Clay hits a hanging block', text: 'A 0.50 kg ball of clay moving horizontally at 6.0 m/s hits a 2.5 kg block that hangs at rest from a long light cord, and sticks to it. How high above its starting level does the block (with the clay) swing?',
          key: { givens: { m1: [0.5, 'kg'], v1i: [6, 'm/s', 0], m2: [2.5, 'kg'], v2i: [0, 'm/s', 0], g: [9.81, 'm/s²'] }, cond: { collide: 'stick', rest2: true, earth: true }, targets: ['h'] },
          answers: { h: '0.051' } } },
    ],
  },
  {
    id: 'glance', chapter: 'energy', title: 'Glancing collisions and a force graph', objectives: ['momentum is a vector: x and y separately', 'equal masses cancel', 'work is the area under F against x'],
    recap: 'In a glancing collision, write momentum twice: along the incoming line, and across it (where the total is zero, so the two sideways parts cancel). Two equations, two unknown speeds, solved together. For a force that changes with position, the work is the area under the force–position graph, taken stretch by stretch; the work–energy theorem then gives the speed.',
    stops: [
      { kind: 'long', mode: 'guided', help: FULL,
        prompts: [
          { when: 'start', text: 'Draw before and after. Put the x axis along puck 1’s incoming velocity: what is each puck’s x part and y part afterwards?' },
          { when: 'conditions', text: 'Do they leave along one line or at angles? Are the masses equal? If they are, the mass divides out of every term.' },
          { when: 'solve', text: 'Two unknown speeds: you need two equations with them, one for each axis.' },
        ],
        route: { laws: ['pmomentum'], why: 'A collision: momentum is conserved, and it is a vector, so it gives one equation along the incoming line and one across it. Nothing says the collision is elastic, so energy is not used.',
          cues: ['Puck 2 is at rest before the hit', 'The pucks leave on opposite sides of the incoming line', 'Equal masses: the mass cancels'],
          decoys: ['Kinetic energy is conserved', 'The pucks stick together', 'Only the momentum along the incoming line matters'] },
        problem: { original: true, title: 'Two pucks on an air table', text: 'A puck sliding at 6.0 m/s on an air table strikes an identical puck at rest. Afterwards the first puck moves at 25° to its original direction and the second moves at 40° on the other side of that direction. Find the speed of each puck after the collision.',
          key: { givens: { v1i: [6, 'm/s', 0], th1: [25, '°'], th2: [40, '°'] }, cond: { collide: 'glance', equal: true }, targets: ['v1f', 'v2f'] },
          answers: { v1f: '4.3', v2f: '2.8' } } },
      { kind: 'twin', mode: 'guided', help: TWIN,
        prompts: [{ when: 'start', text: 'Same picture, new numbers. Which axis is x? Write momentum along it and across it.' }],
        route: { laws: ['pmomentum'], why: 'Momentum along the incoming line and across it: two equations for the two speeds.',
          cues: ['Ball 2 is at rest before the hit', 'The balls leave on opposite sides of the incoming line', 'Equal masses: the mass cancels'],
          decoys: ['Kinetic energy is conserved', 'Only the momentum along the incoming line matters'] },
        problem: { original: true, title: 'Cue ball and object ball', text: 'A cue ball moving at 3.0 m/s strikes an object ball of the same mass at rest. The cue ball leaves at 35° to its original direction and the object ball at 55° on the other side. Find the speed of each ball after the collision.',
          key: { givens: { v1i: [3, 'm/s', 0], th1: [35, '°'], th2: [55, '°'] }, cond: { collide: 'glance', equal: true }, targets: ['v1f', 'v2f'] },
          answers: { v1f: '2.5', v2f: '1.7' } } },
      { kind: 'transfer', mode: 'guided', help: NONE,
        prompts: [{ when: 'start', text: 'The force is not constant, so F Δx won’t do. What does the area under a force–position graph mean?' }],
        route: { laws: ['work'], why: 'The force changes with position, so its work is the area under the graph; the work–energy theorem turns that work into a change of kinetic energy.',
          cues: ['The work is the area under the force–position graph', 'The track is frictionless, so this force does all the work', 'The cart is already moving at the start: K₀ is not zero'],
          decoys: ['The force is constant, so W = F Δx with the largest force', 'The cart starts from rest'] },
        problem: { original: true, title: 'Cart pushed by a growing force', text: 'A 1.5 kg cart rolls along a frictionless level track at 1.0 m/s. A forward force then acts on it: the force rises steadily from 0 to 12 N over the first 2.0 m and stays at 12 N for the next 3.0 m. How fast is the cart moving at the end of those 5.0 m?',
          key: { givens: { m: [1.5, 'kg'], v0: [1, 'm/s'], Fai: [0, 'N', 0], Faf: [12, 'N', 0], dxa: [2, 'm'], Fbi: [12, 'N', 0], Fbf: [12, 'N', 0], dxb: [3, 'm'] }, cond: { graph: true }, targets: ['v'] },
          answers: { v: '8.1' } } },
    ],
  },
  {
    id: 'ftime', chapter: 'energy', title: 'A force that changes with time', objectives: ['F(t) gives a(t) by Newton’s second law', 'the area under a(t) is the change in velocity', 'kinetic energy from the speed at one moment'],
    recap: 'When the force changes with time, the acceleration does too, so the constant-acceleration equations and W = F Δx are both out. Newton’s second law still holds at every moment: a(t) = F(t)/m. Integrate once for v(t) (the start velocity is the constant), put in the time, and K = ½mv² gives the kinetic energy. Integrate again for how far it went.',
    stops: [
      { kind: 'long', mode: 'guided', help: FULL,
        prompts: [
          { when: 'start', text: 'The force is a formula in t, not one number. Pick “varies with time” under This problem, then give F as a function of t.' },
          { when: 'conditions', text: 'Is the force steady? If not, which equations stop working?' },
          { when: 'solve', text: 'F(t) gives a(t). What do you do to an acceleration to get a velocity, and what else do you need to know?' },
        ],
        route: { laws: ['forces'], why: 'The force changes with time, so the acceleration is not constant: Newton’s second law gives a(t), and integrating it gives v(t). Kinetic energy then follows from its definition.',
          cues: ['The force is given as a function of time', 'It starts from rest: v₀ = 0', 'This is the only force along the motion'],
          decoys: ['The acceleration is constant', 'The work is F Δx with the force at the end'] },
        problem: { original: true, title: 'Puck pushed harder and harder', text: 'A 0.50 kg puck rests on a frictionless air table. From t = 0 a forward force F = (0.9t² + 1.5t) N acts on it, with t in seconds. Find the puck’s speed and its kinetic energy at t = 2.0 s.',
          key: { givens: { m: [0.5, 'kg'], v0: [0, 'm/s', 0], t: [2, 's'] }, fns: { Fp: '0.9t² + 1.5t' }, cond: { varA: true }, targets: ['v', 'K'] },
          answers: { v: '11', K: '29' } } },
      { kind: 'twin', mode: 'guided', help: TWIN,
        prompts: [{ when: 'start', text: 'Same route, new force. It pushes backward at first: let the signs in F(t) carry that.' }],
        route: { laws: ['forces'], why: 'A force that changes with time: F = ma gives a(t), the integral gives v, and K = ½mv².',
          cues: ['The force is given as a function of time', 'It starts from rest: v₀ = 0', 'This is the only force along the motion'],
          decoys: ['The acceleration is constant', 'The force is always forward'] },
        problem: { original: true, title: 'Glider on an air track', text: 'A 350 g glider is at rest on a level air track. Between t = 0 and t = 3.0 s the only horizontal force on it is F = (2t² + 3t − 5) N, with t in seconds. How much kinetic energy does the glider have at t = 3.0 s?',
          key: { givens: { m: [350, 'g'], v0: [0, 'm/s', 0], t: [3, 's'] }, fns: { Fp: '2t² + 3t − 5' }, cond: { varA: true }, targets: ['K'] },
          answers: { K: '3.9e2' } } },
      { kind: 'transfer', mode: 'guided', help: NONE,
        prompts: [{ when: 'start', text: 'It is already moving, and the question asks how far. How many times do you integrate, and what is each start value?' }],
        route: { laws: ['forces'], why: 'F = ma gives a(t); one integral gives v(t), starting from v₀, and a second gives the distance. The force is not steady, so its work is not F Δx: the work–energy theorem gives it from the kinetic energies.',
          cues: ['The force is given as a function of time', 'It is already moving at t = 0', 'This is the only force along the motion'],
          decoys: ['It starts from rest', 'The work is F Δx with the force at the end'] },
        problem: { original: true, title: 'Trolley with a growing push', text: 'A 2.0 kg trolley rolls forward at 1.5 m/s on a frictionless level floor. From t = 0 a forward force F = (6t) N acts on it, with t in seconds. How far does the trolley travel in the first 2.0 s, and how much work does the force do on it in that time?',
          key: { givens: { m: [2, 'kg'], v0: [1.5, 'm/s', 0], t: [2, 's'] }, fns: { Fp: '6t' }, cond: { varA: true }, targets: ['dx', 'Wnet'] },
          answers: { dx: '7.0', Wnet: '54' } } },
    ],
  },
];

// "What's wrong?" error handlers (plan section 8, after Andes): each names an edit app.js knows how to try on the solved path,
// and what to say when that edit turns the app's answer into the student's. The most specific comes first.
const SLIPS = [
  { id: 'trig', edit: 'swapTrig', says: 'Your number is what you get with <b>sin and cos swapped</b> in {eq}. Check which side of the triangle is opposite the angle: the component along the angle’s side uses cos, the one across from it sin.' },
  { id: 'drop', edit: 'dropTerm', says: 'Your number is what you get with <b>one term left out</b> of {eq}. Check that every force, torque or energy that acts made it into the equation.' },
  { id: 'sign', edit: 'flipSign', says: 'Your number is what you get with <b>{q} the other way round</b>: a sign slip. Check which way you took as + and the direction of {q}.' },
];

export default {
  id: 'mech', name: 'Mechanics', bare: true,
  // licences are open question 4 in docs/core-plan.md (CC BY-SA 4.0 is the recommendation for content)
  license: { code: 'not chosen yet', content: 'not chosen yet' },
  quantities: VARS, equations: EQS, chapters: CHAPTERS, components: COMPONENTS, practice: PRACTICE, lessons: LESSONS, slips: SLIPS, printOrder: PRINT_ORDER, notes: { chapters: NOTES.chapters, equations: NOTES.equations, quantities: NOTES.quantities },
};
