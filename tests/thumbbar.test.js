// Phase 10 stage 2: on a phone the open stage's tools sit in a fixed thumb bar, one stage's cards show at a time,
// and nothing is wider than the screen. On a laptop the bar is not shown.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE } from '../js/data.js';
import { launch, openApp, loadPractice, applyKey } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const PHONE = { width: 375, height: 812 };
const bar = (page) => page.evaluate(() => [...document.querySelectorAll('#thumbBar .tbtn')].map(b => ({ t: b.lastChild.textContent, now: b.classList.contains('now'), off: b.disabled, h: Math.round(b.getBoundingClientRect().height) })));
const shown = (page, sel) => page.evaluate((sel) => { const el = document.querySelector(sel); return !!el && el.getClientRects().length > 0; }, sel);
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const press = (page, t) => page.locator('#thumbBar .tbtn', { hasText: t }).click();

test('laptop: the thumb bar is not shown', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    assert.equal(await shown(page, '#thumbBar'), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('phone, guided: the bar holds the open stage’s tools at thumb size, and the way on lights up when the stage passes', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.setViewportSize(PHONE);
    let b = await bar(page);
    assert.deepEqual(b.map(x => x.t), ['Given', 'Undo', 'Forces']);
    assert.ok(b.every(x => x.h >= 44), `44 px targets: ${JSON.stringify(b)}`);
    assert.deepEqual(b.filter(x => x.now).map(x => x.t), ['Given'], 'nothing set up yet: the stage’s own tool matters');
    assert.ok(await noSideScroll(page));
    await press(page, 'Given');
    assert.ok(await shown(page, '#palette'), 'the bar button presses + Add a given');
    // a solved problem: every stage has passed
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPractice(page, 4); await applyKey(page, PRACTICE[4]); await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return S.targets.every(t => S.isKnown(t)) && !S.busy; });
    await page.setViewportSize(PHONE);
    await page.click('#steps [data-stage="0"]');
    b = await bar(page);
    assert.deepEqual(b.filter(x => x.now).map(x => x.t), ['Forces'], 'Setup passed: the way on is lit');
    await press(page, 'Forces');
    assert.equal(await page.evaluate(() => window.__rl.stage), 1);
    assert.deepEqual((await bar(page)).map(x => x.t), ['Undo', 'Motion', 'Conditions']);
    await press(page, 'Conditions');
    assert.deepEqual((await bar(page)).map(x => x.t), ['Confirm', 'Solve']);
    await press(page, 'Solve');
    b = await bar(page);
    assert.deepEqual(b.map(x => x.t), ['Looking for', 'Hint', 'Show me', 'Replay']);
    assert.deepEqual(b.filter(x => x.now).map(x => x.t), ['Replay'], 'every target found: Replay is what’s left');
    assert.ok(b.every(x => x.h >= 44 && !x.off));
    assert.ok(await noSideScroll(page));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('phone, guided: one stage at a time, and a bar tool’s message stays in view', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.setViewportSize(PHONE);
    assert.ok(await shown(page, '#problem') && await shown(page, '#bpal'), 'Setup shows the problem and the drawing tools');
    await page.click('#steps [data-stage="1"]');
    assert.equal(await shown(page, '#problem'), false, 'past Setup the problem box is put away');
    assert.equal(await shown(page, '#chPick'), false);
    assert.ok(await shown(page, '#bpal'), 'Forces keeps its drawing tools');
    await page.evaluate(() => window.__rl.stage = 0); await page.click('#steps [data-stage="3"]'); // the sheet can always be read
    assert.equal(await shown(page, '#bpal'), false, 'no drawing tools while solving');
    const order = await page.evaluate(() => document.getElementById('sheetWin').getBoundingClientRect().top < document.getElementById('diagramCard').getBoundingClientRect().top);
    assert.ok(order, 'the sheet comes before the sketch at Solve');
    // scrolled to the bottom, a bar tool's message is still in view: the assistant line is in the pinned note
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await press(page, 'Hint');
    const b = await page.evaluate(() => { const r = document.getElementById('bubble').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height > 0; });
    assert.ok(b, 'the message is on screen');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('phone, drawing first: the bar holds the main drawing tools and Done drawing', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await page.setViewportSize(PHONE);
    const b = await bar(page);
    assert.deepEqual(b.map(x => x.t), ['Select', 'Connect', 'Force', 'Undo', 'Done']);
    assert.ok(b.every(x => x.h >= 44));
    await press(page, 'Connect');
    assert.equal(await page.getAttribute('[data-dftool="connect"]', 'aria-pressed'), 'true');
    await page.waitForFunction(() => document.querySelector('#thumbBar .tbtn[aria-pressed="true"]')?.lastChild.textContent === 'Connect');
    assert.ok(await noSideScroll(page));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
