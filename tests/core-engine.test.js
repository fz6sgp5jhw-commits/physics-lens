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
// fixture symbols get typical values, as library quantities do (the engine reads signs from them)
X.addSamples({ W: 1000, n: 1, R: 8.314, T: 300, V1: 1, V2: 2, q: 1, Q0: 2, t: 1, C: 1e-3, P1: 1, P2: 1, T1: 300, T2: 300, gamma: 1.4, V: 1, a: 1, P: 1, g: 1.4, b: 1 });
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

// ---------------------------------------------------------------- powers that aren't whole numbers
test('powers: Final A Q7, helium compressed adiabatically… expanded to 4 × its volume from 1.20 atm ends at 0.119 atm', () => {
  const P2 = X.evalNum(X.parse('{P1}({V1}/{V2})^{gamma}'), { P1: 1.20, V1: 1, V2: 4, gamma: 5 / 3 });
  assert.ok(Math.abs(P2 - 0.119) < 0.0005, `P₂ = ${P2} atm, the exam's answer is 0.119 atm`);
  const iso = X.isolate(X.parseEq('{P1}{V1}^(5/3) = {P2}{V2}^(5/3)'), 'P2');
  assert.ok(Math.abs(X.evalNum(iso.tree, { P1: 1.20, V1: 1, V2: 4 }) - 0.119) < 0.0005, 'the same with PV^γ written out');
});

test('powers: P₂ = P₁(V₁/V₂)^γ and T₂ = T₁(V₁/V₂)^(γ−1) round trip, including for γ', () => {
  const gas = () => ({ P1: between(0.5, 3), P2: between(0.5, 3), V1: between(1, 5), V2: between(1, 5), T1: between(250, 600), T2: between(250, 600), gamma: between(1.2, 1.7) });
  roundTrip('{P2} = {P1}({V1}/{V2})^{gamma}', gas, { only: ['P2', 'P1', 'V2', 'V1'] });
  roundTrip('{T2} = {T1}({V1}/{V2})^({gamma} − 1)', gas, { only: ['T2', 'T1', 'V2'] });
  roundTrip('{P1}{V1}^(5/3) = {P2}{V2}^(5/3)', gas);
  roundTrip('{V} = {a}³', () => ({ V: between(1, 9), a: between(1, 3) }));
  // solving for γ needs data where γ comes out as it went in: P₂ made from γ, then γ read back
  for (const [src, out] of [['{P2} = {P1}({V1}/{V2})^{gamma}', 'P2'], ['{T2} = {T1}({V1}/{V2})^({gamma} − 1)', 'T2']]){
    const eq = X.parseEq(src), iso = X.isolate(eq, 'gamma'), v = gas();
    v[out] = X.evalNum(eq.rhs, v);
    assert.ok(close(X.evalNum(iso.tree, v), v.gamma), `${src} → γ ${seedNote}`);
    assert.ok(iso.steps.some(s => /ln/.test(s.why)), 'γ comes down with ln');
  }
});

test('powers: units multiply by a numeric exponent; a symbol exponent needs a base with no unit', () => {
  const d = dims({ P: 'Pa', V: 'm³', V1: 'm³', gamma: '' });
  assert.ok(X.dimEq(X.dimOf(X.parse('{P}{V}^(5/3)'), d), X.parseUnit('Pa·m⁵')));
  assert.deepEqual(X.dimOf(X.parse('({V1}/{V})^{gamma}'), d), {});
  assert.throws(() => X.dimOf(X.parse('{V}^{gamma}'), d), /base needs no unit.*ratio/);
  assert.throws(() => X.dimOf(X.parse('{V}^(7/5)'), d), /isn’t a whole unit/);
  assert.throws(() => X.dimOf(X.parse('2^{V}'), d), /pure number/);
  assert.throws(() => X.evalNum(X.parse('({a} − 2)^(1/3)'), { a: 1 }), /negative/);
});

test('powers: simplify and print as atoms', () => {
  const s = (src) => { const env = Object.fromEntries(ids(src).map(x => [x, X.symbol(x)])); return X.toText(X.toRat(X.parse(src), env), { fmt: String, order: [] }); };
  assert.equal(s('{P}({a}/{b})^{g}'), 'P (a / b)^g');
  assert.equal(s('{P}{V}^(5/3)'), 'P V^(5/3)');
  assert.equal(s('{V}^(5/3) {V}^(5/3)'), 'V^(10/3)');
  assert.equal(s('{V}^(1/2)'), s('√({V})'));
  assert.equal(s('8^(1/3)'), '2');
  assert.equal(s('{V}^(4/2)'), 'V²');
});

// ---------------------------------------------------------------- degrees Celsius
test('°C: a temperature adds 273.15, a difference and a compound unit convert by 1', () => {
  const abs = { absolute: true };
  assert.ok(close(X.toSI(20, '°C', abs), 293.15), '20 °C is 293.15 K');
  assert.ok(close(X.toSI(-40, '℃', abs), 233.15), '℃ typed from a keyboard works too');
  assert.ok(close(X.fromSI(293.15, '°C', abs), 20), 'and back');
  assert.equal(X.toSI(80, '°C'), 80, 'a ΔT of 80 °C is 80 K');
  assert.equal(X.toSI(300, 'K', abs), 300);
  assert.equal(X.unitFactor('J/(kg·°C)'), X.unitFactor('J/(kg·K)'));
  assert.ok(X.dimEq(X.parseUnit('J/(kg·°C)'), X.parseUnit('J/(kg·K)')), 'c in J/(kg·°C) is the same quantity as in J/(kg·K)');
  assert.ok(close(X.toSI(4186, 'J/(kg·°C)'), 4186), 'a specific heat in J/(kg·°C) is not offset');
  assert.throws(() => X.toSI(20, '°C·s', abs), /can’t be multiplied or divided/);
  assert.throws(() => X.toSI(20, '°C²', abs), /can’t be multiplied or divided/);
  assert.throws(() => X.parseUnit('k°C'), /unknown unit/, '°C takes no prefix');
});

test('°C: Final B Q6, isobaric 600 → 1200 cm³ from 20 °C ends at 313 °C', () => {
  const abs = { absolute: true }, iso = X.isolate(X.parseEq('{V1}/{T1} = {V2}/{T2}'), 'T2');
  const v = { V1: X.toSI(600, 'cm³'), V2: X.toSI(1200, 'cm³'), T1: X.toSI(20, '°C', abs) };
  const T2 = X.fromSI(X.evalNum(iso.tree, v), '°C', abs);
  assert.ok(Math.abs(T2 - 313) < 0.5, `T₂ = ${T2} °C, the exam's answer is 313 °C`);
  assert.ok(Math.abs(2 * 20 - T2) > 200, 'doubling 20 °C (the slip the offset prevents) would give 40 °C');
});
