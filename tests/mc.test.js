// Phase Q4 gate: the multiple-choice screen drives the Q1–Q3 engines. Answers are worked by hand elsewhere (the choice-*
// tests); here: the dialog opens, each tab asks first and then reports, input is shown as text, and nothing throws.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const tab = (page, name) => page.click(`#mcHost .mctabs button:has-text("${name}")`);
const out = (page, id) => page.textContent(`#mc-${id} .mcout`);

test('multiple-choice screen: principle, scaling, rank, signs, vectors, options', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await page.click('#mcBtn');
    assert.ok(await page.isVisible('#mcWrap'));

    // principle: canoes (F zero, τ zero, W_nc nonzero) → predicting p, L is right; adding E is told why not
    const sels = page.locator('#mc-principle select');
    await sels.nth(0).selectOption('zero'); await sels.nth(1).selectOption('zero'); await sels.nth(2).selectOption('nonzero');
    const boxes = page.locator('#mc-principle input[type=checkbox]');
    await boxes.nth(0).check(); await boxes.nth(1).check();
    await page.click('#mc-principle >> text=Check my prediction');
    assert.match(await out(page, 'principle'), /matches the checklist/);
    assert.match(await out(page, 'principle'), /do not set K before = K after/);
    await boxes.nth(2).check();
    await page.click('#mc-principle >> text=Check my prediction');
    assert.match(await out(page, 'principle'), /not conserved here/);

    // scaling: the skid example → 4
    await tab(page, 'Scaling');
    await page.click('#mc-scale >> text=Example: skid');
    await page.click('#mc-scale >> text=Scale it');
    assert.match(await out(page, 'scale'), /Ratio: 4/);
    // leaving the held-fixed box empty is explained in a sentence, not an error
    await page.fill('#mc-scale input[placeholder^="held"]', '');
    await page.click('#mc-scale >> text=Scale it');
    assert.match(await out(page, 'scale'), /didn’t say what happens to/);

    // rank: rolling race → sphere > disc > hoop
    await page.click('#mc-scale >> text=Example: rolling race');
    await page.click('#mc-scale >> text=Rank them');
    assert.match(await out(page, 'scale'), /Order: sphere > disc > hoop/);

    // sign: gravity on the way down is positive; a support under a hanging load pushes up
    await tab(page, 'Sign');
    const ins = page.locator('#mc-sign input');
    await ins.nth(0).fill('0, -2'); await ins.nth(1).fill('0, -9.8');
    await page.click('#mc-sign >> text=Sign of the work');
    assert.match(await out(page, 'sign'), /W is positive/);
    await ins.nth(5).fill('4, 0'); await ins.nth(6).fill('2, 0'); await ins.nth(7).fill('0, -100');
    await page.click('#mc-sign >> text=Direction');
    assert.match(await out(page, 'sign'), /points up/);

    // vectors: 86 kJ
    await tab(page, 'Vectors');
    const v = page.locator('#mc-vectors input');
    await v.nth(0).fill('10, 9, 12'); await v.nth(1).fill('kN'); await v.nth(2).fill('5, 4, 0'); await v.nth(3).fill('m');
    await page.click('#mc-vectors >> text=a · b');
    assert.match(await out(page, 'vectors'), /86 kJ/);
    await v.nth(0).fill('oops');
    await page.click('#mc-vectors >> text=a × b');
    assert.match(await out(page, 'vectors'), /Type numbers/);

    // options: nothing marked before a prediction; then 4× is matched and 2× is the root slip
    await tab(page, 'Check');
    await page.fill('#mc-options textarea >> nth=0', '2×\n4×\n8×');
    await page.fill('#mc-options input[placeholder^="your result"]', '4');
    await page.click('#mc-options >> text=Check');
    assert.match(await out(page, 'options'), /Pick the option you expect first/);
    assert.doesNotMatch(await out(page, 'options'), /✓|✗/);
    await page.selectOption('#mc-options select', '1');
    await page.click('#mc-options >> text=Check');
    const o = await out(page, 'options');
    assert.match(o, /B: ✓/); assert.match(o, /A: ✗.*square root/);

    // facts card, and a reasoning line that is empty until a step is added
    await page.click('#mc-options >> text=Show the facts card');
    assert.match(await page.textContent('#mc-options .mcfacts'), /alpha|α/i);
    assert.equal(await page.inputValue('#mc-options textarea >> nth=1'), '');
    await page.fill('#mc-options input[placeholder^="e.g. momentum"]', '<b>momentum</b> is conserved');
    await page.fill('#mc-options input[placeholder^="because"]', 'no external force');
    await page.click('#mc-options >> text=Add step');
    assert.equal(await page.inputValue('#mc-options textarea >> nth=1'), '<b>momentum</b> is conserved because no external force. So the answer is B.');
    assert.equal(await page.locator('#mc-options b >> text=momentum').count(), 0, 'typed text is never HTML');

    await page.keyboard.press('Escape');
    assert.ok(!await page.isVisible('#mcWrap'));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
