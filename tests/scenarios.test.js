// Phase D gate test: scenarios + what matters.
// Two touching blocks on a floor, F pushes A, same μk on both:
//   P = F·m_B/(m_A + m_B); μk and g don't matter;
//   ranking 4 > 2 > 3 > 1 (9, 8, 6, 4 N) for (m_A, m_B, F, μk) = (2,1,12,0.1), (1,2,12,0.1), (2,2,12,0.3), (1,1,18,0.2);
//   scenario 3 flagged as barely sliding.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, setCondition, confirmConditions, addTarget } from './helpers.js';
import { gather } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const ROWS = [[2, 1, 12, 0.1], [1, 2, 12, 0.1], [2, 2, 12, 0.3], [1, 1, 18, 0.2]];
const COLS = ['mA', 'mB', 'Fp', 'mu'];

async function openEditorFor(page, id){
  await page.evaluate(async (id) => {
    const { VARS, CHAPTERS } = await import('./js/data.js');
    const ch = CHAPTERS[window.__rl.ch], name = (ch.names && ch.names[id]) || VARS[id].name;
    const b = [...document.querySelectorAll('#palette button')].find(x => x.title === `Add ${name}`);
    if (!b) throw new Error(`no palette button for ${id}`);
    b.click();
  }, id);
}
async function drawForces(page, bodyIndex, forces){
  const bodies = await page.evaluate(() => window.__rl.build.bodies().map(b => b.id));
  if (bodies.length > 1) await page.selectOption('#fbdBody', bodies[bodyIndex]);
  for (const k of forces) await page.click(`[data-addforce="${k}"]`);
}

async function setup(page){
  await page.click('#chPick button:has-text("Pushed blocks")');
  await setCondition(page, 'friction', true);
  await confirmConditions(page);
  // the four givens that change from case to case go in the scenario table
  for (const id of COLS){ await openEditorFor(page, id); await page.click('#editorSlot [data-kind="scenario"]'); await page.click('#edSave'); }
  for (let r = 0; r < ROWS.length; r++){
    await page.click('#scenAdd');
    for (let c = 0; c < COLS.length; c++) await page.fill(`#scen [data-cell="${r},${c}"]`, String(ROWS[r][c]));
  }
  await page.locator('#scen [data-cell="3,3"]').dispatchEvent('change');
  // build: two touching blocks on a floor; forces on each
  await page.click('[data-dtab="build"]'); await page.click('[data-template="blocks"]');
  await page.click('[data-dtab="forces"]');
  await drawForces(page, 0, ['gravity', 'normal', 'push', 'contact', 'friction']);
  await page.click('#fbdCheck'); assert.match(await page.innerText('#fbdMsg'), /looks right/i, 'block A');
  await page.click('#fbdWrite');
  await drawForces(page, 1, ['gravity', 'normal', 'contact', 'friction']);
  await page.click('#fbdCheck'); assert.match(await page.innerText('#fbdMsg'), /looks right/i, 'block B');
  await page.click('#fbdWrite');
  for (const e of ['Q1', 'Q2']) await gather(page, e);
}

test('pushed blocks: P = F·m_B/(m_A + m_B), what matters, ranking, barely sliding (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await setup(page);
    const eqs = await page.evaluate(() => window.__rl.sheet.filter(e => e.startsWith('G')).map(e => window.__rl.eqText(e)));
    assert.deepEqual(eqs, ['F − P − f_A = m_A a', 'N_A − m_A g = 0', 'P − f_B = m_B a', 'N_B − m_B g = 0']);
    await addTarget(page, 'P');
    await addTarget(page, 'rank:P');
    await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return S.targets.every(t => S.isKnown(t)) && !S.busy; }, null, { timeout: 20000 });
    const P = await page.evaluate(async () => { const X = await import('./js/expr.js'), S = window.__rl; return X.toText(S.found.P.expr, S.printOpts); });
    assert.equal(P, 'm_B F / (m_A + m_B)');
    const m = await page.innerText('#matters');
    // (the page shows m_A as m with a subscript A, so its text reads "mA")
    assert.match(m, /P depends on: mA, mB, F\n/);
    assert.match(m, /P doesn’t depend on: (g, μk|μk, g) /);
    assert.match(m, /mA → 0: P → F/);
    assert.match(m, /mB → ∞: P → F/);
    assert.match(m, /4 > 2 > 3 > 1/);
    assert.match(m, /9 N, 8 N, 6 N, 4 N/);
    const flags = await page.evaluate(() => [...document.querySelectorAll('#matters [data-flag]')].map(e => e.dataset.flag));
    assert.deepEqual(flags, ['ok', 'ok', 'barely', 'ok']);
    assert.match(await page.innerText('#matters'), /barely sliding/i);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the free-body checker wants the contact pair: same symbol, opposite directions', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('#chPick button:has-text("Pushed blocks")');
    await setCondition(page, 'friction', false); await confirmConditions(page);
    await page.click('[data-dtab="build"]'); await page.click('[data-template="blocks"]');
    await page.click('[data-dtab="forces"]');
    await drawForces(page, 0, ['gravity', 'normal', 'push']);
    await page.click('#fbdCheck');
    assert.match(await page.innerText('#fbdMsg'), /touches block B.*contact force/i);
    await drawForces(page, 0, ['contact']);
    await page.selectOption('[data-fdir="3"]', 'forward');
    await drawForces(page, 1, ['gravity', 'normal', 'contact']);
    await page.selectOption('[data-fdir="2"]', 'forward');
    await page.click('#fbdCheck');
    assert.match(await page.innerText('#fbdMsg'), /third law.*opposite/i);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
