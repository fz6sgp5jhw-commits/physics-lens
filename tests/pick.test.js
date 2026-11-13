// Phase G1 gate: help picking equations. From the structure of the disc-and-block problem alone, the helper names what is sought,
// the principles (Στ = Iα for the disc, ΣF = ma for the block, a = Rα linking them) and the equations to gather — never a number.
// The glow comes only after the student has named a target; the next-step hint goes sought → principle → equation; and
// "What's wrong?" names a unit slip and a left-out term.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EQS, VARS, CHAPTERS, LESSONS } from '../js/data.js';
import { plan, looking, routes, unitSlip, dropTerms } from '../js/pick.js';
import { sigMatch } from '../js/course.js';
import { launch, openApp, applyKey } from './helpers.js';

const key = LESSONS[0].stops[0].problem.key, cond = key.cond;
const eqs = CHAPTERS.rolling.sections.filter(s => !s.applies || s.applies(cond)).flatMap(s => s.eqs).filter(e => !EQS[e].applies || EQS[e].applies(cond));
const known = new Set(Object.keys(key.givens));

test('part (a): the acceleration needs Στ = Iα for the disc, ΣF = ma for the block, and a = Rα to link them', () => {
  const p = plan({ targets: ['a'], known, eqs, EQS, VARS });
  assert.deepEqual(p.sought.map(s => s.id), ['a']);
  for (const e of ['D4', 'D5', 'RO2']) assert.ok(p.eqs.includes(e), `${e} is in the route: ${p.eqs}`);
  assert.ok(!p.eqs.includes('D6'), 'the combined shortcut is left for the student to derive');
  assert.deepEqual(p.steps.filter(s => s.role === 'law').map(s => s.principle).sort(), ['Στ = Iα for the disc', 'ΣF = ma for the hanging block'].sort());
  assert.ok(p.steps.some(s => s.role === 'rel' && /^a = Rα/.test(s.principle)));
  assert.equal(p.count, p.eqs.length, 'as many equations as unknowns');
  const text = p.lines.join(' ');
  assert.match(text, /looking for acceleration/); assert.match(text, /one law for each|law for each body/i);
  assert.ok(!/\d\.\d|9\.81|4\.36/.test(text), 'never a number');
});

test('part (b): the speed after a drop is an energy route that links the block and the disc', () => {
  const p = plan({ targets: ['v'], known, eqs, EQS, VARS });
  assert.ok(p.eqs.includes('EN1'), 'energy');
  assert.ok(p.steps.some(s => /^v = Rω/.test(s.principle)), 'the string links v and ω');
  assert.equal(p.count, p.eqs.length);
});

test('a found quantity is known: only what is left is planned; a target with no route says so', () => {
  const done = plan({ targets: ['a'], known: new Set([...known, 'a']), eqs, EQS, VARS });
  assert.equal(done.none, true);
  const none = plan({ targets: ['a'], known, eqs: ['EN4'], EQS, VARS });
  assert.equal(none.noRoute, 'a');
  const l = looking({ targets: ['a'], known, VARS, plan: plan({ targets: ['a'], known, eqs, EQS, VARS }) });
  assert.ok(l.missing.length >= 3, 'the unknowns the route needs are named');
});

test('unit slips and left-out terms are recognised', () => {
  assert.equal(unitSlip(4.36, '436', sigMatch).f, 100);
  assert.equal(unitSlip(4.36, '0.00436', sigMatch).f, 0.001);
  assert.equal(unitSlip(4.36, '4.36', sigMatch) && 'same number is no slip', null);
  const tree = { t: 'sub', a: [{ t: 'add', a: [{ t: 'var', id: 'F' }, { t: 'var', id: 'N' }] }] };
  assert.equal(dropTerms(tree).length, 2);
  assert.deepEqual(dropTerms(tree)[0].tree, { t: 'sub', a: [{ t: 'var', id: 'N' }] });
});

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });
const openDisc = async (page) => {
  await page.evaluate(() => window.__rl.course.open('disc', 'long'));
  await page.click('#lessonBar button:has-text("Route")'); await page.click('#routeDone');
  await applyKey(page, { ch: 'rolling', key: { ...key, targets: [] } });
};

test('the sheet “What am I looking for?” asks for a target first; the glow comes only after it, and never gathers anything', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await openDisc(page);
    await page.click('#lookBtn');
    assert.match(await page.innerText('#lookPop'), /Say what the question asks for/);
    assert.equal(await page.locator('.suggest').count(), 0, 'nothing glows before a target is named');
    assert.equal(await page.locator('#lookGlow').count(), 0, 'no way to light formulas before naming');
    await page.selectOption('#lookSel', 'a'); await page.click('#lookSet');
    await page.click('#lookPop summary');
    const t = await page.innerText('#lookPop');
    assert.match(t, /Looking for:.*acceleration/); assert.match(t, /One law per body/); assert.match(t, /Στ = Iα for the disc/);
    assert.ok(!/4\.36|\b9\.81\b/.test(t));
    await page.click('#lookGlow');
    await page.click('#libBtn');
    const lit = await page.evaluate(() => [...document.querySelectorAll('.lib-eq.suggest')].map(d => d.dataset.eq));
    for (const e of ['D4', 'D5', 'RO2']) assert.ok(lit.includes(e), `${e} glows: ${lit}`);
    assert.ok(!lit.includes('D6'));
    assert.equal(await page.evaluate(() => window.__rl.sheet.length), 0, 'the glow gathers nothing');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the next-step hint goes sought → principle → the equation, and lights its card', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await openDisc(page);
    await page.evaluate(() => { const S = window.__rl; S.targets.push('a'); S.sheet = ['D5']; });
    await page.evaluate(() => document.getElementById('hintBtn').click());
    assert.match(await page.innerText('#bubble'), /You’re looking for.*acceleration/);
    await page.click('#hintBtn');
    assert.match(await page.innerText('#bubble'), /The principle to look for:/);
    assert.ok(await page.evaluate(() => window.__rl.suggest.length) >= 1, 'the teaching hint lights a formula');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('“What’s wrong?” names a unit slip and a term left out', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await openDisc(page);
    await page.evaluate(() => window.__rl.targets.push('a'));
    await page.evaluate(() => { window.__rl.help.showMe = true; document.getElementById('showBtn').disabled = false; });
    await page.click('#showBtn');
    await page.waitForFunction(() => 'a' in window.__rl.found && !window.__rl.busy, null, { timeout: 15000 });
    await page.waitForSelector('#dlg.show'); if (await page.isVisible('#dlgCancel')) await page.click('#dlgCancel'); else await page.click('#dlgOk');
    const why = async (v) => { await page.fill('#ansVal', v); await page.click('#ansCheck'); await page.click('#ansWhy'); return page.innerText('#bubble'); };
    assert.match(await why('436'), /unit slip/);
    assert.match(await why('9.81'), /one term left out/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
