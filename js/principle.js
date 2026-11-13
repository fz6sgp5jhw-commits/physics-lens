// Physics Lens — multiple-choice aid, phase Q2: which principle applies, and which way a work or torque points. Pure
// logic (no DOM) on top of vectors.js and expr.js. The student answers the system checklist first and predicts what is
// conserved; the card then says what is and is not conserved, in words built from those answers. It never picks a choice.
import { dot, cross, angle } from './vectors.js';
import * as X from './expr.js';

const { R, number, numValue } = X;
const neg = (x) => numValue(R.neg(number(x)));
const isZero = (x) => Math.abs(x) < 1e-9;

// ---------------------------------------------------------------------------------------------- the system checklist
// answers: { force: 'zero'|'nonzero', torque: 'zero'|'nonzero', work: 'zero'|'nonzero' }  (external F, external τ, W of non-conservative forces)
export const CHECKLIST = [
  { id: 'force', ask: 'Is the net EXTERNAL force on your system zero?', law: 'momentum', quantity: 'p', name: 'linear momentum p = mv' },
  { id: 'torque', ask: 'Is the net EXTERNAL torque on your system zero (about the axis you chose)?', law: 'angular', quantity: 'L', name: 'angular momentum L' },
  { id: 'work', ask: 'Do non-conservative forces (friction, drag, a push-off, a crash) do work on your system?', law: 'energy', quantity: 'E', name: 'mechanical energy K + U', invert: true },
];
const WHY = {
  p: ['No net external force, so p does not change: internal forces come in equal and opposite pairs.', 'A net external force changes p (impulse = Δp).'],
  L: ['No net external torque, so L does not change: Iω stays fixed even if I changes.', 'A net external torque changes L (τ = dL/dt).'],
  E: ['Only conservative forces do work, so K + U stays the same.', 'Non-conservative work changes K + U by exactly W_nc (K + U changes, perhaps into heat).'],
};
export function chooser(answers){
  const out = { conserved: [], notConserved: [], lines: [], complete: true };
  for (const c of CHECKLIST){
    const a = answers && answers[c.id];
    if (a !== 'zero' && a !== 'nonzero'){ out.complete = false; continue; }
    const kept = c.invert ? a === 'zero' : a === 'zero';
    (kept ? out.conserved : out.notConserved).push(c.quantity);
    out.lines.push(`${c.name}: ${kept ? 'conserved' : 'not conserved'}. ${WHY[c.quantity][kept ? 0 : 1]}`);
  }
  // a crash with p conserved but K not is the usual trap: say it out loud
  if (out.conserved.includes('p') && out.notConserved.includes('E')) out.lines.push('So momentum balances the books here, but kinetic energy does not: do not set K before = K after.');
  return out;
}
// the student's prediction (a list of 'p','L','E') against the checklist: what they got, what they missed
export function judgePrediction(answers, predicted){
  const c = chooser(answers);
  if (!c.complete) return { ok: false, lines: ['Answer all three checklist questions first, then the prediction can be checked.'] };
  const pred = new Set(predicted), want = new Set(c.conserved), lines = [];
  for (const q of want) if (!pred.has(q)) lines.push(`You left out ${q}: ${CHECKLIST.find(x => x.quantity === q).name} is conserved here.`);
  for (const q of pred) if (!want.has(q)) lines.push(`${CHECKLIST.find(x => x.quantity === q).name} is not conserved here: ${WHY[q][1]}`);
  return { ok: !lines.length, lines: lines.length ? lines : ['Your prediction matches the checklist.'] };
}
// skater, diver, spinning stool: L = Iω conserved, so ω moves opposite to I
export function spinResponse(change){ // change: 'falls' | 'rises' for I
  if (change !== 'falls' && change !== 'rises') throw new Error('I falls or rises.');
  return { omega: change === 'falls' ? 'rises' : 'falls', line: `L = Iω is fixed, so when I ${change}, ω ${change === 'falls' ? 'rises' : 'falls'}. ` + (change === 'falls' ? 'Kinetic energy rises too (K = L²/2I): the arms did work pulling in.' : 'Kinetic energy falls (K = L²/2I).') };
}
// W_nc of drag is negative: the energy gained as K from a loss of U is smaller than that loss
export function energyGain(uLost, wncSign){
  const rel = { negative: '<', zero: '=', positive: '>' }[wncSign];
  if (!rel) throw new Error('W_nc is negative, zero or positive.');
  return { relation: rel, line: `K gained = (U lost) + W_nc, and W_nc is ${wncSign}: K gained ${rel} ${uLost}. ` + (rel === '<' ? 'Drag takes some of it.' : rel === '=' ? 'Nothing else takes or gives energy.' : 'Something else is adding energy.') };
}

// ---------------------------------------------------------------------------------------------- sign of work
// the displacement and the force as components: W = F·d. Sign from the dot product (exact); φ for the picture.
export function workSign(d, F){
  const w = dot(d, F), phi = angle(d, F);
  const kind = w.sign;
  const say = kind === 'zero' ? (phi === null ? 'One of them is zero, so the work is zero.' : `φ = ${Math.round(phi)}°: the force is perpendicular to the motion, so it does no work (cos 90° = 0). A normal force on a sliding block is this case.`)
    : kind === 'positive' ? `φ = ${Math.round(phi)}° (less than 90°): the force has a part along the motion, so it adds energy.`
      : `φ = ${Math.round(phi)}° (more than 90°): the force has a part against the motion, so it takes energy away.`;
  return { sign: kind, phi, value: w.value, steps: w.steps, line: say };
}
// φ given directly: W = F d cos φ
export function workSignAngle(phiDeg){
  const c = Math.cos(phiDeg * Math.PI / 180), sign = isZero(c) ? 'zero' : c > 0 ? 'positive' : 'negative';
  return { sign, cos: isZero(c) ? 0 : c, line: `cos ${phiDeg}° ${sign === 'zero' ? '= 0' : sign === 'positive' ? '> 0' : '< 0'}, so W is ${sign}.` };
}

// ---------------------------------------------------------------------------------------------- torque sense and direction
// r from the axis to where the force acts, F as components: τ_z = r_x F_y − r_y F_x (+ counterclockwise)
export function torqueSense(r, F){
  const c = cross(r, F), z = c.value;
  const sense = c.sign === 'zero' ? 'none' : c.sign === 'positive' ? 'counterclockwise' : 'clockwise';
  const fl = numValue(R.sqrt(number(F.reduce((s, x) => s + x * x, 0))));
  const lever = fl ? numValue(R.mul(number(Math.abs(z)), R.inv(number(fl)))) : 0; // the lever arm: the perpendicular distance from the axis to the force's line
  return { tau: z, sense, leverArm: lever, steps: c.steps, line: sense === 'none' ? 'The force’s line passes through the axis: no lever arm, no torque.' : `τ = ${X.fmt(z)} (${sense}). The lever arm is ${X.fmt(lever)}: the distance from the axis to the force’s line.` };
}
// which of several forces at one point is most effective at turning? the one with the biggest |r × F|, per equal size F
export function mostEffective(r, forces){
  const rows = forces.map(f => ({ id: f.id, tau: Math.abs(cross(r, f.F).value), sense: torqueSense(r, f.F).sense }));
  const best = Math.max(...rows.map(x => x.tau));
  return { rows, best: rows.filter(x => Math.abs(x.tau - best) < 1e-9 * Math.max(1, best)).map(x => x.id), line: 'The most effective force has the largest lever arm: the part of F perpendicular to r, F sin φ.' };
}
// a beam on two supports (or one hinge and one support): the loads' net torque about the hinge fixes which way the support
// must push. loads: [{ at: [x, y], F: [fx, fy] }], pivot: [x, y], support: [x, y] where it pushes vertically.
export function supportDirection({ loads, pivot, support }){
  let net = 0;
  for (const l of loads) net = numValue(R.add(number(net), number(torqueSense([l.at[0] - pivot[0], l.at[1] - pivot[1]], l.F).tau)));
  const rx = support[0] - pivot[0];
  if (isZero(rx)) return { dir: null, line: 'The support is at the pivot: it has no lever arm, so it cannot balance a torque about that point.' };
  const Fy = neg(numValue(R.mul(number(net), R.inv(number(rx))))); // τ_support = rx·Fy must cancel the loads' τ
  const dir = isZero(Fy) ? 'none' : Fy > 0 ? 'up' : 'down';
  return { dir, force: Fy, netLoadTorque: net, line: `The loads turn the beam ${isZero(net) ? 'not at all' : net > 0 ? 'counterclockwise' : 'clockwise'} about the pivot, so the support must turn it the other way: its force points ${dir}.` };
}
