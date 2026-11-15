// Phase M1 gate: "What's wrong?" handlers from the patterns in a graded exam (docs/mistake-plan.md sections 1 and 4).
// On lesson stops, a typed answer made with one slip is named by its own handler: the compression and slide lengths swapped,
// ½kx not squared, friction work without its distance, momentum without the masses, the spring stretch from energy where
// ΣF = 0 holds, and a graph area over the wrong interval. Each slip number is worked here from the stop's givens, not by the app.
// Also: a typed term whose units differ from the rest of its line is named with its units, and a problem file that names
// an unknown choice for a condition no longer breaks Check my setup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, applyKey, checkSetup } from './helpers.js';
import { triangleOnly, dropPowers, dropFactors, swapVars, editsOf } from '../js/pick.js';
import { evalNum, parse } from '../js/expr.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const deg = Math.PI / 180, g = 9.81;
const p3 = (x) => x.toPrecision(3);
// [lesson, stop, quantity asked about, slip answer worked by hand, what the handler must say]
const CASES = [
  // elastic/transfer: ½k·dx² in place of ½k·xs² (15 cm squeezed, 40 cm slide), then K = Us0 + Wnc and v = √(2K/m)
  ['elastic', 'transfer', 'v', (() => { const K = 0.5 * 60 * 0.4 ** 2 - 0.12 * 0.8 * g * 0.4; return p3(Math.sqrt(2 * K / 0.8)); })(), /in place of[\s\S]*how far the spring is squeezed/],
  // launch/long: Us0 = ½·180·0.12, not squared: a force (N), not an energy
  ['launch', 'long', 'Us0', p3(0.5 * 180 * 0.12), /not squared<\/b>.*in N, but it should be in J/],
  // elastic/transfer: friction work μmg, without the 40 cm
  ['elastic', 'transfer', 'Wnc', p3(-0.12 * 0.8 * g), /left out<\/b>.*in N, but it should be in J/],
  // explode/long: the third piece's speed from −(u₁ + u₂) as vectors, masses left out
  ['explode', 'long', 'u3', (() => { const x = 8 * Math.cos(180 * deg) + 15 * Math.cos(40 * deg), y = 8 * Math.sin(180 * deg) + 15 * Math.sin(40 * deg); return p3(Math.hypot(x, y)); })(), /masses left out/],
  // spring/long: ½kx² = mgx gives x = 2mg/k, twice the hanging stretch
  ['spring', 'long', 'xs', p3(2 * 0.6 * g / 25), /energy conservation<\/b>.*ΣF = 0/],
  // impulse/twin: the first stretch's area taken over the second stretch's 1.5 s instead of its 2 s
  ['impulse', 'twin', 'v1f', p3((0.5 * 6 * 1.5 + 0.5 * 12 * 1.5 + 3 * 1.2) / 3), /wrong interval/],
  // glance/transfer: the first stretch's area over the second stretch's 3 m instead of its 2 m
  ['glance', 'transfer', 'v', p3(Math.sqrt(2 * (0.5 * 1.5 * 1 + 0.5 * 12 * 3 + 12 * 3) / 1.5)), /wrong interval/],
];

async function solveStop(page, l, kind){
  await page.evaluate(async ([l, s]) => window.__rl.course.open(l, s), [l, kind]);
  const st = await page.evaluate(() => { const c = window.__rl.course; return { ch: c.lesson.chapter, key: c.stop.problem.key }; });
  await page.click('#lessonBar button:has-text("Route")');
  await page.click('#routeDone');
  await applyKey(page, { ch: st.ch, key: st.key });
  await page.evaluate(() => { window.__rl.help.showMe = true; document.getElementById('showBtn').disabled = false; });
  await page.click('#showBtn');
  await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 20000 });
  await page.waitForSelector('#dlg.show', { timeout: 5000 });
  if (await page.isVisible('#dlgCancel')) await page.click('#dlgCancel'); else await page.click('#dlgOk');
}

test('each slip is named by its own handler; the right answer and a stray number are not', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    let open = '';
    for (const [l, kind, q, typed, says] of CASES){
      if (open !== `${l}/${kind}`){ await solveStop(page, l, kind); open = `${l}/${kind}`; }
      const r = await page.evaluate(([q, typed]) => window.__rl.whatsWrong(q, typed), [q, typed]);
      assert.match(r || '', says, `${l}/${kind} ${q} = ${typed}: ${r}`);
      if (q === 'v' && l === 'elastic'){
        const right = await page.evaluate(() => String(window.__rl.found.v.val));
        assert.equal(await page.evaluate((x) => window.__rl.whatsWrong('v', x), right), null, 'the right answer names no slip');
        assert.equal(await page.evaluate(() => window.__rl.whatsWrong('v', '123')), null, 'a stray number names no slip');
      }
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('the tree edits: only the triangle, no square, a factor left out, a symbol swapped', () => {
  const t = parse('½({Fi} + {Ff}){w}'), at = { Fi: 2, Ff: 6, w: 1 };
  assert.deepEqual(triangleOnly(t).map(e => evalNum(e.tree, at)).sort(), [-2, 2], 'the rectangle under the slope is left out');
  assert.deepEqual(dropPowers(parse('½{k}{x}²')).map(e => evalNum(e.tree, { k: 4, x: 3 })), [6]);
  assert.deepEqual(dropFactors(parse('{mu}{m}{g}{d}')).map(e => e.id).sort(), ['d', 'g', 'm', 'mu']);
  assert.deepEqual(swapVars(parse('{x} + {d}'), { x: ['d'] }).map(e => evalNum(e.tree, { x: 1, d: 5 })), [10]);
  assert.equal(editsOf(parse('{a} + {b}'), () => []).length, 0);
});

test('a typed term whose units differ from the rest of its line is named, with its units', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await page.click('[data-bshape="rod"]');
    for (let i = 0; i < 3; i++) await page.click('[data-bshape="block"]');
    await page.click('#doneDraw');
    await page.evaluate(() => window.__rl.kn.addSource(() => [
      ...[1, 2, 3].map(k => ({ name: 'm' + '₀₁₂₃'[k], value: 'm', source: 'card', qty: 'mass' })),
      ...['−L/2', '0', 'L/2'].map((x, i) => ({ name: `x(Block ${i + 1})`, value: x, source: 'toolkit', qty: 'length' })),
    ]));
    await page.fill('#dfTarget', 'I'); await page.click('#dfTargetAdd');
    await page.fill('#algIn', 'I = m_1*L**2 + m_2*L + m_3*L**2'); await page.press('#algIn', 'Shift+Enter');
    await page.click('#algCheck');
    await page.click('[data-rev="correct"]');
    const s = (await page.evaluate(() => window.__rl.ws.state())).review;
    assert.equal(s.issue.kind, 'units');
    assert.match(await page.textContent('#algCorr'), /Line 1.*The term m₂\s*·?\s*L is in kg·m, but the other terms are in kg·m²/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('Check my setup: a problem file with an unknown choice for a condition is reported, not thrown', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.evaluate(async () => window.__rl.course.open('elastic', 'long'));
    await page.click('#lessonBar button:has-text("Route")');
    await page.click('#routeDone');
    const st = await page.evaluate(() => { const c = window.__rl.course; return { ch: c.lesson.chapter, key: c.stop.problem.key }; });
    await applyKey(page, { ch: st.ch, key: st.key });
    await page.evaluate(() => { const b = window.__rl.bank; b.key = { ...b.key, cond: { ...b.key.cond, collide: 'wobble<b>' } }; });
    const chk = await checkSetup(page);
    assert.match(chk.title, /perfect/, chk.msg);
    assert.match(chk.msg, /asks for “wobble<b>”, which isn’t one of its choices/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
