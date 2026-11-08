// Phase 7 gate: axes, ticks and gap labels, typed coordinates, the rotation-axis marker, letters and fade; and a force split on tilted axes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const screen = (page, x, y) => page.evaluate(([a, b]) => window.__rl.build.toScreen(a, b), [x, y]);
async function drag(page, from, to){
  const a = await screen(page, from.x, from.y), b = await screen(page, to.x, to.y);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up();
}
async function click(page, p){ const a = await screen(page, p.x, p.y); await page.mouse.click(a.x, a.y); }
const answer = async (page, text) => { await page.fill('#dfPopIn', text); await page.press('#dfPopIn', 'Enter'); };
const tool = (page, name) => page.click(`[data-dftool="${name}"]`);
const texts = (page, sel) => page.evaluate((q) => [...document.querySelectorAll(q)].map(e => e.textContent), sel);   // SVG text has no innerText
const tk = (page) => page.evaluate(() => window.__rl.tk.state());

async function drawRodAndBlocks(page){
  await page.click('[data-bshape="rod"]');
  for (let i = 0; i < 3; i++) await page.click('[data-bshape="block"]');
  return page.evaluate(() => {
    const B = window.__rl.build, rod = B.shapes.find(s => s.kind === 'rod'), blocks = B.shapes.filter(s => s.kind === 'block');
    Object.assign(rod, { x: 440, y: 260, w: 480, h: 10 });
    blocks.forEach((b, i) => Object.assign(b, { x: 200 + 240 * i, y: 260 - 5 - b.h / 2 }));
    B.snap();
    return { rod: rod.id, blocks: blocks.map(b => ({ id: b.id, x: b.x, y: b.y })) };
  });
}

test('blocks at x = −L/2, 0, L/2 on axes through the rod’s centre; gaps L/2 and L/2; rotation axis ⊙ at the centre; letters and fade', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    const { rod, blocks } = await drawRodAndBlocks(page);
    const mid = { x: 440, y: 260 };
    // axes: a click places the origin, snapped onto the rod’s centre
    await tool(page, 'axes'); await click(page, mid);
    let t = await tk(page);
    assert.ok(Math.hypot(t.axes.x - 440, t.axes.y - 260) < 1 && t.axes.ang === 0);
    // gaps as dimension lines between the rod’s ticks (ends and centre are ticks already)
    await tool(page, 'dim');
    await drag(page, { x: 200, y: 260 }, mid); await answer(page, 'L/2');
    await drag(page, mid, { x: 680, y: 260 }); await answer(page, 'L/2');
    assert.deepEqual((await texts(page, '.dfdimtxt')), ['L/2', 'L/2']);
    // coordinates typed on the blocks
    await tool(page, 'coord');
    for (const [b, v] of [[blocks[0], '−L/2'], [blocks[1], '0'], [blocks[2], 'L/2']]){ await click(page, b); await answer(page, v); }
    t = await tk(page);
    assert.deepEqual(blocks.map(b => t.coords[`b:${b.id}`]), ['−L/2', '0', 'L/2']);
    assert.deepEqual(await texts(page, '.dfcoord'), ['x = −L/2', 'x = 0', 'x = L/2']);
    // a coordinate is a name from the line of symbols, never markup
    await click(page, blocks[1]); await page.fill('#dfPopIn', '<b>x</b>'); await page.press('#dfPopIn', 'Enter');
    assert.ok(await page.isVisible('#dfPopErr'), 'markup is refused');
    await page.click('#dfPop button[type=button]');
    // the rotation axis: ⊙ at the centre, again for a dashed line, again to remove it
    await tool(page, 'axis'); await click(page, mid);
    assert.equal(await page.locator('.dfrotdot').count(), 1);
    assert.equal((await tk(page)).axis.key, `r:${rod}:0.5`);
    await click(page, mid); assert.equal(await page.locator('.dfrotaxis').count(), 1);
    await click(page, mid); assert.equal(await page.locator('.dfrotdot, .dfrotaxis').count(), 0);
    await click(page, mid);
    // a tick the student adds, then removes
    await tool(page, 'tick'); await click(page, { x: 320, y: 260 });
    assert.deepEqual((await tk(page)).ticks[rod], [0.25]);
    await click(page, { x: 320, y: 260 });
    assert.deepEqual((await tk(page)).ticks[rod], []);
    // point letters are optional
    assert.equal(await page.locator('.dfletter').count(), 0);
    await page.click('#dfLetters');
    assert.deepEqual(await texts(page, '.dfletter'), ['A', 'B', 'C']);
    // the fade control only changes the look
    await page.evaluate(() => { const f = document.getElementById('dfFade'); f.value = '40'; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); });
    assert.equal((await tk(page)).fade, 0.4);
    assert.equal(await page.evaluate(() => document.getElementById('bd').style.getPropertyValue('--dffade')), '0.4');
    // they reach the knowns list once the drawing is done
    await tool(page, 'select'); await page.click('#doneDraw');
    const k = (await page.innerText('#dfKnowns')).replace(/\s+/g, ' ');
    assert.match(k, /x\(Block 1\) = −L\/2 toolkit/); assert.match(k, /x\(Block 3\) = L\/2/);
    // undo steps back through the toolkit like any drawing change
    assert.equal(await page.evaluate(() => window.__rl.build.undo()), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('on a ramp, W is split onto tilted axes and labelled', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await page.evaluate(() => window.__rl.build.template('incline'));
    const blk = await page.evaluate(() => { const b = window.__rl.build.shapes.find(s => s.kind === 'block'); return { x: b.x, y: b.y }; });
    await tool(page, 'axes'); await click(page, blk);
    let t = await tk(page);
    assert.ok(Math.hypot(t.axes.x - blk.x, t.axes.y - blk.y) < 1, 'the origin snaps onto the block');
    // turn x by its handle onto the ramp: it clicks to the ramp’s angle and shows it
    await drag(page, { x: blk.x + 150, y: blk.y }, { x: blk.x + 150 * Math.cos(Math.PI / 6) + 3, y: blk.y - 150 * Math.sin(Math.PI / 6) + 2 });
    t = await tk(page);
    assert.equal(t.axes.ang, await page.evaluate(() => window.__rl.build.theta));
    assert.equal((await texts(page, '.dfaxang'))[0], '30°');
    // draw W straight down from the block, and name it
    await tool(page, 'force'); await drag(page, blk, { x: blk.x + 2, y: blk.y + 110 }); await answer(page, 'W');
    t = await tk(page);
    assert.equal(t.forces.length, 1); assert.equal(t.forces[0].label, 'W'); assert.deepEqual([t.forces[0].ux, t.forces[0].uy], [0, 1], 'it snaps to straight down');
    // split onto the tilted axes: parts of W sin θ and W cos θ in length, each labelled by the student
    await tool(page, 'split'); await click(page, { x: blk.x, y: blk.y + 55 });
    const lens = await page.evaluate(() => [...document.querySelectorAll('.dfproj')].map(l => Math.hypot(l.getAttribute('x2') - l.getAttribute('x1'), l.getAttribute('y2') - l.getAttribute('y1'))));
    const L = t.forces[0].len;
    assert.ok(Math.abs(lens[0] - L * Math.sin(Math.PI / 6)) < 0.5 && Math.abs(lens[1] - L * Math.cos(Math.PI / 6)) < 0.5, `projection lengths ${lens}`);
    await page.locator('[data-flab$=":x"]').click(); await answer(page, 'W sin θ');
    await page.locator('[data-flab$=":y"]').click(); await answer(page, '−W cos θ');
    t = await tk(page);
    assert.deepEqual([t.forces[0].split.lx, t.forces[0].split.ly], ['W sin θ', '−W cos θ']);
    assert.deepEqual(await texts(page, '.dfprojlab'), ['W sin θ', '−W cos θ']);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('splitting a force needs the axes first; guided mode shows none of the toolkit', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await page.click('[data-bshape="block"]');
    const b = await page.evaluate(() => { const s = window.__rl.build.shapes.find(q => q.kind === 'block'); return { x: s.x, y: s.y }; });
    await tool(page, 'force'); await drag(page, b, { x: b.x, y: b.y + 100 }); await answer(page, 'W');
    await tool(page, 'split'); await click(page, { x: b.x, y: b.y + 50 });
    assert.equal((await tk(page)).forces[0].split, null);
    await page.click('#modeBtn [data-mode="guided"]');
    assert.equal(await page.locator('.dftk, .dfconns').count(), 0);
    assert.equal(await page.isVisible('#dfTools'), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
