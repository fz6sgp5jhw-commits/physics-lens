// Phase E1 gate: one workspace. At 1440×900, after solving a problem, the problem statement, the canvas,
// the side panel (conditions + diagrams that write equations) and the latest solved card are all on screen
// together, without scrolling. The library is a drawer; the work opens under the sheet's cards.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE } from '../js/data.js';
import { launch, openApp, loadPractice, applyKey } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const inView = (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel); if (!el) return { sel, missing: true };
  const r = el.getBoundingClientRect();
  return { sel, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), ok: r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
}, sel);

test('statement, canvas, side diagrams and the latest solved card fit on one 1440×900 screen (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await loadPractice(page, 4); // sled: a, then t
    await applyKey(page, PRACTICE[4]);
    await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return S.targets.every(t => S.isKnown(t)) && !S.busy; });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    for (const sel of ['#problem', '#dg', '#condCard', '#sheet .eq.last']){
      const r = await inView(page, sel);
      assert.ok(r.ok, `${sel} is not fully on screen: ${JSON.stringify(r)}`);
    }
    // the latest solved card shows what it found
    assert.match(await page.innerText('#sheet .eq.last'), /t = 2\.231 s/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the library is a drawer, and gathering from it puts the equation on the sheet', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    assert.equal(await page.evaluate(() => document.getElementById('libDrawer').classList.contains('open')), false);
    await page.click('#libBtn');
    assert.equal(await page.evaluate(() => document.getElementById('libDrawer').classList.contains('open')), true);
    await page.click('#lib [data-gather="X1"]');
    assert.deepEqual(await page.evaluate(() => window.__rl.sheet), ['X1']);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('libDrawer').classList.contains('open')), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('in Forces mode the canvas shows the setup and the free-body builder sits beside it', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('[data-dtab="build"]'); await page.click('[data-template="incline"]');
    await page.click('[data-dtab="forces"]');
    assert.ok((await inView(page, '#bd')).ok, 'setup canvas visible');
    assert.ok((await inView(page, '#fbd')).ok || (await page.evaluate(() => document.getElementById('fbd').getBoundingClientRect().top < innerHeight)), 'free-body builder visible');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
