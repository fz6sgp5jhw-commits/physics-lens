// Test 4: browser smoke test.
// Page loads with no console errors; calm mode hides the gags; diagram hotspots respond.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

test('loads with no console errors, in each unit', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { calm: false });
  try {
    assert.ok(await page.locator('#bd').isVisible(), 'the setup canvas shows first');
    await page.click('[data-dtab="motion"]');
    assert.ok(await page.locator('#dg').isVisible(), 'the motion canvas shows in Motion mode');
    for (const title of ['Tension & pulleys', 'Rotation kinematics', 'Inclines & Newton’s laws']){
      await page.click(`#chPick button:has-text("${title}")`);
      await page.waitForTimeout(150);
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the background field runs, and calm mode freezes it (and remembers)', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { calm: false });
  try {
    assert.equal(await page.evaluate(() => window.__rl.field.running), true, 'field should animate by default');
    await page.click('#calmBtn');
    assert.equal(await page.getAttribute('#calmBtn', 'aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => window.__rl.field.running), false, 'calm mode should stop the field');
    await page.reload();
    await page.waitForFunction(() => window.__rl);
    assert.equal(await page.evaluate(() => window.__rl.field.running), false, 'calm mode not remembered after reload');
    assert.equal(await page.evaluate(() => document.body.classList.contains('calm')), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('no cartoon gags are left on the page', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { calm: false });
  try {
    assert.equal(await page.locator('.gag, #mascot, #galaxy, .deco, #boot').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('diagram hotspots respond in each unit', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('[data-dtab="motion"]');
    for (const title of ['Inclines & Newton’s laws', 'Tension & pulleys', 'Rotation kinematics']){
      await page.click(`#chPick button:has-text("${title}")`);
      await page.waitForTimeout(150);
      const spots = await page.evaluate(() => window.__rl.hot.map(h => ({ x: h.x, y: h.y, kind: h.kind, id: h.id, name: h.name })));
      assert.ok(spots.length > 0, `${title}: no hotspots registered`);
      const box = await page.locator('#dg').boundingBox();
      const size = await page.evaluate(() => ({ w: document.getElementById('dg').width, h: document.getElementById('dg').height }));
      const sp = spots[0];
      await page.evaluate(() => document.getElementById('inspector').innerHTML = '');
      await page.mouse.click(box.x + sp.x * box.width / size.w, box.y + sp.y * box.height / size.h);
      const txt = await page.innerText('#inspector');
      assert.ok(txt.trim().length > 0 && !/CLICK THE DIAGRAM/.test(txt), `${title}: clicking ${sp.kind} ${sp.id || sp.name} did nothing`);
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('calm mode hides the SOLVED burst', async () => {
  const { page, errors } = await openApp(env.browser, env.url); // calm on
  try {
    await page.click('#bankBtn'); await page.click('[data-load="0"]');
    await page.evaluate(() => { document.getElementById('solved').dataset.seen = ''; new MutationObserver(() => { if (document.getElementById('solved').classList.contains('show')) document.getElementById('solved').dataset.seen = '1'; }).observe(document.getElementById('solved'), { attributes: true }); });
    const { applyKey } = await import('./helpers.js');
    const { PRACTICE } = await import('../js/data.js');
    await applyKey(page, PRACTICE[0]);
    await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return S.targets.every(t => t in S.found) && !S.busy; });
    assert.equal(await page.evaluate(() => document.getElementById('solved').dataset.seen), '');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
