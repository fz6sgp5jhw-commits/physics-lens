// Phase E1 gate, revised in phase 2 (a guided solving flow): four stages, Setup → Forces → Conditions → Solve.
// Only the open stage's panel sits beside the canvas. At 1440×900, after solving, the problem statement, the canvas,
// the stage tracker and the latest solved card are on screen together without scrolling, and the Conditions panel is
// never below the fold. The library is a drawer; the work opens under the sheet's cards.
// Phase 10 (the open book, text on the left page and the sketch on the right): the Conditions panel sits under the
// givens on the left page, so its heading and confirm button are on screen and the rest of it scrolls with the page.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE } from '../js/data.js';
import { launch, openApp, loadPractice, applyKey, addGiven, openStage, roughen } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const inView = (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel); if (!el) return { sel, missing: true };
  const r = el.getBoundingClientRect();
  return { sel, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), ok: r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
}, sel);

const shown = (page, sel) => page.evaluate((sel) => { const el = document.querySelector(sel); return !!el && el.getClientRects().length > 0; }, sel);
const stars = (page) => page.evaluate(() => [...document.querySelectorAll('#steps [data-stage]')].map(b => b.classList.contains('done') ? '★' : b.classList.contains('na') ? '–' : '·').join(''));
async function solveSled(page){
  await loadPractice(page, 4); // sled: (a) a, then (b) t
  await applyKey(page, PRACTICE[4]);
  await page.click('#showBtn');
  await page.waitForFunction(() => { const S = window.__rl; return S.targets.every(t => S.isKnown(t)) && !S.busy; });
}

test('statement, canvas, tracker and the latest solved card fit on one 1440×900 screen; Conditions is never below the fold (gate)', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await solveSled(page);
    await page.click('[data-dtab="motion"]'); // after solving, replay the motion
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    // past Setup the statement on screen is the pinned line in the header (the problem box is put away); the pinned note sits under it
    for (const sel of ['#pinText', '#nowBar', '#dg', '#steps', '#sheet .eq.last']){
      const r = await inView(page, sel);
      assert.ok(r.ok, `${sel} is not fully on screen: ${JSON.stringify(r)}`);
    }
    // the latest solved card shows what it found
    assert.match(await page.innerText('#sheet .eq.last'), /t = 2\.231 s/);
    // only the Solve stage's panels are open; nothing drawn, so Forces has no diagram to check
    assert.equal(await shown(page, '#condCard'), false, 'conditions are closed while solving');
    assert.equal(await stars(page), '★–★★');
    // Conditions: one tap, on the text page, its heading and confirm button above the fold
    await openStage(page, 2);
    assert.ok((await inView(page, '#condCard .titlebar')).ok && (await inView(page, '#condOk')).ok, 'conditions panel starts on screen');
    assert.equal(await shown(page, '#sheetWin'), false, 'the sheet is closed in Conditions');
    // the sheet is one tap from any stage
    await page.click('#sheetTab');
    assert.ok((await inView(page, '#sheet .eq.last')).ok, 'the sheet tab opens the sheet');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('stages unlock like levels with a peek ahead: Solve waits for Forces when something is drawn', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    const stage = () => page.evaluate(() => window.__rl.stage);
    await openStage(page, 2); // two stages ahead of Setup: locked
    assert.equal(await stage(), 0);
    await openStage(page, 1); // one ahead: a peek is fine
    assert.equal(await stage(), 1);
    // draw the setup: Setup passes, Conditions opens, Solve can be read but not used until the diagram passes
    await page.click('[data-dtab="build"]'); await page.click('[data-template="incline"]');
    await openStage(page, 2);
    assert.equal(await stage(), 2);
    await page.click('#condOk');
    assert.equal(await stage(), 2, 'Solve is still locked, so confirming the conditions stays here');
    await openStage(page, 3);
    assert.equal(await shown(page, '#sheetLock'), true, 'the sheet says it is locked');
    await page.click('#showBtn', { force: true });
    assert.match(await page.innerText('#bubble'), /unlocks when.*Forces/);
    assert.equal(await page.evaluate(() => window.__rl.path.length), 0);
    // a checked free-body diagram passes Forces and unlocks Solve
    await page.click('[data-dtab="forces"]');
    await page.click('[data-addforce="gravity"]'); await page.click('[data-addforce="normal"]');
    await page.click('#fbdWrite');
    assert.equal(await stars(page), '★★★·');
    await openStage(page, 3);
    assert.equal(await shown(page, '#sheetLock'), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('multi-part problems: what (a) found stays a known for (b), labelled with its part; clearing a part asks first', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await solveSled(page);
    const parts = await page.evaluate(() => { const S = window.__rl; return { a: S.found.a.part, t: S.found.t.part }; });
    assert.deepEqual(parts, { a: 'a', t: 't' });
    // (b) used the a that (a) found: the card that found t names that step
    const steps = await page.evaluate(() => window.__rl.path.map(p => p.v));
    const aStep = steps.indexOf('a') + 1, tStep = steps.indexOf('t') + 1;
    assert.ok(aStep > 0 && tStep > aStep, JSON.stringify(steps));
    const last = await page.innerText('#sheet .eq.last');
    assert.match(last, new RegExp(`Step ${tStep}`));
    assert.match(last, new RegExp(`uses step ${aStep}, which found a`));
    // cards appear in solving order
    const nums = await page.evaluate(() => [...document.querySelectorAll('#sheet .eq .stepno')].map(e => parseInt(e.textContent.replace(/\D+/, ''), 10)));
    assert.deepEqual(nums, [...nums].sort((x, y) => x - y));
    // the givens strip shows found values with their part
    assert.match(await page.innerText('#knowns'), /a = 4\.823 m\/s².*found · \(a\)/s);
    // clearing part (b) asks first; Cancel keeps it
    await page.click('[data-clr="t"]');
    assert.match(await page.innerText('#dlgMsg'), /CLEAR PART \(b\)/);
    await page.click('#dlgCancel');
    assert.equal(await page.evaluate(() => 't' in window.__rl.found), true);
    await page.click('[data-clr="t"]'); await page.click('#dlgOk');
    const after = await page.evaluate(() => { const S = window.__rl; return { a: 'a' in S.found, t: 't' in S.found, targets: S.targets }; });
    assert.deepEqual(after, { a: true, t: false, targets: ['a', 't'] });
    // changing a given after solving asks before it clears the answers
    await page.click('#knowns [data-edit="dx"]'); await page.click('#edSave');
    assert.match(await page.innerText('#dlgMsg'), /CLEARS .* SOLVED STEP.*part \(a\)/s);
    await page.click('#dlgCancel');
    assert.equal(await page.evaluate(() => 'a' in window.__rl.found), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the drawing settles friction and the direction of motion; Conditions only asks the rest', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('[data-template="incline"]');
    await roughen(page, 'ramp');
    // draw v up the slope with the velocity tool
    await page.evaluate(() => { window.__rl.build.tool = 'vel'; });
    const { x, y, dx, dy } = await page.evaluate(() => { const S = window.__rl, b = S.build.bodies()[0], c = S.build.screenOf(b.id), u = S.fbdScreenDir(b, 'up-slope'); return { x: c.x, y: c.y, dx: u.x, dy: u.y }; });
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + dx * 50, y + dy * 50, { steps: 4 }); await page.mouse.move(x + dx * 100, y + dy * 100, { steps: 4 });
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => ({ f: window.__rl.cond.friction, up: window.__rl.cond.up })), { f: true, up: true });
    assert.equal(await stars(page), '★★··', 'the motion arrow is a motion diagram');
    await openStage(page, 2);
    const conds = await page.innerText('#conds');
    assert.match(conds, /Rough \(friction\): settled by your drawing/);
    assert.match(conds, /Up the slope: settled by your drawing/);
    assert.equal(await page.locator('#conds .cgroup:has(.settled) button').count(), 0, 'settled conditions have no buttons');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the library is a drawer, and gathering from it puts the equation on the sheet', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    assert.equal(await page.evaluate(() => document.getElementById('libDrawer').classList.contains('open')), false);
    await page.click('#libBtn');
    assert.equal(await page.evaluate(() => document.getElementById('libDrawer').classList.contains('open')), true);
    await page.click('#lib [data-gather="X1"]');
    assert.deepEqual(await page.evaluate(() => window.__rl.sheet), ['X1']);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('libDrawer').classList.contains('open')), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('in Forces mode the canvas shows the setup and the free-body builder sits beside it', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('[data-dtab="build"]'); await page.click('[data-template="incline"]');
    await page.click('[data-dtab="forces"]');
    assert.ok((await inView(page, '#bd')).ok, 'setup canvas visible');
    assert.ok((await inView(page, '#fbd')).ok || (await page.evaluate(() => document.getElementById('fbd').getBoundingClientRect().top < innerHeight)), 'free-body builder visible');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
