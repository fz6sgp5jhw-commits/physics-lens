// Phase 8a gate: the formula sheet and the algebra workspace. From I = Σ m r² (three point masses), with the knowns
// substituted, to I = mL²/2: once by mouse only and once by keyboard only. A one-sided division is written as asked.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';
import { toId, display, parse, print, parseOp, applyOp, simplify, sheet, eqText } from '../js/algebra.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

// a rod with three blocks; the knowns the cards and the toolkit give (their own gates are drawfirst-knowns and drawfirst-toolkit)
async function setUp(page){
  await page.click('[data-bshape="rod"]');
  for (let i = 0; i < 3; i++) await page.click('[data-bshape="block"]');
  await page.evaluate(() => window.__rl.kn.addSource(() => [
    ...[1, 2, 3].map(k => ({ name: 'm' + '₀₁₂₃'[k], value: 'm', source: 'card' })),
    { name: 'x(Block 1)', value: '−L/2', source: 'toolkit' }, { name: 'x(Block 2)', value: '0', source: 'toolkit' }, { name: 'x(Block 3)', value: 'L/2', source: 'toolkit' },
  ]));
}
const lines = (page) => page.evaluate(() => window.__rl.ws.state());
const term = (page, side, i) => page.locator(`#dfWork .algline.cur button[data-side="${side}"][data-term="${i}"]`);
const START = 'I = m₁r₁² + m₂r₂² + m₃r₃²', END = 'I = mL²/2';

test('names, printing and exact operations', () => {
  assert.deepEqual(['m_1', 'm₁', 'theta', 'θ', 'I_cm', 'ω₀', 'W∥', 'Δx'].map(toId), ['m_1', 'm_1', 'theta', 'theta', 'I_cm', 'omega_0', 'W_par', 'Delta_x']);
  assert.deepEqual(['m_1', 'theta', 'I_cm', 'omega_0'].map(id => display(id).text), ['m₁', 'θ', 'I_cm', 'ω₀']);
  assert.equal(print(parse('m_1*r_1**2 + sqrt(k/m) - W*sin(theta)')), 'm₁r₁² + √(k/m) − W sin θ');
  assert.equal(print(parse('m*L^2/(2*m)')), 'mL²/(2m)', 'one line, kept as typed: nothing cancels until asked');
  assert.equal(print(simplify(parse('m*(L/2)**2 + m*0**2 + m*(L/2)**2'))), 'mL²/2');
  const eq = { l: parse('I'), r: parse('m*L**2/2') };
  assert.equal(eqText(applyOp(eq, parseOp('/ 2'), { side: 'l', i: 0 })), 'I/2 = mL²/2', 'one term only, even though it is untrue');
  assert.equal(eqText(applyOp(eq, parseOp('/ 2'), null)), 'I/2 = (mL²/2)/2');
  assert.equal(sheet('inertia', 3)[0].items[0].line.r.a.length, 3, 'I = Σ m r² has a term per mass');
});

test('mouse only: the sheet gives I = Σ m r² with a term per block; substitute, simplify to I = mL²/2; a one-sided ÷ is kept; undo greys', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page);
    await page.click('#algSheetBtn');
    assert.equal(await page.locator('#algSheet .algpick.on').count(), 0, 'the sheet is neutral: nothing is suggested');
    assert.equal(await page.textContent('#algSheetN'), '3', 'one term per block in the drawing');
    await page.click('[data-sheetn="1"]'); await page.click('[data-sheetn="-1"]');
    await page.click('[data-pick="Isum"]');
    assert.deepEqual((await lines(page)).lines, [START]);
    for (const [k, v] of [[1, 'm'], [2, 'm'], [3, 'm']]){ await term(page, 'r', k - 1).click(); await page.click(`[data-subsym="m_${k}"][data-subval="${v}"]`, { modifiers: ['Shift'] }); }
    for (const [k, v] of [[1, 'L/2'], [2, '0'], [3, 'L/2']]){ await term(page, 'r', k - 1).click(); await page.click(`[data-subsym="r_${k}"][data-subval="${v}"]`, { modifiers: ['Shift'] }); }
    let s = await lines(page);
    assert.equal(s.lines.at(-1), 'I = m(L/2)² + m·0² + m(L/2)²');
    assert.equal(s.how.at(-1), 'r₃ → L/2 everywhere');
    await term(page, 'r', 0).click(); await page.click('#algMenu [data-op="simp"]', { modifiers: ['Shift'] });
    s = await lines(page);
    assert.equal(s.lines.at(-1), END); assert.equal(s.lines.length, 8);
    // one-sided: divide only the right-hand term by its factor 2, written as asked even though it is no longer true
    await term(page, 'r', 0).click();
    await page.locator('#algMenu [data-opnd]', { hasText: /^2$/ }).click();
    await page.click('#algMenu [data-op="div"]');
    s = await lines(page);
    assert.equal(s.lines.at(-1), 'I = (mL²/2)/2'); assert.equal(s.how.at(-1), '÷ 2, this term only');
    // undo greys the line; going on from the earlier line replaces it
    await page.click('#algUndo');
    assert.equal(await page.locator('#dfWork .algline.grey').count(), 1);
    assert.equal((await lines(page)).cur, 7);
    await page.click('#dfWork .algline.grey [data-back]');
    assert.equal((await lines(page)).cur, 8, 'back to here brings it back');
    await page.click('#algUndo');
    await term(page, 'l', 0).click(); await page.click('#algMenu [data-op="sq"]', { modifiers: ['Shift'] });
    s = await lines(page);
    assert.equal(s.lines.length, 9); assert.equal(s.lines.at(-1), 'I² = (mL²/2)²');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('keyboard only: / opens the sheet, typed substitutions with autocomplete, simplify; a typo can’t make a new symbol; a one-sided ÷ 2', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    await setUp(page);
    await page.focus('#algIn');
    await page.keyboard.press('/');
    assert.ok(await page.isVisible('#algSheet'));
    await page.keyboard.type('point masses'); await page.keyboard.press('Enter');
    assert.deepEqual((await lines(page)).lines, [START]);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'algIn');
    for (const k of [1, 2, 3]){ await page.keyboard.type(`m_${k} = m`); await page.keyboard.press('Shift+Enter'); }
    // autocomplete offers only symbols defined in this problem
    await page.keyboard.type('r_');
    assert.deepEqual(await page.locator('#algAc [data-ac] .muted').allTextContents(), ['r_1', 'r_2', 'r_3']);
    await page.keyboard.press('Tab'); await page.keyboard.type(' = L/2'); await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('r_2 = 0'); await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('r_3 = L/2'); await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('simplify'); await page.keyboard.press('Shift+Enter');
    let s = await lines(page);
    assert.equal(s.lines.at(-1), END); assert.equal(s.lines.length, 8);
    // a typo is refused, not turned into a new variable
    await page.keyboard.type('I = mL**2/2'); await page.keyboard.press('Enter');
    assert.match(await page.textContent('#algMsg'), /mL isn’t defined in this problem\. Did you mean m\*L\?/);
    assert.equal((await lines(page)).lines.length, 8);
    await page.fill('#algIn', '');
    // Shift+Tab twice reaches the left-hand term; Enter opens its menu; "/ 2" divides that term only
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'algOp');
    await page.keyboard.type('/ 2'); await page.keyboard.press('Enter');
    s = await lines(page);
    assert.equal(s.lines.at(-1), 'I/2 = mL²/2'); assert.equal(s.how.at(-1), '÷ 2, this term only');
    // guided mode keeps the workspace (phase G3 changed this on purpose: the student does the algebra there too)
    await page.click('#modeBtn [data-mode="guided"]');
    assert.equal(await page.isVisible('#dfWork'), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
