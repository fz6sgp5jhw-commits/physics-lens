// Phase M2 gate: the four lessons the student's exam showed were missing (docs/mistake-plan.md section 4).
// Spring: lowered slowly (ΣF = 0) against released (energy, twice the stretch). Impulse: J = FΔt = Δp, the area under
// F–t, and the opposite impulse on the other body. Elastic collision on a line, alone and after a slide. Explosion in two
// dimensions: x and y written out, then the speed and the quadrant of the angle. Every stop's key passes Check my setup and
// solves to answers worked outside the app (scratch script, 2026-11-14), compared within their significant figures.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, applyKey, checkSetup } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const NEW = ['spring', 'impulse', 'elastic', 'explode'];

test('the four lessons exist in the energy unit, each long → twin → transfer, with original problems', async () => {
  const { LESSONS } = await import('../js/data.js').then(m => ({ LESSONS: m.LESSONS }));
  for (const id of NEW){
    const l = LESSONS.find(x => x.id === id);
    assert.ok(l, `${id} is a lesson`);
    assert.equal(l.chapter, 'energy', id);
    assert.deepEqual(l.stops.map(s => s.kind), ['long', 'twin', 'transfer'], id);
    for (const s of l.stops) assert.ok(s.problem.original && s.problem.answers && s.route.why, `${id}/${s.kind}`);
  }
});

test('every new stop: its key passes Check my setup and solves to the worked answers', async () => {
  const { page, errors } = await openApp(env.browser, env.url);
  try {
    for (const l of NEW) for (const kind of ['long', 'twin', 'transfer']){
      const k = `${l}/${kind}`;
      assert.equal(await page.evaluate(async ([l, s]) => window.__rl.course.open(l, s), [l, kind]), true, k);
      const st = await page.evaluate(() => { const c = window.__rl.course, s = c.stop; return { ch: c.lesson.chapter, key: s.problem.key, answers: s.problem.answers }; });
      await applyKey(page, { ch: st.ch, key: st.key });
      const chk = await checkSetup(page);
      assert.match(chk.title, /perfect/, `${k}: the key passes Check my setup: ${chk.msg}`);
      await page.evaluate(() => { window.__rl.help.showMe = true; document.getElementById('showBtn').disabled = false; });
      await page.click('#showBtn');
      await page.waitForFunction(() => { const S = window.__rl; return S.targets.length && S.targets.every(t => t in S.found) && !S.busy; }, null, { timeout: 20000 });
      const got = await page.evaluate(async (answers) => {
        const { sigMatch } = await import('./js/course.js');
        return Object.entries(answers).map(([id, a]) => [id, a, window.__rl.found[id].val, sigMatch(window.__rl.found[id].val, a)]);
      }, st.answers);
      for (const [id, a, v, ok] of got) assert.ok(ok, `${k}: ${id} = ${v}, worked answer ${a}`);
      await page.waitForSelector('#dlg.show', { timeout: 5000 });
      if (await page.isVisible('#dlgCancel')) await page.click('#dlgCancel'); else await page.click('#dlgOk');
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
