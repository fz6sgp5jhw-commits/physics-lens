// Phase B gate test: the motion ladder.
// Motor shaft: θ(t) = (250 rad/s)t − (20.3 rad/s²)t² − (1.44 rad/s³)t³. When is ω = 0?
// Expect ω(t) = 250 − 40.6t − 4.32t² and t = 4.24 s, with the root −13.6 s rejected.
// Also: "acceleration varies with time" greys out the constant-α equations; ∫dt needs a start value.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, setCondition, confirmConditions, addTarget, addFunction } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const ROTATION = 'Rotation kinematics';
async function rotation(page){ await page.click(`#chPick button:has-text("${ROTATION}")`); }

// "⏱ time when X = value": the editor opens for X at the moment the question asks about
async function addTimeWhen(page, id, value){
  await page.selectOption('#addTarget', `when:${id}`);
  await page.fill('#edVal', String(value));
  await page.click('#edSave');
}
const solved = (page) => page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => S.isKnown(t)) && !S.busy; }, null, { timeout: 15000 });
const fnText = (page, id) => page.evaluate(async (id) => { const S = window.__rl; return S.funcs[id] ? S.polyText(S.funcs[id].poly) : null; }, id);

test('motor shaft: ω(t) by d/dt, then the time when ω = 0 (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await setCondition(page, 'varA', true);
    await addFunction(page, 'theta', [0, 250, -20.3, -1.44]);
    assert.equal(await fnText(page, 'theta'), '250t − 20.3t² − 1.44t³');
    await confirmConditions(page); // Conditions opens once Setup has a given
    // the constant-α equations no longer apply
    const greyed = await page.evaluate(() => ['E1', 'E2', 'E3', 'E4', 'E5'].map(e => document.querySelector(`#lib [data-eq="${e}"]`)?.classList.contains('na')));
    assert.deepEqual(greyed, [true, true, true, true, true], 'constant-α equations should be greyed out');
    // the calculus ladder sits at the top of Solve: θ → ω = dθ/dt → α = dω/dt, with θ(t) on its rung
    const calc = await page.innerText('#calcSolve');
    assert.match(calc, /ω = dθ\/dt/); assert.match(calc, /α = dω\/dt/); assert.match(calc, /θ\(t\) given/); assert.match(calc, /start value/);
    await addTarget(page, 'fn:w');
    await addTimeWhen(page, 'w', 0);
    await page.click('#showBtn');
    await solved(page);

    assert.equal(await fnText(page, 'w'), '250 − 40.6t − 4.32t²');
    const t = await page.evaluate(() => window.__rl.found.t.val);
    assert.ok(Math.abs(t - 4.2425) < 0.001, `t = ${t}`);
    const work = await page.innerText('#work');
    assert.match(work, /4\.24/);
    assert.match(work, /−13\.6\d* s.*reject/is);
    // the path used the ladder, not a constant-α equation
    const path = await page.evaluate(() => window.__rl.path.map(p => p.kind + ':' + p.v));
    assert.deepEqual(path, ['deriv:fn:w', 'solveT:t']);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('∫dt needs the start value, and keeps symbols as coefficients', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await setCondition(page, 'varA', true);
    await addFunction(page, 'alpha', [4, 0, -0.6]); // α(t) = 4 − 0.6t²
    await confirmConditions(page);
    await addTarget(page, 'fn:w');
    // no ω₀ yet: the ladder can't integrate, so ω(t) is unreachable
    assert.match(await page.innerText('#sheetStatus'), /can’t reach|Even the whole library/);
    // ω₀ as a symbol
    await page.evaluate(() => [...document.querySelectorAll('#palette button')].find(b => b.title === 'Add initial angular velocity').click());
    await page.click('#editorSlot [data-kind="symbol"]');
    await page.click('#edSave');
    await addTarget(page, 'fn:theta');
    await page.click('#showBtn');
    await solved(page);
    assert.equal(await fnText(page, 'w'), 'ω₀ + 4t − 0.2t³');
    assert.equal(await fnText(page, 'theta'), 'ω₀t + 2t² − 0.05t⁴');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('evaluate a function at a known time', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rotation(page);
    await setCondition(page, 'varA', true);
    await addFunction(page, 'theta', [0, 250, -20.3, -1.44]);
    await confirmConditions(page);
    await page.evaluate(() => [...document.querySelectorAll('#palette button')].find(b => b.title === 'Add elapsed time').click());
    await page.fill('#edVal', '2'); await page.click('#edSave');
    await addTarget(page, 'alpha'); // α at t = 2 s: α(t) = −40.6 − 8.64t → −57.88
    await page.click('#showBtn');
    await solved(page);
    const a = await page.evaluate(() => window.__rl.found.alpha.val);
    assert.ok(Math.abs(a + 57.88) < 1e-9, `α = ${a}`);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
