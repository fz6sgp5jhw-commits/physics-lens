// Phase 6b gate: the connect tool, per-part names, the knowns list with sources, freedoms and the counter.
// Worked example: three blocks of mass m clamped at the ends and centre of a light rod (target: I).
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
const pick = async (page, part, group, choice) => {
  await page.click(`[data-dot="${part}"]`);
  await page.click(`#dfCard [data-group="${group}"] [data-choice="${choice}"]`);
};
const nameIt = async (page, part, key, text) => {
  await page.click(`[data-dot="${part}"]`);
  await page.fill(`#dfNm-${key}`, text); await page.click(`#dfCard [data-setname="${key}"]`);
};
const knowns = async (page) => (await page.innerText('#dfKnowns')).replace(/\s+/g, ' ');

test('three blocks connected and clamped, each “has mass m”: knowns m₁ = m … L_rod = L, M_rod = 0; target I; 1 unknown, 0 relationships', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    const { rod, blocks } = await drawRodAndBlocks(page);
    // the connect tool: drag from each block to the rod (to a free spot, so the drag ends on the rod itself)
    await page.click('[data-dftool="connect"]');
    for (const [i, b] of blocks.entries()) await drag(page, { x: b.x, y: b.y }, { x: [320, 560, 560][i], y: 260 });
    assert.equal(await page.evaluate(() => window.__rl.build.shapes.filter(s => s.kind === 'conn').length), 3);
    // a connection to a rod puts a tick there
    const ticks = await page.evaluate(() => window.__rl.tk.points().filter(q => q.key.startsWith('r:')).map(q => q.key.split(':')[2]));
    assert.deepEqual(ticks, ['0', '0.5', '1']);
    await page.click('[data-dftool="select"]');
    await page.click('#doneDraw');
    const titles = await page.evaluate(() => [...document.querySelectorAll('[data-dot]')].map(d => d.dataset.title));
    assert.deepEqual(titles, ['Rod', 'Block 1', 'Block 2', 'Block 3', 'Connection 1', 'Connection 2', 'Connection 3', 'System']);
    // before any names the list has only what the drawing and the rod’s card say
    await pick(page, rod, 'mass', 'light'); await pick(page, rod, 'held', 'free');
    const where = ['left', 'centre', 'right'];
    for (const [i, b] of blocks.entries()){
      await pick(page, b.id, 'size', 'point'); await pick(page, b.id, 'mass', 'has'); await pick(page, b.id, 'held', 'clamped'); await pick(page, b.id, 'where', where[i]);
      await nameIt(page, b.id, 'mass', 'm');
    }
    const conns = await page.evaluate(() => window.__rl.build.shapes.filter(s => s.kind === 'conn').map(s => s.id));
    for (const c of conns) await pick(page, c, 'kind', 'clamped');
    await pick(page, 'system', 'gravity', 'none'); await pick(page, 'system', 'motion', 'eq');
    const k = await knowns(page);
    for (const row of ['m₁ = m', 'm₂ = m', 'm₃ = m', 'L_rod = L', 'M_rod = 0']) assert.ok(k.includes(row), `knowns list has ${row}\n${k}`);
    assert.match(k, /L_rod = L drawing/); assert.match(k, /M_rod = 0 card/); assert.match(k, /m₁ = m card/);
    // the target, and the counter: one unknown (I), no relationships yet
    await page.fill('#dfTarget', 'I'); await page.click('#dfTargetAdd');
    assert.match(await page.innerText('#dfCounter'), /1 unknown, 0 relationships/);
    assert.match(await page.innerText('#dfCounter'), /one more is needed/);
    assert.ok(!/which/i.test(await page.innerText('#dfCounter')), 'the counter never says which relationship is missing');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a value of the wrong kind is refused with a reason; numbers stay with their own name; “not needed” greys an entry', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    const { rod, blocks } = await drawRodAndBlocks(page);
    await page.click('#doneDraw');
    await pick(page, rod, 'mass', 'light');
    await pick(page, blocks[0].id, 'mass', 'has');
    const err = () => page.innerText('#dfCard [role="alert"]');
    await nameIt(page, blocks[0].id, 'mass', '5 m');
    assert.match(await err(), /m measures length, not mass/);
    await nameIt(page, blocks[0].id, 'mass', '5');
    assert.match(await err(), /needs its unit/);
    await nameIt(page, blocks[0].id, 'mass', 'L');
    assert.match(await err(), /L is already .*length/);
    assert.ok(!(await knowns(page)).includes('m₁'), 'refused values write nothing');
    await nameIt(page, blocks[0].id, 'mass', '2 kg');
    assert.ok((await knowns(page)).includes('m₁ = 2 kg'));
    await page.click(`[data-dot="${blocks[1].id}"]`);
    assert.equal(await page.locator('#dfNm-mass').count(), 0, 'no name field until the block “has mass”');
    // not needed: greyed, never dropped
    await page.click('[data-koff="m₁"]');
    assert.equal(await page.evaluate(() => document.querySelector('[data-kn="m₁"]').classList.contains('off')), true);
    assert.ok((await knowns(page)).includes('m₁ = 2 kg'));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a disc’s shape card adds I_cm; a string has its own unknown tension and the counter counts it', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await page.click('[data-bshape="wheel"]');
    const wheel = await page.evaluate(() => window.__rl.build.shapes.find(s => s.kind === 'wheel').id);
    await page.click('#doneDraw');
    assert.ok(!(await knowns(page)).includes('I_cm'));
    await pick(page, wheel, 'shape', 'solid');
    assert.match(await knowns(page), /I_cm = ½M_disc·R_disc² card/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }

  const q = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await q.page.evaluate(() => window.__rl.build.template('pulley'));
    await q.page.click('#doneDraw');
    assert.match(await knowns(q.page), /T₁ = not given/);
    assert.match((await q.page.innerText('#dfCounter')), /1 unknown, 1 relationship: the counts match/, 'tension unknown; a light string ties the two blocks');
    await q.page.click('[data-koff="T₁"]');
    assert.match((await q.page.innerText('#dfCounter')), /0 unknowns, 1 relationship/);
    assert.deepEqual(q.errors, []);
  } finally { await q.page.close(); }
});
