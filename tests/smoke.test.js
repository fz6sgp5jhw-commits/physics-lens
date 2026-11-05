// Test 4: browser smoke test.
// Page loads with no console errors; calm mode hides the gags; diagram hotspots respond.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const visibleGags = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.gag, .deco, #galaxy')].filter(el => getComputedStyle(el).display !== 'none' && el.getClientRects().length).length);

test('loads with no console errors, in each unit', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { calm: false });
  try {
    assert.ok(await page.locator('#dg').isVisible(), 'diagram canvas visible');
    for (const title of ['Tension & pulleys', 'Rotation kinematics', 'Inclines & Newton’s laws']){
      await page.click(`#chPick button:has-text("${title}")`);
      await page.waitForTimeout(150);
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('calm mode hides the gags (and remembers it)', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { calm: false });
  try {
    assert.ok(await visibleGags(page) > 0, 'gags should be visible before calm mode');
    await page.click('#calmBtn');
    assert.equal(await page.getAttribute('#calmBtn', 'aria-pressed'), 'true');
    assert.equal(await visibleGags(page), 0, 'gags still visible in calm mode');
    await page.reload();
    await page.waitForFunction(() => window.__rl && !document.getElementById('boot'));
    assert.equal(await visibleGags(page), 0, 'calm mode not remembered after reload');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('diagram hotspots respond in each unit', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
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
