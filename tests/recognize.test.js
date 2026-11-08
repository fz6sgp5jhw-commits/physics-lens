// Phase 4: reading freehand strokes, tested with the recorded strokes in strokes.json (see strokes.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, recognize } from '../js/recognize.js';
import { at } from './strokes.js';

const scene = (o = {}) => ({ unit: 'incline', floorY: 470, bodies: [], pulleys: [], corners: [], ...o });
const only = (r) => { assert.equal(r.options.length, 1, JSON.stringify(r)); return r.options[0]; };

test('recorded strokes: what each one looks like, at any size and angle', () => {
  assert.equal(classify(at('line', { s: 300 })).type, 'line');
  assert.equal(classify(at('line', { s: 400, deg: 25 })).type, 'line');
  assert.equal(classify(at('loop', { s: 60 })).type, 'loop');
  assert.equal(classify(at('loop', { s: 12 })).type, 'loop');
  assert.equal(classify(at('box', { sx: 35, sy: 38 })).type, 'box');
  assert.equal(classify(at('box', { s: 30, deg: 20 })).type, 'box', 'a box drawn tilted, as on a ramp, is still a box');
  assert.equal(classify(at('rounded', { s: 40 })).type, 'closed');
  assert.equal(classify(at('arrow', { s: 150, deg: -60 })).type, 'arrow');
  assert.equal(classify(at('scribble', { s: 200 })).type, 'curve');
  assert.equal(classify(at('line', { s: 10 })).type, 'unknown');
});

test('lines: flat → floor or table, steep → ramp at the drawn angle, in between → ask, too steep → explain', () => {
  const ramp = only(recognize(at('line', { x: 150, y: 466, s: 500, deg: 25 }), scene()));
  assert.equal(ramp.kind, 'ramp'); assert.ok(Math.abs(ramp.theta - 25) < 1.5, `θ = ${ramp.theta}`); assert.ok(Math.abs(ramp.w - 500 * Math.cos(25 * Math.PI / 180)) < 10);
  assert.equal(only(recognize(at('line', { x: 40, y: 468, s: 700, deg: 2 }), scene())).kind, 'floor');
  const table = only(recognize(at('line', { x: 60, y: 260, s: 520 }), scene()));
  assert.equal(table.kind, 'table'); assert.ok(Math.abs(table.y - 260) < 6 && Math.abs(table.x - 60) < 6);
  const almost = recognize(at('line', { x: 100, y: 400, s: 400, deg: 9 }), scene());
  assert.deepEqual(almost.options.map(o => o.kind), ['ramp', 'table']); assert.match(almost.ask, /ramp or a flat surface/);
  const steep = recognize(at('line', { x: 300, y: 460, s: 300, deg: 85 }), scene());
  assert.equal(steep.options.length, 0); assert.match(steep.why, /too steep/);
});

test('closed shapes: box → block, loop → ball (wheel in rotation), tiny → particle, small at a corner → pulley, unsure → ask', () => {
  const b = only(recognize(at('box', { x: 400, y: 250, sx: 35, sy: 38, deg: 15 }), scene()));
  assert.deepEqual([b.kind, b.mass, Math.round(b.w / 10), Math.round(b.h / 10)], ['block', 'm', 7, 5]);
  assert.equal(only(recognize(at('loop', { x: 400, y: 250, s: 60 }), scene())).kind, 'ball');
  assert.equal(only(recognize(at('loop', { x: 400, y: 250, s: 100 }), scene({ unit: 'rotation' }))).kind, 'wheel');
  assert.equal(only(recognize(at('loop', { x: 400, y: 250, s: 9 }), scene())).kind, 'particle');
  assert.equal(only(recognize(at('loop', { x: 595, y: 245, s: 15 }), scene({ corners: [{ x: 580, y: 260 }] }))).kind, 'pulley');
  const r = recognize(at('rounded', { x: 400, y: 250, s: 40 }), scene());
  assert.deepEqual(r.options.map(o => o.kind), ['block', 'ball']); assert.match(r.ask, /block or a round body/);
});

test('pulley problems: blocks are named m₁ (on the table) and m₂ (hanging under the pulley); strings join them over it', () => {
  const pul = { id: 'pulley3', x: 594, y: 246, r: 18 }, b1 = { id: 'block2', kind: 'block', x: 300, y: 237, w: 70, h: 46, mass: 'm1' }, b2 = { id: 'block4', kind: 'block', x: 612, y: 380, w: 70, h: 46, mass: 'm2' };
  const sc = scene({ unit: 'pulley', pulleys: [pul], bodies: [b1] });
  const top = only(recognize(at('box', { x: 320, y: 230, sx: 35, sy: 23 }), sc));
  assert.deepEqual([top.kind, top.mass, !!top.hanging], ['block', 'm1', false]);
  const hang = only(recognize(at('box', { x: 605, y: 380, sx: 35, sy: 23 }), sc));
  assert.deepEqual([hang.mass, hang.hanging, hang.x], ['m2', true, 612]);
  // one stroke from block 1 over the pulley down to block 2
  const both = { ...sc, bodies: [b1, b2] };
  const path = [{ x: 300, y: 237 }, { x: 450, y: 232 }, { x: 590, y: 228 }, { x: 610, y: 260 }, { x: 612, y: 320 }, { x: 612, y: 378 }];
  assert.deepEqual(only(recognize(path, both)).ends, ['block2', 'pulley3', 'block4']);
  // or in two strokes, each ending on the pulley
  assert.deepEqual(only(recognize([{ x: 300, y: 237 }, { x: 400, y: 234 }, { x: 500, y: 231 }, { x: 590, y: 240 }], both)).ends, ['block2', 'pulley3']);
});

test('arrows: from a body they are vectors (ask v or a); anywhere else, say so; scribbles and slips are explained', () => {
  const block = { id: 'block2', kind: 'block', x: 400, y: 300, w: 70, h: 46 };
  const r = recognize(at('arrow', { x: 400, y: 300, s: 120, deg: -30 }), scene({ bodies: [block] }));
  assert.deepEqual(r.options.map(o => o.vec), ['v', 'a']); assert.equal(r.options[0].body, 'block2'); assert.match(r.ask, /Which arrow/);
  assert.ok(r.options[0].x > 0 && r.options[0].y > 0, 'down and to the right (y is down on the drawing)');
  // a plain line out of a body is read as an arrow too
  assert.equal(recognize(at('line', { x: 400, y: 300, s: 120, deg: 90 }), scene({ bodies: [block] })).options[0].kind, 'vec');
  assert.match(recognize(at('arrow', { x: 100, y: 100, s: 120 }), scene({ bodies: [block] })).why, /belongs to a body/);
  assert.match(recognize(at('scribble', { x: 100, y: 200, s: 200 }), scene()).why, /neither straight nor closed/);
  assert.match(recognize(at('line', { s: 10 }), scene()).why, /too short/);
});
