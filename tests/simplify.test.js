// Phase S1 gate: simplify (docs/simplify-audit.md). Fewer things on screen, using what the app already has:
// the exam sheet two clicks from the start; one instruction line and the problem text once; no unit tabs inside a
// lesson; a drawn body takes the unit's own mass symbol; nothing in Conditions chosen for the student; menus close.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, applyKey } from './helpers.js';
import { LESSONS } from '../js/data.js';

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

test('each equation on the sheet offers Solve it for me or I’ll do the algebra; the typed algebra opens under it, with only the sheet to draw from', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.evaluate(() => window.__rl.course.open('disc', 'long'));
    await applyKey(page, { ch: 'rolling', key: LESSONS[0].stops[0].problem.key });
    await page.click('#libBtn');
    for (const e of ['D5', 'D4']){ await page.click(`[data-gather="${e}"]`); await page.click('#kindWrap [data-kind="law"]'); await page.click('#kindCheck'); await page.click('#kindDone'); }
    await page.click('#libClose');
    assert.equal(await page.isVisible('#dfWork'), false, 'no separate Algebra panel until the student asks for it');
    const cards = await page.$$eval('#sheet .eq[data-eq]', els => els.map(e => ({ alg: !!e.querySelector('[data-alg]'), solve: e.querySelector('[data-solve]')?.textContent || null })));
    assert.ok(cards.length >= 2 && cards.every(c => c.alg), JSON.stringify(cards));
    assert.ok(cards.every(c => c.solve === null || /Solve it for me/.test(c.solve)), JSON.stringify(cards));
    await page.click('#sheet .eq[data-eq="D5"] [data-alg]');
    assert.ok(await page.isVisible('#dfWork'));
    assert.equal(await page.$eval('#dfWork', w => w.previousElementSibling?.dataset.eq), 'D5', 'the algebra sits under the equation it started from');
    assert.deepEqual((await page.evaluate(() => window.__rl.ws.state())).lines, ['mg − T = ma']);
    await page.click('#algSheetBtn');
    assert.match(await page.textContent('#algSheetBtn'), /Your sheet/);
    assert.equal(await page.locator('#algSheet .algpick').count(), 2, 'only the equations on the sheet, not the whole library');
    await page.locator('#algSheet .algpick').nth(1).click();
    assert.deepEqual((await page.evaluate(() => window.__rl.ws.state())).lines, ['mg − T = ma', 'TR = Iα']);
    await page.click('#algClose');
    assert.equal(await page.isVisible('#dfWork'), false, 'put away; the lines stay');
    assert.equal((await page.evaluate(() => window.__rl.ws.state())).lines.length, 2);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('when solved, one Solution card holds the answers, every step line by line and what matters', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.evaluate(() => window.__rl.course.open('disc', 'long'));
    await applyKey(page, { ch: 'rolling', key: LESSONS[0].stops[0].problem.key });
    assert.equal(await page.isVisible('#solWin'), false, 'no Solution card before it is solved');
    await page.evaluate(() => { window.__rl.help.showMe = true; document.getElementById('showBtn').disabled = false; });
    await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 20000 });
    if (await page.isVisible('#dlgOk')) await page.click(await page.isVisible('#dlgCancel') ? '#dlgCancel' : '#dlgOk');
    assert.ok(await page.isVisible('#solWin'));
    assert.equal(await page.isVisible('#workWin'), false, 'the Solution card replaces the Work panel');
    const s = await page.evaluate(() => ({ n: window.__rl.path.length, steps: document.querySelectorAll('#pathList .sstep').length, answers: document.getElementById('solAnswers').innerText }));
    assert.equal(s.steps, s.n, 'one block per step');
    assert.match(s.answers, /a = .*\n.*v = /s);
    assert.ok(await page.$eval('#matters', m => !!m.closest('#solWin')));
    assert.match(await page.innerText('#matters'), /depends on/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('bugs: an unreachable target names the missing given', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    // the rolling ball without its height h: v can't be reached, and the app names the missing given
    await page.evaluate(() => window.__rl.course.open('roll', 'long'));
    const key = await page.evaluate(() => window.__rl.course.stop.problem.key);
    await applyKey(page, { ch: 'rolling', key, skip: ['h'] });
    if (await page.locator('[data-del="h"]').count()) await page.locator('[data-del="h"]').first().dispatchEvent('click');
    if (await page.isVisible('#dlgOk')) await page.click('#dlgOk');
    assert.equal(await page.evaluate(() => 'h' in window.__rl.givens), false);
    await page.evaluate(() => { window.__rl.help.showMe = true; document.getElementById('showBtn').disabled = false; });
    await page.click('#showBtn');
    await page.waitForSelector('#dlg.show', { timeout: 20000 });
    assert.match(await page.innerText('#dlgMsg'), /a value or symbol for h/, await page.innerText('#dlgMsg'));
    await page.click('#dlgOk');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('bugs: a short typed name is read as the problem’s; Enter adds the line; a dialog closes the sheet pop-up', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    // typed algebra: f is read as f_s, the only f in this unit
    await page.evaluate(() => window.__rl.course.open('disc', 'long'));
    await applyKey(page, { ch: 'rolling', key: LESSONS[0].stops[0].problem.key });
    await page.click('#libBtn'); await page.click('[data-gather="D5"]');
    await page.click('#kindWrap [data-kind="law"]'); await page.click('#kindCheck'); await page.click('#kindDone'); await page.click('#libClose');
    await page.click('#sheet .eq[data-eq="D5"] [data-alg]');
    await page.fill('#algIn', 'f*R = I*alpha'); await page.press('#algIn', 'Enter');
    const s = await page.evaluate(() => window.__rl.ws.state());
    assert.equal(s.lines.length, 2, 'Enter adds the typed line');
    assert.match(s.how[1], /read as/);
    // one window at a time: a dialog closes the sheet pop-up
    await page.click('#algSheetBtn');
    assert.ok(await page.isVisible('#algSheet'));
    await page.click('#sheet .eq[data-eq="D5"] .form');   // two unknowns: the app explains in a dialog
    await page.waitForSelector('#dlg.show');
    assert.equal(await page.isVisible('#algSheet'), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
