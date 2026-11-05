// Phase C gate test: build canvas + free-body diagrams.
// Ramp pushed by F = kt (frictionless, angle θ, from rest), axes + up the slope:
//   a = (k cosθ/m)t − g sinθ; a = 0 at t* = mg tanθ/k; v(t) = (k cosθ/2m)t² − g sinθ·t
//   (still sliding down at t*, stops at 2t*); N = mg cosθ + kt sinθ.
// Also: the free-body checker, general system detection, sample-value sliders.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, setCondition, confirmConditions, addTarget, addGiven, addFunction } from './helpers.js';
import { gather } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const solved = (page) => page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => S.isKnown(t)) && !S.busy; }, null, { timeout: 20000 });
const text = (page, what) => page.evaluate(async (what) => {
  const X = await import('./js/expr.js'), S = window.__rl;
  if (what.startsWith('fn:')) return S.polyText(S.funcs[what.slice(3)].poly);
  return X.toText(S.found[what].expr, S.printOpts);
}, what);

async function rampSetup(page){
  await setCondition(page, 'friction', false);
  await setCondition(page, 'upAxis', true);
  await setCondition(page, 'varA', true);
  await setCondition(page, 'rest', true);
  await setCondition(page, 'earth', false);
  await confirmConditions(page);
  for (const id of ['m', 'inc', 'g']) await addGiven(page, id, 0, '', 0, { symbol: true });
  await addFunction(page, 'Fp', ['', 'k', '', '']); // F(t) = k·t, k a new symbol in N/s
  // build: the incline template puts a block on a ramp
  await page.click('[data-dtab="build"]');
  await page.click('[data-template="incline"]');
  // forces on the block
  await page.click('[data-dtab="forces"]');
  await page.click('[data-addforce="gravity"]');
  await page.click('[data-addforce="normal"]');
  await page.click('[data-addforce="push"]');
  await page.selectOption('[data-fvar="2"]', 'Fp');
  await page.selectOption('[data-fdir="2"]', 'horiz-in');
}

test('ramp pushed by F = kt: a(t), t*, v(t), N(t) (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rampSetup(page);
    // the build canvas knows the block touches the ramp
    const contacts = await page.evaluate(() => window.__rl.build.contacts().map(c => `${c.body}→${c.surface}`));
    assert.deepEqual(contacts, ['block→ramp']);
    // the component table is computed by code
    const table = await page.innerText('#fbdTable');
    assert.match(table, /F\s.*F cos θ.*−F sin θ/s);
    await page.click('#fbdCheck');
    assert.match(await page.innerText('#fbdMsg'), /looks right/i);
    await page.click('#fbdWrite');
    const sheet = await page.evaluate(() => window.__rl.sheet.filter(e => e.startsWith('G')).map(e => window.__rl.eqText(e)));
    assert.deepEqual(sheet, ['F cos θ − mg sin θ = ma', 'N − mg cos θ − F sin θ = 0']);

    await addTarget(page, 'fn:a');
    await page.selectOption('#addTarget', 'when:a'); await page.fill('#edVal', '0'); await page.click('#edSave');
    await addTarget(page, 'fn:vf');
    await addTarget(page, 'vf');
    await addTarget(page, 'fn:N');
    await page.click('#showBtn');
    await solved(page);

    assert.equal(await text(page, 'fn:a'), '(k cos θ / m)t − g sin θ');
    assert.equal(await text(page, 't'), 'mg tan θ / k');
    assert.equal(await text(page, 'fn:vf'), '(k cos θ / (2m))t² − g sin θ·t');
    assert.equal(await text(page, 'fn:N'), 'mg cos θ + k sin θ·t');
    // still sliding down at t* (v < 0 with + up the slope), and it stops at 2t*
    const check = await page.evaluate(async () => {
      const X = await import('./js/expr.js'), S = window.__rl;
      const out = [];
      for (let i = 0; i < 5; i++){
        const vals = { m: 1 + 4 * Math.random(), g: 9.81, inc: 10 + 60 * Math.random(), c_k: 0.5 + 5 * Math.random() }; // k is stored as c_k
        const tStar = X.evalRat(S.found.t.expr, vals), vAt = X.evalRat(S.found.vf.expr, vals);
        const vNum = S.funcs.vf.poly.map(c => X.evalRat(c, vals));
        const stop = X.polySolve(X.polyFromNumbers(vNum), X.number(0)).roots.map(r => r.x).filter(x => x > 1e-9);
        out.push({ tStar, want: vals.m * vals.g * Math.tan(vals.inc * Math.PI / 180) / vals.c_k, vAt, stop });
      }
      return out;
    });
    for (const c of check){
      assert.ok(Math.abs(c.tStar - c.want) < 1e-9 * c.want, `t* = ${c.tStar}, want ${c.want}`);
      assert.ok(c.vAt < 0, 'still sliding down at t*');
      assert.equal(c.stop.length, 1);
      assert.ok(Math.abs(c.stop[0] - 2 * c.tStar) < 1e-9 * c.tStar, `stops at ${c.stop[0]}, want 2t* = ${2 * c.tStar}`);
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('free-body checker: missing gravity, missing normal, stray friction, wrong direction', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await setCondition(page, 'friction', false); await confirmConditions(page);
    await page.click('[data-dtab="build"]'); await page.click('[data-template="incline"]');
    await page.click('[data-dtab="forces"]');
    await page.click('[data-addforce="normal"]');
    await page.selectOption('[data-fdir="0"]', 'down');
    await page.click('[data-addforce="friction"]');
    await page.click('#fbdCheck');
    const msg = await page.innerText('#fbdMsg');
    assert.match(msg, /gravity/i);
    assert.match(msg, /normal force.*perpendicular/i);
    assert.match(msg, /friction.*frictionless/i);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('general system detection: T5 and T6 share T and a, combine them', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('#chPick button:has-text("Tension & pulleys")');
    await setCondition(page, 'friction', false); await setCondition(page, 'earth', false); await confirmConditions(page);
    for (const id of ['m1', 'm2', 'g']) await addGiven(page, id, 0, '', 0, { symbol: true });
    for (const e of ['P2', 'P5', 'P6']) await gather(page, e);
    await addTarget(page, 'a');
    await page.click('#sheet [data-eq="P2"] [data-solve]');
    await page.waitForFunction(() => !window.__rl.busy && 'W2' in window.__rl.found);
    await page.click('#sysBtn');
    await page.waitForFunction(() => window.__rl.sheet.some(e => e.startsWith('G')));
    const g = await page.evaluate(() => window.__rl.sheet.find(e => e.startsWith('G')));
    await page.click(`#sheet [data-eq="${g}"] [data-solve]`);
    await page.waitForFunction(() => !window.__rl.busy && 'a' in window.__rl.found);
    assert.equal(await text(page, 'a'), 'm₂g / (m₁ + m₂)');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('sample-value sliders move the replay values for symbols', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await rampSetup(page);
    await page.click('[data-dtab="motion"]');
    const before = await page.evaluate(() => window.__rl.sampleOf('m'));
    await page.$eval('#sliders [data-slider="m"]', (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input')); }, before * 2);
    assert.equal(await page.evaluate(() => window.__rl.sampleOf('m')), before * 2);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
