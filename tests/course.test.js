// Phase C5 gate: the course. The map is always open; both pilot lessons run long → twin → transfer; the route card grades
// (wrong is explained, not blocked); the kind tap comes before an equation goes on the sheet; Show me and glow are off in the
// twin; progress is kept in pl-course and cleared by its button. Hints: levels, the two error handlers, missing and
// redundant equations. One looping test applies every stop's answer key, solves, and compares with the stored answers
// (within their significant figures) — with the private exam file too, when it is on this device (private/, never committed).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, openApp, applyKey, openStage, checkSetup } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const PRIVATE = await readFile(new URL('../private/exam-lessons.json', import.meta.url), 'utf8').catch(() => null);
const openStop = (page, k) => page.evaluate(async (k) => { const [l, s] = k.split('/'); return window.__rl.course.open(l, s); }, k);
// the route card, answered right, so later stage changes run on
async function answerRoute(page){
  await page.click('#lessonBar button:has-text("Route")');
  await page.click('#routeDone');
}
const stopOf = (page) => page.evaluate(() => { const c = window.__rl.course, s = c.stop; return { ch: c.lesson.chapter, key: s.problem.key, answers: s.problem.answers, help: s.help }; });
async function solveAll(page){
  await page.evaluate(() => { window.__rl.help.showMe = true; document.getElementById('showBtn').disabled = false; }); // the loop solves every stop, help or not
  await page.click('#showBtn');
  await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 20000 });
}
async function closeRecap(page){
  await page.waitForSelector('#dlg.show', { timeout: 5000 });
  if (await page.isVisible('#dlgCancel')) await page.click('#dlgCancel'); else await page.click('#dlgOk');
}
const bubble = (page) => page.innerText('#bubble');

test('every stop: apply its answer key, solve, and match the stored answers to their figures', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    const sets = [null];
    if (PRIVATE) sets.push(PRIVATE);
    for (const file of sets){
      if (file){
        await page.click('#courseBtn');
        await page.setInputFiles('#courseFile', { name: 'exam-lessons.json', mimeType: 'application/json', buffer: Buffer.from(file) });
        await page.waitForSelector('#courseRemove:not([hidden])');
        await page.click('#courseClose');
      }
      const keys = await page.evaluate((own) => window.__rl.course.lessons.flatMap(l => l.stops.filter(s => !own || s.local).map(s => `${l.id}/${s.kind}`)), !!file);
      assert.ok(keys.length >= (file ? 1 : 15), `stops to run: ${keys}`);
      for (const k of keys){
        assert.equal(await openStop(page, k), true, k);
        const st = await stopOf(page);
        await answerRoute(page);
        await applyKey(page, { ch: st.ch, key: st.key });
        const chk = await checkSetup(page);
        assert.match(chk.title, /perfect/, `${k}: the key passes Check my setup: ${chk.msg}`);
        await solveAll(page);
        const got = await page.evaluate(async (answers) => {
          const { sigMatch } = await import('./js/course.js');
          return Object.entries(answers).map(([id, a]) => [id, a, window.__rl.found[id].val, sigMatch(window.__rl.found[id].val, a)]);
        }, st.answers);
        for (const [id, a, v, ok] of got) assert.ok(ok, `${k}: ${id} = ${v}, the source says ${a}`);
        assert.ok(got.length, `${k} has answers to compare`);
        await closeRecap(page);
      }
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the map, route card, kind tap, help switches, stars and progress', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    // the map is always open: every stop of both lessons can be opened, in any order
    await page.click('#courseBtn');
    assert.equal(await page.locator('#courseBody .clesson').count(), 5);
    assert.equal(await page.locator('#courseBody [data-stop]:not([disabled])').count(), 15);
    await page.click('[data-stop="roll/transfer"]');
    assert.equal(await page.evaluate(() => window.__rl.mode), 'guided', 'lessons run in guided mode');
    assert.match(await page.inputValue('#problem'), /swing/);
    await page.click('#courseBtn');
    await page.click('[data-stop="disc/long"]');
    assert.match(await bubble(page), /Lesson:.*Draw it first/s, 'the stop’s first prompt is on the hint line');

    // the route card: a wrong choice is explained, not blocked; the right one is confirmed
    await page.click('#lessonBar button:has-text("Route")');
    await page.check('#routeWrap input[value="momentum"]');
    await page.check('#routeWrap input[value="The disc rolls along the floor"]');
    await page.click('#routeCheck');
    const wrong = await page.innerText('#routeWrap .rout');
    assert.match(wrong, /angular momentum.*isn’t the route here/i);
    assert.match(wrong, /The disc rolls along the floor.*isn’t in this picture/);
    assert.match(wrong, /You also need: Newton’s second law/);
    assert.match(wrong, /carry on either way/);
    await page.uncheck('#routeWrap input[value="momentum"]');
    await page.uncheck('#routeWrap input[value="The disc rolls along the floor"]');
    for (const v of ['forces', 'energy']) await page.check(`#routeWrap input[value="${v}"]`);
    for (const box of await page.$$('#routeWrap input[name=cue]')){ const v = await box.getAttribute('value'); if (!/rolls along|no outside torque/i.test(v)) await box.check(); }
    await page.click('#routeCheck');
    assert.match(await page.innerText('#routeWrap .rout'), /✓ That’s the route/);
    await page.click('#routeDone');

    // the kind tap: before an equation goes on the sheet, say its kind (a wrong one is explained, then it goes on anyway)
    await page.click('#libBtn');
    await page.click('[data-gather="EN1"]');
    await page.waitForSelector('#kindWrap.show');
    await page.click('#kindWrap [data-kind="def"]');
    await page.click('#kindCheck');
    assert.match(await page.innerText('#kindWrap .rout'), /It’s a law, not a definition/);
    await page.click('#kindDone');
    assert.ok(await page.evaluate(() => window.__rl.sheet.includes('EN1')));
    await page.click('#libClose');

    // hints: one unknown short is named; an equation that adds nothing is named; bottom-out costs a star
    const st = await stopOf(page);
    await applyKey(page, { ch: 'rolling', key: { ...st.key, targets: ['a'] } });
    await page.evaluate(() => { const S = window.__rl; S.sheet = ['D5', 'GEO3']; });
    await page.click('#hintBtn');
    const h1 = await bubble(page);
    assert.match(h1, /still need an equation with T/, 'the unknown the sheet can’t pin down is named');
    await page.click('#hintBtn'); await page.click('#hintBtn');
    assert.match(await bubble(page), /bottom-out hint/i);
    assert.equal(await page.evaluate(() => window.__rl.course.stars), 2, 'only the bottom-out hint cost a star');
    await page.evaluate(() => { window.__rl.sheet = ['D5', 'J3', 'J9', 'J3x'].filter(e => e !== 'J3x'); });
    await page.evaluate(() => { const S = window.__rl; S.givens.Icm = { from: 'you', mag: 0.24, unit: 'kg·m²', dir: 0, val: 0.24 }; });
    await page.click('#hintBtn');
    assert.match(await bubble(page), /I\d<\/?b?>?.*adds? nothing new|adds? nothing new/, 'an equation whose unknowns are pinned down is named');
    await page.evaluate(() => { delete window.__rl.givens.Icm; });

    // "What's wrong?": a sign slip is named
    await page.evaluate(() => { window.__rl.help.showMe = true; });
    await page.click('#showBtn');
    await page.waitForFunction(() => 'a' in window.__rl.found && !window.__rl.busy, null, { timeout: 15000 });
    await closeRecap(page);
    await page.fill('#ansVal', '-4.36');
    await page.click('#ansCheck');
    assert.match(await bubble(page), /✗ The app gets/);
    await page.click('#ansWhy');
    assert.match(await bubble(page), /the other way round/);
    await page.fill('#ansVal', '4.36');
    await page.click('#ansCheck');
    assert.match(await bubble(page), /✓/);

    // progress: the long stop is done, with its stars, in pl-course
    const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('pl-course')));
    assert.deepEqual(prog.stops['disc/long'], { done: true, stars: 2 });

    // the twin: Show me and glow are off
    await openStop(page, 'disc/twin');
    assert.equal(await page.isDisabled('#showBtn'), true);
    const tw = await stopOf(page);
    await answerRoute(page);
    await applyKey(page, { ch: 'rolling', key: tw.key });
    await openStage(page, 3);
    await page.click('#libBtn');
    for (const e of ['J3', 'J9', 'RO6', 'EN4', 'EN1']){
      await page.click(`[data-gather="${e}"]`);
      await page.click('#kindWrap [data-kind="law"]'); await page.click('#kindCheck'); await page.click('#kindDone');
    }
    assert.equal(await page.locator('.eq.lit, .lib-eq.lit').count(), 0, 'nothing glows in the twin');
    await page.click('#libClose');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#sheet .eq.ready').length > 0), true, 'solvable equations are still solvable, just not lit');

    // the sin/cos handler names its slip (ball up the ramp: Δx = h / sin θ)
    await openStop(page, 'roll/twin');
    const rt = await stopOf(page);
    await answerRoute(page);
    await applyKey(page, { ch: 'rolling', key: rt.key });
    await solveAll(page);
    await closeRecap(page);
    const swapped = await page.evaluate(() => { const S = window.__rl; return S.found.h.val / Math.cos(20 * Math.PI / 180); });
    await page.fill('#ansVal', swapped.toPrecision(3));
    await page.click('#ansWhy');
    assert.match(await bubble(page), /sin and cos swapped.*G4/s);

    // Clear progress empties pl-course
    await page.click('#courseBtn');
    await page.click('#courseClear');
    await page.click('#dlgOk');
    assert.equal(await page.evaluate(() => localStorage.getItem('pl-course')), null);
    assert.equal(await page.locator('#courseBody .cstop.done').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('your own problems: imported from a file, checked, kept on the device, removable', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    const file = JSON.stringify({ stops: {
      'disc/transfer': { problem: { source: { work: 'My homework', license: 'private', problem: '3' }, title: '<img id=pwn>', text: 'A pulley problem of mine.',
        key: { givens: { M: [2, 'kg'], R: [0.1, 'm'], m: [1, 'kg'], g: [9.81, 'm/s²'] }, cond: { body: 'hang', shape: 'disc' }, targets: ['Tn'] }, answers: { Tn: '6.54' } },
        prompts: [{ when: 'start', text: '<img id=pwn2> my own prompt' }] },
      'disc/nope': { problem: { original: true, title: 'x', key: { targets: ['a'] } } },
      'roll/long': { problem: { title: 'no source', key: { targets: ['a'] } } },
    } });
    await page.click('#courseBtn');
    await page.setInputFiles('#courseFile', { name: 'mine.json', mimeType: 'application/json', buffer: Buffer.from(file) });
    await page.waitForSelector('#courseRemove:not([hidden])');
    assert.match(await page.innerText('[data-stop="disc/transfer"]'), /\(yours\)/);
    assert.equal(await page.locator('#pwn').count(), 0, 'titles are text');
    assert.match(await bubble(page), /Added 1 of your own problem.*skipped/s);
    await page.click('[data-stop="disc/transfer"]');
    assert.match(await bubble(page), /<img id=pwn2> my own prompt/, 'a prompt from a file is shown as text');
    assert.equal(await page.locator('#pwn2').count(), 0);
    await page.reload();
    await page.waitForFunction(() => window.__rl && document.getElementById('steps').children.length > 0);
    await page.click('#courseBtn');
    assert.match(await page.innerText('[data-stop="disc/transfer"]'), /\(yours\)/, 'kept on this device');
    await page.click('#courseRemove');
    await page.click('#dlgOk');
    assert.doesNotMatch(await page.innerText('[data-stop="disc/transfer"]'), /yours/);
    assert.equal(await page.evaluate(() => localStorage.getItem('pl-lessons')), null);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
