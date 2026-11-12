// Phase C1 engine additions: SI units with prefixes, exp/ln as atoms, systems by matching and strongly connected components.
// Node only (in test:fast). Equations here are test fixtures; none of them is in the app's library.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../js/expr.js';
import { between, seedNote } from './rand.js';

const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const dims = (o) => Object.fromEntries(Object.entries(o).map(([id, u]) => [id, X.parseUnit(u)]));
// both sides of a one-line equation have the same unit
const sidesAgree = (eq, units) => { const { lhs, rhs } = X.parseEq(eq), d = dims(units); return X.dimEq(X.dimOf(lhs, d), X.dimOf(rhs, d)); };

test('units: PV = nRT and Q = CV check, and a wrong one is caught', () => {
  assert.ok(sidesAgree('{P}{V} = {n}{R}{T}', { P: 'Pa', V: 'm³', n: 'mol', R: 'J/(mol·K)', T: 'K' }));
  assert.ok(sidesAgree('{P}{V} = {n}{R}{T}', { P: 'atm', V: 'L', n: 'mol', R: 'J/mol/K', T: 'K' }));
  assert.ok(sidesAgree('{Q} = {C}{V}', { Q: 'C', C: 'F', V: 'V' }));
  assert.ok(sidesAgree('{P} = {I}{V}', { P: 'W', I: 'A', V: 'V' }));
  assert.ok(sidesAgree('{V} = {I}{R}', { V: 'V', I: 'A', R: 'Ω' }));
  assert.ok(!sidesAgree('{P}{V} = {n}{R}', { P: 'Pa', V: 'm³', n: 'mol', R: 'J/(mol·K)' }));
  assert.ok(!X.dimEq(X.parseUnit('A'), X.parseUnit('K')), 'dimEq compares every base, not only m, kg, s');
});

test('units: prefixes convert (mm, μF, kPa, mL, keV) and exact units win over prefixes (min, mol, Pa, T)', () => {
  const cases = [['mm', 1e-3, 'm'], ['μF', 1e-6, 'F'], ['µF', 1e-6, 'F'], ['nC', 1e-9, 'C'], ['kPa', 1e3, 'Pa'], ['MHz', 1e6, 'Hz'],
    ['mL', 1e-6, 'm³'], ['keV', 1.602176634e-16, 'J'], ['kg', 1, 'kg'], ['g', 1e-3, 'kg'], ['cm', 1e-2, 'm'], ['km/h', 1 / 3.6, 'm/s'],
    ['atm', 101325, 'Pa'], ['min', 60, 's'], ['mol', 1, 'mol'], ['T', 1, 'T'], ['mT', 1e-3, 'T'], ['kΩ', 1e3, 'Ω'], ['Ω', 1, 'Ω'],
    ['mA·h', 3.6, 'C'], ['s⁻¹', 1, 'Hz'], ['cm²', 1e-4, 'm²']];
  for (const [u, f, si] of cases){
    assert.ok(close(X.unitFactor(u), f), `${u}: factor ${X.unitFactor(u)}, want ${f}`);
    assert.ok(X.dimEq(X.parseUnit(u), X.parseUnit(si)), `${u}: dimension ${X.dimStr(X.parseUnit(u))}, want ${si}`);
  }
  for (const u of ['kmin', 'Matm', 'xyz', 'mrad']) assert.throws(() => X.parseUnit(u), /unknown unit/, u);
  assert.equal(X.dimStr(X.parseUnit('μF')), 'F');
  assert.equal(X.dimStr(X.parseUnit('kg·m²/s²')), 'J');
  assert.equal(X.dimStr(X.parseUnit('rad/s')), '1/s', 'angular speed is still printed 1/s, not Hz');
});

// ---------------------------------------------------------------- exp and ln
// Put an isolated variable back into the equation: both sides agree at random values (positive sizes).
const ids = (eq) => [...new Set([...eq.matchAll(/\{([^}]+)\}/g)].map(m => m[1]))];
function roundTrip(src, vals, opts = {}){
  const eq = X.parseEq(src), bad = [];
  for (const x of opts.only || ids(src)){
    const iso = X.isolate(eq, x);
    for (let k = 0; k < 5; k++){
      const v = vals();
      delete v[x];
      const got = X.evalNum(iso.tree, v);
      const all = { ...v, [x]: got }, l = X.evalNum(eq.lhs, all), r = X.evalNum(eq.rhs, all);
      if (!close(l, r, 1e-9)) bad.push(`${src} → ${x} at ${JSON.stringify(v)}: ${x} = ${got}, sides ${l} vs ${r}`);
    }
    for (const s of iso.steps) assert.ok(s.why, `${src} → ${x}: a step without a why`);
  }
  assert.deepEqual(bad, [], seedNote);
}

test('exp and ln: parse, evaluate, print back, and refuse ln of a negative', () => {
  assert.ok(close(X.evalNum(X.parse('e^(2)'), {}), Math.E ** 2));
  assert.ok(close(X.evalNum(X.parse('exp({x}) ln {y}'), { x: 1, y: Math.E }), Math.E));
  assert.ok(close(X.evalNum(X.parse('{Q}e^(−{t}/({R}{C}))'), { Q: 5, t: 2, R: 1, C: 2 }), 5 / Math.E));
  const tpl = X.showTree(X.parse('{Q}e^(−{t}/({R}{C}))'), (id) => `{${id}}`);
  assert.ok(close(X.evalNum(X.parse(tpl), { Q: 3, t: 1, R: 2, C: 4 }), 3 * Math.exp(-1 / 8)), tpl);
  assert.throws(() => X.evalNum(X.parse('ln({a} − {b})'), { a: 1, b: 2 }), /positive/);
});

test('exp and ln: simplify as atoms, and cancel each other', () => {
  const s = (src) => { const env = Object.fromEntries(ids(src).map(x => [x, X.symbol(x)])); return X.toText(X.toRat(X.parse(src), env), { fmt: String, order: [] }); };
  assert.equal(s('ln(e^({x}))'), 'x');
  assert.equal(s('e^(ln {x})'), 'x');
  assert.equal(s('ln({x}) + 2 ln({x})'), '3ln x', 'like terms in ln combine');
  assert.equal(s('{q} e^({x}) e^({x})'), 'q e^(2x)');
  assert.equal(s('ln(2.5)'), String(Math.log(2.5)));
});

test('exp and ln: the argument must have no unit', () => {
  const d = dims({ V: 'm³', V1: 'm³', t: 's', R: 'Ω', C: 'F' });
  assert.throws(() => X.dimOf(X.parse('ln {V}'), d), /no unit.*m³/);
  assert.deepEqual(X.dimOf(X.parse('ln({V}/{V1})'), d), {});
  assert.deepEqual(X.dimOf(X.parse('e^(−{t}/({R}{C}))'), d), {}, 'RC is a time');
  assert.throws(() => X.dimOf(X.parse('e^({t})'), d), /no unit/);
  assert.ok(sidesAgree('{W} = {n}{R}{T} ln({V2}/{V1})', { W: 'J', n: 'mol', R: 'J/(mol·K)', T: 'K', V2: 'L', V1: 'L' }));
});

test('exp and ln: W = nRT ln(V₂/V₁) round trip for every variable', () => {
  roundTrip('{W} = {n}{R}{T} ln({V2}/{V1})', () => ({ W: between(100, 5000), n: between(0.5, 3), R: 8.314, T: between(250, 600), V2: between(2, 9), V1: between(1, 9) }));
});

test('exp and ln: q = Q₀e^(−t/RC) solved for t gives RC ln(Q₀/q)', () => {
  const eq = X.parseEq('{q} = {Q0} e^(−{t}/({R}{C}))'), iso = X.isolate(eq, 't');
  for (let k = 0; k < 5; k++){
    const v = { q: between(0.1, 2), Q0: between(2, 5), R: between(100, 5000), C: between(1e-6, 1e-3) };
    const want = v.R * v.C * Math.log(v.Q0 / v.q); // by hand: ln both sides, then multiply by −RC
    assert.ok(close(X.evalNum(iso.tree, v), want), `t = ${X.evalNum(iso.tree, v)}, want ${want} ${seedNote}`);
  }
  assert.ok(iso.steps.some(s => /ln/.test(s.why)), 'one step takes ln of both sides');
  roundTrip('{q} = {Q0} e^(−{t}/({R}{C}))', () => { // t is up to a few time constants RC
    const R = between(100, 5000), C = between(1e-6, 1e-3);
    return { q: between(0.1, 2), Q0: between(2, 5), t: between(0.1, 3) * R * C, R, C };
  });
});
