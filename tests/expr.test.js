// Expression engine: parsing, simplifying, printing and units.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../js/expr.js';
import { EQS, VARS, SAMPLE, PRINT_ORDER, DIMS } from '../js/data.js';

X.setSamples(SAMPLE);
const o = { plain: (id) => VARS[id].plain, order: PRINT_ORDER, spaced: (id) => /[A-Za-zα-ω]{2,}/.test(VARS[id].plain), fmt: (x) => String(+x.toPrecision(4)) };
const sym = Object.fromEntries(Object.keys(VARS).map(id => [id, X.symbol(id)]));
const simp = (sub, env = sym, sign = 1) => X.toText(X.toRat(X.parse(sub), env, sign), o);
const rat = (sub, env = sym) => X.toRat(X.parse(sub), env);

test('simplifier: like terms, common factors, whole sums, tan', () => {
  assert.equal(simp('{g}(sin {inc} − {mu} cos {inc})'), 'g(sin θ − μk cos θ)');
  assert.equal(simp('{m2}{g} / ({m1} + {m2})'), 'm₂g / (m₁ + m₂)');
  assert.equal(simp('{m} + {m} − 2{m}'), '0');
  assert.equal(simp('{W} sin {inc} / ({W} cos {inc})'), 'tan θ');
  assert.equal(simp('{m}{g} sin {inc} / {m}'), 'g sin θ');
  assert.equal(simp('({m1} + {m2}){g} / ({m1} + {m2})'), 'g');
  // T from μk found symbolically: (m₁m₂g(1 + μk)) / (m₁ + m₂) with μk = (m₂g − a(m₁ + m₂)) / (m₁g) → m₂(g − a)
  const mu = rat('[{m2} − {a}({m1} + {m2}) / {g}] / {m1}');
  assert.equal(X.toText(mu, o), '(m₂g − m₁a − m₂a) / (m₁g)');
  assert.equal(simp('{m1}{m2}{g}(1 + {mu}) / ({m1} + {m2})', { ...sym, mu }), 'm₂(g − a)');
});

test('simplifier: square roots', () => {
  const a = rat('{g} sin {inc}');
  const vf = X.toRat(X.parse('±√({v0}² + 2{a}{dx})'), { ...sym, a, v0: X.number(0) }, 1);
  assert.equal(X.toText(vf, o), '√(2gΔx sin θ)');
  assert.equal(simp('{vf}² / (2{dx})', { ...sym, vf }), 'g sin θ'); // √x · √x = x
  assert.equal(simp('√({m}²{g}²)'), 'mg');
  const a2 = rat('{g}(sin {inc} − {mu} cos {inc})');
  const t = X.toRat(X.parse('[−{v0} ± √({v0}² + 2{a}{dx})] / {a}'), { ...sym, a: a2, v0: X.number(0) }, 1);
  assert.equal(X.toText(t, o), '√(2Δx / (g(sin θ − μk cos θ)))');
});

test('numbers and symbols mix', () => {
  assert.equal(simp('{m}{g}', { ...sym, g: X.number(9.81) }), '9.81m');
  assert.equal(simp('½{a}{t}²'), 'at² / 2');
  assert.equal(simp('{dx} / {t}', { ...sym, dx: X.number(0) }), '0');
});

test('units: every template is consistent and has the unit of what it solves for', () => {
  let n = 0;
  for (const [id, eq] of Object.entries(EQS)) for (const [x, sol] of Object.entries(eq.solve)){ assert.ok(X.dimEq(X.dimOf(sol.tree, DIMS), DIMS[x]), `${id} → ${x}`); n++; }
  assert.equal(n, 122); // every solver in the library
  assert.throws(() => X.dimOf(X.parse('{v0} + {a}'), DIMS), /units don’t match: m\/s \+ m\/s²/);
  assert.throws(() => X.dimOf(X.parse('sin {t}'), DIMS), /sin needs an angle/);
});

test('every template: simplified symbolic answer = plain numeric evaluation, at random values', () => {
  const bad = [];
  let n = 0;
  for (const [id, eq] of Object.entries(EQS)) for (const [x, sol] of Object.entries(eq.solve)){
    for (let k = 0; k < 20; k++){
      const vals = {};
      for (const y of eq.vars) if (y !== x) vals[y] = y === 'inc' ? 10 + 60 * Math.random() : SAMPLE[y] * (0.5 + Math.random());
      for (const sign of X.hasPM(sol.tree) ? [1, -1] : [1]){
        let want; try { want = X.evalNum(sol.tree, vals, sign); } catch { continue; }
        if (!isFinite(want)) continue;
        const R = X.toRat(sol.tree, sym, sign), got = X.evalRat(R, vals);
        n++;
        if (!(Math.abs(got - want) <= 1e-7 * Math.max(1, Math.abs(want)))) bad.push(`${id} → ${x} (${sign > 0 ? '+' : '−'}): ${X.toText(R, o)} gives ${got}, template gives ${want}`);
      }
    }
  }
  assert.ok(n > 2000, `only ${n} cases ran`);
  assert.deepEqual(bad.slice(0, 10), []);
});

test('numeric evaluation: ± branches, degrees, division by zero', () => {
  const q = X.parse('[−{v0} ± √({v0}² + 2{a}{dx})] / {a}');
  assert.equal(X.evalNum(q, { v0: 0, a: 2, dx: 4 }, 1), 2);
  assert.equal(X.evalNum(q, { v0: 0, a: 2, dx: 4 }, -1), -2);
  assert.ok(Math.abs(X.evalNum(X.parse('sin {inc}'), { inc: 30 }) - 0.5) < 1e-12);
  assert.ok(Math.abs(X.evalNum(X.parse('sin⁻¹({a} / {g})'), { a: 1, g: 2 }) - 30) < 1e-9);
  assert.throws(() => X.evalNum(X.parse('{dx} / ({v0} + {vf})'), { dx: 1, v0: 2, vf: -2 }, 1, (id) => VARS[id].plain), /v₀ \+ v is zero/);
});
