// Phase 4 gate: the diagram library and recognition in the app.
// Every practice problem is set up from freehand pen strokes (the recorded strokes in strokes.json, drawn with the mouse)
// and must give the same components, contacts and strings as the unit's template; the wheel's "a point" button shows
// v, aₜ and a꜀ in the right directions with the right sizes; the Diagrams drawer and the toolbar's hover cards teach the notation.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE, CHAPTERS, COMPONENTS } from '../js/data.js';
import { launch, openApp, loadPractice, addGiven, setCondition } from './helpers.js';
import { at } from './strokes.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

// draw a stroke (drawing coordinates) with the pen, through the real pointer
async function pen(page, points){
  if (await page.getAttribute('[data-tool="pen"]', 'aria-pressed') !== 'true') await page.click('[data-tool="pen"]');
  const scr = await page.evaluate((pts) => pts.map(p => window.__rl.build.toScreen(p.x, p.y)), points);
  await page.mouse.move(scr[0].x, scr[0].y); await page.mouse.down();
  for (const p of scr.slice(1)) await page.mouse.move(p.x, p.y);
  await page.mouse.up();
}
// what the drawing is made of: shapes, which mass rests on what, what hangs, what the strings join
const summary = (page) => page.evaluate(() => {
  const B = window.__rl.build, name = (id) => { const s = B.shapes.find(q => q.id === id); return s.props.mass || s.kind; };
  return { kinds: B.shapes.map(s => s.kind).sort(), contacts: B.contacts().map(c => `${name(c.bodyId)}→${c.surface}`).sort(),
    hanging: B.shapes.filter(s => s.hanging).map(s => s.props.mass), strings: B.strings().map(s => s.ends.map(name).join('-')) };
});
const rad = (d) => d * Math.PI / 180;
// the strokes a student would draw for each unit's picture
const STROKES = {
  incline: (A) => {
    const L = 560, u = 0.45 * L, P = { x: 150 + u * Math.cos(rad(A)), y: 466 - u * Math.sin(rad(A)) };
    return [at('line', { x: 150, y: 466, s: L, deg: A }), at('box', { x: P.x - 40 * Math.sin(rad(A)), y: P.y - 40 * Math.cos(rad(A)), sx: 35, sy: 38, deg: A })];
  },
  pulley: () => [at('line', { x: 60, y: 260, s: 520 }), at('loop', { x: 594, y: 246, s: 14 }), at('box', { x: 300, y: 222, sx: 35, sy: 38 }), at('box', { x: 610, y: 380, sx: 35, sy: 38 }),
    [{ x: 300, y: 237 }, { x: 380, y: 235 }, { x: 450, y: 232 }, { x: 520, y: 229 }, { x: 590, y: 226 }, { x: 612, y: 262 }, { x: 612, y: 300 }, { x: 612, y: 340 }, { x: 612, y: 378 }]],
  rotation: () => [at('loop', { x: 440, y: 260, s: 110 })],
};

PRACTICE.forEach((p, i) => {
  test(`set up from freehand strokes ${i + 1}: ${p.ch} / ${p.title}`, async () => {
    const { page, errors } = await openApp(env.browser, env.url);
    try {
      await loadPractice(page, i);
      const A = p.key.givens.inc?.[0];
      for (const s of STROKES[p.ch](A)) await pen(page, s);
      const drawn = await summary(page);
      await page.evaluate((t) => window.__rl.build.template(t), CHAPTERS[p.ch].diagram);
      assert.deepEqual(drawn, await summary(page), 'the strokes give the same picture as the template');
      await page.evaluate(() => window.__rl.build.undo());
      if (A) assert.ok(Math.abs(await page.evaluate(() => window.__rl.build.theta) - A) < 1.5, `the ramp keeps the drawn angle ${A}°`);
      const fromDrawing = await page.evaluate(() => Object.entries(window.__rl.givens).filter(([, g]) => g.from === 'drawing').map(([id]) => id).sort());
      assert.deepEqual(fromDrawing, { incline: ['inc', 'm'], pulley: ['m1', 'm2'], rotation: [] }[p.ch]);
      assert.equal(await page.locator('#steps [data-stage="0"].done').count(), 1, 'Setup earns its star');
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
});

test('ambiguous strokes ask; an arrow out of the block becomes v and settles "Moving"', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    for (const s of STROKES.incline(30)) await pen(page, s);
    // a rounded square: block or ball?
    await pen(page, at('rounded', { x: 700, y: 120, s: 30 }));
    assert.match(await page.innerText('#choosePick'), /block or a round body/);
    await page.click('#choosePick [data-pick="-1"]');
    assert.equal(await page.evaluate(() => window.__rl.build.shapes.length), 3, 'Neither adds nothing');
    // an arrow from the block, up the slope: velocity
    const b = await page.evaluate(() => { const s = window.__rl.build.shapes.find(q => q.kind === 'block'); return { x: s.x, y: s.y }; });
    await pen(page, at('arrow', { x: b.x, y: b.y, s: 130, deg: 30 }));
    await page.click('#choosePick [data-pick="0"]');
    const v = await page.evaluate(() => window.__rl.build.shapes.find(q => q.kind === 'block').v);
    assert.equal(v.key, 'up-slope', 'it clicks onto the slope');
    assert.equal(await page.evaluate(() => window.__rl.cond.up), true, 'the drawing settles "Moving: up the slope"');
    assert.match(await page.innerText('#bubble'), /What to check/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

// the wheel's point: ω = 2 rad/s counterclockwise, α = 3 rad/s² clockwise, r = 0.5 m
// → v = 1 m/s along the path (left, at the top), aₜ = −1.5 m/s² (right), a꜀ = 2 m/s² (down, to the centre), a = 2.5 m/s²
test('wheel button: a point\'s v, aₜ and a꜀ for a sample ω and α, and its equations go onto the sheet', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('#chPick button:has-text("Rotation kinematics")');
    await pen(page, STROKES.rotation()[0]);
    assert.equal(await page.locator('[data-wheelbtn]').count(), 0, 'no button until the wheel has ω or α');
    await setCondition(page, 'rim', true);
    await addGiven(page, 'w', 2, 'rad/s', 0);
    await addGiven(page, 'alpha', 3, 'rad/s²', 1);
    await addGiven(page, 'r', 0.5, 'm');
    await page.click('[data-wheelbtn]');
    const vecs = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-pvec]')].map(g => [g.dataset.pvec, [+g.dataset.ux, +g.dataset.uy]])));
    assert.deepEqual(vecs, { v: [-1, 0], at: [1, 0], ac: [0, 1], atot: [0.6, 0.8] });
    const txt = await page.innerText('#bprops');
    for (const re of [/v = rω = .* = 1 m\/s/, /= -1\.5 m\/s²/, /ac = ω²r = .* = 2 m\/s²/, /= 2\.5 m\/s²/]) assert.match(txt, re);
    await page.click('#ptAdd');
    assert.deepEqual(await page.evaluate(() => window.__rl.sheet), ['E7', 'E8', 'E9', 'E11']);
    // drawn spin arrows alone show the button too: ω clockwise turns v around
    await page.evaluate(() => { const S = window.__rl; delete S.givens.w; delete S.givens.alpha; S.build.render(); });
    assert.equal(await page.locator('[data-pvec]').count(), 0, 'no ω or α: no point');
    await page.click('[data-tool="omega"]');
    const w = await page.evaluate(() => { const s = window.__rl.build.shapes[0]; return window.__rl.build.toScreen(s.x + s.r + 10, s.y); });
    await page.mouse.click(w.x, w.y); await page.mouse.click(w.x, w.y);
    assert.equal(await page.evaluate(() => window.__rl.build.shapes[0].omega.ccw), false);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-pvec]')].map(g => `${g.dataset.pvec}:${g.dataset.ux}`)), ['v:1.000', 'ac:0.000']);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('Diagrams drawer: every component with its standard drawing and a "what to check" line; hovering a tool shows its card', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('#diagBtn');
    const n = Object.keys(COMPONENTS).length;
    assert.equal(await page.locator('#diagDrawer.open #diagLib .comp').count(), n);
    assert.equal(await page.locator('#diagLib .comp svg.cdraw').count(), n);
    assert.equal(await page.locator('#diagLib .comp .cchk').count(), n);
    for (const k of ['surface', 'ramp', 'block', 'particle', 'ball', 'wheel', 'rod', 'pulley', 'string', 'spring', 'pivot', 'force', 'v', 'a', 'omega', 'alpha']) assert.ok(COMPONENTS[k], k);
    await page.click('#libBtn');
    assert.equal(await page.locator('#diagDrawer.open').count(), 0, 'one drawer at a time');
    await page.keyboard.press('Escape');
    await page.hover('[data-bshape="ramp"]');
    assert.match(await page.innerText('#compCard'), /Ramp[\s\S]*What to check: Gravity is straight down/);
    await page.mouse.move(5, 5);
    assert.equal(await page.isHidden('#compCard'), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
