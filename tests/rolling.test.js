// Phase C3 gate: energy with rotation, rolling and angular momentum, solved with symbols through the UI (Show me).
// Rolling down a ramp a = (5/7)g sin θ, (3/5)g sin θ, (2/3)g sin θ; v = √(10gh/7) from height h; K_rot / K = 2/7;
// a disc turned by a hanging mass v = √(2mgh / (m + M/2)) by energy, the same as by forces (v² = 2ah);
// a turntable M = 16K / (D²ω²); a skater ω₂ = I₁ω₁ / I₂ with no outside torque, refused with the reason otherwise.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, addGiven, addTarget, setCondition, confirmConditions } from './helpers.js';
import { rand } from './rand.js';

const UNIT = 'Energy, rolling & L';
let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

// random sizes (SI) for every symbol a test uses: the symbolic answer must hold at any of them
const SIZES = { M: 3, m: 1.5, R: 0.3, g: 9.81, h: 2, inc: 30, v: 4, K: 50, D: 0.6, w: 8, wi: 3, Ii: 2.4, If: 0.8 };
const draw = (ids) => Object.fromEntries(ids.map(id => [id, SIZES[id] * (0.5 + rand())]));

// Switch to the unit, set conditions, enter each given as a symbol, ask for the targets and press Show me.
// Returns the page and, per target, its plain text and its value at several random points.
async function solveSym({ cond, syms, targets, points = 3 }){
  const { page, errors } = await openApp(env.browser, env.url);
  await page.click(`#chPick button:has-text("${UNIT}")`);
  for (const [k, v] of Object.entries(cond)) await setCondition(page, k, v);
  for (const id of syms) await addGiven(page, id, 0, '', 0, { symbol: true });
  await confirmConditions(page);
  for (const t of targets) await addTarget(page, t);
  await page.click('#showBtn');
  await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 20000 });
  const pts = Array.from({ length: points }, () => draw(syms));
  const out = await page.evaluate(async ({ pts }) => {
    const X = await import('./js/expr.js'), S = window.__rl;
    return Object.fromEntries(S.targets.map(t => {
      const f = S.found[t];
      return [t, { symbolic: !!f.expr && !X.isNumeric(f.expr), text: f.expr ? X.toText(f.expr, S.printOpts) : '', at: pts.map(n => X.evalRat(f.expr, n)) }];
    }));
  }, { pts });
  const work = await page.innerText('#work');
  return { page, errors, out, pts, work };
}
const close = (got, want) => Math.abs(got - want) <= 1e-9 * Math.abs(want) + 1e-12;
const sinD = (d) => Math.sin(d * Math.PI / 180);

async function check(spec, verify){
  const r = await solveSym(spec);
  try {
    for (const t of spec.targets) assert.ok(r.out[t].symbolic, `${t} should be symbolic, got "${r.out[t].text}"`);
    await verify(r);
    assert.match(r.work, /CHECK WITH NUMBERS/);
    assert.doesNotMatch(r.work, /✗/);
    assert.deepEqual(r.errors, []);
  } finally { await r.page.close(); }
}

for (const [shape, k, form] of [['sphere', 5 / 7, '5g sin θ / 7'], ['shell', 3 / 5, '3g sin θ / 5'], ['disc', 2 / 3, '2g sin θ / 3']]){
  test(`rolling: down a ramp by forces, ${shape}: a = ${form}`, () => check(
    { cond: { body: 'roll', shape, axis: 'centre', earth: false }, syms: ['M', 'R', 'g', 'inc'], targets: ['a'] },
    ({ out, pts }) => {
      pts.forEach((n, i) => assert.ok(close(out.a.at[i], k * n.g * sinD(n.inc)), `a = ${out.a.text} at ${JSON.stringify(n)}`));
      assert.equal(out.a.text, form);
    }));
}

test('rolling: a solid sphere from height h by energy: v = √(10gh/7)', () => check(
  { cond: { body: 'roll', shape: 'sphere', rest: true, earth: false }, syms: ['M', 'R', 'g', 'h'], targets: ['v'] },
  ({ out, pts }) => {
    pts.forEach((n, i) => assert.ok(close(out.v.at[i], Math.sqrt(10 * n.g * n.h / 7)), `v = ${out.v.text}`));
    assert.equal(out.v.text, '√(10gh / 7)');
  }));

test('rolling: a solid sphere has K_rot / K = 2/7', () => check(
  { cond: { body: 'roll', shape: 'sphere' }, syms: ['M', 'v', 'R'], targets: ['Krot', 'K'] },
  ({ out, pts }) => {
    pts.forEach((n, i) => assert.ok(close(out.Krot.at[i] / out.K.at[i], 2 / 7), `K_rot / K = ${out.Krot.text} / (${out.K.text})`));
    assert.equal(out.K.text, '7Mv² / 10');
    assert.equal(out.Krot.text, 'Mv² / 5');
  }));

test('rolling: a disc turned by a hanging mass, by energy v = √(2mgh / (m + M/2)), the same as by forces', () => check(
  { cond: { body: 'hang', shape: 'disc', rest: true, earth: false }, syms: ['m', 'M', 'R', 'g', 'h'], targets: ['v', 'a'] },
  ({ out, pts }) => {
    pts.forEach((n, i) => {
      assert.ok(close(out.v.at[i], Math.sqrt(2 * n.m * n.g * n.h / (n.m + n.M / 2))), `v = ${out.v.text}`);
      assert.ok(close(out.v.at[i] ** 2, 2 * out.a.at[i] * n.h), `by forces a = ${out.a.text}: v² = 2ah must agree`);
    });
  }));

test('rolling: a turntable of diameter D: M = 16K / (D²ω²)', () => check(
  { cond: { body: 'spin', shape: 'disc', axis: 'centre' }, syms: ['K', 'D', 'w'], targets: ['M'] },
  ({ out, pts }) => {
    pts.forEach((n, i) => assert.ok(close(out.M.at[i], 16 * n.K / (n.D ** 2 * n.w ** 2)), `M = ${out.M.text}`));
    assert.equal(out.M.text, '16K / (D²ω²)');
  }));

test('rolling: a skater pulls their arms in with no outside torque: ω₂ = I₁ω₁ / I₂', () => check(
  { cond: { body: 'spin', noTorque: true }, syms: ['wi', 'Ii', 'If'], targets: ['wf'] },
  ({ out, pts }) => {
    pts.forEach((n, i) => assert.ok(close(out.wf.at[i], n.Ii * n.wi / n.If), `ω₂ = ${out.wf.text}`));
    assert.equal(out.wf.text, 'I₁ω₁ / I₂');
  }));

test('rolling: L₁ = L₂ is refused, with the reason, when an outside torque acts', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click(`#chPick button:has-text("${UNIT}")`);
    await setCondition(page, 'body', 'spin');
    await setCondition(page, 'noTorque', false);
    for (const id of ['wi', 'Ii', 'If']) await addGiven(page, id, 0, '', 0, { symbol: true });
    await confirmConditions(page);
    await addTarget(page, 'wf');
    await page.click('#libBtn');
    assert.match(await page.innerText('#lib [data-eq="AM4"]'), /doesn’t apply here: needs no outside torque/);
    await page.click('#lib [data-gather="AM4"]');
    await page.waitForSelector('#dlg.show');
    const msg = await page.innerText('#dlgMsg');
    assert.match(msg, /DOESN’T APPLY HERE/);
    assert.match(msg, /an outside torque changes L/);
    await page.click('#dlgOk');
    await page.click('#libClose');
    assert.equal(await page.evaluate(() => window.__rl.sheet.includes('AM4')), false, 'L₁ = L₂ stays off the sheet');
    // Show me finds no way to ω₂ without it
    await page.click('#showBtn');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => 'wf' in window.__rl.found), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
