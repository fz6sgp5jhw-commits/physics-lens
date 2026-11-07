// Phase 4b gate: two homework problems solved through the UI in the order a student meets them
// (This problem row in Setup → givens → conditions → targets → Show me), plus a drawn flywheel that doesn't lock Solve.
// Flywheel: r = 0.400 m, from rest, α = 0.700 rad/s²; after 2.00 s: aₜ = rα = 0.280, a_rad = ω²r = (αt)²r = 0.784,
// a = √(aₜ² + a_rad²) = 0.8325 m/s². Disk: α–t graph a straight line through (0, 0) and (5, 6) → α(t) = 1.2t, from rest:
// θ(t) = 0.2t³, θ(5) = 25 rad = 3.979 rev.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, addGiven, addFunction, setCondition, confirmConditions, addTarget, openStage } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const rotation = (page) => page.click('#chPick button:has-text("Rotation kinematics")');
const kind = (page, key, i) => page.click(`#kindRow [data-ck="${key}"][data-i="${i}"]`);
const showMe = async (page) => {
  await page.click('#showBtn');
  await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 15000 });
};
const found = (page) => page.evaluate(() => Object.fromEntries(window.__rl.targets.map(t => [t, window.__rl.found[t].val])));
const near = (got, want) => assert.ok(Math.abs(got - want) < 1e-3 * want, `got ${got}, want ${want}`);

test('flywheel (a)–(c): "a point on it" in Setup brings r; radial and resultant are named; each part builds on the last', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    assert.equal(await page.locator('#palette button[title*="distance of the point"]').count(), 0, 'no r before the choice');
    await kind(page, 'rim', 1);
    assert.equal(await page.getAttribute('#kindRow [data-ck="rim"][data-i="1"]', 'aria-pressed'), 'true');
    await addGiven(page, 'r', 0.4, 'm');
    await addGiven(page, 'alpha', 0.7, 'rad/s²', 0);
    await addGiven(page, 't', 2, 's');
    await setCondition(page, 'rest', true);
    await confirmConditions(page);
    await openStage(page, 3);
    const opts = await page.$$eval('#addTarget option', os => os.map(o => o.textContent).join('\n'));
    assert.match(opts, /radial \(centripetal\) acceleration/); assert.match(opts, /resultant \(total\) acceleration/);
    await addTarget(page, 'at'); await showMe(page);
    await addTarget(page, 'ac'); await showMe(page);
    await addTarget(page, 'atot'); await showMe(page);
    const f = await found(page);
    near(f.at, 0.28); near(f.ac, 0.784); near(f.atot, 0.8325);
    assert.match(await page.innerText('#knowns'), /found · \(a\)[\s\S]*found · \(b\)/, 'aₜ from (a) and a꜀ from (b) stay as knowns');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('α from a graph: "varies with time" in Setup opens the function box (with the graph hint); N = 3.98 rev in the first 5 s', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await page.click('#addGivenBtn');
    await page.click('#palette button[title="Add angular acceleration"]');
    assert.match((await page.textContent('#editorSlot')).replace(/\s+/g, ' '), /Pick varies with time under This problem/);
    await page.click('#edCancel');
    await kind(page, 'varA', 1);
    await page.click('#palette button[title="Add angular acceleration"]');
    await page.click('#editorSlot [data-kind="fn"]');
    assert.match((await page.textContent('#editorSlot')).replace(/\s+/g, ' '), /straight-line graph.*slope/);
    await page.click('#edCancel');
    await addFunction(page, 'alpha', '1.2t');
    await setCondition(page, 'rest', true);
    await confirmConditions(page);
    const opts = await page.evaluate(() => [...document.querySelectorAll('#addTarget option')].map(o => o.textContent).join('\n'));
    assert.match(opts, /revolutions turned between two moments \(like “in the first 5 s”\)/);
    await addTarget(page, 'nrev');
    await page.fill('#spanBv', '5'); await page.dispatchEvent('#spanBv', 'change');
    await showMe(page);
    near((await found(page)).nrev, 25 / (2 * Math.PI));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a drawn flywheel with an ω arrow is its motion diagram: Forces passes and Solve opens', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await page.click('[data-template="wheel"]');
    await addGiven(page, 'alpha', 0.7, 'rad/s²', 0);
    await confirmConditions(page);
    assert.equal(await page.locator('#steps [data-stage="1"].done').count(), 0, 'a bare wheel: no diagram yet');
    await openStage(page, 0);
    await page.click('[data-tool="omega"]');
    const p = await page.evaluate(() => { const s = window.__rl.build.shapes[0]; return window.__rl.build.toScreen(s.x + s.r + 10, s.y); });
    await page.mouse.click(p.x, p.y);
    assert.equal(await page.locator('#steps [data-stage="1"].done').count(), 1, 'the ω arrow passes Forces');
    await openStage(page, 3);
    assert.equal(await page.isHidden('#sheetLock'), true, 'Solve is open');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
