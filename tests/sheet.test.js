// Phase M4 gate: the exam sheet, find the mistake and my mistakes (docs/mistake-plan.md sections 3 and 4).
// An exam sheet for a lesson shows every problem with nothing of its solution visible; the solution opens one line at a
// time, symbols before numbers; a typed wrong answer gets its slip and is counted by pattern in pl-mistakes. A generated
// erroneous example has exactly one faulty line, and the app checks the line, the pattern and the fix. The top pattern
// leads the first hint and the gate list; the exam wrapper adds a past test's mistakes; Clear forgets them.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';
import { faultyLines, checkFind, topPattern, PATTERNS } from '../js/sheet.js';
import { sigMatch } from '../js/course.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });
const g = 9.81;
const tally = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pl-mistakes') || 'null'));
async function openSheet(page, l){
  await page.click('#courseBtn');
  await page.click(`[data-sheet="${l}"]`);
  await page.waitForSelector('#sheetPage:not([hidden]) .sprob');
}

test('the sheet lists every problem with no solution showing; lines reveal one at a time, symbols first', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await openSheet(page, 'spring');
    const titles = await page.$$eval('#sheetPage .sprob h2', hs => hs.map(h => h.textContent));
    assert.deepEqual(titles, ['Mass lowered onto a spring', 'Mass let go on a spring', 'Bag on a luggage scale']);
    assert.equal(await page.$$eval('#sheetPage .ssol *', x => x.length), 0, 'no solution is in the page before it is asked for');
    assert.equal(await page.$$eval('#sheetPage .result', x => x.length), 0);
    const p1 = '#sheetPage .sprob >> nth=0';
    const seen = [];
    const visible = () => page.locator(p1).locator('.ssol .sstep > *:not(.shide)').allTextContents();
    await page.locator(p1).locator('.snext').click();
    await page.locator(p1).locator('.sstep').first().waitFor();
    assert.equal((await visible()).length, 1, 'one line per click');
    for (let i = 0; i < 40 && await page.locator(p1).locator('.snext').isEnabled(); i++){
      const v = await visible(); seen.push(v[v.length - 1]);
      await page.locator(p1).locator('.snext').click();
    }
    seen.push((await visible()).at(-1));
    const at = (re) => seen.findIndex(t => re.test(t));
    assert.ok(at(/ISOLATE/) >= 0 && at(/ISOLATE/) < at(/PLUG IN NUMBERS/), `symbols first: ${seen.join(' | ')}`);
    const xs = (0.6 * g / 25).toPrecision(2);
    assert.ok(seen.slice(0, at(/PLUG IN NUMBERS/)).every(t => !t.includes(xs)), 'the number comes after the symbols');
    assert.ok(seen.some(t => /0\.235/.test(t)), 'the stretch is in the solution');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a typed wrong answer gets its slip and is counted; the top pattern leads the first hint and the gates', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await openSheet(page, 'spring');
    const row = page.locator('#sheetPage .sprob >> nth=0').locator('.srow >> nth=0');
    await row.locator('.sval').fill((2 * 0.6 * g / 25).toPrecision(3));
    await row.locator('.scheck').click();
    await page.waitForFunction(() => document.querySelector('#sheetPage .sout')?.textContent.length > 0);
    assert.match(await row.locator('.sout').innerText(), /✗ The app gets[\s\S]*energy conservation[\s\S]*ΣF = 0/);
    assert.equal((await tally(page)).n.P1, 1, 'counted as P1, a law used without its condition');
    await row.locator('.sval').fill('0.235');
    await row.locator('.scheck').click();
    assert.match(await row.locator('.sout').innerText(), /✓/);
    await page.click('#sheetClose');
    // the gate that guards P1 (why) is listed first, and the first hint on a problem opens with what to watch for
    await page.click('#courseBtn');
    await page.click('#gatesBox summary');
    assert.equal(await page.getAttribute('#gatesBox [data-gate] >> nth=0', 'data-gate'), 'why');
    await page.click('#mistakesBox summary');
    assert.match(await page.innerText('#mistakesBox'), /Most frequent: P1/);
    await page.click('[data-stop="elastic/long"]');
    const hint = () => page.evaluate(() => document.getElementById('hintBtn').click());
    await hint();
    assert.match(await page.innerText('#bubble'), /Your most frequent slip is P1/);
    await hint();
    assert.doesNotMatch(await page.innerText('#bubble'), /most frequent slip/, 'once per problem');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('find the mistake: exactly one faulty line; the line, the pattern and the fix are each checked', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await openSheet(page, 'spring');
    const ex = await page.evaluate(() => window.__rl.example('spring', null));
    assert.ok(ex, 'an example is made');
    assert.deepEqual(faultyLines(ex), [ex.bad], 'exactly one line has a wrong formula');
    assert.ok(PATTERNS.some(([id]) => id === ex.pattern));
    const fix = ex.fixVal.toPrecision(3);
    assert.deepEqual(checkFind(ex, { line: ex.bad, pattern: ex.pattern, fix }, sigMatch).all, true);
    assert.equal(checkFind(ex, { line: ex.bad, pattern: ex.pattern, fix: '999' }, sigMatch).fix, false);
    await page.click('#sheetFind');
    await page.waitForSelector('#sheetFindBox .fline');
    assert.equal(await page.$$eval('#sheetFindBox .fline', x => x.length), ex.lines.length);
    const other = ex.bad === 0 ? 1 : 0;
    await page.click(`#sheetFindBox .fline[data-i="${other}"]`);
    await page.selectOption('#fmPattern', ex.pattern === 'P2' ? 'P3' : 'P2');
    await page.click('#fmCheck');
    assert.match(await page.innerText('#fmResult'), /✗ Line \d+ is right for the numbers[\s\S]*✗ Not P/);
    await page.click(`#sheetFindBox .fline[data-i="${ex.bad}"]`);
    await page.selectOption('#fmPattern', ex.pattern);
    await page.fill('#fmFix', '999');
    await page.click('#fmCheck');
    assert.match(await page.innerText('#fmResult'), new RegExp(`✓ Line ${ex.bad + 1}[\\s\\S]*✓ ${ex.pattern}[\\s\\S]*✗ Not yet`));
    await page.fill('#fmFix', fix);
    await page.click('#fmCheck');
    assert.match(await page.innerText('#fmResult'), /✓ Fixed[\s\S]*Why: Your number is/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the exam wrapper adds a past test to the tally; Clear forgets it', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('#courseBtn');
    await page.click('#mistakesBox summary');
    await page.click('#mistakesWrapper');
    await page.click('#sheetPage .wplus[data-p="P2"]'); await page.click('#sheetPage .wplus[data-p="P2"]');
    await page.click('#sheetPage .wplus[data-p="P6"]');
    await page.click('#wrapSave');
    assert.deepEqual((await tally(page)).n, { P1: 0, P2: 2, P3: 0, P4: 0, P5: 0, P6: 1, P7: 0 });
    assert.match(await page.innerText('#wrapOut'), /most frequent pattern is P2/);
    await page.click('#sheetClose');
    await page.click('#courseBtn');
    await page.click('#mistakesBox summary');
    assert.equal(await page.getAttribute('#gatesBox [data-gate] >> nth=0', 'data-gate'), 'target');
    await page.click('#mistakesClear');
    assert.equal(await page.evaluate(() => localStorage.getItem('pl-mistakes')), null);
    assert.match(await page.innerText('#mistakesBox'), /My mistakes/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('every lesson stop solves behind the sheet to its stored answers', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    const { LESSONS } = await import('../js/data.js');
    const fails = [];
    for (const l of LESSONS) for (const s of l.stops){
      if (s.problem.key.fns) continue;
      const r = await page.evaluate(async ([l, k]) => { const S = window.__rl; const r = await S.sheetSolve(l, k); return r && Object.fromEntries(S.targets.map(t => [t, S.found[t]?.val])); }, [l.id, s.kind]);
      if (!r){ fails.push(`${l.id}/${s.kind}: not solved`); continue; }
      for (const [t, want] of Object.entries(s.problem.answers || {})) if (!(t in r) || !sigMatch(r[t], want)) fails.push(`${l.id}/${s.kind} ${t}: ${r[t]} vs ${want}`);
    }
    assert.deepEqual(fails, []);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the tally store: validated on read, top pattern by count', () => {
  assert.equal(topPattern({ P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0, P7: 0 }), null);
  assert.equal(topPattern({ P1: 1, P2: 0, P3: 3, P4: 3, P5: 0, P6: 0, P7: 0 }).id, 'P3', 'a tie goes to the first');
});
