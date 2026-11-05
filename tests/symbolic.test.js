// Phase A gate test: all 13 practice problems solve with symbols and match their numeric answers.
// Every stated given is entered as a symbol (g too); hidden givens (from rest, stops, constant speed) stay 0.
// Show me builds the symbolic answer; evaluating it at the problem's numbers must give the expected answer.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE, VARS } from '../js/data.js';
import { launch, openApp, loadPractice, applyKey, checkSetup } from './helpers.js';

const EXPECTED = [
  { vf: 4.988 }, { a: 3.206 }, { dx: -7.089 }, { N: 92.18 }, { a: 4.823, t: 2.231 },
  { a: 3.27, Tn: 13.08 }, { a: 2.146 }, { mu: 0.25 }, { dx: 1.766 }, { mu: 0.2706, Tn: 8.31 },
  { t: 5 }, { theta: 10 }, { v: 6 },
];
// Simplified forms the engine should reach (plain text). Not every answer is listed, only the classic ones.
const FORMS = {
  0: { vf: '√(2gΔx sin θ)' },
  1: { a: 'g(sin θ − μk cos θ)' },
  2: { dx: '−v₀² / (2g sin θ)' },
  3: { N: 'mg cos θ' },
  5: { a: 'm₂g / (m₁ + m₂)', Tn: 'm₁m₂g / (m₁ + m₂)' },
  4: { t: '√(2Δx / (g(sin θ − μk cos θ)))' },
  6: { a: 'g(m₂ − μk m₁) / (m₁ + m₂)' },
  7: { mu: 'm₂ / m₁' },
  8: { dx: 'm₂gt² / (2(m₁ + m₂))' },
  9: { Tn: 'm₂(g − a)' },
  10: { t: '2θ / ω₀' },
  11: { theta: '(ω² − ω₀²) / (2α)' },
  12: { v: 'rαt' },
};
const close = (got, want) => Math.abs(got - want) <= 1e-3 * Math.abs(want) + 1e-9;

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

PRACTICE.forEach((p, i) => {
  test(`symbolic ${i + 1}: ${p.ch} / ${p.title}`, async () => {
    const { page, errors } = await openApp(env.browser, env.url);
    try {
      await loadPractice(page, i);
      await applyKey(page, p, { symbols: true });
      const chk = await checkSetup(page);
      assert.match(chk.msg, /ALL SET UP CORRECTLY/, `Check my setup did not accept the symbols:\n${chk.msg}`);

      await page.click('#showBtn');
      await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 15000 });

      // the problem's numbers, as magnitudes in SI (a symbol stands for the size; the direction carries the sign)
      const nums = Object.fromEntries(Object.entries(p.key.givens).map(([id, [mag, unit]]) => [id, mag * VARS[id].units[unit]]));
      const out = await page.evaluate(async ({ nums }) => {
        const X = await import('./js/expr.js'), S = window.__rl;
        return Object.fromEntries(S.targets.map(t => {
          const f = S.found[t];
          return [t, { symbolic: !!f.expr && !X.isNumeric(f.expr), value: f.expr ? X.evalRat(f.expr, nums) : NaN, text: f.expr ? X.toText(f.expr, S.printOpts) : '' }];
        }));
      }, { nums });
      for (const [id, want] of Object.entries(EXPECTED[i])){
        assert.ok(out[id].symbolic, `${id} should be a symbolic answer, got "${out[id].text}"`);
        assert.ok(close(out[id].value, want), `${id} = ${out[id].text} gives ${out[id].value} at the problem's numbers, want ${want}`);
        if (FORMS[i]?.[id]) assert.equal(out[id].text, FORMS[i][id]);
      }
      // the work shows the numeric check at random values, and it passed
      assert.match(await page.innerText('#work'), /CHECK WITH NUMBERS/);
      assert.doesNotMatch(await page.innerText('#work'), /✗/);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
});
