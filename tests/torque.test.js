// Phase 5 gate: torque, statics and rotational dynamics, with hand-worked numbers (g = 9.81 m/s²).
// 1. Beam on a pivot with a slanted cord: L = 1.79 m, M = 1.07 kg, pivot 0.262 m from the left end, m = 0.301 kg hung
//    0.262 m from the right end, cord 0.354 m from the right end at 24.9° to the beam. Στ about the pivot:
//    T sin φ (L − 0.354 − 0.262) = Mg(L/2 − 0.262) + mg(L − 0.262 − 0.262) → T = 21.005 N; ΣFx: H_x = T cos φ = 19.052 N
//    (toward the right end); ΣFy: H_y = (M + m)g − T sin φ = 4.606 N up.
// 2. Beam hinged to the ceiling at its left end, hanging by a vertical cable 12.9 cm long that hangs 38.5 cm (horizontally)
//    from the hinge: the cable is tied d_T = √(38.5² + 12.9²) = 40.60 cm along the beam, sin β = 12.9 / 40.60 → β = 18.52°;
//    Στ about the hinge: T d_T cos β = Mg (L/2) cos β → T = 7.716 N; H_x = 0; H_y = Mg − T = 6.116 N up.
// 3. Thin rod 2.50 kg, 70.0 cm about one end: I = ⅓ML² = 0.40833 kg·m²; about its centre ML²/12 = 0.10208, and the
//    parallel-axis theorem with d = L/2 gives the same 0.40833 (4 × the centre value).
// 4. Solid disc M = 2.00 kg, R = 0.200 m on a fixed axle, string from its rim to a hanging m = 1.00 kg:
//    a = mg / (m + M/2) = 4.905 m/s², T = m(g − a) = 4.905 N, α = a / R = 24.525 rad/s².
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, addGiven, setCondition, confirmConditions, addTarget, openStage } from './helpers.js';
import { EQS } from '../js/data.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const torqueUnit = (page) => page.click('#chPick button:has-text("Torque & equilibrium")');
const showMe = async (page) => {
  await page.click('#showBtn');
  await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 20000 });
};
const found = (page) => page.evaluate(() => Object.fromEntries(Object.entries(window.__rl.found).map(([k, f]) => [k, f.val])));
const near = (got, want, tol = 1e-3) => assert.ok(Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)), `got ${got}, want ${want}`);
// give a drawn quantity (a symbol from the drawing) a number through its chip
async function editChip(page, id, value, unit){
  await page.click(`#knowns [data-edit="${id}"]`);
  await page.click('#editorSlot [data-kind="value"]');
  await page.fill('#edVal', String(value));
  if (unit) await page.selectOption('#edUnit', unit);
  await page.click('#edSave');
  if (await page.locator('#dlg.show #dlgCancel:not([hidden])').count()) await page.click('#dlgOk');
}
const bodyOf = (page, kind) => page.evaluate((kind) => window.__rl.build.bodies().find(b => b.kind === kind).id, kind);
async function pickBody(page, kind){
  const id = await bodyOf(page, kind);
  if (await page.locator('#fbdBody').count()) await page.selectOption('#fbdBody', id);
}
const forcesOn = (page, kind) => page.evaluate((kind) => { const S = window.__rl, b = S.build.bodies().find(x => x.kind === kind); return (S.fbd.forces[b.id] || []).map(f => `${f.kind}:${f.var || ''}:${f.dir}:${f.at}`); }, kind);
const lastRow = (page) => page.evaluate(() => document.querySelectorAll('#fbd [data-fdir]').length - 1);

test('gate 1: a beam on a pivot with a slanted cord, from the drawing: T = 21.0 N, H_x = 19.05 N, H_y = 4.61 N', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await torqueUnit(page);
    assert.equal(await page.getAttribute('#kindRow [data-ck="dyn"][data-i="0"]', 'aria-pressed'), 'true', 'equilibrium by default');
    await page.click('[data-template="beam"]');
    const drawn = await page.evaluate(() => Object.entries(window.__rl.givens).filter(([, g]) => g.from === 'drawing').map(([id]) => id).sort());
    assert.deepEqual(drawn, ['L', 'M', 'm'], 'the beam names L and M, the hung block m');
    await editChip(page, 'L', 1.79, 'm'); await editChip(page, 'M', 1.07, 'kg'); await editChip(page, 'm', 0.301, 'kg');
    await openStage(page, 1);
    await pickBody(page, 'rod');
    // the extended free-body diagram: each force starts where it acts
    for (const k of ['gravity', 'hung', 'tension', 'hinge']) await page.click(`#fbd [data-addforce="${k}"]`);
    let fs = await forcesOn(page, 'rod');
    assert.deepEqual(fs, ['gravity::down:centre', 'hung::down:dm', 'tension:Tn:up:dT', 'hinge:Hx:right:pivot', 'hinge:Hy:up:pivot']);
    // the cord slants up toward the left end at φ to the beam; the hook and the cord are measured from the right end
    await page.selectOption('#fbd [data-fdir="2"]', 'slant-ul');
    await page.click('#fbd [data-ffrom="dm"][data-side="right"]');
    await page.click('#fbd [data-ffrom="dT"][data-side="right"]');
    assert.equal(await page.locator('#bd [data-arrow]').count(), 5, 'every force is drawn on the beam');
    // the axis starts at the pivot, with a question about why that is a good choice
    assert.equal(await page.inputValue('#fbdAxis'), 'pivot');
    assert.match(await page.innerText('#fbd'), /Why is the pivot a good axis/);
    await page.click('#fbd [data-why="1"]');
    assert.match(await page.innerText('#whyMsg'), /every point/i, 'a wrong answer explains');
    await page.click('#fbd [data-why="0"]');
    assert.match(await page.innerText('#whyMsg'), /lever arm is zero/i);
    // torque cards: force, lever arm, sign
    const table = await page.innerText('#torqueTable');
    assert.match(table, /H[\s\S]*0/, 'the hinge forces have no lever arm about the pivot');
    assert.match(table, /↻/); assert.match(table, /↺/);
    await page.click('#fbdWrite');
    const labels = await page.evaluate(() => Object.values(window.__rl.gen).map(g => g.label));
    assert.deepEqual(labels, ['ΣFx', 'ΣFy', 'Στ (about the pivot)']);
    // the distances along the beam are named on the drawing; they get their numbers like any given
    await addGiven(page, 'dP', 0.262, 'm'); await addGiven(page, 'dm', 0.262, 'm'); await addGiven(page, 'dT', 0.354, 'm');
    await addGiven(page, 'phi', 24.9, '°');
    await confirmConditions(page);
    for (const t of ['Tn', 'Hx', 'Hy']) await addTarget(page, t);
    await showMe(page);
    const f = await found(page);
    near(f.Tn, 21.005); near(f.Hx, 19.0524); near(f.Hy, 4.6057);
    assert.match(await page.innerText('#knowns'), /toward the right end/, 'H_x is reported with its direction');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('gate 2: a beam hinged at one end, hanging by a vertical cable: β = 18.5°, T = 7.72 N, H_x = 0, H_y = 6.12 N', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await torqueUnit(page);
    await page.click('[data-bshape="rod"]'); await page.click('[data-bshape="pivot"]');
    // pin the rod at its left end
    await page.evaluate(() => { const S = window.__rl, r = S.build.shapes.find(s => s.kind === 'rod'), p = S.build.shapes.find(s => s.kind === 'pivot'); p.x = r.x - r.w / 2 + 2; p.y = r.y + 22; S.build.snap(); });
    assert.equal(await page.evaluate(() => window.__rl.build.shapes.find(s => s.kind === 'rod').pinAt), 'left', 'pinned at its left end');
    await editChip(page, 'L', 45.3, 'cm'); await editChip(page, 'M', 1.41, 'kg');
    await addGiven(page, 'xh', 38.5, 'cm'); await addGiven(page, 'hc', 12.9, 'cm');
    await openStage(page, 1);
    await page.click('#fbd [data-tilt="down"]');
    for (const k of ['gravity', 'tension', 'hinge']) await page.click(`#fbd [data-addforce="${k}"]`);
    assert.deepEqual(await forcesOn(page, 'rod'), ['gravity::down:centre', 'tension:Tn:up:dT', 'hinge:Hx:right:pivot', 'hinge:Hy:up:pivot']);
    await page.click('#fbdWrite');
    await confirmConditions(page);
    for (const t of ['beta', 'Tn', 'Hx', 'Hy']) await addTarget(page, t);
    await showMe(page);
    const f = await found(page);
    near(f.dT, 0.40604); near(f.beta, 18.5242); near(f.Tn, 7.71597); near(f.Hx, 0); near(f.Hy, 6.11613);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('gate 3: a thin rod about one end, I = ⅓ML² = 0.408 kg·m², 4 × the centre value (parallel axis)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await torqueUnit(page);
    await addGiven(page, 'M', 2.5, 'kg'); await addGiven(page, 'L', 70, 'cm');
    await setCondition(page, 'shape', 'rod');
    await setCondition(page, 'axis', 'other');
    await confirmConditions(page);
    await addTarget(page, 'I'); await addTarget(page, 'Icm');
    await showMe(page);
    const f = await found(page);
    near(f.I, 0.408333); near(f.Icm, 0.1020833); near(f.I / f.Icm, 4, 1e-9);
    // the library shows every standard shape; the ones that don't fit the shape you picked grey out
    await page.click('#libBtn');
    const lib = await page.innerText('#lib');
    for (const w of ['thin rod', 'solid disc', 'thin ring', 'solid sphere', 'hollow sphere', 'point mass', 'parallel-axis']) assert.match(lib.toLowerCase(), new RegExp(w));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('gate 3 (parallel axis): I = I_cm + Md² with d = L/2 gives the end value from the centre value', () => {
  const Icm = EQS.J1.solve.Icm.f({ M: 2.5, L: 0.7 }).value;
  near(EQS.J8.solve.I.f({ Icm, M: 2.5, dpa: 0.35 }).value, 0.408333, 1e-6);
  near(EQS.J2.solve.I.f({ M: 2.5, L: 0.7 }).value, 4 * Icm, 1e-9);
});

test('gate 4: a disc spun up by a hanging mass, from the drawing: Στ = Iα and ΣF = ma combine with a = Rα', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await torqueUnit(page);
    await page.click('#kindRow [data-ck="dyn"][data-i="1"]');
    await page.click('[data-template="disc"]');
    assert.equal(await page.evaluate(() => window.__rl.cond.shape), 'disc', 'the drawn disc settles the shape');
    await editChip(page, 'M', 2, 'kg'); await editChip(page, 'R', 0.2, 'm'); await editChip(page, 'm', 1, 'kg');
    await openStage(page, 1);
    // the disc: weight and axle at the centre, the string's pull at the rim
    await pickBody(page, 'wheel');
    for (const k of ['gravity', 'hinge', 'tension']) await page.click(`#fbd [data-addforce="${k}"]`);
    assert.deepEqual(await forcesOn(page, 'wheel'), ['gravity::down:centre', 'hinge:Hx:right:centre', 'hinge:Hy:up:centre', 'tension:Tn:down:rim-left']);
    await page.click('#fbdWrite');
    // the hanging block: the usual free-body diagram (+ down)
    await pickBody(page, 'block');
    for (const k of ['gravity', 'tension']) await page.click(`#fbd [data-addforce="${k}"]`);
    await page.click('#fbdWrite');
    const gen = await page.evaluate(() => Object.values(window.__rl.gen).map(g => g.text));
    assert.ok(gen.some(t => /R ?T = I ?α|RT = Iα/.test(t.replace(/·/g, ''))), `Στ = Iα written from the disc: ${gen}`);
    await confirmConditions(page);
    for (const t of ['a', 'Tn', 'alpha']) await addTarget(page, t);
    // the sheet route: the moment of inertia, then three equations in T, a, α (a system of three)
    await openStage(page, 3);
    for (const e of ['J3', 'J9', 'D3']){ await page.click('#libBtn'); await page.click(`#lib [data-gather="${e}"]`); await page.click('#libClose'); }
    await page.click('#sheet [data-eq="J3"] [data-solve="Icm"]');
    await page.waitForFunction(() => !window.__rl.busy && 'Icm' in window.__rl.found);
    await page.click('#sheet [data-eq="J9"] [data-solve="I"]');
    await page.waitForFunction(() => !window.__rl.busy && 'I' in window.__rl.found);
    assert.match(await page.innerText('#sheetStatus'), /system of three equations/);
    await page.click('#sysBtn');
    await showMe(page);
    const f = await found(page);
    near(f.a, 4.905); near(f.Tn, 4.905); near(f.alpha, 24.525);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the axis can be any point: click the beam with the axis tool; the hinge then has a lever arm', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await torqueUnit(page);
    await page.click('[data-template="beam"]');
    await openStage(page, 1);
    await pickBody(page, 'rod');
    for (const k of ['gravity', 'hinge']) await page.click(`#fbd [data-addforce="${k}"]`);
    await page.click('[data-tool="axis"]');
    const p = await page.evaluate(() => { const S = window.__rl, r = S.build.shapes.find(s => s.kind === 'rod'); return S.build.toScreen(r.x + r.w / 2 - 3, r.y); });
    await page.mouse.click(p.x, p.y);
    assert.equal(await page.inputValue('#fbdAxis'), 'right', 'snaps to the nearest named point: the right end');
    assert.doesNotMatch(await page.innerText('#fbd'), /Why is the pivot a good axis/);
    const rows = await page.$$eval('#torqueTable tr', trs => trs.map(t => t.innerText));
    assert.ok(rows.some(r => /H.*y/.test(r) && /L|d/.test(r)), 'H_y now has a lever arm');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('drawing a force on the beam: it starts where you start the drag, and the picker offers the beam forces', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await torqueUnit(page);
    await page.click('[data-template="beam"]');
    await openStage(page, 1);
    const { x, y } = await page.evaluate(() => { const S = window.__rl, r = S.build.shapes.find(s => s.kind === 'rod'); return S.build.toScreen(r.x + r.w * 0.3, r.y); });
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y - 50, { steps: 4 }); await page.mouse.move(x, y - 110, { steps: 4 }); await page.mouse.up();
    const kinds = await page.$$eval('#forcePick [data-fkind]', bs => bs.map(b => b.dataset.fkind));
    assert.ok(['hung', 'tension', 'hinge'].every(k => kinds.includes(k)), kinds.join());
    await page.click('#forcePick [data-fkind="tension"]');
    const f = await page.evaluate(() => { const S = window.__rl, b = S.build.bodies().find(x => x.kind === 'rod'); return S.fbd.forces[b.id][0]; });
    assert.equal(f.at, 'dT'); assert.equal(f.dir, 'up');
    assert.ok(Math.abs(f.u - 0.8) < 0.05, `drawn 80% of the way along from the left end: u = ${f.u}`);
    assert.match(await page.textContent('#bd'), /dT|d_T|dₜ/, 'the point is named on the drawing');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
