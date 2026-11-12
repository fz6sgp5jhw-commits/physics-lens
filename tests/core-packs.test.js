// Phase C2 gate: a new subject is a pack (data only). A test pack (tests/fixtures/demo-pack.js, P = P₀ + ρgh) is added
// to js/packs/index.js as it is served, with no change to app.js: it loads, shows in the library and solves with Show me.
// Id collisions between packs are refused at load, and app.js names no unit.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, openApp, addGiven, addTarget, gather, confirmConditions } from './helpers.js';
import { mergePacks, attribution, PACKS } from '../js/packs/index.js';
import mech from '../js/packs/mech.js';
import demo from './fixtures/demo-pack.js';

const read = (f) => readFile(new URL('../' + f, import.meta.url), 'utf8');

test('packs: an id collision is refused at load, naming both packs; a new pack must prefix its ids', () => {
  const clone = (extra) => ({ ...demo, id: 'demo2', quantities: { ...extra } });
  assert.throws(() => mergePacks([mech, { id: 'x', bare: true, quantities: { m: { unit: 'kg' } } }]), /quantity id m is already used by pack mech/);
  assert.throws(() => mergePacks([mech, clone({ g2: { unit: 'm' } })]), /needs the prefix demo2_/);
  assert.throws(() => mergePacks([mech, mech]), /loaded twice/);
  const ok = mergePacks([mech, demo]);
  assert.equal(ok.equations.demo_H1.pack, 'demo');
  assert.equal(ok.quantities.demo_h.py, 'demo_h', 'py defaults to the id');
  assert.equal(ok.samples.demo_rho, 1000);
});

test('packs: app.js names no unit', async () => {
  const src = await read('js/app.js');
  const hits = [...src.matchAll(/['"`](incline|pulley|rotation|torque|blocks)['"`]|S\.ch\s*[!=]==\s*['"`]/g)].map(m => m[0]);
  assert.deepEqual(hits, []);
});

test('packs: every pack has licences, every practice problem a source or original: true, and credits are listed', () => {
  for (const p of PACKS) assert.ok(p.license && p.license.code && p.license.content, `${p.id} has license { code, content }`);
  const borrowed = { original: false, ch: 'demo_depth', title: 'Dam wall', source: { work: 'Some Open Physics', edition: '2e', license: 'CC BY 4.0', url: 'https://example.org/book', problem: 'Ch. 14, Problem 12' } };
  const withSrc = { ...demo, practice: [borrowed, { original: true, ch: 'demo_depth', title: 'Our own' }] };
  const credits = attribution([mech, withSrc]);
  assert.equal(credits[0].works.length, 0, 'mechanics practice is all original');
  assert.equal(credits[0].original, mech.practice.length);
  assert.deepEqual(credits[1].works, [{ work: 'Some Open Physics', edition: '2e', license: 'CC BY 4.0', url: 'https://example.org/book', problems: ['Ch. 14, Problem 12'] }]);
  assert.throws(() => mergePacks([mech, { ...demo, practice: [{ ch: 'demo_depth', title: 'No source' }] }]), /“No source” needs a source/);
});

let env;
before(async () => { env = await launch(); });
after(async () => { await env.close(); });

test('packs: the demo pack loads, shows in the library and solves with Show me, with no app.js change', async () => {
  const index = await read('js/packs/index.js');
  const served = "import demo from '../../tests/fixtures/demo-pack.js';\n" + index.replace('export const PACKS = [mech];', 'export const PACKS = [mech, demo];');
  assert.notEqual(served, index);
  const { page, errors } = await openApp(env.browser, env.url, {
    before: (p) => p.route('**/js/packs/index.js', r => r.fulfill({ contentType: 'text/javascript', body: served })),
  });
  try {
    await page.click('#chPick button:has-text("Pressure with depth (demo)")');
    assert.equal(await page.evaluate(() => window.__rl.ch), 'demo_depth');
    await page.click('#libBtn');
    assert.equal(await page.locator('#lib [data-gather="demo_H1"]').count(), 1, 'H1 is in the library');
    await page.click('#libClose');
    await addGiven(page, 'demo_P0', 1, 'atm');
    await addGiven(page, 'demo_rho', 1000, 'kg/m³');
    await addGiven(page, 'demo_h', 2, 'm');
    await confirmConditions(page);
    await addTarget(page, 'demo_P');
    await page.click('#showBtn');
    await page.waitForFunction(() => { const S = window.__rl; return 'demo_P' in S.found && !S.busy; }, null, { timeout: 15000 });
    const P = await page.evaluate(() => window.__rl.found.demo_P.val);
    assert.ok(Math.abs(P - (101325 + 1000 * 9.81 * 2)) < 1e-6 * P, `P = ${P} Pa`);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
