// Phase S1 gate: simplify (docs/simplify-audit.md). Fewer things on screen, using what the app already has:
// the exam sheet two clicks from the start; one instruction line and the problem text once; no unit tabs inside a
// lesson; a drawn body takes the unit's own mass symbol; nothing in Conditions chosen for the student; menus close.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const shown = (page, sel) => page.$$eval(sel, els => els.filter(e => e.getClientRects().length > 0 && e.textContent.trim()).length);
// a lesson stop opened the way a student does: Course (a main button), then the stop
async function openStop(page, key){
  await page.locator('#courseBtn').click();
  await page.locator(`[data-stop="${key}"]`).click();
  await page.waitForFunction(() => window.__rl.course.active);
}

test('a new student reaches a lesson’s exam sheet in two clicks from the start screen', async () => {
  const { page, errors } = await openApp(env.browser, env.url); // nothing stored: what a new student sees
  try {
    assert.equal(await page.locator('#modeBtn').count(), 0, 'there is one mode: no Drawing first / Guided switch');
    assert.ok(await page.locator('#courseBtn').isVisible(), 'Course & exams is a main button, not inside a menu');
    assert.equal(await page.$eval('#courseBtn', b => !!b.closest('#toolsMenu')), false);
    await page.locator('#courseBtn').click();           // click 1
    await page.locator('[data-sheet="roll"]').click();  // click 2
    await page.waitForSelector('#sheetPage:not([hidden]) .sprob');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('in a lesson: one instruction line, the problem once, no unit tabs, nothing pre-chosen in Conditions', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await openStop(page, 'roll/long');
    assert.equal(await shown(page, '#bubble'), 0, 'no separate tip line: the lesson’s words are in the Next line');
    assert.match(await page.innerText('[data-now="next"]'), /Draw the ramp and the ball/);
    assert.equal(await shown(page, '#setupGuide'), 0, 'no Inspect checklist repeating the Next line');
    assert.equal(await shown(page, '#bprops'), 0, 'no footnote under the canvas until a part is selected');
    const text = 'A 2.0 kg uniform solid sphere';
    assert.equal(await page.$$eval('#problem, #pinText', (els, t) => els.filter(e => e.getClientRects().length && (e.value ?? e.textContent).includes(t)).length, text), 1, 'the problem text shows once');
    assert.equal(await shown(page, '#chPick'), 0, 'no unit tabs inside a lesson');
    assert.equal(await page.$$eval('#conds [aria-pressed="true"], #conds input:checked:not(:disabled)', x => x.length), 0, 'no condition chosen for the student');
    const auto = await page.evaluate(() => Object.entries(window.__rl.givens).filter(([, g]) => g.from === 'condition').map(([id]) => id));
    assert.deepEqual(auto, [], 'no givens filled in from conditions before the student picks them');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a ball drawn in the rolling unit takes the unit’s mass symbol M', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await openStop(page, 'roll/long');
    const r = await page.evaluate(() => { const S = window.__rl; S.build.add('ramp'); S.build.add('ball'); const b = S.build.shapes.find(s => s.kind === 'ball'); return { mass: b.props.mass, radius: b.props.radius, givens: Object.keys(S.givens) }; });
    assert.equal(r.mass, 'M'); assert.equal(r.radius, 'R');
    assert.ok(r.givens.includes('M') && !r.givens.includes('m'), r.givens.join());
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the More menu closes when an item is picked', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.locator('#toolsMenu > summary').click();
    assert.equal(await page.$eval('#toolsMenu', d => d.open), true);
    await page.locator('#nbBtn').click();
    assert.equal(await page.$eval('#toolsMenu', d => d.open), false, 'the menu doesn’t stay over the drawer it opened');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
