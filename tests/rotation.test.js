// Phase 3 gate test: rotation. Numbers worked by hand:
//  Fan blade ω(t) = γ − βt², γ = 12 rad/s, β = 3 rad/s³:
//    α(t) = dω/dt = −6t; ω = 0 at t = √(γ/β) = 2 s (−2 s rejected);
//    θ(t) = 12t − t³ (θ(0) = 0); from t = 0 to ω = 0: Δθ = θ(2) = 16 rad, N = 16/2π = 2.546 rev;
//    α_avg = (ω(2) − ω(0)) / 2 = (0 − 12)/2 = −6 rad/s²; ω_avg = 16/2 = 8 rad/s.
//    From t = 1 s to t = 3 s ω changes sign at 2 s: Δθ = θ(3) − θ(1) = 9 − 11 = −2 rad,
//    but it travels |16 − 11| + |9 − 16| = 5 + 7 = 12 rad.
//  θ(t) = 6t − t³: ω = 6 − 3t² = 0 at t = √2; θ = 0 again at t = √6 (t = 0 is the start).
//    Δθ = θ(√6) − θ(√2) = 0 − 4√2 = −5.657 rad, N = −0.9003 rev; ω < 0 throughout, so θ_trav = 5.657 rad.
//  Point at r = 0.5 m with ω = 4 rad/s, α = 3 rad/s²: aₜ = 1.5, a꜀ = 8, a = √(1.5² + 8²) = 8.139 m/s².
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, setCondition, confirmConditions, addTarget, addFunction, addGiven, openStage } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const rotation = (page) => page.click('#chPick button:has-text("Rotation kinematics")');
const solved = (page) => page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => S.isKnown(t)) && !S.busy; }, null, { timeout: 15000 });
const fnText = (page, id) => page.evaluate((id) => { const S = window.__rl; return S.funcs[id] ? S.polyText(S.funcs[id].poly) : null; }, id);
const found = (page, id) => page.evaluate((id) => window.__rl.found[id]?.val, id);
const near = (got, want, tol = 1e-3) => assert.ok(Math.abs(got - want) < tol, `got ${got}, want ${want}`);
// the two moments: ['t', 2] is t = 2 s; ['w', 0] is "when ω = 0"
async function setSpan(page, a, b){
  await openStage(page, 3);
  for (const [k, [x, v, dir = 0]] of [['A', a], ['B', b]]){
    await page.selectOption(`#span${k}x`, x);
    await page.fill(`#span${k}v`, String(v));
    if (x !== 't') await page.selectOption(`#span${k}d`, String(dir));
    await page.dispatchEvent(`#span${k}v`, 'change');
  }
}
async function timeWhen(page, id, value){
  await page.selectOption('#addTarget', `when:${id}`);
  await page.fill('#edVal', String(value));
  await page.click('#edSave');
}

test('one-box function entry: γ − βt² with symbols, preview, units (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await setCondition(page, 'varA', true);
    await page.evaluate(() => [...document.querySelectorAll('#palette button')].find(b => b.title === 'Add final angular velocity').click());
    await page.click('#editorSlot [data-kind="fn"]');
    await page.fill('#edFn', 'gamma - beta t^2');
    const prev = await page.innerText('#edFnPreview');
    assert.match(prev, /ω\(t\) = γ − βt²/);
    assert.match(prev, /γ is a constant in rad\/s/); assert.match(prev, /β is a constant in rad\/s³/);
    await page.fill('#edFn', 'γ − β²t²'); // a constant squared has no single unit
    assert.match(await page.innerText('#edFnPreview'), /stand on its own/);
    await page.fill('#edFn', 'γ − βt²');
    await page.click('#edSave');
    assert.equal(await fnText(page, 'w'), 'γ − βt²');
    await confirmConditions(page);
    await addTarget(page, 'fn:alpha');
    await timeWhen(page, 'w', 0);
    await page.click('#showBtn');
    await solved(page);
    assert.equal(await fnText(page, 'alpha'), '−2βt');
    const t = await page.evaluate(async () => { const { SAMPLE } = await import('./js/data.js'); const S = window.__rl; return [S.found.t.val, Math.sqrt(SAMPLE.c_γ / SAMPLE.c_β)]; });
    near(t[0], t[1], 1e-9);
    assert.match(await page.innerText('#work'), /√/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('fan blade: α(t), average α and revolutions from t = 0 to ω = 0 (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await setCondition(page, 'varA', true);
    await addFunction(page, 'w', '12 − 3t²');
    await confirmConditions(page);
    await addTarget(page, 'fn:alpha');
    await addTarget(page, 'aavg');
    await addTarget(page, 'nrev');
    await addTarget(page, 'wavg');
    await setSpan(page, ['t', 0], ['w', 0]);
    await page.click('#showBtn');
    await solved(page);
    assert.equal(await fnText(page, 'alpha'), '−6t');
    near(await found(page, 'aavg'), -6);
    near(await found(page, 'nrev'), 16 / (2 * Math.PI));
    near(await found(page, 'wavg'), 8);
    const work = await page.innerText('#sheetWin');
    assert.match(work, /−2 s.*reject/is, 'the negative root is listed as rejected');
    // the sheet's span card names both moments
    assert.match(await page.innerText('#spanCard'), /t = 0 s/); assert.match(await page.innerText('#spanCard'), /ω = 0/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('fan blade: from t = 1 s to t = 3 s it turns back, so Δθ and the angle travelled differ (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await setCondition(page, 'varA', true);
    await addFunction(page, 'w', '12 − 3t²');
    await confirmConditions(page);
    await addTarget(page, 'dth');
    await addTarget(page, 'dtrav');
    await setSpan(page, ['t', 1], ['t', 3]);
    await page.click('#showBtn');
    await solved(page);
    near(await found(page, 'dth'), -2);
    near(await found(page, 'dtrav'), 12);
    assert.match(await page.innerText('#sheetWin'), /changes direction/i);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('θ(t) given: revolutions between "ω = 0" and "θ = 0" (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await setCondition(page, 'varA', true);
    await addFunction(page, 'theta', '6t − t³');
    await confirmConditions(page);
    await addTarget(page, 'nrev');
    await addTarget(page, 'dtrav');
    await setSpan(page, ['w', 0], ['theta', 0]);
    await page.click('#showBtn');
    await solved(page);
    near(await found(page, 'nrev'), -4 * Math.SQRT2 / (2 * Math.PI));
    near(await found(page, 'dtrav'), 4 * Math.SQRT2);
    const work = await page.innerText('#sheetWin');
    assert.match(work, /t = 0 s is where it starts/);
    // the path used the ladder (ω from θ) for the "ω = 0" moment
    const kinds = await page.evaluate(() => window.__rl.path.map(p => p.kind));
    assert.ok(kinds.includes('deriv') && kinds.includes('span'), kinds.join(','));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a point on the wheel: aₜ, a꜀ and total a, offered even before tracking a point (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await addGiven(page, 'w', 4, 'rad/s');
    await addGiven(page, 'alpha', 3, 'rad/s²');
    await confirmConditions(page);
    // "Track a point" is off, but the target list still offers the point's quantities
    await addTarget(page, 'pt:at');
    assert.equal(await page.evaluate(() => window.__rl.cond.rim), true);
    await addGiven(page, 'r', 0.5, 'm');
    await addTarget(page, 'ac');
    await addTarget(page, 'atot');
    await page.click('#showBtn');
    await solved(page);
    near(await found(page, 'at'), 1.5, 1e-9);
    near(await found(page, 'ac'), 8, 1e-9);
    near(await found(page, 'atot'), Math.hypot(1.5, 8), 1e-9);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
