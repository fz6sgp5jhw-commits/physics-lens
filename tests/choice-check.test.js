// Phase Q3 gate: checking the options, the facts card, the reasoning line. Node only (in test:fast).
// Expected answers are worked by hand: 4× for double the speed; a typed √2 is the root slip; 86 kJ written 86000 J.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOption, checkOptions, factsCard, reasoning, SLIPS } from '../js/options.js';
import { EQS } from '../js/data.js';

test('options are typed as numbers, ratios or statements', () => {
  assert.deepEqual([parseOption('86 kJ').type, parseOption('86 kJ').unit, parseOption('86 kJ').value], ['number', 'kJ', 86]);
  assert.equal(parseOption('4×').type, 'ratio');
  assert.ok(Math.abs(parseOption('1/√2').value - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(parseOption('−1/2').value + 0.5) < 1e-12);
  assert.equal(parseOption('The angular velocity increases').type, 'statement');
});

test('nothing is marked before the student has committed to a prediction', () => {
  const r = checkOptions({ options: ['2×', '4×', '8×'], derived: { value: 4 } });
  assert.equal(r.committed, false); assert.deepEqual(r.verdicts, []); assert.equal(r.match, null);
  assert.equal(checkOptions({ options: ['2×', '4×'], prediction: 7, derived: { value: 4 } }).committed, false);
  const saved = checkOptions({ options: ['2×', '4×'], prediction: 1 });
  assert.equal(saved.committed, true); assert.deepEqual(saved.verdicts, []);
});

test('the derived result is matched to an option, and each other option is explained by its slip', () => {
  const r = checkOptions({ options: ['2×', '4×', '8×', '1/4×', '√2×'], prediction: 1, derived: { value: 4 } });
  assert.equal(r.match, 1); assert.ok(r.matchedPrediction);
  assert.deepEqual(r.verdicts.map(v => v.ok), [false, true, false, false, false]);
  assert.ok(r.verdicts[0].slips.includes('root') && /square root/.test(r.verdicts[0].why), '2 is √4: forgot to square');
  assert.ok(r.verdicts[2].slips.includes('double'));
  assert.ok(r.verdicts[3].slips.includes('inverse'));
  assert.match(r.verdicts[4].why, /no common slip/, '√2 is not a slip of 4');
});

test('√2 for 2 and a flipped sign are named', () => {
  const r = checkOptions({ options: ['√2', '2', '−2'], prediction: 1, derived: { value: 2 } });
  assert.ok(r.verdicts[0].slips.includes('root'));
  assert.ok(r.verdicts[2].slips.includes('sign'));
});

test('units are compared in SI: 86 kJ is 86000 J, and a missed prefix is named', () => {
  const r = checkOptions({ options: ['86000 J', '86 J', '8.6 kJ'], prediction: 0, derived: { value: 86, unit: 'kJ' } });
  assert.equal(r.match, 0);
  assert.ok(r.verdicts[1].slips.includes('prefix-down'));
});

test('a different match than the prediction is flagged; no match says so', () => {
  assert.equal(checkOptions({ options: ['2', '4'], prediction: 0, derived: { value: 4 } }).matchedPrediction, false);
  assert.match(checkOptions({ options: ['2', '4'], prediction: 0, derived: { value: 9 } }).message, /None of the options/);
});

test('statements are matched by meaning words, and a number option against a statement result is refused', () => {
  const r = checkOptions({ options: ['Linear momentum is conserved', 'Kinetic energy is conserved'], prediction: 0, derived: 'linear momentum is conserved' });
  assert.equal(r.match, 0); assert.match(r.verdicts[1].why, /disagrees/);
  assert.match(checkOptions({ options: ['4'], prediction: 0, derived: 'x' }).verdicts[0].why, /number/);
});

test('every slip handler produces what it claims', () => {
  const d = 4, want = { root: 2, square: 16, inverse: 0.25, sign: -4, half: 2, double: 8, prefix: 4000, 'prefix-down': 0.004 };
  assert.deepEqual(SLIPS.map(s => s.id).sort(), Object.keys(want).sort());
  for (const s of SLIPS) assert.ok(Math.abs(s.make(d) - want[s.id]) < 1e-12, s.id);
});

test('facts card for a rotating rigid body: ω and α are the same everywhere; v, a_t, a_c depend on r', () => {
  const pick = Object.fromEntries(['E7', 'E8', 'E9'].map(k => [k, EQS[k]]));
  const c = factsCard(pick);
  assert.deepEqual(c.sameEverywhere.sort(), ['alpha', 'w']);
  assert.deepEqual(c.dependOnR.sort(), ['ac', 'at', 'v']);
  assert.equal(c.rows.length, 3);
  assert.ok(c.rows.every(r => r.meaning && r.condition), 'built from each equation’s meaning and condition');
});

test('the reasoning line is built from the student’s steps, empty until they act', () => {
  assert.equal(reasoning([]).text, '');
  assert.equal(reasoning([{ said: '  ' }], '(b)').text, '');
  const r = reasoning([{ said: 'momentum is conserved', because: 'no external force acts on the canoes.' }, { said: 'K is not' }], '(c)');
  assert.equal(r.text, 'Momentum is conserved because no external force acts on the canoes. K is not. So the answer is (c).');
  assert.ok(r.editable);
});
