// Phase 10, the drawing language: the stroke key is one table in recognize.js, printed beside the canvas; the pen shows
// what a stroke will become while it is drawn; a single reading offers recognize()'s other readings for 6 s; the pencil
// notes tick as the drawing grows, with How much help in the menu stored as pl-help and a way to forget it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { STROKES, recognize } from '../js/recognize.js';
import { previewText } from '../js/pen.js';
import { at } from './strokes.js';
import { launch, openApp } from './helpers.js';

let env;
before(async () => { env = await launch(); });
after(async () => { await env?.close(); });

const scene = (o = {}) => ({ unit: 'incline', floorY: 470, bodies: [], pulleys: [], corners: [], ...o });

test('the stroke key table: every reading recognize() makes has a row; the unreadable-stroke sentence points at the key', () => {
  const draws = STROKES.map(k => k.draws).join(' | ');
  for (const w of ['block', 'ball or wheel', 'ramp', 'floor or table', 'arrow', 'string', 'pulley', 'particle']) assert.match(draws, new RegExp(w), w);
  assert.ok(STROKES.every(k => k.stroke && k.how && k.icon));
  assert.match(recognize(at('scribble', { s: 200 }), scene()).why, /stroke key/);
});

test('a tap is a particle (on a part it draws nothing); single readings carry the other reading as alts', () => {
  const tap = recognize([{ x: 400, y: 200 }, { x: 401, y: 201 }], scene());
  assert.equal(tap.options[0].kind, 'particle');
  assert.equal(recognize([{ x: 400, y: 200 }], scene({ bodies: [{ id: 'b', kind: 'block', x: 400, y: 200, w: 60, h: 40 }] })).options.length, 0);
  const box = recognize(at('box', { sx: 35, sy: 38 }), scene());
  assert.equal(box.options[0].kind, 'block'); assert.equal(box.alts[0].kind, 'ball');
  const loop = recognize(at('loop', { s: 60 }), scene());
  assert.equal(loop.options[0].kind, 'ball'); assert.equal(loop.alts[0].kind, 'block');
  const ramp = recognize(at('line', { s: 300, deg: -30 }), scene());
  assert.equal(ramp.options[0].kind, 'ramp'); assert.equal(ramp.alts[0].kind, 'table');
  const flat = recognize(at('line', { s: 300 }), scene());
  assert.equal(flat.options[0].kind, 'table'); assert.equal(flat.alts[0].kind, 'ramp');
  assert.equal(previewText(box), '→ block');
  assert.equal(previewText({ options: [] }), 'keep going…');
  assert.match(previewText(recognize(at('rounded', { s: 40 }), scene())), /block or ball\?/);
});

test('drawing first: the key folds, the pen previews, the fix chip swaps or rubs out, the notes tick, help is stored and forgotten', async () => {
  const { page, errors } = await openApp(env.browser, env.url, { mode: 'draw' });
  try {
    assert.equal(await page.locator('#strokeKey > div').count(), STROKES.length);
    await page.click('#dfKeyBtn'); assert.equal(await page.isHidden('#strokeKey'), true);
    await page.click('#dfKeyBtn'); assert.equal(await page.isVisible('#strokeKey'), true);
    assert.match(await page.textContent('#pencilNotes li.next'), /Draw the problem/);

    // a box drawn with the pen, in drawing coordinates; the preview is read before the pen lifts
    const mid = await page.evaluate(() => {
      window.__rl.build.tool = 'pen';
      const svg = document.getElementById('bd'), m = svg.getScreenCTM(), C = [[300, 200], [420, 200], [420, 290], [300, 290], [300, 200]], pts = [];
      for (let i = 0; i <= 40; i++){ const t = i / 10, k = Math.min(3, Math.floor(t)), f = t - k; pts.push([C[k][0] + (C[k + 1][0] - C[k][0]) * f, C[k][1] + (C[k + 1][1] - C[k][1]) * f]); }
      const ev = (type, [x, y]) => { const p = new DOMPoint(x, y).matrixTransform(m); svg.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 1, button: 0 })); };
      ev('pointerdown', pts[0]); pts.slice(1, 39).forEach(p => ev('pointermove', p));
      const text = document.getElementById('penPreview')?.textContent;
      ev('pointermove', pts[39]); ev('pointerup', pts[40]); return text;
    });
    assert.equal(mid, '→ block');
    assert.match(await page.textContent('#fixChip'), /Read as block\..*no, ball.*rub out/);
    await page.click('#fixChip button:has-text("no, ball")');
    assert.deepEqual(await page.evaluate(() => window.__rl.build.shapes.map(s => s.kind)), ['ball']);
    assert.match(await page.getAttribute('#pencilNotes li:first-child', 'class'), /ok/);

    // How much help: in the Tools menu, stored as pl-help, forgotten by its button
    const menu = async (sel) => { await page.evaluate(() => { document.getElementById('toolsMenu').open = true; }); await page.click(sel); };
    await menu('[data-help="prompt"]');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pl-help')).level), 'prompt');
    assert.match(await page.textContent('#pencilNotes .pnote'), /Next: Press Done drawing/);
    await menu('[data-help="own"]'); assert.equal(await page.isHidden('#pencilNotes'), true);
    await menu('#helpClear');
    assert.equal(await page.evaluate(() => localStorage.getItem('pl-help')), null);
    assert.equal(await page.locator('#pencilNotes ol.walk').count(), 1);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
