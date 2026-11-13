// The problem stays in view (sticky bar under the header), and the Tools menu holds the secondary buttons and closes after use.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

test('the problem bar stays on screen while scrolling, shows typed text as text, and expands', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    assert.ok(await page.isHidden('#pinBar'), 'no problem text yet: no bar');
    await page.fill('#problem', 'A disc turns <b>fast</b>. Find ω after 2.0 s.');
    assert.ok(await page.isVisible('#pinBar'));
    assert.equal(await page.textContent('#pinText'), 'A disc turns <b>fast</b>. Find ω after 2.0 s.');
    assert.equal(await page.locator('#pinText b').count(), 0, 'text, never HTML');
    await page.evaluate(() => window.scrollTo(0, 800));
    const top = await page.$eval('#pinBar', (e) => e.getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 200, `bar is pinned near the top (${top})`);
    await page.click('#pinToggle');
    assert.equal(await page.getAttribute('#pinToggle', 'aria-expanded'), 'true');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('Tools menu: Practice, Course, libraries, Board, Notebook and Multiple choice are inside it, and it closes after a pick', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    for (const id of ['bankBtn', 'courseBtn', 'libBtn', 'diagBtn', 'boardBtn', 'nbBtn', 'mcBtn'])
      assert.equal(await page.locator(`#toolsMenu #${id}`).count(), 1, id);
    await page.click('summary:has-text("Tools")');
    assert.ok(await page.evaluate(() => document.getElementById('toolsMenu').open));
    await page.click('#boardBtn');
    assert.ok(!await page.evaluate(() => document.getElementById('toolsMenu').open), 'closes after a pick');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
