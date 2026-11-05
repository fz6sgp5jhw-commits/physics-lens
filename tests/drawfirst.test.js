// Phase E2 (revised): draw first. Drawing the ramp and the block defines θ and m; the free-body diagram is drawn
// on the same picture (the setup fades); each drawn force joins the collection of quantities.
// Example: m and θ given, at rest: find the friction force and whether it moves.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, setCondition, confirmConditions, addTarget } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

// drag on the setup canvas from a body's centre along one of its named directions, then pick the force
async function drawForce(page, kind, dir){
  const { x, y, dx, dy } = await page.evaluate((dir) => {
    const S = window.__rl, b = S.build.bodies()[0], c = S.build.screenOf(b.id), u = S.fbdScreenDir(b, dir);
    return { x: c.x, y: c.y, dx: u.x, dy: u.y };
  }, dir);
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx * 50, y + dy * 50, { steps: 4 }); await page.mouse.move(x + dx * 110, y + dy * 110, { steps: 4 });
  await page.mouse.up();
  await page.click(`#forcePick [data-fkind="${kind}"]`);
}
async function editChip(page, id, value){
  await page.click(`#knowns [data-edit="${id}"]`);
  await page.click('#editorSlot [data-kind="value"]');
  await page.fill('#edVal', String(value));
  await page.click('#edSave');
}

test('draw the ramp and block: θ and m appear; draw W, N, f on the faded setup; they join the collection', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    assert.equal(await page.evaluate(() => window.__rl.dtab), 'build', 'the setup canvas comes first');
    await page.click('[data-bshape="ramp"]'); await page.click('[data-bshape="block"]');
    // drop the block onto the ramp
    await page.evaluate(() => { const S = window.__rl, r = S.build.shapes.find(s => s.kind === 'ramp'), b = S.build.shapes.find(s => s.kind === 'block'); b.x = r.x + r.w * 0.5; b.y = 470 - r.w * 0.5 * Math.tan(S.build.theta * Math.PI / 180) - 30; S.build.snap(); });
    assert.deepEqual(await page.evaluate(() => window.__rl.build.contacts().map(c => `${c.body}→${c.surface}`)), ['block→ramp']);
    const givens = await page.evaluate(() => Object.entries(window.__rl.givens).filter(([, g]) => g.from === 'drawing').map(([id]) => id).sort());
    assert.deepEqual(givens, ['inc', 'm']);
    // the free-body diagram is drawn on the same canvas, over the faded setup
    await page.click('[data-dtab="forces"]');
    assert.equal(await page.evaluate(() => document.querySelector('#bd .setup').classList.contains('faded')), true);
    await drawForce(page, 'gravity', 'down');
    await drawForce(page, 'normal', 'perp-out');
    await setCondition(page, 'friction', true);
    await drawForce(page, 'friction', 'up-slope');
    const forces = await page.evaluate(() => { const S = window.__rl, b = S.build.bodies()[0]; return S.fbd.forces[b.id].map(f => `${f.kind}:${f.dir}`); });
    assert.deepEqual(forces, ['gravity:down', 'normal:perp-out', 'friction:up-slope']);
    assert.equal(await page.locator('#bd [data-arrow]').count(), 3, 'arrows are drawn on the setup');
    // each force joins the collection of quantities
    assert.match(await page.innerText('#forceChips'), /W = mg.*N.*f/s);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('at rest: f = mg sin θ, and "does it move?" is answered (numbers, then symbols)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('[data-template="incline"]');
    await setCondition(page, 'friction', true);
    await setCondition(page, 'still', true);
    await confirmConditions(page);
    await page.click('[data-dtab="forces"]');
    await drawForce(page, 'gravity', 'down');
    await drawForce(page, 'normal', 'perp-out');
    await drawForce(page, 'friction', 'up-slope');
    await page.click('#fbdWrite');
    // symbols first: θ and m come from the drawing as symbols (g is 9.81 from "On Earth"); μs as a symbol
    await page.evaluate(() => [...document.querySelectorAll('#palette button')].find(b => b.title === 'Add coefficient of static friction').click());
    await page.click('#editorSlot [data-kind="symbol"]'); await page.click('#edSave');
    await addTarget(page, 'f');
    await addTarget(page, 'N'); // "does it move?" compares f with μs N
    await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return S.targets.every(t => S.isKnown(t)) && !S.busy; });
    const f = await page.evaluate(async () => { const X = await import('./js/expr.js'), S = window.__rl; return X.toText(S.found.f.expr, S.printOpts); });
    assert.equal(f, '9.81m sin θ'); // g comes from "On Earth" as a number
    assert.match(await page.innerText('#matters'), /Does it move\?.*stays put while.*μs.*tan θ/s);
    // now numbers: m = 4 kg, θ = 30°, μs = 0.5 → needs 19.62 N, static friction can give at most 16.99 N → it moves
    await editChip(page, 'm', 4); await editChip(page, 'inc', 30); await editChip(page, 'mus', 0.5);
    await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return S.targets.every(t => S.isKnown(t)) && !S.busy; });
    assert.ok(Math.abs(await page.evaluate(() => window.__rl.found.f.val) - 19.62) < 0.01);
    assert.match(await page.innerText('#matters'), /Does it move\?.*It moves.*16\.99 N.*19\.62 N/s);
    // θ = 20°: needs 13.42 N, can give 18.44 N → it stays put
    await editChip(page, 'inc', 20);
    await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return S.targets.every(t => S.isKnown(t)) && !S.busy; });
    assert.match(await page.innerText('#matters'), /Does it move\?.*It stays put.*18\.44 N.*13\.42 N/s);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
