// Phase Q1 gate: scaling and ranking for multiple-choice questions. Node only (in test:fast).
// Answers come from outside the app: a car skidding twice as fast stops in 4× the distance; at the same work, twice the
// moment of inertia turns at 1/√2 the speed; a rolling race down a ramp: solid sphere, then solid disc, then hoop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaling, rank, niceRatio, SHAPES } from '../js/choice.js';

const SKID = [
  { eq: '{f}{d} = ½{m}{v}²', solve: 'd' },   // friction stops it: f·d = K
  { eq: '{f} = {mu}{N}', solve: 'f' },
  { eq: '{N} = {m}{g}', solve: 'N' },
];
const NAMES = { mu: 'μ', w: 'ω', th: 'θ' };

test('skid distance: twice the speed gives 4× the distance (μ and the mass held)', () => {
  const r = scaling({ chain: SKID, hold: ['mu', 'g'], change: { id: 'v', k: 2 }, names: NAMES });
  assert.ok(r.ok, r.problems.join(' '));
  assert.equal(r.ratioText, '4');
  assert.equal(r.ratio, 4);
  assert.match(r.expr, /v²/);
  assert.ok(!/m\b/.test(r.expr.replace('μ', '')), 'the mass cancels from d = v² / (2μg)');
  assert.ok(r.steps.length >= 4 && r.steps.every(s => s.text && s.why));
  assert.ok(r.steps[0].text.startsWith('d ='), 'symbols first');
});

test('skid distance: holding N (and m) fixed instead of g gives the same 4×', () => {
  const r = scaling({ chain: SKID, hold: ['mu', 'N', 'm'], change: { id: 'v', k: 2 } });
  assert.ok(r.ok, r.problems.join(' '));
  assert.equal(r.ratio, 4);
});

test('skid distance: any factor works (3× speed → 9×, half the speed → 1/4)', () => {
  assert.equal(scaling({ chain: SKID, hold: ['mu', 'g'], change: { id: 'v', k: 3 } }).ratioText, '9');
  assert.equal(scaling({ chain: SKID, hold: ['mu', 'g'], change: { id: 'v', k: 0.5 } }).ratioText, '1/4');
});

test('skid distance: twice the mass changes nothing (m cancels)', () => {
  const r = scaling({ chain: SKID, hold: ['mu', 'g'], change: { id: 'm', k: 2 } });
  assert.ok(r.ok, r.problems.join(' '));
  assert.equal(r.ratioText, '1');
});

test('kinetic energy: twice the moment of inertia at the same work gives ω × 1/√2', () => {
  const r = scaling({ chain: [{ eq: '{W} = ½{I}{w}²', solve: 'w' }], hold: ['W'], change: { id: 'I', k: 2 }, names: NAMES });
  assert.ok(r.ok, r.problems.join(' '));
  assert.equal(r.ratioText, '1/√2');
  assert.ok(Math.abs(r.ratio - Math.SQRT1_2) < 1e-9);
  assert.match(r.expr, /√/);
  assert.match(r.steps.at(-1).why, /two random points/, 'a root ratio is confirmed numerically');
});

test('kinetic energy: twice the work at the same I gives ω × √2, and 4× the work gives 2×', () => {
  const chain = [{ eq: '{W} = ½{I}{w}²', solve: 'w' }];
  assert.equal(scaling({ chain, hold: ['I'], change: { id: 'W', k: 2 } }).ratioText, '√2');
  assert.equal(scaling({ chain, hold: ['I'], change: { id: 'W', k: 4 } }).ratioText, '2');
});

test('wrong "held fixed" choices are explained', () => {
  const ke = [{ eq: '{W} = ½{I}{w}²', solve: 'w' }];
  let r = scaling({ chain: ke, hold: ['w'], change: { id: 'I', k: 2 }, names: NAMES });
  assert.ok(!r.ok); assert.match(r.problems.join(' '), /ω.*answer/);
  r = scaling({ chain: ke, hold: ['I'], change: { id: 'I', k: 2 } });
  assert.ok(!r.ok); assert.match(r.problems.join(' '), /quantity you change/);
  // friction f = μmg depends on m: it can't stay fixed while m changes
  r = scaling({ chain: SKID, hold: ['f'], change: { id: 'm', k: 2 } });
  assert.ok(!r.ok); assert.match(r.problems.join(' '), /f is built from m/);
  // changing something built from other things
  r = scaling({ chain: SKID, hold: ['mu'], change: { id: 'f', k: 2 } });
  assert.ok(!r.ok); assert.match(r.problems.join(' '), /built from other quantities/);
  // a quantity that is not in the equations
  r = scaling({ chain: ke, hold: ['W'], change: { id: 'q', k: 2 } });
  assert.ok(!r.ok); assert.match(r.problems.join(' '), /isn’t in the equations/);
  // changing the answer itself
  r = scaling({ chain: ke, hold: [], change: { id: 'w', k: 2 } });
  assert.ok(!r.ok); assert.match(r.problems.join(' '), /the answer/);
});

test('a ratio that is not one number says which symbol is still loose', () => {
  const r = scaling({ chain: [{ eq: '{v} = {u} + {a}{t}', solve: 'v' }], hold: ['a', 't'], change: { id: 'u', k: 2 } });
  assert.ok(!r.ok); assert.match(r.problems.join(' '), /still depends on/);
});

test('symbols the student did not mention are noted, not silently assumed', () => {
  const r = scaling({ chain: SKID, hold: ['mu'], change: { id: 'v', k: 2 } });
  assert.ok(r.ok);
  assert.match(r.notes.join(' '), /didn’t say what happens to/);
});

// ------------------------------------------------------------------------------------------------ ranking
const ROLL = '{a} = {g}sin{th}/(1 + {I}/({M}{R}²))';
const race = (cases, extra = {}) => rank({ eq: ROLL, solve: 'a', common: { g: 9.81, th: 30 }, cases, ...extra });

test('rolling race: solid sphere, then solid disc, then hoop, whatever the masses and radii', () => {
  const r = race([
    { label: 'hoop', shape: 'ring', values: { M: 5, R: 0.4 } },
    { label: 'disc', shape: 'disc', values: { M: 0.5, R: 0.1 } },
    { label: 'sphere', shape: 'sphere', values: { M: 9, R: 0.9 } },
  ]);
  assert.ok(r.ok, r.problems.join(' '));
  assert.deepEqual(r.order, ['sphere', 'disc', 'hoop']);
  assert.deepEqual(r.ties, []);
  assert.deepEqual([...r.cancels].sort(), ['M', 'R']);
  const by = Object.fromEntries(r.results.map(x => [x.label, x.value]));
  assert.ok(Math.abs(by.sphere - 9.81 * 0.5 * 5 / 7) < 1e-9, 'a = (5/7) g sin θ');
  assert.ok(Math.abs(by.disc - 9.81 * 0.5 * 2 / 3) < 1e-9, 'a = (2/3) g sin θ');
  assert.ok(Math.abs(by.hoop - 9.81 * 0.5 / 2) < 1e-9, 'a = (1/2) g sin θ');
  assert.ok(r.steps.some(s => /cancel/.test(s.why)));
});

test('the rolling race shows the shape number only: mass and radius are gone from each result', () => {
  const r = race([{ label: 'a', shape: 'sphere' }, { label: 'b', shape: 'shell' }]);
  assert.ok(r.ok, r.problems.join(' '));
  assert.ok(r.results.every(x => !/[MR]/.test(x.expr.replace(/sin/g, ''))), r.results.map(x => x.expr).join(' | '));
  assert.deepEqual(r.order, ['a', 'b']);
});

test('equal results are flagged as ties, and the order can run smallest first', () => {
  const r = race([
    { label: 'big disc', shape: 'disc', values: { M: 8, R: 1 } },
    { label: 'small disc', shape: 'disc', values: { M: 1, R: 0.1 } },
    { label: 'hoop', shape: 'ring' },
  ]);
  assert.deepEqual(r.ties, [['big disc', 'small disc']]);
  assert.equal(r.order.at(-1), 'hoop');
  assert.deepEqual(race([{ label: 'hoop', shape: 'ring' }, { label: 'sphere', shape: 'sphere' }], { order: 'low' }).order, ['hoop', 'sphere']);
});

test('point masses: which arrangement is hardest to spin (largest I = Σ m r²)', () => {
  const r = rank({ eq: '{L} = {I}{w}', solve: 'L', common: { w: 2 }, cases: [
    { label: 'A', masses: [{ m: 1, r: 2 }, { m: 1, r: 2 }] },         // 8
    { label: 'B', masses: [{ m: 2, r: 1 }, { m: 'm', r: 'd' }], values: { m: 1, d: 3 } }, // 2 + 9 = 11
    { label: 'C', masses: [{ m: 4, r: 1 }] },                         // 4
  ] });
  assert.ok(r.ok, r.problems.join(' '));
  assert.deepEqual(r.order, ['B', 'A', 'C']);
  assert.deepEqual(r.results.map(x => x.value), [16, 22, 8]);
});

test('missing values and a single case are explained', () => {
  const r = rank({ eq: '{L} = {I}{w}', solve: 'L', cases: [{ label: 'A', masses: [{ m: 'm', r: 1 }] }, { label: 'B', masses: [{ m: 1, r: 1 }] }] });
  assert.ok(!r.ok); assert.match(r.problems.join(' '), /give a value for/);
  assert.ok(!race([{ label: 'x', shape: 'disc' }]).ok);
});

test('niceRatio prints fractions and roots', () => {
  assert.deepEqual(['4', '1/2', '2/3'].map(s => s), [niceRatio(4), niceRatio(0.5), niceRatio(2 / 3)]);
  assert.deepEqual([niceRatio(Math.SQRT2), niceRatio(Math.SQRT1_2), niceRatio(Math.sqrt(1.5))], ['√2', '1/√2', '√(3/2)']);
  assert.ok(SHAPES.sphere.k === 0.4);
});
