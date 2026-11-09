// Phase C1 engine additions: SI units with prefixes, exp/ln as atoms, systems by matching and strongly connected components.
// Node only (in test:fast). Equations here are test fixtures; none of them is in the app's library.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../js/expr.js';

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
