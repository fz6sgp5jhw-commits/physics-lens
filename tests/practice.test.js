// Test 2: practice bank end to end.
// For each problem: load it, apply the answer-key setup through the UI, confirm "Check my setup"
// passes, run "Show me", and compare the found answers with the expected values.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE } from '../js/data.js';
import { launch, openApp, loadPractice, applyKey, checkSetup } from './helpers.js';

// Expected answers (from CLAUDE.md), in practice-bank order. Signed SI values.
const EXPECTED = [
  { vf: 4.988 },
  { a: 3.206 },
  { dx: -7.089 },
  { N: 92.18 },
  { a: 4.823, t: 2.231 },
  { a: 3.27, Tn: 13.08 },
  { a: 2.146 },
  { mu: 0.25 },
  { dx: 1.766 },
  { mu: 0.2706, Tn: 8.31 },
  { t: 5 },
  { theta: 10 },
  { v: 6 },
];
const close = (got, want) => Math.abs(got - want) <= 1e-3 * Math.abs(want) + 1e-9; // answers are given to 4 significant figures

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

test('expected answers cover every practice problem', () => {
  assert.equal(EXPECTED.length, PRACTICE.length);
  PRACTICE.forEach((p, i) => assert.deepEqual(Object.keys(EXPECTED[i]).sort(), [...p.key.targets].sort(), p.title));
});

PRACTICE.forEach((p, i) => {
  test(`practice ${i + 1}: ${p.ch} / ${p.title}`, async () => {
    const { page, errors } = await openApp(env.browser, env.url);
    try {
      await loadPractice(page, i);
      await applyKey(page, p);
      const chk = await checkSetup(page);
      assert.match(chk.msg, /ALL SET UP CORRECTLY/, `Check my setup did not pass:\n${chk.msg}`);

      await page.click('#showBtn');
      await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 15000 });
      const found = await page.evaluate(() => Object.fromEntries(window.__rl.targets.map(t => [t, window.__rl.found[t].val])));
      for (const [id, want] of Object.entries(EXPECTED[i])) assert.ok(close(found[id], want), `${id}: got ${found[id]}, want ${want}`);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
});
