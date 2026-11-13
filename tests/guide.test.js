// Phase G2 gate: the fading guide. Three levels (Walk me through, Prompt me, On my own) under a demo: a correct step drops the
// level one notch, a wrong one raises it; Show me costs a star; the level is kept in pl-guide, validated, and can be forgotten.
// Walk me through checks the drawing and explains each force; Prompt me asks before any equation, using the answer chosen.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, easier, harder, drawn, walkStatus, askJudge, readGuide, KEY } from '../js/guide.js';
import { LESSONS } from '../js/data.js';
import { launch, openApp, applyKey } from './helpers.js';

const G = LESSONS[0].stops[0].guide;

test('a correct step drops the level one notch; a wrong step raises it, never back up to the demo', () => {
  assert.deepEqual(LEVELS, ['demo', 'walk', 'prompt', 'own']);
  assert.equal(easier('demo'), 'walk'); assert.equal(easier('walk'), 'prompt'); assert.equal(easier('prompt'), 'own'); assert.equal(easier('own'), 'own');
  assert.equal(harder('own'), 'prompt'); assert.equal(harder('prompt'), 'walk'); assert.equal(harder('walk'), 'walk'); assert.equal(harder('demo'), 'demo');
});

test('the stored level is validated on read', () => {
  const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
  assert.deepEqual(readGuide(), { level: 'demo', demo: false });
  store[KEY] = JSON.stringify({ v: 1, level: 'prompt', demo: true }); assert.deepEqual(readGuide(), { level: 'prompt', demo: true });
  for (const bad of ['{"v":1,"level":"expert"}', '{"v":2,"level":"own"}', 'not json', '[]', '{"level":"own"}']){ store[KEY] = bad; assert.deepEqual(readGuide(), { level: 'demo', demo: false }, bad); }
  delete globalThis.localStorage;
});

test('walk me through: each thing to draw is checked against the drawing', () => {
  const snap = { shapes: [{ id: 1, kind: 'wheel' }, { id: 2, kind: 'block' }], strings: [['wheel', 'block']], forces: { 2: ['gravity'], 1: ['tension'] } };
  const rows = walkStatus(G.walk, snap);
  assert.deepEqual(rows.map(r => r.done), [true, true, true, true, false, true]);
  assert.ok(!drawn({ force: { on: 'block', kind: 'tension' } }, snap), 'a tension on the disc is not a tension on the block');
  assert.ok(G.walk.every(r => r.why.length > 20), 'each one says why');
});

test('prompt me: the answer chosen is used in the explanation', () => {
  const q = G.ask[1];
  const bad = askJudge(q, 1);
  assert.equal(bad.ok, false); assert.match(bad.text, /You chose “the disc’s weight”/); assert.match(bad.text, /no lever arm/); assert.match(bad.text, /The one that fits is “the string’s tension at the rim”/);
  const good = askJudge(q, 0);
  assert.equal(good.ok, true); assert.match(good.text, /You chose “the string’s tension at the rim”: yes/);
});

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });
const guide = (page) => page.evaluate(() => window.__rl.guide.state());
const stored = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);

test('first time: the demo is offered; levels move with right and wrong answers and are remembered; Forget clears them', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.evaluate(() => window.__rl.course.open('disc', 'long'));
    assert.deepEqual([(await guide(page)).level, (await guide(page)).demoSeen], ['demo', false]);
    assert.match(await page.innerText('#guideCard'), /Watch a demo/);
    await page.click('[data-glevel="prompt"]');
    assert.equal((await guide(page)).level, 'prompt');
    assert.equal(JSON.parse(await stored(page)).level, 'prompt');
    // the questions come one at a time
    assert.equal(await page.locator('#guideCard .guideq').count(), 1);
    await page.click('[data-gq="0:1"]');                                            // wrong: its weight alone
    assert.match(await page.innerText('#guideNote'), /You chose “its weight alone”/);
    assert.equal((await guide(page)).level, 'walk', 'a wrong answer raises the level');
    await page.click('[data-glevel="prompt"]');
    await page.click('[data-gq="0:0"]');                                            // right
    assert.equal((await guide(page)).level, 'own', 'a right answer drops it');
    assert.equal((await guide(page)).answered['disc/long'][0].ok, true);
    await page.click('#guideClear');
    assert.deepEqual([(await guide(page)).level, await stored(page)], ['demo', null]);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('walk me through: the checklist ticks as the disc, string and block are drawn', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.evaluate(() => window.__rl.course.open('disc', 'long'));
    await page.click('[data-glevel="walk"]');
    assert.equal(await page.locator('#guideCard .guidewalk li.done').count(), 0);
    assert.match(await page.innerText('#guideCard .guidewalk li.next'), /Draw the disc/);
    await page.evaluate(() => { const B = window.__rl.build; B.add?.('wheel'); });
    await page.evaluate(() => window.__rl.guide.render?.());
    const n = await page.locator('#guideCard .guidewalk li.done').count();
    assert.ok(n >= 1, 'drawing the disc ticks the first item');
    assert.match(await page.innerText('#guideCard .guidewalk li.done'), /the body that turns/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('Show me costs a star in a lesson', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.evaluate(() => window.__rl.course.open('disc', 'long'));
    assert.equal(await page.evaluate(() => window.__rl.course.stars), 3);
    await page.click('#lessonBar button:has-text("Route")'); await page.click('#routeDone');
    await applyKey(page, { ch: 'rolling', key: LESSONS[0].stops[0].problem.key });
    await page.click('#showBtn');
    await page.waitForFunction(() => 'a' in window.__rl.found && !window.__rl.busy, null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.__rl.course.stars), 2);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the demo solves an example while naming each control, then hands back an empty workspace', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('#guideDemo');
    const steps = [];
    for (let i = 0; i < 20; i++){
      await page.waitForSelector('#demoText', { timeout: 15000 });
      await page.waitForFunction(() => document.querySelector('#demoText').textContent.length > 5 && !document.querySelector('#demoNext')?.disabled);
      steps.push(await page.innerText('#demoText'));
      if (await page.locator('#demoDone').count()) break;
      await page.click('#demoNext');
    }
    assert.match(steps[0], /The problem/); assert.match(steps[1], /Givens/); assert.match(steps[2], /Conditions/); assert.match(steps[3], /Target/);
    const solvedText = steps.filter(t => /Gather/.test(t) && /Solve for/.test(t));
    assert.ok(solvedText.length >= 1, `a gather-and-solve step names the library and the Solve button: ${steps.join(' | ')}`);
    assert.ok(steps.some(t => /Hint/.test(t)));
    assert.equal(await page.evaluate(() => 'a' in window.__rl.found), true, 'the app really solved it');
    assert.equal(await page.evaluate(() => document.querySelectorAll('.guide-pulse').length) <= 1, true);
    await page.click('#demoDone');
    assert.deepEqual([await page.evaluate(() => Object.keys(window.__rl.found).length), (await guide(page)).demoSeen, (await guide(page)).level], [0, true, 'walk']);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
