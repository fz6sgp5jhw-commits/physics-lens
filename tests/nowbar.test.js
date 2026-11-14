// The pinned note under the header: Doing, Why and Next stay in view while the page scrolls, on a laptop and a phone,
// in guided and drawing-first mode. They follow the student's work and, like a hint, never give a value.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE } from '../js/data.js';
import { tell } from '../js/nowbar.js';
import { launch, openApp, loadPractice, applyKey, openStage } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const PHONE = { width: 375, height: 812 };
const parts = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#nowBar [data-now]')].map(e => [e.dataset.now, e.textContent])));
const onScreen = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }, sel);
const toBottom = async (page) => { await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(50); };
const solved = (page) => page.waitForFunction(() => { const S = window.__rl; return S.targets.length > 0 && S.targets.every(t => S.isKnown(t)) && !S.busy; });

const STAGES = [0, 1, 2, 3].map(i => ({ name: 'S' + i, doing: 'doing ' + i, why: 'why ' + i, whyMotion: 'motion ' + i, next: 'next ' + i, go: '#go' + i }));
const base = { mode: 'guided', stage: 0, stages: STAGES, checks: [false, false, false, false], first: 0, locked: false, lockText: '', hasGivens: false, drawn: false, condOk: false, targets: 0, cur: '', hint: '', hintKey: '', principle: '', walk: '', forcesOptional: false };

test('tell(): each stage says what it is, why, and one next step; a passed stage points on', () => {
  let t = tell(base);
  assert.match(t.doing, /S0/); assert.equal(t.why, 'why 0'); assert.equal(t.next, 'next 0'); assert.deepEqual(t.go, { sel: '#go0' });
  t = tell({ ...base, checks: [true, false, false, false] });
  assert.match(t.next, /Go on to <b>S1<\/b>/); assert.equal(t.go.stage, 1);
  t = tell({ ...base, stage: 1, checks: [true, null, false, false], forcesOptional: true });
  assert.equal(t.why, 'motion 1'); assert.equal(t.go.stage, 2, 'an optional diagram doesn’t hold the student back');
  // a lesson's walk list names the next thing to draw; its text is escaped
  t = tell({ ...base, walk: 'Draw the <rod>' });
  assert.equal(t.next, 'Draw the &lt;rod&gt;');
});

test('tell(): at Solve the next step is the pointing hint, with where to go; a locked Solve sends the student back', () => {
  const solve = { ...base, stage: 3, checks: [true, true, true, false], hasGivens: true, condOk: true };
  let t = tell({ ...solve, hint: 'Add a target.' });
  assert.equal(t.go.sel, '#targets');
  t = tell({ ...solve, targets: 1, cur: '<b>a</b> (acceleration)', hint: 'Your sheet is missing a link.', hintKey: 'missS2', principle: 'Newton’s second law' });
  assert.match(t.doing, /finding <b>a<\/b>/); assert.match(t.why, /Newton’s second law/); assert.match(t.next, /Equation library/); assert.equal(t.go.sel, '#toolsMenu');
  t = tell({ ...solve, targets: 1, hint: 'All found.' });
  assert.match(t.doing, /every target is found/); assert.match(t.go.sel, /replayBtn/);
  t = tell({ ...solve, checks: [true, false, false, false], first: 1, locked: true, lockText: 'Solving unlocks when Forces passes.' });
  assert.equal(t.next, 'Solving unlocks when Forces passes.'); assert.equal(t.go.stage, 1);
});

test('tell(): drawing first follows draw, set the parts, check the summary, write the equations', () => {
  const df = { done: false, closed: false, summary: false, count: '', shapes: 0, lines: 0 };
  const go = (d) => tell({ mode: 'draw', df: { ...df, ...d } });
  assert.equal(go({}).go.sel, '#bpal');
  assert.equal(go({ shapes: 2 }).go.sel, '#doneDraw');
  assert.match(go({ done: true, count: '1 of 3 parts set' }).doing, /1 of 3 parts set/);
  assert.equal(go({ done: true, summary: true }).go.sel, '#dfClose');
  assert.equal(go({ done: true, closed: true }).go.sel, '#dfWork');
});

for (const [name, vp] of [['laptop 1440×900', { width: 1440, height: 900 }], ['phone 375 px', PHONE]]){
  test(`${name}: the note stays in view at the bottom of the page, follows the stage and the solving, and gives no answer`, async () => {
    const { page, errors } = await openApp(env.browser, env.url);
    try {
      const start = await parts(page);
      assert.match(start.doing, /Setup/); assert.ok(start.why && start.next);
      await loadPractice(page, 4); await applyKey(page, PRACTICE[4]);
      await page.setViewportSize(vp);
      await page.evaluate(() => document.querySelector('#steps [data-stage="0"]').click());
      const setup = await parts(page);
      assert.match(setup.next, /Go on to Forces/, 'Setup passed: the note points on');
      await page.evaluate(() => document.querySelector('#steps [data-stage="3"]').click());
      const solving = await parts(page);
      assert.match(solving.doing, /Solve/); assert.match(solving.doing, /finding a/);
      assert.notDeepEqual(solving, setup, 'all three parts changed with the stage');
      for (const k of ['doing', 'why', 'next']) assert.notEqual(solving[k], setup[k], k);
      // Take me there: the control the next step names comes into view, outlined
      await toBottom(page);
      assert.ok(await onScreen(page, '#nowBar'), 'the note is in view at the bottom of the page');
      assert.ok(await onScreen(page, '#bubble'), 'and so is the assistant line');
      await page.click('#nowGo');
      await page.waitForFunction(() => { const t = document.querySelector('.guide-pulse'); if (!t) return false; const r = t.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
      // one step solved: the note moves on to the next target
      await page.evaluate(() => document.getElementById('showBtn').click());
      await solved(page);
      const done = await parts(page);
      assert.match(done.doing, /every target is found/); assert.notEqual(done.next, solving.next);
      // no value from the answers appears in the note
      const answers = await page.evaluate(() => { const S = window.__rl; return S.targets.map(t => String(S.found[t].val)); });
      const text = Object.values(done).join(' ');
      assert.equal(answers.length, 2);
      for (const a of [...answers, '4.823', '2.231', '4.82', '2.23']) assert.ok(!text.includes(a), `the note shows ${a}`);
      await toBottom(page);
      assert.ok(await onScreen(page, '#nowBar'));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no sideways scroll');
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('phone: the note is short until More is pressed; drawing first has it too', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await page.setViewportSize(PHONE);
    const p = await parts(page);
    assert.match(p.doing, /Drawing the problem/); assert.match(p.next, /Pick a shape/);
    assert.equal(await page.isVisible('#nowBar [data-now="why"]'), false, 'Why is folded away on a phone');
    const short = await page.evaluate(() => document.getElementById('nowBar').offsetHeight);
    assert.ok(short <= 150, `the folded note is short: ${short}px`);
    await page.click('#nowMore');
    assert.ok(await page.isVisible('#nowBar [data-now="why"]'));
    assert.equal(await page.getAttribute('#nowMore', 'aria-expanded'), 'true');
    await page.click('#nowMore');
    await toBottom(page);
    assert.ok(await onScreen(page, '#nowBar'));
    // the note and the thumb bar leave the middle of the screen for the work
    const free = await page.evaluate(() => document.getElementById('thumbBar').getBoundingClientRect().top - document.getElementById('nowBar').getBoundingClientRect().bottom);
    assert.ok(free >= 500, `room between the note and the thumb bar: ${free}px`);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('guided: answering Conditions moves the note on', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await loadPractice(page, 4); await applyKey(page, PRACTICE[4]);
    await page.evaluate(() => { window.__rl.condOk = false; }); // the conditions are set but not yet confirmed
    await openStage(page, 2);
    const before = await parts(page);
    assert.match(before.doing, /Conditions/); assert.match(before.next, /These conditions are right/);
    await page.click('#nowGo');
    assert.equal(await page.evaluate(() => document.getElementById('condOk').classList.contains('guide-pulse')), true);
    await page.click('#condOk');
    await page.waitForFunction((n) => document.querySelector('#nowBar [data-now="next"]').textContent !== n, before.next);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
