// Phase C4 gate: the notebook (saved problems, with or without a drawing) and the board (cards laid out from a solved path).
// Flywheel: from rest, α = 0.70 rad/s², r = 0.40 m, t = 2.0 s → ω = αt = 1.4 rad/s (found), a꜀ = ω²r = 0.784 m/s² (target).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, openApp, addGiven, setCondition, confirmConditions, addTarget } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const V0 = await readFile(new URL('./fixtures/notebook-v0.json', import.meta.url), 'utf8');
const showMe = async (page) => {
  await page.click('#showBtn');
  await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 15000 });
};
const openNotebook = async (page) => { if (!await page.locator('#nbDrawer.open').count()) await page.click('#nbBtn'); };
async function saveAs(page, title, objectives = ''){
  await openNotebook(page);
  await page.fill('#nbBody [name=title]', title);
  await page.fill('#nbBody [name=objectives]', objectives);
  await page.click('#nbSave');
}
const listed = (page) => page.$$eval('#nbBody .nbitem b', bs => bs.map(b => b.textContent));
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pl-notebook') || 'null'));

test('save with and without a drawing, reload, search by unit and law, open, export → clear → import, board from the path', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    // 1. a problem with a drawing (a block on a ramp), nothing solved
    await page.fill('#problem', 'A block slides down a rough ramp.');
    await page.evaluate(() => { window.__rl.build.add('ramp'); window.__rl.build.add('block'); });
    await saveAs(page, 'Block on a ramp', 'forces, friction');
    assert.deepEqual(await listed(page), ['Block on a ramp']);
    await page.click('#nbClose');
    await page.click('#clearBtn');

    // 2. a problem with no drawing, solved with Show me: ω is found on the way to the target a꜀
    await page.click('#chPick button:has-text("Rotation kinematics")');
    await page.fill('#problem', 'A flywheel of radius 0.40 m starts from rest with α = 0.70 rad/s². Find the radial acceleration of a rim point after 2.0 s.');
    await page.click('#kindRow [data-ck="rim"][data-i="1"]');
    await addGiven(page, 'r', 0.4, 'm');
    await addGiven(page, 'alpha', 0.7, 'rad/s²', 0);
    await addGiven(page, 't', 2, 's');
    await setCondition(page, 'rest', true);
    await confirmConditions(page);
    await addTarget(page, 'ac');
    await showMe(page);
    assert.ok(Math.abs(await page.evaluate(() => window.__rl.found.ac.val) - 0.784) < 1e-6);

    // the board lays the path out given → equation → found → target, in the state colours
    await page.click('#boardBtn');
    await page.click('[data-bd="path"]');
    const cards = await page.evaluate(() => window.__rl.board.cards.map(c => ({ id: c.id, type: c.type, ref: c.ref, state: c.state, x: c.x })));
    const q = (id) => cards.find(c => c.type === 'quantity' && c.ref === id);
    assert.equal(q('alpha').state, 'given'); assert.equal(q('r').state, 'given');
    assert.equal(q('w').state, 'found'); assert.equal(q('ac').state, 'target');
    const eqs = cards.filter(c => c.type === 'equation');
    assert.equal(eqs.length, 2, 'one equation card per step');
    const intoOmega = await page.evaluate(() => { const b = window.__rl.board; return b.arrows.filter(a => a.to === 'q:w').map(a => a.from); });
    const e1 = cards.find(c => c.id === intoOmega[0]), e2 = eqs.find(c => c !== e1);
    assert.ok(q('alpha').x < e1.x && e1.x < q('w').x && q('w').x < e2.x && e2.x < q('ac').x, 'columns run given → equation → found → equation → target');
    const colour = (sel) => page.$eval(sel, d => getComputedStyle(d).borderTopColor);
    assert.equal(await colour('[data-card="q:alpha"]'), 'rgb(31, 143, 224)', 'given is blue ink');
    assert.equal(await colour('[data-card="q:w"]'), 'rgb(224, 138, 0)', 'found is amber');
    assert.equal(await colour('[data-card="q:ac"]'), 'rgb(217, 63, 174)', 'target is rose');
    assert.match(await page.textContent('[data-card="q:w"]'), /1\.4/, 'the found value shows on its card');
    assert.equal(await page.locator('.bdlines polyline').count(), await page.evaluate(() => window.__rl.board.arrows.length));
    // a note card is added and kept
    await page.click('[data-bd="note"]');
    await page.fill('.bd-note textarea', 'ω₀ = 0 because it starts from rest');
    await page.click('#boardX');
    await saveAs(page, 'Flywheel rim', 'rotation, kinematics');
    assert.deepEqual(await listed(page), ['Block on a ramp', 'Flywheel rim']);

    // 3. reload: both come back
    await page.reload();
    await page.waitForFunction(() => window.__rl && document.getElementById('steps').children.length > 0);
    await openNotebook(page);
    assert.deepEqual(await listed(page), ['Block on a ramp', 'Flywheel rim']);
    const recs = (await stored(page)).problems;
    assert.equal(recs[0].v, 1);
    assert.deepEqual(recs[0].drawing?.shapes.map(x => x.kind), ['floor', 'ramp', 'block'], 'the first keeps its drawing');
    assert.equal(recs[1].drawing, null, 'the second has none');
    assert.equal(recs[1].steps.length, 2);

    // search by unit and by law used
    await page.selectOption('#nbBody [name=chapter]', 'rotation');
    assert.deepEqual(await listed(page), ['Flywheel rim']);
    await page.selectOption('#nbBody [name=chapter]', '');
    const law = recs[1].laws[0];
    assert.ok(law, 'the solved problem lists the laws it used');
    await page.selectOption('#nbBody [name=law]', law);
    assert.deepEqual(await listed(page), ['Flywheel rim']);
    await page.selectOption('#nbBody [name=law]', '');
    await page.fill('#nbBody [name=words]', 'friction');
    assert.deepEqual(await listed(page), ['Block on a ramp'], 'objectives are searched too');
    await page.fill('#nbBody [name=words]', '');

    // open each: the setup, drawing and board come back
    await page.click(`[data-nbopen="${recs[1].id}"]`);
    const back = await page.evaluate(() => ({ ch: window.__rl.ch, targets: window.__rl.targets, alpha: window.__rl.givens.alpha?.val, cond: window.__rl.cond.rest, note: window.__rl.board.cards.find(c => c.type === 'note')?.text }));
    assert.deepEqual(back, { ch: 'rotation', targets: ['ac'], alpha: 0.7, cond: true, note: 'ω₀ = 0 because it starts from rest' });
    await page.click('#boardBtn');
    assert.equal(await page.inputValue('.bd-note textarea'), 'ω₀ = 0 because it starts from rest');
    await page.click('#boardX');
    await openNotebook(page);
    await page.click(`[data-nbopen="${recs[0].id}"]`);
    assert.equal(await page.evaluate(() => window.__rl.build.shapes.map(s => s.kind).join(',')), 'floor,ramp,block');
    assert.equal(await page.inputValue('#problem'), 'A block slides down a rough ramp.');

    // export → Clear notebook (with a confirm) → import restores both
    await openNotebook(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#nbExport')]);
    const file = await readFile(await dl.path(), 'utf8');
    await page.click('#nbClear');
    await page.click('#dlgOk');
    assert.equal(await page.evaluate(() => localStorage.getItem('pl-notebook')), null, 'nothing is left on the device');
    assert.deepEqual(await listed(page), []);
    await page.setInputFiles('#nbFile', { name: 'notebook.json', mimeType: 'application/json', buffer: Buffer.from(file) });
    await page.waitForFunction(() => document.querySelectorAll('#nbBody .nbitem').length === 2);
    assert.deepEqual((await stored(page)).problems, recs, 'import restores both records exactly');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a version-0 record is migrated on load; typed text from a file stays text', async () => {
  const { page, errors } = await openApp(env.browser, env.url, {
    before: (p) => p.addInitScript((v0) => { try { if (!sessionStorage.getItem('pl-nb-seed')){ sessionStorage.setItem('pl-nb-seed', '1'); localStorage.setItem('pl-notebook', v0); } } catch {} }, V0),
  });
  try {
    const s = await stored(page);
    assert.equal(s.v, 1, 'stored again in the current format');
    const r = s.problems[0];
    assert.equal(r.v, 1); assert.equal(r.chapter, 'rotation'); assert.match(r.text, /flywheel starts from rest/);
    assert.deepEqual(r.parts, [{ label: 'a', target: 'w' }]);
    assert.deepEqual(r.conds, { rest: true }); assert.equal(r.notes, 'ω₀ = 0 from rest');
    await openNotebook(page);
    await page.click('[data-nbopen="old-1"]');
    assert.deepEqual(await page.evaluate(() => [window.__rl.ch, window.__rl.givens.alpha.val, window.__rl.targets[0]]), ['rotation', 0.7, 'w']);

    // an imported record with markup in its text, an unknown unit and a bad drawing
    const evil = JSON.stringify({ problems: [
      { v: 1, id: 'x1', title: '<img src=x id=pwn>', chapter: 'rotation', text: '<b>hi</b>', notes: '<script>1</script>', givens: { alpha: { from: 'you', mag: 1, unit: '<i>', dir: 0, val: 1 } },
        drawing: { shapes: [{ kind: 'block', id: '<svg onload=x>' }] }, board: { cards: [{ id: 'n1', type: 'note', text: '<img id=pwn2>' }], arrows: [{ from: 'n1', to: 'nope' }] } },
      { v: 1, id: 'x2', title: 'no such unit', chapter: 'nope' },
    ] });
    await openNotebook(page);
    await page.setInputFiles('#nbFile', { name: 'evil.json', mimeType: 'application/json', buffer: Buffer.from(evil) });
    await page.waitForFunction(() => document.querySelectorAll('#nbBody .nbitem').length === 2);
    assert.equal(await page.locator('#pwn').count(), 0);
    assert.match(await page.textContent('#bubble'), /1 couldn’t be read/);
    const x1 = (await stored(page)).problems.find(p => p.id === 'x1');
    assert.equal(x1.drawing, null, 'a drawing with markup in it is dropped');
    assert.equal(x1.givens.alpha.unit, 'rad/s²', 'an unknown unit falls back to the quantity’s own');
    assert.deepEqual(x1.board.arrows, [], 'an arrow to a missing card is dropped');
    await page.click('[data-nbopen="x1"]');
    await page.click('#boardBtn');
    assert.equal(await page.inputValue('.bd-note textarea'), '<img id=pwn2>');
    assert.equal(await page.locator('#pwn2').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
