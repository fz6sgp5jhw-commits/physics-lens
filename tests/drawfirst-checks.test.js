// Phase 8b gate: condensing, the two checks and the final check, numbers last with the unit check, stars and SOLVED.
// Worked examples: three blocks of mass m on a light rod, about the centre (part A, I = mL²/2) and about one end (part B, I = 5mL²/4).
// A planted sign slip is found by a check with its line named; a swapped sin/cos label on a split force is flagged.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

// the knowns the cards and the toolkit would give; x is each block's coordinate from the rotation axis
async function setUp(page, xs, { mass = 'm' } = {}){
  await page.click('[data-bshape="rod"]');
  for (let i = 0; i < 3; i++) await page.click('[data-bshape="block"]');
  await page.click('#doneDraw');
  await page.evaluate(([xs, mass]) => window.__rl.kn.addSource(() => [
    ...[1, 2, 3].map(k => ({ name: 'm' + '₀₁₂₃'[k], value: mass, source: 'card', qty: 'mass' })),
    ...xs.map((x, i) => ({ name: `x(Block ${i + 1})`, value: x, source: 'toolkit', qty: 'length' })),
  ]), [xs, mass]);
  await page.fill('#dfTarget', 'I'); await page.click('#dfTargetAdd');
}
const ws = (page) => page.evaluate(() => window.__rl.ws.state());
const type = async (page, text, shift = true) => { await page.fill('#algIn', text); await page.press('#algIn', shift ? 'Shift+Enter' : 'Enter'); };
async function sheetIsum(page){ await page.focus('#algIn'); await page.keyboard.press('/'); await page.keyboard.type('point masses'); await page.keyboard.press('Enter'); }
const START = 'I = m₁r₁² + m₂r₂² + m₃r₃²';

test('part A: about the centre. Substitute, simplify, two checks pass (two stars), the final check passes: SOLVED', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page, ['−L/2', '0', 'L/2']);
    assert.equal(await page.locator('#algSolved').count(), 0);
    await sheetIsum(page);
    assert.deepEqual((await ws(page)).lines, [START]);
    // check 1 before any algebra: the relationship fits the setup
    await page.click('#algCheck');
    assert.match(await page.textContent('#algRev'), /This check passed/);
    for (const k of [1, 2, 3]) await type(page, `m_${k} = m`);
    await type(page, 'r_1 = L/2'); await type(page, 'r_2 = 0'); await type(page, 'r_3 = L/2'); await type(page, 'simplify');
    assert.equal((await ws(page)).lines.at(-1), 'I = mL²/2');
    await page.click('#algCheck');
    let s = (await ws(page)).review;
    assert.deepEqual([s.used, s.stars, s.solved, s.status], [2, 2, false, 'pass']);
    assert.equal(await page.locator('#algCheck').isDisabled(), true, 'only two checks before the answer');
    assert.equal(await page.locator('#algSolved').count(), 0, 'stars come with passed checks; SOLVED only with the final one');
    await page.click('#algFinal');
    s = (await ws(page)).review;
    assert.deepEqual([s.stars, s.solved], [3, true]);
    assert.equal(await page.textContent('#algSolved'), 'SOLVED');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('part B: about one end, I = 5mL²/4; a final check on the part A answer is not enough', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page, ['0', 'L/2', 'L']);
    await sheetIsum(page);
    for (const k of [1, 2, 3]) await type(page, `m_${k} = m`);
    await type(page, 'r_1 = 0'); await type(page, 'r_2 = L/2'); await type(page, 'r_3 = L'); await type(page, 'simplify');
    assert.equal((await ws(page)).lines.at(-1), 'I = 5mL²/4');
    await page.click('#algFinal');
    assert.deepEqual([(await ws(page)).review.solved, (await ws(page)).review.stars], [true, 1]);
    // the same line for the wrong axis (part A’s answer) is something to look at
    const { page: p2, errors: e2 } = await openApp(env.browser, env.url, { mode: 'draw' });
    try {
      await setUp(p2, ['0', 'L/2', 'L']);
      await type(p2, 'I = m*L**2/2');
      await p2.click('#algFinal');
      const r = (await ws(p2)).review;
      assert.equal(r.status, 'look'); assert.equal(r.solved, false); assert.equal(r.stars, 0);
      assert.deepEqual(e2, []);
    } finally { await p2.close(); }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a planted sign slip: the check says only “something to look at”; the correction names the line and the kind of slip; no star is lost', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page, ['−L/2', '0', 'L/2']);
    await sheetIsum(page);
    await page.click('#algCheck');                                   // earns a star
    for (const k of [1, 2, 3]) await type(page, `m_${k} = m`);
    await type(page, 'I = m*(L/2)**2 + m*0**2 - m*(L/2)**2', false);   // line 5: the slip
    await page.click('#algCheck');
    let s = (await ws(page)).review;
    assert.equal(s.status, 'look'); assert.equal(s.stars, 1);
    const txt = await page.textContent('#algRev');
    assert.match(txt, /Something to look at/); assert.ok(!/Line 5/.test(txt), 'before the correction it does not say where');
    assert.equal(await page.locator('#algSheet .look').count(), 0);
    await page.click('#algSheetBtn');
    assert.ok(await page.locator('#algSheet .algsg.look').count() >= 1, 'the sheet highlights the group to look in');
    await page.keyboard.press('Escape');
    await page.click('[data-rev="correct"]');
    s = (await ws(page)).review;
    assert.equal(s.issue.line, 5);
    assert.match(await page.textContent('#algCorr'), /Line 5.*A sign looks wrong in one term on the right side/);
    assert.equal(s.stars, 1, 'asking for a correction takes nothing away');
    assert.equal((await ws(page)).lines.length, 5, 'the correction writes no line');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a one-sided division is caught and named; a wrong replacement says what it replaced', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page, ['−L/2', '0', 'L/2']);
    await type(page, 'I = m*L**2/2', false);
    await page.click('#dfWork button[data-side="r"][data-term="0"]');
    await page.fill('#algOp', '/ 2'); await page.press('#algOp', 'Enter');
    await page.click('#algCheck');
    await page.click('[data-rev="correct"]');
    assert.match(await page.textContent('#algCorr'), /Line 2.*changed one term and left the rest alone/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('condensing: name a piece (replaced everywhere, expandable), simplify a piece, work a piece out in numbers', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page, ['−0.5 m', '0 m', '0.5 m'], { mass: '2 kg' });
    await type(page, 'I = m*(L/2)**2 + m*(L/2)**2', false);
    const piece = async (re) => { await page.click('#dfWork .algline.cur button[data-side="r"][data-term="0"]'); await page.locator('#algMenu [data-piece]').filter({ hasText: re }).first().click(); };
    // a name already in use is refused
    await piece(/^\(L\/2\)2$/); await page.fill('#algPieceName', 'm'); await page.click('[data-pc="name"]');
    assert.match(await page.textContent('#algOpErr'), /already used in this problem/);
    await page.keyboard.press('Escape');
    // name (L/2)² as A: both terms change, because it is the same piece (the buttons read it as (L/2)2)
    await piece(/^\(L\/2\)2$/); await page.fill('#algPieceName', 'A'); await page.click('[data-pc="name"]');
    let s = await ws(page);
    assert.equal(s.lines.at(-1), 'I = mA + mA'); assert.equal(s.names.A, '(L/2)²');
    // expand A back: it is offered as a substitution
    await page.click('#dfWork .algline.cur button[data-side="r"][data-term="0"]');
    await page.locator('#algMenu [data-subsym="A"]').first().click({ modifiers: ['Shift'] });
    assert.equal((await ws(page)).lines.at(-1), 'I = m(L/2)² + m(L/2)²');
    // simplify just (L/2)²: its own line, the rest untouched
    await piece(/^\(L\/2\)2$/); await page.click('[data-pc="simp"]');
    assert.equal((await ws(page)).lines.at(-1), 'I = m(L²/4) + m(L/2)²');
    // an unknown number is refused with the reason
    await piece(/^L2$/); await page.click('[data-pc="num"]');
    assert.match(await page.textContent('#algOpErr'), /I need a number with a unit for L/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('numbers last: put in my values (units kept), the unit check, and the numbers line is checked too', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page, ['−0.5 m', '0 m', '0.5 m'], { mass: '2 kg' });
    assert.ok(await page.locator('#algNums').isDisabled(), 'needs the target alone first');
    await sheetIsum(page);
    assert.match(await page.textContent('#algUnit'), /Unit check: every term works out to kg·m²/);
    await page.click('#algNums');
    const s = await ws(page);
    assert.equal(s.lines.at(-1), 'I = 1 kg·m²');
    assert.equal(s.lines.at(-2), 'I = 2 kg·(0.5 m)² + 2 kg·(0 m)² + 2 kg·(0.5 m)²');
    await page.click('#algFinal');
    assert.equal((await ws(page)).review.solved, true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a unit slip is named by the unit check', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page, ['−L/2', '0', 'L/2']);
    await type(page, 'I = m*L', false);
    assert.match(await page.textContent('#algUnit'), /works out to kg·m, but I is measured in kg·m²/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a swapped sin/cos label on a split force is flagged; the right labels pass', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    const screen = (x, y) => page.evaluate(([a, b]) => window.__rl.build.toScreen(a, b), [x, y]);
    const drag = async (from, to) => { const a = await screen(from.x, from.y), b = await screen(to.x, to.y); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up(); };
    const click = async (p) => { const a = await screen(p.x, p.y); await page.mouse.click(a.x, a.y); };
    const answer = async (t) => { await page.fill('#dfPopIn', t); await page.press('#dfPopIn', 'Enter'); };
    await page.evaluate(() => window.__rl.build.template('incline'));
    const blk = await page.evaluate(() => { const b = window.__rl.build.shapes.find(s => s.kind === 'block'); return { x: b.x, y: b.y }; });
    await page.click('#doneDraw');
    await page.click('[data-dftool="axes"]'); await click(blk);
    await drag({ x: blk.x + 150, y: blk.y }, { x: blk.x + 150 * Math.cos(Math.PI / 6) + 3, y: blk.y - 150 * Math.sin(Math.PI / 6) + 2 });
    let t = await page.evaluate(() => window.__rl.tk.state());
    await click({ x: t.axes.x + 46 * Math.cos(t.axes.ang * Math.PI / 360), y: t.axes.y - 46 * Math.sin(t.axes.ang * Math.PI / 360) }); await answer('θ');
    await page.click('[data-dftool="force"]'); await drag(blk, { x: blk.x + 2, y: blk.y + 110 }); await answer('W');
    await page.click('[data-dftool="split"]'); await click({ x: blk.x, y: blk.y + 55 });
    const label = async (k, text) => { await page.locator(`[data-flab$=":${k}"]`).click(); await answer(text); };
    // swapped: cos on the part along x, sin on the part along y
    await label('x', '−W cos θ'); await label('y', '−W sin θ');
    await page.click('#algCheck');
    let r = (await ws(page)).review;
    assert.equal(r.status, 'look'); await page.click('[data-rev="correct"]');
    assert.match(await page.textContent('#algCorr'), /sin and cos are swapped/);
    // the right labels (signs from the directions): the labels are no longer the problem
    await label('x', '−W sin θ'); await label('y', '−W cos θ');
    await page.click('#algCheck');
    r = (await ws(page)).review;
    assert.ok(!r.issue || r.issue.kind !== 'label', JSON.stringify(r.issue));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
