// Phase G3 gate: the student does the algebra in guided mode. The disc-and-block lesson problem is solved with typed and tapped
// algebra at "On my own": a = mg / (m + ½M) = 4.36 m/s², v = 3.62 m/s. A planted slip is found with its line named; at "Walk me
// through" the app writes one line as a worked example and hands the next to the student; a one-sided move is explained, not blocked.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../js/data.js';
import { launch, openApp, applyKey } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const key = LESSONS[0].stops[0].problem.key;
async function open(page, level){
  await page.evaluate(() => window.__rl.course.open('disc', 'long'));
  await page.click('#lessonBar button:has-text("Route")'); await page.click('#routeDone');
  await applyKey(page, { ch: 'rolling', key });
  await page.click(`[data-glevel="${level}"]`);
}
const ws = (page) => page.evaluate(() => window.__rl.ws.state());
const line = async (page, text) => { await page.fill('#algIn', text); await page.press('#algIn', 'Enter'); };
const term = (page, side, i) => page.locator(`#dfWork .algline.cur button[data-side="${side}"][data-term="${i}"]`);
const num = (t) => parseFloat(t.replace(/^.*= /, ''));

test('On my own: the disc and block solved by typed and tapped algebra; checks pass; numbers last give 4.36 m/s² and 3.62 m/s', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await open(page, 'own');
    assert.ok(await page.isVisible('#dfWork'), 'the algebra workspace is in guided mode');
    assert.match(await page.textContent('#showBtn'), /last resort/);
    // typed: the three relationships for the block, the disc and the string, and I for a solid disc
    await line(page, 'm*g - T = m*a');
    await line(page, 'T*R = I*alpha');
    await line(page, 'alpha = a/R');
    await line(page, 'I = M*R**2/2');
    await page.click('#algCheck');
    assert.equal((await ws(page)).review.status, 'pass', JSON.stringify((await ws(page)).review));
    // tapped: put α, then I, into the disc's equation (line 2), from the lines that say what they equal
    await term(page, 'r', 0).click();   // current line is I = …: pick line 2 through its own term buttons instead
    await page.keyboard.press('Escape');
    await page.locator('#dfWork .algline[data-line="1"] button[data-side="r"][data-term="0"]').click();
    await page.locator('#algMenu [data-subsym="alpha"]').first().click({ modifiers: ['Shift'] });
    let s = await ws(page);
    assert.equal(s.lines.at(-1), 'TR = I(a/R)');
    await page.locator('#dfWork .algline.cur button[data-side="r"][data-term="0"]').click();
    await page.locator('#algMenu [data-subsym="I"]').first().click({ modifiers: ['Shift'] });
    assert.match((await ws(page)).lines.at(-1), /M.*R.*²\/2.*a\/R/);
    // typed again: the algebra the student did on paper
    await line(page, 'T = M*a/2');
    await line(page, 'm*g - M*a/2 = m*a');
    await line(page, 'm*g = m*a + M*a/2');
    await line(page, 'a = m*g/(m + M/2)');
    s = await ws(page);
    await page.click('#algCheck');
    assert.equal((await ws(page)).review.status, 'pass', JSON.stringify((await ws(page)).review));
    await page.click('#algFinal');
    assert.deepEqual([(await ws(page)).review.solved, (await ws(page)).review.stars], [true, 3]);
    assert.match(await page.textContent('#algUnit'), /Unit check: every term works out to m\/s²/);
    await page.click('#algNums');
    s = await ws(page);
    assert.match(s.lines.at(-1), /^a = 4\.36\d* m\/s²$/, s.lines.at(-1));
    // part (b): v from the same symbols
    await line(page, 'v = sqrt(2*m*g*h/(m + M/2))');
    await page.click('#algNums');
    s = await ws(page);
    assert.ok(Math.abs(num(s.lines.at(-1).replace(/ m\/s$/, '')) - 3.62) < 0.01, s.lines.at(-1));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a planted slip (the disc’s equation without the lever arm) is found with its line named', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await open(page, 'own');
    await line(page, 'm*g - T = m*a');
    await line(page, 'T = I*alpha');            // line 2: the lever arm R is missing
    await line(page, 'a = R*alpha');
    await page.click('#algCheck');
    let r = (await ws(page)).review;
    assert.equal(r.status, 'look');
    assert.ok(!/Line 2/.test(await page.textContent('#algRev')), 'it does not say where until asked');
    await page.click('[data-rev="correct"]');
    r = (await ws(page)).review;
    assert.equal(r.issue.line, 2);
    assert.match(await page.textContent('#algCorr'), /Line 2/);
    assert.equal((await ws(page)).lines.length, 3, 'the correction writes no line');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('Walk me through: the app writes the first line as a worked example, then it is the student’s turn', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await open(page, 'walk');
    await page.click('#algExample');
    const s = await ws(page);
    assert.equal(s.lines.length, 1); assert.match(s.how[0], /^worked example: /);
    assert.match(await page.textContent('#dfWork .alhwhy'), /law|relationship/);
    assert.equal(await page.locator('#algExample').count(), 0, 'one line only: the next is the student’s');
    await line(page, 'a = R*alpha');
    assert.equal((await ws(page)).lines.length, 2);
    // at "On my own" the button isn't offered
    await page.click('[data-glevel="own"]'); await page.click('#clearBtn').catch(() => {});
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('a one-sided move is explained at once, not blocked; and a wrong move is never refused', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await open(page, 'own');
    await line(page, 'a = R*alpha');
    await term(page, 'r', 0).click();
    await page.fill('#algOp', '/ 2'); await page.press('#algOp', 'Enter');
    const s = await ws(page);
    assert.equal(s.lines.at(-1), 'a = Rα/2');
    assert.match(await page.textContent('#dfWork .algline.cur .alhwhy'), /changed one term only, so the two sides now differ/);
    await term(page, 'l', 0).click();
    await page.locator('#algMenu [data-op="sq"]').click({ modifiers: ['Shift'] });
    assert.match(await page.textContent('#dfWork .algline.cur .alhwhy'), /Squaring both sides/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
