// Phase Q2 gate: which principle applies, sign of work, torque direction, vectors. Node only (in test:fast).
// Answers come from outside the app, worked by hand: canoes push off (p conserved, K not); a fall with air resistance gains
// less K than the U lost; a skater pulling in her arms (L conserved, I falls, ω rises); a normal force does no work;
// gravity on the way down does positive work; a beam load fixes which way the support pushes; dot and cross by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooser, judgePrediction, spinResponse, energyGain, workSign, workSignAngle, torqueSense, mostEffective, supportDirection } from '../js/principle.js';
import { dot, cross, angle } from '../js/vectors.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('canoes: no external force, but the push-off does work → p conserved, K not', () => {
  const c = chooser({ force: 'zero', torque: 'zero', work: 'nonzero' });
  assert.deepEqual(c.conserved.sort(), ['L', 'p']);
  assert.deepEqual(c.notConserved, ['E']);
  assert.ok(c.lines.some(l => /do not set K before = K after/.test(l)));
});

test('the card is built from the student’s answers, and is incomplete until all three are in', () => {
  assert.equal(chooser({ force: 'zero' }).complete, false);
  assert.equal(chooser({ force: 'zero', torque: 'nonzero', work: 'zero' }).conserved.join(), 'p,E');
});

test('prediction is judged against the checklist, naming what was missed and what was wrong', () => {
  const a = { force: 'zero', torque: 'zero', work: 'nonzero' };
  assert.ok(judgePrediction(a, ['p', 'L']).ok);
  const bad = judgePrediction(a, ['p', 'E']);
  assert.ok(!bad.ok);
  assert.ok(bad.lines.some(l => /left out L/.test(l)) && bad.lines.some(l => /mechanical energy/.test(l)));
  assert.ok(!judgePrediction({ force: 'zero' }, ['p']).ok, 'no verdict before the checklist is done');
});

test('air resistance: K gained is less than the U lost (30 J)', () => {
  const r = energyGain(30, 'negative');
  assert.equal(r.relation, '<');
  assert.match(r.line, /< 30/);
  assert.equal(energyGain(30, 'zero').relation, '=');
});

test('skater: no external torque → L conserved; I falls so ω rises', () => {
  const c = chooser({ force: 'nonzero', torque: 'zero', work: 'nonzero' });
  assert.deepEqual(c.conserved, ['L']);
  assert.equal(spinResponse('falls').omega, 'rises');
  assert.equal(spinResponse('rises').omega, 'falls');
});

test('sign of work: a normal force (φ = 90°) is zero; gravity on the way down is positive', () => {
  assert.equal(workSignAngle(90).sign, 'zero');
  assert.equal(workSign([3, 0], [0, 50]).sign, 'zero');     // slides along x, normal force up
  assert.equal(workSign([0, -2], [0, -9.8]).sign, 'positive'); // falls, gravity down: φ = 0°
  assert.equal(workSign([0, 2], [0, -9.8]).sign, 'negative');  // rises against gravity: φ = 180°
  near(workSign([0, -2], [0, -9.8]).phi, 0, 1e-6);
  assert.equal(workSignAngle(180).sign, 'negative');
});

test('torque sense: +x lever arm with a downward force turns clockwise; lever arm is the perpendicular distance', () => {
  const t = torqueSense([2, 0], [0, -100]);
  assert.equal(t.sense, 'clockwise'); near(t.tau, -200); near(t.leverArm, 2);
  const slanted = torqueSense([2, 0], [30, 40]); // only the 40 perpendicular to r counts: τ = 2·40
  near(slanted.tau, 80); assert.equal(slanted.sense, 'counterclockwise'); near(slanted.leverArm, 80 / 50);
  assert.equal(torqueSense([2, 0], [5, 0]).sense, 'none');
});

test('which force is most effective: the one perpendicular to r', () => {
  const m = mostEffective([2, 0], [{ id: 'a', F: [10, 0] }, { id: 'b', F: [0, 10] }, { id: 'c', F: [7, 7] }]);
  assert.deepEqual(m.best, ['b']);
});

test('which way must the support push (4B #1 style): a weight beyond the pivot', () => {
  // pivot B at x=0, a 100 N weight hangs at x=2 (clockwise 200); support A at x=4 must turn it counterclockwise: up, 50 N
  const s = supportDirection({ loads: [{ at: [2, 0], F: [0, -100] }], pivot: [0, 0], support: [4, 0] });
  assert.equal(s.dir, 'up'); near(s.force, 50);
  // the same load but the support on the other side of the pivot has to pull down
  assert.equal(supportDirection({ loads: [{ at: [2, 0], F: [0, -100] }], pivot: [0, 0], support: [-4, 0] }).dir, 'down');
  assert.equal(supportDirection({ loads: [], pivot: [0, 0], support: [0, 0] }).dir, null);
});

test('dot product (10, 9, 12)·(5, 4, 0) = 86, and kN·m reads as kJ', () => {
  const d = dot([10, 9, 12], [5, 4, 0], { ua: 'kN', ub: 'm' });
  near(d.value, 86); assert.equal(d.unit, 'kJ'); assert.equal(d.text, '86 kJ');
  assert.ok(d.steps[0].text.startsWith('a·b ='), 'symbols first');
  assert.match(d.steps[2].text, /50 \+ 36 \+ 0 = 86/);
});

test('cross product in the plane: (32, 21)×(0.25, −0.18) = 32(−0.18) − 21(0.25) = −11.01 N·m (k̂)', () => {
  // The roadmap wrote −10.8; by hand it is −5.76 − 5.25 = −11.01. (−10.8 would need 0.24 in place of 0.25: check the exam’s numbers.)
  const c = cross([32, 21], [0.25, -0.18], { ua: 'N', ub: 'm' });
  near(c.value, -11.01, 1e-9); assert.equal(c.sign, 'negative'); assert.equal(c.unit, 'N·m');
  assert.match(c.text, /k̂/);
});

test('cross product in 3D by hand: î×ĵ = k̂, and a×a = 0', () => {
  assert.deepEqual(cross([1, 0, 0], [0, 1, 0]).parts.map(x => x + 0), [0, 0, 1]);
  assert.deepEqual(cross([2, 3, 4], [2, 3, 4]).parts.map(x => x + 0), [0, 0, 0]);
  assert.deepEqual(cross([1, 2, 3], [4, 5, 6]).parts.map(x => x + 0), [-3, 6, -3]);
});

test('angle between vectors and bad input', () => {
  near(angle([1, 0], [0, 1]), 90, 1e-9); near(angle([1, 0], [-1, 0]), 180, 1e-9);
  assert.throws(() => dot([1, 2], [1, 2, 3]));
  assert.throws(() => cross([1, 'x'], [1, 2]));
});
