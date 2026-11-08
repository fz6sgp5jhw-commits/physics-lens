// Phase 6a gate: drawing-first mode, Done drawing, a dot and a card per part, the summary with its conflicts.
// Worked example: three blocks of mass m clamped at the ends and centre of a light rod.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

// a rod with three blocks sitting on it: at its left end, centre and right end (ids sorted left to right)
async function drawRodAndBlocks(page){
  await page.click('[data-bshape="rod"]');
  for (let i = 0; i < 3; i++) await page.click('[data-bshape="block"]');
  return page.evaluate(() => {
    const B = window.__rl.build, rod = B.shapes.find(s => s.kind === 'rod'), blocks = B.shapes.filter(s => s.kind === 'block');
    Object.assign(rod, { x: 440, y: 260, w: 480, h: 10 });
    blocks.forEach((b, i) => Object.assign(b, { x: 200 + 240 * i, y: 260 - 5 - b.h / 2 }));
    B.snap();
    return { rod: rod.id, blocks: blocks.map(b => b.id) };
  });
}
const pick = async (page, part, group, choice) => {
  await page.click(`[data-dot="${part}"]`);
  await page.click(`#dfCard [data-group="${group}"] [data-choice="${choice}"]`);
};
const counter = (page) => page.textContent('#dfCount');

test('guided mode still opens today’s flow; drawing-first is the default and the choice is remembered', async () => {
  const guided = await openApp(env.browser, env.url);
  try {
    const p = guided.page;
    assert.equal(await p.evaluate(() => window.__rl.mode), 'guided');
    assert.ok(await p.isVisible('#steps'), 'the four stages show');
    assert.ok(await p.isVisible('#problem'), 'the problem box shows');
    assert.ok(await p.isVisible('#showBtn') || await p.locator('#showBtn').count(), 'Show me is still there');
    assert.equal(await p.isVisible('#doneDraw'), false, 'no Done drawing in guided mode');
    assert.deepEqual(guided.errors, []);
  } finally { await guided.page.close(); }

  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    assert.equal(await page.evaluate(() => window.__rl.mode), 'draw');
    assert.equal(await page.evaluate(() => window.__rl.ch), 'torque', 'the first scope is the torque unit');
    assert.equal(await page.isVisible('#steps'), false);
    assert.equal(await page.isVisible('#problem'), false, 'no problem text box in drawing-first mode');
    assert.ok(await page.isVisible('#doneDraw'));
    // switching to guided is remembered; switching back to the default forgets it
    await page.click('#modeBtn [data-mode="guided"]');
    assert.equal(await page.evaluate(() => localStorage.getItem('pl-mode')), 'guided');
    assert.ok(await page.isVisible('#steps'));
    await page.click('#modeBtn [data-mode="draw"]');
    assert.equal(await page.evaluate(() => localStorage.getItem('pl-mode')), null);
    assert.ok(await page.isVisible('#doneDraw'));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('rod and three blocks: Done drawing gives each part a dot; every card answered; the summary closes', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    const { rod, blocks } = await drawRodAndBlocks(page);
    assert.equal(await page.locator('[data-dot]').count(), 0, 'nothing pops up while drawing');
    await page.click('#doneDraw');
    // a dot with a title on every part, and the whole system
    const titles = await page.evaluate(() => [...document.querySelectorAll('[data-dot]')].map(d => d.dataset.title));
    assert.deepEqual(titles, ['Rod', 'Block 1', 'Block 2', 'Block 3', 'System']);
    assert.equal(await counter(page), '0 of 5 parts set');

    // the rod's card: its groups, each choice with its plain line and what it adds; the rod glows, the rest dims
    await page.click(`[data-dot="${rod}"]`);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#dfCard [data-group]')].map(g => g.dataset.group)), ['mass', 'held']);
    assert.match(await page.innerText('#dfCard'), /Negligible mass.*Adds:/s);
    assert.ok(await page.locator('#dfCard [data-group="mass"] [data-choice="unsure"]').count(), '“Not sure” is always an option');
    assert.equal(await page.evaluate((id) => document.querySelector(`#bd [data-id="${id}"]`).classList.contains('dfglow'), rod), true);
    assert.equal(await page.evaluate((id) => document.querySelector(`#bd [data-id="${id}"]`).classList.contains('dfdim'), blocks[0]), true);
    await pick(page, rod, 'mass', 'light');
    await pick(page, rod, 'held', 'free');
    assert.equal(await counter(page), '1 of 5 parts set');

    // a block on the rod gets the stationary groups only (nothing moves: no motion group)
    await page.click(`[data-dot="${blocks[0]}"]`);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#dfCard [data-group]')].map(g => g.dataset.group)), ['size', 'mass', 'held', 'where']);
    const where = ['left', 'centre', 'right'];
    for (const [i, b] of blocks.entries()){
      await pick(page, b, 'size', 'point');
      await pick(page, b, 'mass', 'has');
      await pick(page, b, 'held', 'clamped');
      await pick(page, b, 'where', where[i]);
    }
    assert.equal(await counter(page), '4 of 5 parts set');
    await pick(page, 'system', 'gravity', 'none');
    await pick(page, 'system', 'motion', 'eq');
    assert.equal(await counter(page), '5 of 5 parts set');

    // every part set: the summary opens by itself
    assert.ok(await page.isVisible('#dfSummary'));
    const sum = await page.innerText('#dfSummary');
    assert.match(sum, /Rod.*Negligible mass/s);
    assert.match(sum, /Block 2.*Point mass.*Clamped to the rod.*Centre/s);
    assert.match(sum, /Assumed.*Rigid.*Overturned by/is, 'the assumed defaults are listed with what overturns them');
    assert.match(sum, /No conflicts/);
    assert.equal(await page.isDisabled('#dfClose'), false);
    await page.click('#dfClose');
    assert.equal(await page.evaluate(() => window.__rl.df.closed), true);
    // guided mode keeps the drawing but shows no dots
    await page.click('#modeBtn [data-mode="guided"]');
    assert.equal(await page.locator('[data-dot]').count(), 0);
    await page.click('#modeBtn [data-mode="draw"]');
    assert.equal(await page.locator('[data-dot]').count(), 5);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a block marked free while drawn on the rod is named as a conflict; the summary closes once it is fixed', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    const { rod, blocks } = await drawRodAndBlocks(page);
    await page.click('#doneDraw');
    await pick(page, rod, 'mass', 'light'); await pick(page, rod, 'held', 'free');
    for (const b of blocks){ await pick(page, b, 'size', 'point'); await pick(page, b, 'mass', 'has'); await pick(page, b, 'held', 'clamped'); await pick(page, b, 'where', 'centre'); }
    await pick(page, blocks[1], 'held', 'free');
    await pick(page, 'system', 'gravity', 'none'); await pick(page, 'system', 'motion', 'eq');
    assert.ok(await page.isVisible('#dfSummary'));
    assert.match(await page.innerText('#dfSummary'), /Block 2 is drawn on the rod, but it is marked free/);
    assert.equal(await page.isDisabled('#dfClose'), true, 'it closes only when there are no conflicts');
    assert.equal(await page.evaluate((id) => document.querySelector(`[data-dot="${id}"]`).classList.contains('conflict'), blocks[1]), true);
    // a choice that needs a missing part is a conflict too: the rod held by a pivot, with no pivot drawn
    await pick(page, rod, 'held', 'pivot');
    await page.click('#dfSumBtn');
    assert.match(await page.innerText('#dfSummary'), /Rod is not drawn on a pivot/);
    // fix both: the summary closes
    await pick(page, rod, 'held', 'free');
    await pick(page, blocks[1], 'held', 'clamped');
    await page.click('#dfSumBtn');
    assert.match(await page.innerText('#dfSummary'), /No conflicts/);
    await page.click('#dfClose');
    assert.equal(await page.evaluate(() => window.__rl.df.closed), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
