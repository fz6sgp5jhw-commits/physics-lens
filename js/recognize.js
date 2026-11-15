// Physics Lens — reading freehand strokes (Phase 4). Every recognition rule lives in this file, so it can be tested
// with recorded strokes. A stroke is an array of { x, y } points in drawing coordinates (880 × 520, y down).
//   classify(points)        → what the stroke looks like: line, arrow, loop, box, closed (box or loop?), curve, unknown
//   recognize(points, scene) → { options: [placements], ask?: question, alts?: [placements] } or { options: [], why: what to try instead }
// One option: the drawing snaps to it, and alts (if any) are the other readings the same rules allow, offered as a quick fix.
// Several: the app asks which one was meant. STROKES is the drawing language printed beside the canvas (the stroke key). A placement is a component in its
// standard form: { kind, label, …geometry } for build.js `place()`.

export const RULES = {
  minLen: 24,     // shorter strokes are taps or slips
  closed: 0.22,   // ends closer than this share of the length: a closed shape
  straight: 0.09, // furthest wobble from the chord, as a share of its length, still counted as straight
  corners: 3,     // a closed shape with this many sharp bends is a box, however much of its bounding box it fills
  cornerDeg: 50,  // a sharp bend: the direction swings more than this over a short stretch
  boxFill: 0.88,  // without them: a closed shape filling this much of its bounding box is a box…
  loopFill: 0.82, // …and this little is a loop (a circle fills π/4 ≈ 0.785); in between, ask
  flatDeg: 6,     // lines flatter than this are flat surfaces; steeper than rampDeg are ramps; in between, ask
  rampDeg: 12,
  steepDeg: 78,   // steeper than this can't be a ramp
  tinyR: 12,      // a loop this small is a particle
  pulleyR: 28,    // a small loop near a table's edge or a ramp's top is a pulley
  near: 60,       // how close counts as "at" a corner or "under" a pulley
  grab: 12,       // a stroke starts "on" a body within this margin of it
  tap: 6,         // a press that moves less than this is a tap: a particle
};

// The drawing language: each kind of stroke and what it draws. The stroke key is printed from this table, and the
// sentences recognize() gives when a stroke can't be read use the same words. icon: an SVG path in a 38 × 30 box.
export const STROKES = [
  { stroke: 'a box', draws: 'block', how: 'press into the corners', icon: 'M6 7 H32 V24 H6 Z' },
  { stroke: 'a round loop', draws: 'ball or wheel', how: 'close it where it started', icon: 'M19 4 a11 11 0 1 0 0.1 0' },
  { stroke: 'a slanted line', draws: 'ramp', how: 'one straight line, steeper than 12°', icon: 'M4 26 L34 7' },
  { stroke: 'a flat line', draws: 'floor or table', how: 'one straight line, near level', icon: 'M3 18 H35 M9 18 l-5 7 M17 18 l-5 7 M25 18 l-5 7 M33 18 l-5 7' },
  { stroke: 'a line out of a body', draws: 'arrow (v or a)', how: 'start inside the body it belongs to', icon: 'M8 22 L30 8 M21 7 L30 8 L27 16' },
  { stroke: 'a line between parts', draws: 'string', how: 'from one body, over a pulley, to the other', icon: 'M6 24 L6 8 Q19 1 32 8 L32 24' },
  { stroke: 'a small loop at a corner', draws: 'pulley', how: 'at a table’s edge or a ramp’s top', icon: 'M4 20 H22 M28 16 a5 5 0 1 0 0.1 0' },
  { stroke: 'a tap', draws: 'particle', how: 'one press, away from other parts', icon: 'dot' },
];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLen = (P) => P.reduce((s, p, i) => i ? s + dist(P[i - 1], p) : 0, 0);
function bbox(P){
  const xs = P.map(p => p.x), ys = P.map(p => p.y), x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
// the smallest rectangle round the points at any turn (3° steps), so a box drawn tilted still reads as a box
function minRect(P){
  let best = null;
  for (let d = 0; d < 90; d += 3){
    const a = d * Math.PI / 180, c = Math.cos(a), n = Math.sin(a), u = P.map(p => p.x * c + p.y * n), v = P.map(p => p.y * c - p.x * n);
    const w = Math.max(...u) - Math.min(...u), h = Math.max(...v) - Math.min(...v);
    if (!best || w * h < best.w * best.h) best = d > 45 ? { w: h, h: w } : { w, h };
  }
  return best;
}
const area = (P) => P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
// n points spaced evenly along the stroke
function resample(P, n){
  const step = pathLen(P) / (n - 1), out = [P[0]];
  let acc = 0;
  for (let i = 1; i < P.length && out.length < n; i++){
    let a = P[i - 1]; const b = P[i]; let d = dist(a, b);
    while (acc + d >= step && out.length < n){
      const t = (step - acc) / d, q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
      out.push(q); a = q; d = dist(a, b); acc = 0;
    }
    acc += d;
  }
  while (out.length < n) out.push(P[P.length - 1]);
  return out;
}
// the sharp bends round a closed stroke (evenly resampled): where the direction swings more than cornerDeg between the
// points 3 either side, each bend counted once. Hand-drawn boxes have soft corners and bowed sides, so they can fill
// as little of their bounding box as a circle does; their corners still show.
function corners(Q){
  const n = Q.length, w = 3, at = (i) => Q[(i + n) % n];
  const turn = (i) => {
    const a = at(i - w), b = at(i), c = at(i + w);
    let d = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d);
  };
  const ang = Q.map((_, i) => turn(i)), min = RULES.cornerDeg * Math.PI / 180, out = [];
  for (let i = 0; i < n; i++){
    if (ang[i] < min || ang[i] < ang[(i + n - 1) % n] || ang[i] < ang[(i + 1) % n]) continue;
    if (out.some(j => Math.min(Math.abs(i - j), n - Math.abs(i - j)) < 6)) continue;
    out.push(i);
  }
  return out.length;
}
// the furthest any point strays from the straight line between the ends, as a share of that line's length
function wobble(P){
  const a = P[0], b = P[P.length - 1], L = dist(a, b);
  if (L < 1) return Infinity;
  return Math.max(...P.map(p => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / L)) / L;
}

export function classify(raw){
  const P = raw.filter((p, i) => !i || dist(p, raw[i - 1]) > 0.5);
  const L = P.length > 1 ? pathLen(P) : 0;
  if (raw.length && L < RULES.tap && raw.every(p => dist(p, raw[0]) < RULES.tap)) return { type: 'tap', at: raw[0] };
  if (P.length < 4 || L < RULES.minLen) return { type: 'unknown', why: 'That stroke is too short to read. Draw it a little bigger.' };
  const a = P[0], b = P[P.length - 1], box = bbox(P);
  if (dist(a, b) < RULES.closed * L && Math.min(box.w, box.h) > 10){
    const rect = minRect(P), fill = Math.abs(area(P)) / (rect.w * rect.h), c = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    const Q = resample(P, 64), r = Q.reduce((s, p) => s + dist(p, c), 0) / Q.length;
    const k = corners(Q), type = k >= RULES.corners || fill >= RULES.boxFill ? 'box' : fill <= RULES.loopFill ? 'loop' : 'closed';
    return { type, fill, corners: k, box, rect, c, r };
  }
  const Q = resample(P, 48);
  // an arrow: a straight shaft out to the point furthest from the start, then a short head drawn back from there
  let k = 0; Q.forEach((p, i) => { if (dist(p, Q[0]) > dist(Q[k], Q[0])) k = i; });
  const shaft = dist(Q[0], Q[k]), head = pathLen(Q.slice(k));
  if (k < Q.length - 2 && head > 0.08 * shaft && head < 0.8 * shaft && wobble(Q.slice(0, k + 1)) <= RULES.straight * 1.5)
    return { type: 'arrow', from: Q[0], to: Q[k], points: Q };
  if (wobble(Q) <= RULES.straight) return { type: 'line', from: a, to: b, points: Q };
  return { type: 'curve', from: a, to: b, points: Q };
}

// what the point is on: a pulley first (it is small and sits on things), then a body
function thingAt(scene, p){
  const pul = scene.pulleys.find(q => dist(p, q) <= q.r + RULES.grab + 4);
  if (pul) return { ...pul, kind: 'pulley' };
  return scene.bodies.find(b => b.kind === 'block' ? Math.abs(p.x - b.x) <= b.w / 2 + RULES.grab && Math.abs(p.y - b.y) <= b.h / 2 + RULES.grab : dist(p, b) <= b.r + RULES.grab) || null;
}
const one = (o) => ({ options: [o] });
// the mass a new block is named with, by unit: the table block is m₁ and the hanging one m₂; pushed blocks are A then B
function massFor(scene, hanging){
  if (scene.unit === 'pulley') return hanging ? 'm2' : 'm1';
  if (scene.unit === 'blocks') return scene.bodies.some(b => b.kind === 'block' && b.mass === 'mA') ? 'mB' : 'mA';
  return 'm';
}

function lineOptions(s, scene){
  const dx = s.to.x - s.from.x, dy = s.to.y - s.from.y, ang = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
  const x = Math.min(s.from.x, s.to.x), w = Math.abs(dx), y = (s.from.y + s.to.y) / 2;
  const flat = y > scene.floorY - 40 ? { kind: 'floor', label: 'Floor' } : { kind: 'table', label: 'Table (flat surface)', x, y, w };
  const ramp = { kind: 'ramp', label: `Ramp at ${Math.round(ang)}°`, x, w, theta: ang };
  // the quick fix's other reading: a flat line could have been a gentle ramp, a ramp a flat surface
  if (ang < RULES.flatDeg) return { options: [flat], alts: [{ ...ramp, label: `Ramp at ${RULES.flatDeg}°`, theta: RULES.flatDeg }] };
  if (ang < RULES.rampDeg) return { options: [ramp, flat], ask: `That line is almost flat (${Math.round(ang)}°). Is it a ramp or a flat surface?` };
  if (ang <= RULES.steepDeg) return { options: [ramp], alts: [flat] };
  return { options: [], why: 'That line is too steep for a ramp. Draw a gentler slope, or start inside a body to draw an arrow.' };
}
function roundOption(s, scene){
  const { c, r } = s;
  if (r <= RULES.pulleyR && scene.corners.some(k => dist(k, c) <= RULES.near)) return { kind: 'pulley', label: 'Pulley', x: c.x, y: c.y };
  if (r <= RULES.tinyR) return { kind: 'particle', label: 'Particle', x: c.x, y: c.y };
  return scene.unit === 'rotation' ? { kind: 'wheel', label: 'Wheel or disc', x: c.x, y: c.y, r } : { kind: 'ball', label: 'Ball', x: c.x, y: c.y, r };
}
function boxOption(s, scene){
  const { c, rect } = s;
  const p = scene.pulleys.find(q => Math.abs(c.x - (q.x + q.r)) <= RULES.near && c.y > q.y + 40);
  const o = { kind: 'block', label: p ? 'Hanging block' : 'Block', x: p ? p.x + p.r : c.x, y: c.y, w: rect.w, h: rect.h, mass: massFor(scene, !!p) };
  if (p) o.hanging = true;
  return o;
}

// scene: { unit, floorY, bodies: [{ id, kind, x, y, w, h, r, mass }], pulleys: [{ id, x, y, r }], corners: [{ x, y }] }
export function recognize(points, scene){
  const s = classify(points);
  if (s.type === 'unknown') return { options: [], why: s.why };
  if (s.type === 'tap') return thingAt(scene, s.at) ? { options: [], why: 'A tap on a part draws nothing. To move it or set it, use Select.' }
    : one({ kind: 'particle', label: 'Particle', x: s.at.x, y: s.at.y });
  if (s.type === 'box') return { options: [boxOption(s, scene)], alts: [roundOption(s, scene)] };
  if (s.type === 'loop') return { options: [roundOption(s, scene)], alts: [boxOption(s, scene)] };
  if (s.type === 'closed') return { options: [boxOption(s, scene), roundOption(s, scene)], ask: 'Is this a block or a round body?' };
  // open strokes: a string joins two things over a pulley; a line or arrow from a body is a vector; else a surface
  const A = thingAt(scene, s.from), B = thingAt(scene, s.to);
  const via = scene.pulleys.find(q => q.id !== A?.id && q.id !== B?.id && s.points.some(p => dist(p, q) <= q.r + 30));
  if (A && B && A.id !== B.id && (A.kind === 'pulley' || B.kind === 'pulley' || via))
    return one({ kind: 'string', label: 'String', ends: [A.id, via?.id, B.id].filter(Boolean) });
  if (A && A.kind !== 'pulley' && s.type !== 'curve'){
    const d = { body: A.id, x: s.to.x - s.from.x, y: s.to.y - s.from.y };
    return { options: [{ kind: 'vec', vec: 'v', label: 'Velocity v', ...d }, { kind: 'vec', vec: 'a', label: 'Acceleration a', ...d }], ask: 'Which arrow is this?' };
  }
  if (s.type === 'arrow') return { options: [], why: 'An arrow belongs to a body: start it inside the block, ball or wheel it belongs to.' };
  if (s.type === 'curve') return { options: [], why: 'That stroke is neither straight nor closed. The stroke key beside the drawing shows each one: a straight line for a floor or ramp, a round loop for a ball or wheel, a box for a block.' };
  return lineOptions(s, scene);
}
