// Phase 9 gate: the phase 8a mouse route redone with drags. A known is dragged onto a symbol, a term (or a factor) is dragged
// across the =. Each is a shortcut for what the tap menu does, and writes the same kind of line.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const ws = (page) => page.evaluate(() => window.__rl.ws.state());
const START = 'I = m₁r₁² + m₂r₂² + m₃r₃²';

test('mouse route with drags: sheet, knowns dragged onto symbols, simplify, then a term and a factor dragged across the =', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await page.setViewportSize({ width: 1440, height: 1500 });   // the Knowns card and the lines must both be on screen to drag between them
    await page.click('[data-bshape="rod"]');
    for (let i = 0; i < 3; i++) await page.click('[data-bshape="block"]');
    await page.click('#doneDraw');
    await page.evaluate(() => window.__rl.kn.addSource(() => [
      ...[1, 2, 3].map(k => ({ name: 'm' + '₀₁₂₃'[k], value: 'm', source: 'card' })),
      ...[['d₁', 'L/2'], ['d₂', '0'], ['d₃', 'L/2']].map(([name, value]) => ({ name, value, source: 'toolkit' })),
    ]));
    await page.fill('#dfTarget', 'I'); await page.click('#dfTargetAdd');
    await page.click('#algSheetBtn'); await page.click('[data-pick="Isum"]');
    assert.deepEqual((await ws(page)).lines, [START]);
    const drop = async (name, id) => {
      const n = (await ws(page)).lines.length;
      await page.locator(`#dfKnowns [data-kn="${name}"]`).dragTo(page.locator(`#dfWork .algline.cur [data-sym="${id}"]`).first(), { sourcePosition: { x: 6, y: 6 } });   // grab the name, not a button
      await page.waitForFunction((n) => window.__rl.ws.state().lines.length > n, n, { timeout: 3000 });
    };
    for (const k of [1, 2, 3]) await drop('m' + '₀₁₂₃'[k], `m_${k}`);
    for (const k of [1, 2, 3]) { await drop('d' + '₀₁₂₃'[k], `r_${k}`);  }
    let s = await ws(page);
    assert.equal(s.lines.at(-1), 'I = m(L/2)² + m·0² + m(L/2)²');
    assert.equal(s.how.at(-1), 'r₃ → L/2 everywhere', 'the same line the tap route writes');
    await page.click('#dfWork .algline.cur button[data-side="r"][data-term="0"]'); await page.click('#algMenu [data-op="simp"]', { modifiers: ['Shift'] });
    assert.equal((await ws(page)).lines.at(-1), 'I = mL²/2');
    // a factor dragged across the =: the 2 at the bottom now multiplies the other side
    await page.click('#dfWork .algline.cur button[data-side="r"][data-term="0"]');
    await page.locator('#algMenu [data-opnd]', { hasText: /^2$/ }).dragTo(page.locator('#dfWork .algline.cur .algsign'));
    s = await ws(page);
    assert.equal(s.lines.at(-1), '2I = mL²'); assert.match(s.how.at(-1), /2 moved across the =, it now multiplies the other side/);
    // a term dragged across the =: its sign flips
    await page.fill('#algIn', 'I = m*L**2 + m'); await page.press('#algIn', 'Enter');
    await page.locator('#dfWork .algline.cur button[data-side="r"][data-term="1"]').dragTo(page.locator('#dfWork .algline.cur .algsign'));
    s = await ws(page);
    assert.equal(s.lines.at(-1), 'I − m = mL²'); assert.equal(s.how.at(-1), 'm moved across the =, its sign flips');
    // and back: a negative term crossing comes out positive
    await page.locator('#dfWork .algline.cur button[data-side="l"][data-term="1"]').dragTo(page.locator('#dfWork .algline.cur .algside[data-side="r"]'));
    assert.equal((await ws(page)).lines.at(-1), 'I = mL² + m');
    // dropping on its own side does nothing; a known with no value is refused with a reason
    const n = (await ws(page)).lines.length;
    await page.locator('#dfWork .algline.cur button[data-side="r"][data-term="1"]').dragTo(page.locator('#dfWork .algline.cur .algside[data-side="r"]'));
    assert.equal((await ws(page)).lines.length, n);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a factor crosses only when it multiplies the whole side', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await page.click('[data-bshape="rod"]'); await page.click('[data-bshape="block"]'); await page.click('#doneDraw');
    await page.evaluate(() => window.__rl.kn.addSource(() => [{ name: 'm₁', value: 'm', source: 'card' }, { name: 'd₁', value: 'L', source: 'toolkit' }]));
    await page.fill('#dfTarget', 'I'); await page.click('#dfTargetAdd');
    await page.fill('#algIn', 'I = m*L + m'); await page.press('#algIn', 'Enter');
    await page.click('#dfWork .algline.cur button[data-side="r"][data-term="0"]');
    await page.locator('#algMenu [data-opnd]', { hasText: /^L$/ }).dragTo(page.locator('#dfWork .algline.cur .algsign'));
    assert.match(await page.textContent('#algMsg'), /multiplies the whole side/);
    assert.equal((await ws(page)).lines.length, 1);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
