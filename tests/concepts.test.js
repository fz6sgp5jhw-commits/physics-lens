// Phase 11 gate: concept cards and the notes page. Every equation and quantity has a card; the key ideas are written out; a
// solved step shows a quick explanation (never forced); the notes page lists every section and prints; pack text is escaped.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EQS, VARS, CHAPTERS, NOTES } from '../js/data.js';
import { eqCard, quantityCard, chapterNotes, chapterHTML, stepCardHTML, esc } from '../js/concepts.js';
import { launch, openApp, loadPractice, applyKey } from './helpers.js';
import { PRACTICE } from '../js/data.js';

test('every equation has a card with its meaning, kind and condition; the key ones have the idea and the usual mix-up', () => {
  for (const id of Object.keys(EQS)){
    const c = eqCard(id);
    assert.ok(c.label && c.meaning && c.kindName, id);
    assert.ok(c.condition, `${id} says when it applies`);
  }
  for (const id of ['N1', 'I1', 'D4', 'D5', 'E7', 'EN1', 'RO1', 'AM4', 'WK1', 'MO1']){
    const c = eqCard(id);
    assert.ok(c.concept.length > 40 && c.confusion.length > 20, `${id} has the idea and the mix-up`);
  }
  assert.equal(Object.keys(NOTES.equations).filter(k => !EQS[k]).length, 0, 'notes name only equations that exist');
  assert.equal(Object.keys(NOTES.quantities).filter(k => !VARS[k]).length, 0, 'notes name only quantities that exist');
});

test('every quantity has a card; the key ones are defined; every chapter has a written guide with its sections', () => {
  for (const id of Object.keys(VARS)){ const q = quantityCard(id); assert.ok(q.name && q.unit, id); }
  for (const id of ['a', 'm', 'tau', 'I', 'alpha', 'K', 'theta']) assert.ok(quantityCard(id).define.length > 25, `${id} is defined`);
  for (const cid of Object.keys(CHAPTERS)){
    const c = chapterNotes(cid);
    assert.ok(c.overview.length > 100, `${cid} has an overview`);
    assert.ok(c.ideas.length >= 3 && c.watch.length >= 2, `${cid} has ideas and mix-ups`);
    assert.equal(c.sections.length, CHAPTERS[cid].sections.length);
    assert.ok(chapterHTML(cid).includes(`id="${cid}"`));
  }
});

test('text from the pack is escaped; a card links to its place in the notes', () => {
  assert.equal(esc('<img src=x onerror=alert(1)> & "q"'), '&lt;img src=x onerror=alert(1)&gt; &amp; &quot;q&quot;');
  const html = stepCardHTML('D4');
  assert.match(html, /concepts\.html#eq-D4/); assert.match(html, /only if frictionless axle/); assert.match(html, /Watch out/);
  assert.ok(!/<script/i.test(chapterHTML('rolling')));
});

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

test('a solved step shows a quick explanation that is never forced; the Tools menu links to the notes for this section', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    const i = PRACTICE.findIndex(p => p.title === 'Frictionless slide');
    await loadPractice(page, i);
    await applyKey(page, { ch: PRACTICE[i].ch, key: PRACTICE[i].key });
    await page.evaluate(() => { window.__rl.help.showMe = true; document.getElementById('showBtn').disabled = false; });
    await page.click('#showBtn');
    await page.waitForFunction(() => 'vf' in window.__rl.found && !window.__rl.busy, null, { timeout: 15000 });
    const d = page.locator('#sheet .eq details.concept').first();
    assert.ok(await d.count() >= 1, 'a card under the solved step');
    assert.equal(await d.evaluate(e => e.open), false, 'closed outside a lesson: nothing is forced');
    await d.locator('summary').click();
    assert.match(await d.innerText(), /What it says/); assert.match(await d.innerText(), /When it applies/);
    assert.match(await page.getAttribute('#notesLink', 'href'), /^concepts\.html#incline$/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the notes page lists every section, jumps to an equation, and prints cleanly', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.goto(new URL('concepts.html#eq-D4', env.url).href);
    await page.waitForSelector('#eq-D4');
    assert.equal(await page.locator('.n-chapter').count(), Object.keys(CHAPTERS).length);
    assert.equal(await page.locator('.n-eq').count(), Object.values(CHAPTERS).flatMap(c => c.sections.flatMap(s => s.eqs)).length);
    assert.ok(await page.locator('#eq-D4.n-hit').count() >= 1, 'the equation in the link is marked');
    assert.match(await page.innerText('#torque'), /Ideas to keep/);
    assert.match(await page.innerText('#eq-D4'), /only the string’s tension has a lever arm|lever arm/);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.isVisible('header'), false, 'the header is left out of the printout');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
