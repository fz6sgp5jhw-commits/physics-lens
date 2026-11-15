// Phase M3 gate: the setup gates (docs/mistake-plan.md section 4), each switchable and each saying the physics when it stops
// the student. In a lesson the equation library stays closed until the target is named; with the right law picked, the route
// card asks why it holds and a decoy reason is explained; two bodies' masses can't mix without an owner; the multiple-choice
// read-back asks what a written relation says before the options are marked. Switched off, a gate lets the student through.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, addGiven } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });
const bubble = (page) => page.innerText('#bubble');
const libOpen = (page) => page.evaluate(() => document.getElementById('libDrawer').classList.contains('open'));
async function openStop(page, l, kind){
  await page.evaluate(async ([l, s]) => window.__rl.course.open(l, s), [l, kind]);
}

test('target gate: in a lesson the library opens only once the target is named; switched off, it opens', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { gates: true });
  try {
    await openStop(page, 'elastic', 'long');
    await page.click('#libBtn');
    assert.equal(await libOpen(page), false, 'closed with no target');
    assert.match(await bubble(page), /Name the target first.*equations you need depend on it/s);
    await page.evaluate(() => { window.__rl.targets.push('v1f'); });
    await page.click('#libBtn');
    assert.equal(await libOpen(page), true, 'open once the target is named');
    await page.click('#libClose');
    await page.evaluate(() => { window.__rl.targets.length = 0; });
    await page.click('#courseBtn');
    await page.click('#gatesBox summary');
    await page.uncheck('#gatesBox [data-gate="target"]');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pl-gates')).target), false, 'the switch is kept in pl-gates');
    await page.click('#courseClose');
    await page.click('#libBtn');
    assert.equal(await libOpen(page), true, 'switched off, the library opens');
    await page.click('#libClose');
    await page.click('#courseBtn');
    await page.click('#gatesForget');
    assert.equal(await page.evaluate(() => localStorage.getItem('pl-gates')), null, 'Forget clears the key');
    assert.equal(await page.isChecked('#gatesBox [data-gate="target"]'), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('why gate: with the right law picked, a decoy reason is explained and the right one confirmed', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { gates: true });
  try {
    await openStop(page, 'elastic', 'long');
    const laws = await page.evaluate(() => window.__rl.course.stop.route.laws);
    await addGiven(page, 'm1', 2, 'kg'); await page.click('#steps [data-stage="2"]');   // the route is asked in Conditions
    for (const k of laws) await page.check(`#routeBox [name=law][value="${k}"]`);
    await page.click('#routeCheck');
    assert.ok(laws.includes('pmomentum'));
    await page.check('#routeBox [name="why-pmomentum"][value^="Momentum is conserved because the speeds"]');
    assert.match(await page.innerText('#routeBox .rwhy'), /✗ .*isn’t why\. Speeds have nothing to do with it/);
    await page.check('#routeBox [name="why-pmomentum"][value^="No outside force"]');
    assert.match(await page.innerText('#routeBox .rwhy'), /✓ Yes: No outside force/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('owner gate: a mass with no owner next to numbered ones asks whose it is; Cancel keeps it out', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { gates: true });
  try {
    await openStop(page, 'elastic', 'transfer');
    await addGiven(page, 'm1', 0.8, 'kg');
    await addGiven(page, 'm', 0.4, 'kg');
    await page.waitForSelector('#dlg.show');
    assert.match(await page.innerText('#dlgMsg'), /EACH MASS HAS AN OWNER[\s\S]*one body’s mass into the other’s equations/);
    await page.click('#dlgCancel');
    assert.equal(await page.evaluate(() => 'm' in window.__rl.givens), false, 'not added');
    assert.equal(await page.evaluate(() => 'm1' in window.__rl.givens), true);
    await page.click('#edSave');
    await page.waitForSelector('#dlg.show');
    await page.click('#dlgOk');
    assert.equal(await page.evaluate(() => window.__rl.givens.m?.val), 0.4, 'kept when the student says it has its own owner');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('read-back gate: a written relation is read back before the options are marked', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { gates: true });
  try {
    await page.click('#mcBtn');
    await page.click('#mcHost .mctabs button:has-text("Check the options")');
    await page.fill('#mc-options textarea >> nth=0', 'Δp₁ = −Δp₂ always\nIt depends on the speeds\nΔp₁ = Δp₂');
    await page.selectOption('#mc-options select >> nth=0', '1');
    await page.fill('#mc-options input[placeholder^="your result"]', 'Δp₁ = −Δp₂');
    await page.click('#mc-options >> text=Check');
    const out = await page.innerText('#mc-options .mcout');
    assert.match(out, /Read it back first.*equal and opposite, whatever the speeds/s);
    assert.ok(!/[ABC]: [✓✗]/.test(out), 'nothing is marked yet');
    await page.selectOption('#mcBack', '0');
    await page.click('#mc-options >> text=Check');
    assert.match(await page.innerText('#mc-options .mcout'), /Your result picks A, but you predicted B/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
