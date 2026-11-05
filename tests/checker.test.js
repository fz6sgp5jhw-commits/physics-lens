// Test 3: setup checker negative test.
// A wrong direction, a missing hidden given, a wrong condition and a missing target must each be reported.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE } from '../js/data.js';
import { launch, openApp, loadPractice, applyKey, checkSetup } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

async function run(i, broken){
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    await loadPractice(page, i);
    await applyKey(page, PRACTICE[i], broken);
    const r = await checkSetup(page);
    assert.deepEqual(errors, []);
    return r.msg;
  } finally { await page.close(); }
}

// "Frictionless slide": v0 = 0 (from rest), dx 3 m down the slope, frictionless, target vf
const SLIDE = PRACTICE.findIndex(p => p.title === 'Frictionless slide');

test('wrong direction is reported', async () => {
  const msg = await run(SLIDE, { flip: ['dx'] });
  assert.match(msg, /1 THING TO FIX/);
  assert.match(msg, /Δx: right size, but the direction is backwards/);
});

test('missing hidden given is reported', async () => {
  const msg = await run(SLIDE, { skip: ['v0'] });
  assert.match(msg, /1 THING TO FIX/);
  assert.match(msg, /Missing a known: v[₀0] .*hidden in the wording/);
});

test('wrong condition is reported', async () => {
  const msg = await run(SLIDE, { condOverride: { friction: true } });
  assert.match(msg, /1 THING TO FIX/);
  assert.match(msg, /Condition “Surface” should be: Frictionless/);
});

test('missing target is reported', async () => {
  const msg = await run(SLIDE, { skipTargets: ['vf'] });
  assert.match(msg, /1 THING TO FIX/);
  assert.match(msg, /asks for v \(final velocity\): add it as a 🎯 target/);
});

test('all four mistakes at once are each reported', async () => {
  const msg = await run(SLIDE, { flip: ['dx'], skip: ['v0'], condOverride: { friction: true }, skipTargets: ['vf'] });
  assert.match(msg, /4 THINGS TO FIX/);
  for (const re of [/direction is backwards/, /Missing a known: v[₀0] /, /Condition “Surface”/, /add it as a 🎯 target/]) assert.match(msg, re);
});
