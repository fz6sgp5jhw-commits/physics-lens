// Physics Lens — the build canvas: shapes that snap together, each with named properties.
// The student builds the setup (or loads a template); contacts found here drive the free-body checker.
// Tools work like a drawing program: pick a tool in the toolbar, then click or drag on the canvas.
// Every arrow (force, velocity, acceleration) can be turned by dragging its tip; it clicks onto the
// physically named directions (along the slope, perpendicular, straight down…) when it gets close.
// SVG, no dependencies. Coordinates are in a 880 × 520 viewBox; the floor is at y = FLOOR.
// The pen tool reads freehand strokes (rules in recognize.js) and snaps them to the standard drawing.
import { recognize } from './recognize.js';

const W = 880, H = 520, FLOOR = 470, SNAP = 36, SNAP_DEG = 12;
const NS = 'http://www.w3.org/2000/svg';
const deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// default named properties per shape: the symbol each property is tied to
const KINDS = {
  floor:  { label: 'Floor', props: { friction: false } },
  ramp:   { label: 'Ramp', props: { angle: 'inc', friction: false } },
  table:  { label: 'Table', props: { friction: false } },
  block:  { label: 'Block', props: { mass: 'm' }, body: true },
  ball:   { label: 'Ball', props: { mass: 'm', radius: 'r' }, body: true },
  wheel:  { label: 'Wheel', props: { radius: 'r' }, body: true, spins: true },
  particle: { label: 'Particle', props: { mass: 'm' }, body: true },
  rod:    { label: 'Rod', props: { length: 'L', mass: 'M' } },
  pulley: { label: 'Pulley', props: {} },
  string: { label: 'String', props: {} },
  spring: { label: 'Spring', props: {} },
  pivot:  { label: 'Pivot', props: {} },
  conn:   { label: 'Connection', props: {} },   // drawing-first: a link between two parts (js/connect.js)
  tk:     { label: 'Toolkit', props: {} },      // drawing-first: axes, ticks, dimensions, coordinates (js/toolkit.js)
};
export const PALETTE = ['ramp', 'block', 'ball', 'wheel', 'particle', 'rod', 'table', 'floor', 'pulley', 'string', 'spring', 'pivot'];
// motion vectors a student can put on a body: velocity and acceleration
const VECS = { v: { label: 'Velocity', color: '#9be15d' }, a: { label: 'Acceleration', color: '#ff8f70' } };
// spin arrows a student can put round a wheel or ball: ω and α, counterclockwise (+) or clockwise
const SPINS = { omega: { sym: 'ω', color: '#9be15d', gap: 14 }, alpha: { sym: 'α', color: '#ff8f70', gap: 30 } };
const spins = (s) => KINDS[s.kind].spins || s.kind === 'ball';

// Options: onChange(); nameOf(id) → label text; and for the free-body layer (mode 'forces'):
//   dirsFor(body) → [{ key, x, y }] unit vectors in drawing coordinates (y down) the arrows snap to
//   forcesFor(body) → [{ dir, vec?, label, color }]  (vec: a unit vector for a force at a custom angle)
//   onArrow(bodyId, dirKey|null, clientXY, kind|null, vec)   a new arrow was drawn (kind set when a force tool is armed)
//   onArrowClick(bodyId, i, clientXY)                        an arrow was clicked (change or remove it)
//   onArrowTurn(bodyId, i, dirKey|null, vec)                 an arrow's tip was dragged to a new direction
//   onArrowErase(bodyId, i)                                  the eraser touched an arrow
//   onVector(bodyId, 'v'|'a', dirKey|null)                    a velocity or acceleration arrow was drawn or turned
//   onPropClick(shapeId, prop) when a property label (mass, angle) is clicked in setup mode
//   snapshot() / restore(x): extra state (the forces) saved with each undo step
//   unit() → the current unit (recognition names masses and round bodies by it)
//   onStroke(result, clientXY, place)  a pen stroke was read: result from recognize(); call place(option) to snap it
//   wheelButton(shape) → label text when a wheel shows its "a point" button; pointVectors(shape) → [{ key, x, y, len, color, label }]
//   onWheelButton(shapeId)
//   afterRender(svg) runs after every redraw (drawing-first mode puts its part dots on top)
// Torque (Phase 5): in the torque unit a rod is a body (frame 'beam') and a wheel is a disc (frame 'disc'). A force can say
// where it acts: u (fraction along the rod from its left end) or off (offset from a disc's centre, in radii); onArrow
// then gets the u where the drag started. axisFor(body) → { u } | { centre: true } marks the axis for torques, and
// onAxisClick(bodyId, u | null) reports a click with the axis tool. A rod pinned at a pivot records pinAt
// ('left' | 'right' | 'centre' | 'point') and pinU; setTilt(id, degrees) turns it about the pin (+ counterclockwise).
export function createBuild(svg, { onChange = () => {}, nameOf = (id) => id, dirsFor = () => [], forcesFor = () => [], onArrow = () => {}, onArrowClick = () => {}, onArrowTurn = () => {}, onArrowErase = () => {}, onVector = () => {}, onPropClick = () => {}, snapshot = () => null, restore = () => {},
  unit = () => '', onStroke = () => {}, wheelButton = () => null, pointVectors = () => null, onWheelButton = () => {}, axisFor = () => null, onAxisClick = () => {}, afterRender = () => {} } = {}){
  const st = { shapes: [], sel: null, seq: 0, theta: 30, mode: 'setup', tool: 'select', preview: null, turn: null, hover: null, stroke: null };
  const hist = [];
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const torque = () => unit() === 'torque';
  const make = (kind, o = {}) => ({ id: kind + (++st.seq), kind, x: 200, y: 200, w: 70, h: 46, r: 30, props: { ...KINDS[kind].props, ...(torque() && kind === 'wheel' ? { radius: 'R', mass: 'M' } : {}) }, ...o });
  const add = (kind, o = {}) => { const s = make(kind, o); st.shapes.push(s); snapAll(); render(); onChange(); return s; };
  const byKind = (k) => st.shapes.filter(s => s.kind === k);
  const isBody = (s) => KINDS[s.kind].body || (s.kind === 'rod' && torque());

  // ---- undo: a snapshot before every change
  const snap0 = () => JSON.stringify({ shapes: st.shapes, theta: st.theta, seq: st.seq, extra: snapshot() });
  function checkpoint(){ const s = snap0(); if (hist[hist.length - 1] !== s){ hist.push(s); if (hist.length > 60) hist.shift(); } }
  function undo(){
    if (!hist.length) return false;
    let s = hist.pop(); if (s === snap0() && hist.length) s = hist.pop();
    const o = JSON.parse(s); st.shapes = o.shapes; st.theta = o.theta; st.seq = o.seq; st.sel = null; restore(o.extra);
    snapAll(); render(); onChange(); return true;
  }

  // ramp geometry: low end at (x, FLOOR), rising to the right over width w at angle θ
  const rampTop = (r) => ({ x: r.x + r.w, y: FLOOR - r.w * Math.tan(rad(st.theta)) });
  const maxTheta = (r) => Math.min(75, deg(Math.atan((FLOOR - 24) / r.w)));
  const surfaces = () => {
    const out = [];
    for (const r of byKind('ramp')){ const t = rampTop(r); out.push({ shape: r, x1: r.x, y1: FLOOR, x2: t.x, y2: t.y, angle: st.theta }); }
    for (const t of byKind('table')) out.push({ shape: t, x1: t.x, y1: t.y, x2: t.x + t.w, y2: t.y, angle: 0 });
    for (const f of byKind('floor')) out.push({ shape: f, x1: 0, y1: FLOOR, x2: W, y2: FLOOR, angle: 0 });
    return out;
  };
  const lift = (b) => b.kind === 'block' ? b.h / 2 : b.r; // centre sits this far above the surface
  const pivotTop = (p) => ({ x: p.x, y: p.y - 22 });
  // the point a distance u along surface s, lifted so body b rests on it
  function restOn(s, u, b){
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const px = s.x1 + ux * u, py = s.y1 + uy * u, nx = uy, ny = -ux, sg = ny < 0 ? 1 : -1;
    return { x: px + sg * nx * lift(b), y: py + sg * ny * lift(b), L };
  }
  // put a body on the nearest surface if it was dropped close to it (a hanging block hangs, a pinned wheel stays pinned)
  function snap(b, reach = SNAP){
    if (snapPivot(b) || !isBody(b) || b.kind === 'rod') return;
    b.on = null;
    if (b.hanging){ b.tilt = 0; return; }
    let best = null, bd = reach;
    for (const s of surfaces()){
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const u = clamp((b.x - s.x1) * ux + (b.y - s.y1) * uy, 0, L);
      const c = restOn(s, u, b), d = Math.hypot(b.x - c.x, b.y - c.y);
      if (d < bd && u > 4 && u < L - 4){ bd = d; best = { s, cx: c.x, cy: c.y }; }
    }
    if (best){ b.x = best.cx; b.y = best.cy; b.on = best.s.shape.id; b.tilt = best.s.angle; }
    else b.tilt = 0;
  }
  // a pulley snaps to the top corner of a table or ramp; strings join bodies over a pulley
  function snapPulley(p){
    let best = null, bd = SNAP * 1.5;
    for (const t of byKind('table')){ const cx = t.x + t.w + 14, cy = t.y - 14, d = Math.hypot(p.x - cx, p.y - cy); if (d < bd){ bd = d; best = { cx, cy }; } }
    for (const r of byKind('ramp')){ const t = rampTop(r), d = Math.hypot(p.x - t.x - 14, p.y - t.y + 14); if (d < bd){ bd = d; best = { cx: t.x + 14, cy: t.y - 14 }; } }
    if (best){ p.x = best.cx; p.y = best.cy; }
  }
  // a wheel dropped with its centre near a pivot is pinned there; a rod is pinned at whichever point lies over the pivot
  // (an end, its centre or a point in between: pinAt, pinU = fraction from the left end)
  function snapPivot(s){
    if (!(s.kind === 'wheel' || s.kind === 'rod')) return false;
    s.pivot = null; s.pinAt = null;
    if (s.kind === 'wheel'){
      const p = byKind('pivot').find(q => Math.hypot(pivotTop(q).x - s.x, pivotTop(q).y - s.y) < SNAP);
      if (!p) return false;
      Object.assign(s, pivotTop(p), { pivot: p.id, on: null, tilt: 0 }); return true;
    }
    const left = s.x - s.w / 2;
    const p = byKind('pivot').find(q => { const t = pivotTop(q); return Math.abs(t.y - s.y) < SNAP && t.x > left - 14 && t.x < left + s.w + 14; });
    if (!p) return false;
    const t = pivotTop(p), u = clamp(t.x - left, 0, s.w), near = 14;
    const at = u < near ? 'left' : u > s.w - near ? 'right' : Math.abs(u - s.w / 2) < near ? 'centre' : 'point';
    const pu = { left: 0, right: 1, centre: 0.5 }[at] ?? u / s.w;
    Object.assign(s, { x: t.x - (pu - 0.5) * s.w, y: t.y, pivot: p.id, pinAt: at, pinU: pu, on: null }); return true;
  }
  // a point a fraction u along a rod from its left end, turned with the rod about its pin (or centre)
  function rodPoint(s, u){
    const a = rad(s.ang || 0), c = s.pinU ?? 0.5, d = (u - c) * s.w, ox = s.x + (c - 0.5) * s.w;
    return { x: ox + d * Math.cos(a), y: s.y - d * Math.sin(a) };
  }
  // where a string meets a shape, heading toward `to`: over a pulley, at a disc's rim, on a rod above the hung body
  function attach(p, to){
    if (!p) return null;
    if (p.kind === 'pulley') return { x: p.x, y: p.y - (p.r || 18) };
    if (p.kind === 'wheel' && to) return { x: p.x + (to.x < p.x ? -p.r : p.r), y: p.y };
    if (p.kind === 'rod' && to){ const u = clamp((to.x - (p.x - p.w / 2)) / p.w, 0, 1); return rodPoint(p, u); }
    return { x: p.x, y: p.y };
  }
  // where a force starts: on a rod at u, on a disc's rim at off, else at the centre of mass
  function forceStart(s, f){
    if (s.kind === 'rod' && f && f.u !== undefined && f.u !== null) return rodPoint(s, f.u);
    if (f && f.off) return { x: s.x + f.off.x * (s.r || 30), y: s.y + f.off.y * (s.r || 30) };
    return comOf(s);
  }
  // the fraction along a rod nearest a drawing point (and how far away it is)
  function rodU(s, p){
    const a = rad(s.ang || 0), L0 = rodPoint(s, 0), ux = Math.cos(a), uy = -Math.sin(a);
    const t = clamp((p.x - L0.x) * ux + (p.y - L0.y) * uy, 0, s.w), q = { x: L0.x + ux * t, y: L0.y + uy * t };
    return { u: t / s.w, d: Math.hypot(p.x - q.x, p.y - q.y) };
  }
  function snapAll(){ st.shapes.forEach(s => s.kind === 'pulley' ? snapPulley(s) : snap(s)); snapTouching(); }
  // blocks dropped close together on the same flat surface slide up against each other
  function snapTouching(){
    const flat = st.shapes.filter(b => b.kind === 'block' && b.on && !(b.tilt));
    const bySurf = {};
    for (const b of flat) (bySurf[b.on] = bySurf[b.on] || []).push(b);
    for (const list of Object.values(bySurf)){
      list.sort((a, b) => a.x - b.x);
      for (let i = 1; i < list.length; i++){ const a = list[i - 1], b = list[i], gap = (b.x - b.w / 2) - (a.x + a.w / 2); if (gap > -a.w / 2 && gap < 16) b.x = a.x + a.w / 2 + b.w / 2; }
    }
  }
  // pairs of blocks pressed against each other: [left, right]
  function touching(){
    const out = [], flat = st.shapes.filter(b => b.kind === 'block' && b.on && !(b.tilt));
    for (const a of flat) for (const b of flat) if (a !== b && a.on === b.on && Math.abs((b.x - b.w / 2) - (a.x + a.w / 2)) < 2) out.push({ left: a.id, right: b.id });
    return out;
  }

  // ---- contacts: which body touches which surface (+ string links)
  function contacts(){
    const out = [];
    for (const b of st.shapes) if (b.on){ const s = st.shapes.find(x => x.id === b.on); if (s) out.push({ body: b.kind, bodyId: b.id, surface: s.kind, surfaceId: s.id, friction: !!s.props.friction, angle: b.tilt || 0 }); }
    return out;
  }
  function strings(){
    return byKind('string').map(s => ({ id: s.id, ends: s.ends || [] }));
  }
  const frameOf = (b) => b.kind === 'rod' ? 'beam' : b.kind === 'wheel' && torque() ? 'disc' : b.hanging ? 'hanging' : b.on ? (st.shapes.find(x => x.id === b.on)?.kind === 'ramp' ? 'slope' : 'flat') : 'free';
  const bodies = () => st.shapes.filter(isBody).map(b => ({ id: b.id, kind: b.kind, mass: b.props.mass, on: b.on, hanging: !!b.hanging, x: b.x, frame: frameOf(b),
    pivot: b.pivot || null, pinAt: b.pinAt || null, ang: b.ang || 0 }));
  const bodyOf = (id) => bodies().find(b => b.id === id);
  const shape = (id) => st.shapes.find(s => s.id === id);

  // ---- templates: the existing diagrams
  function template(name){
    checkpoint();
    st.shapes = []; st.seq = 0; st.sel = null;
    if (name === 'incline'){
      add('floor'); const r = add('ramp', { x: 150, w: 560 });
      const t = rampTop(r); add('block', { x: (r.x + t.x) / 2 + 40, y: (FLOOR + t.y) / 2 - 40 });
    } else if (name === 'pulley'){
      add('floor'); add('table', { x: 60, y: 260, w: 520, h: 18 });
      const b1 = add('block', { x: 300, y: 230, props: { mass: 'm1' } });
      const p = add('pulley', { x: 600, y: 250, r: 18 });
      const b2 = add('block', { x: 614, y: 380, hanging: true, props: { mass: 'm2' } });
      add('string', { ends: [b1.id, p.id, b2.id] });
    } else if (name === 'blocks'){
      add('floor');
      add('block', { x: 330, y: 440, w: 90, h: 62, props: { mass: 'mA' } });
      add('block', { x: 330 + 45 + 35, y: 445, w: 70, h: 50, props: { mass: 'mB' } });
    } else if (name === 'wheel'){
      add('wheel', { x: 440, y: 260, r: 120 });
    } else if (name === 'beam'){
      // a beam on a pivot near its left end, with a mass hung near its right end
      const r = add('rod', { x: 440, y: 200, w: 480, h: 12 });
      add('pivot', { x: 440 - 240 + 0.146 * 480, y: 222 });
      const b = add('block', { x: 440 + 240 - 0.146 * 480, y: 330, w: 56, h: 44, hanging: true, props: { mass: 'm' } });
      add('string', { ends: [r.id, b.id] });
    } else if (name === 'disc'){
      // a disc on a fixed axle with a string from its left rim to a hanging mass
      add('pivot', { x: 440, y: 222 });
      const w = add('wheel', { x: 440, y: 200, r: 90, props: { radius: 'R', mass: 'M' } });
      const b = add('block', { x: 350, y: 390, w: 56, h: 44, hanging: true, props: { mass: 'm' } });
      add('string', { ends: [w.id, b.id] });
    }
    snapAll(); render(); onChange();
  }
  // a shape from the toolbar: surfaces get a floor under them; bodies land on the newest surface
  function addFromTool(kind){
    checkpoint();
    if ((kind === 'ramp' || kind === 'table') && !byKind('floor').length) st.shapes.push(make('floor'));
    const o = { ramp: { x: 120, w: 420 }, table: { x: 80, y: 280, w: 420, h: 18 }, floor: {}, pulley: { x: 560, y: 120, r: 18 }, wheel: { x: 440, y: 240, r: 70 },
      particle: { x: 300, y: 120, r: 8 }, rod: { x: 440, y: 160, w: 200, h: 10 }, spring: { x: 300, y: 300, w: 140 }, pivot: { x: 440, y: 330 } }[kind] || { x: 160 + 60 * (st.seq % 8), y: 120 };
    if (kind === 'floor' && byKind('floor').length) return byKind('floor')[0];
    const s = make(kind, o); st.shapes.push(s);
    if (isBody(s) && !KINDS[kind].spins && kind !== 'rod'){
      const surf = surfaces().find(x => x.shape.kind === 'ramp') || surfaces().find(x => x.shape.kind === 'table') || surfaces().find(x => x.shape.kind === 'floor');
      if (surf){ const n = st.shapes.filter(b => isBody(b) && b.on === surf.shape.id).length, L = Math.hypot(surf.x2 - surf.x1, surf.y2 - surf.y1); const c = restOn(surf, L * clamp(0.5 + 0.18 * n, 0.15, 0.85), s); s.x = c.x; s.y = c.y; }
    }
    if (kind === 'string'){ const bs = st.shapes.filter(x => isBody(x) || x.kind === 'pulley'); s.ends = bs.slice(-3).map(x => x.id); }
    st.sel = s.id; snapAll(); render(); onChange(); return s;
  }

  // ---- recognised strokes: put the component in its standard form (an option from recognize())
  function place(o){
    checkpoint();
    if (o.kind === 'vec'){
      const s = shape(o.body), b = bodyOf(o.body), d = snapDir(b, o.x, o.y);
      s[o.vec] = { x: d.x, y: d.y, len: clamp(Math.hypot(o.x, o.y), 50, 220), key: d.key }; st.sel = s.id;
      render(); onChange(); onVector(s.id, o.vec, d.key); return s;
    }
    if (o.kind === 'string'){
      // a second stroke over the same pulley continues the string: [block, pulley] + [pulley, block] → one string
      const pul = new Set(byKind('pulley').map(p => p.id)), ends = o.ends;
      const old = byKind('string').find(x => (x.ends || []).length === 2 && x.ends.some(id => pul.has(id) && ends.includes(id)));
      if (old){
        let a = old.ends, b = ends;
        if (a[0] === b[0]) a = [...a].reverse(); else if (a[0] === b[b.length - 1]) [a, b] = [b, a]; else if (a[1] === b[b.length - 1]) b = [...b].reverse();
        old.ends = [...a, ...b.slice(1)]; st.sel = old.id; render(); onChange(); return old;
      }
    }
    if (o.kind === 'floor' && byKind('floor').length){ render(); onChange(); return byKind('floor')[0]; }
    if ((o.kind === 'ramp' || o.kind === 'table') && !byKind('floor').length) st.shapes.push(make('floor'));
    const geo = { ramp: { x: o.x, w: o.w }, table: { x: o.x, y: o.y, w: o.w, h: 18 }, block: { x: o.x, y: o.y, w: clamp(o.w, 30, 220), h: clamp(o.h, 24, 180) },
      ball: { x: o.x, y: o.y, r: clamp(o.r, 14, 170) }, wheel: { x: o.x, y: o.y, r: clamp(o.r, 14, 170) }, particle: { x: o.x, y: o.y, r: 8 }, pulley: { x: o.x, y: o.y, r: 18 },
      string: { ends: o.ends } }[o.kind] || {};
    const s = make(o.kind, geo);
    if (o.mass) s.props.mass = o.mass;
    if (o.hanging) s.hanging = true;
    if (o.kind === 'ramp'){ s.x = clamp(s.x, 10, W - 140); s.w = clamp(s.w, 120, W - s.x - 10); st.theta = clamp(o.theta, 5, maxTheta(s)); }
    st.shapes.push(s); st.sel = s.id;
    if (s.kind === 'pulley') snapPulley(s); else snap(s, SNAP * 2.2); // freehand bodies land a little further off
    snapAll(); render(); onChange(); return s;
  }
  const scene = () => ({ unit: unit(), floorY: FLOOR,
    bodies: st.shapes.filter(isBody).map(b => ({ id: b.id, kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h, r: b.r, mass: b.props.mass })),
    pulleys: byKind('pulley').map(p => ({ id: p.id, x: p.x, y: p.y, r: p.r || 18 })),
    corners: [...byKind('table').map(t => ({ x: t.x + t.w, y: t.y })), ...byKind('ramp').map(rampTop)] });
  function readStroke(points, client){ onStroke(recognize(points, scene()), client, place); }

  // ---- drawing
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
  const label = (x, y, txt, cls = 'blabel', parent = svg) => { const t = el('text', { x, y, class: cls, 'text-anchor': 'middle' }, parent); t.textContent = txt; return t; };
  const propLabel = (x, y, s, prop, parent) => { const t = label(x, y, nameOf(s.props[prop], prop), 'blabel prop', parent); t.dataset.prop = prop; t.dataset.shape = s.id; return t; };
  const centre = (b) => ({ x: b.x, y: b.y });
  // the centre of mass: a point the student can move inside the body (forces start there)
  const comOf = (s) => ({ x: s.x + (s.com ? s.com.dx : 0), y: s.y + (s.com ? s.com.dy : 0) });
  const handle = (parent, x, y, kind, id, cursor) => el('rect', { x: x - 7, y: y - 7, width: 14, height: 14, class: 'bhandle', 'data-handle': kind, 'data-hid': id, style: `cursor:${cursor}` }, parent);

  function render(){
    svg.innerHTML = '';
    svg.dataset.tool = st.tool;
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'bbg' });
    const setup = el('g', { class: 'setup' + (st.mode === 'forces' ? ' faded' : '') });
    const selOn = st.mode === 'setup';
    for (const s of st.shapes){
      const g = el('g', { class: 'shape' + (st.sel === s.id ? ' sel' : ''), 'data-id': s.id }, setup);
      const sel = selOn && st.sel === s.id;
      if (s.kind === 'floor'){ el('line', { x1: 0, y1: FLOOR, x2: W, y2: FLOOR, class: 'bsurf' }, g); el('rect', { x: 0, y: FLOOR - 6, width: W, height: 12, fill: 'transparent' }, g); }
      if (s.kind === 'ramp'){
        const t = rampTop(s);
        el('polygon', { points: `${s.x},${FLOOR} ${t.x},${FLOOR} ${t.x},${t.y}`, class: 'bramp' + (s.props.friction ? ' rough' : '') }, g);
        el('path', { d: `M ${s.x + 70} ${FLOOR} A 70 70 0 0 0 ${s.x + 70 * Math.cos(rad(st.theta))} ${FLOOR - 70 * Math.sin(rad(st.theta))}`, class: 'barc' }, g);
        propLabel(s.x + 112, FLOOR - 14, s, 'angle', g).setAttribute('fill', '#ffd166');
        if (st.mode === 'setup'){
          el('circle', { cx: t.x, cy: t.y, r: 10, class: 'bhandle', 'data-handle': 'angle', 'data-hid': s.id }, g);
          if (sel){ handle(g, t.x, FLOOR, 'width', s.id, 'ew-resize'); label(t.x - 4, FLOOR + 30, `${Math.round(st.theta)}°  ·  ${Math.round(s.w)} wide`, 'bhint', g); }
        }
      }
      if (s.kind === 'table'){
        el('rect', { x: s.x, y: s.y, width: s.w, height: s.h, class: 'bramp' + (s.props.friction ? ' rough' : '') }, g); el('line', { x1: s.x + 20, y1: s.y + s.h, x2: s.x + 20, y2: FLOOR, class: 'bleg' }, g); el('line', { x1: s.x + s.w - 20, y1: s.y + s.h, x2: s.x + s.w - 20, y2: FLOOR, class: 'bleg' }, g);
        if (sel) handle(g, s.x + s.w, s.y + s.h / 2, 'twidth', s.id, 'ew-resize');
      }
      if (s.kind === 'block'){
        const a = -(s.tilt || 0);
        const bg = el('g', { transform: `rotate(${a} ${s.x} ${s.y})` }, g);
        el('rect', { x: s.x - s.w / 2, y: s.y - s.h / 2, width: s.w, height: s.h, class: 'bbody' }, bg);
        if (sel) handle(bg, s.x + s.w / 2, s.y - s.h / 2, 'size', s.id, 'nesw-resize');
        propLabel(s.x, s.y + 7, s, 'mass', g);
      }
      if (s.kind === 'ball' || s.kind === 'wheel'){
        el('circle', { cx: s.x, cy: s.y, r: s.r, class: 'bbody round' }, g);
        el('line', { x1: s.x, y1: s.y, x2: s.x + s.r, y2: s.y, class: 'bspoke' }, g);
        propLabel(s.x, s.y - 8, s, s.props.mass ? 'mass' : 'radius', g);
        if (s.props.mass && s.props.radius) propLabel(s.x + s.r / 2, s.y + 18, s, 'radius', g);
        if (sel) handle(g, s.x + s.r * 0.7071, s.y - s.r * 0.7071, 'radius', s.id, 'nesw-resize');
      }
      if (s.kind === 'particle'){ el('circle', { cx: s.x, cy: s.y, r: s.r, class: 'bbody bdot' }, g); propLabel(s.x, s.y - 16, s, 'mass', g); }
      if (s.kind === 'rod'){
        const P = rodPoint(s, s.pinU ?? 0.5), rg = el('g', { transform: `rotate(${-(s.ang || 0)} ${P.x} ${P.y})` }, g), x0 = P.x - (s.pinU ?? 0.5) * s.w;
        el('rect', { x: x0, y: s.y - s.h / 2, width: s.w, height: s.h, class: 'bbody' }, rg);
        if (sel && !s.ang) handle(rg, x0 + s.w, s.y, 'len', s.id, 'ew-resize');
        if (s.props.length) propLabel(s.x, s.y - s.h / 2 - 10, s, 'length', g);
        if (s.props.mass && torque()) propLabel(s.x + 60, s.y - s.h / 2 - 10, s, 'mass', g);
      }
      if (s.kind === 'spring'){
        const n = 8, x0 = s.x - s.w / 2, step = s.w / (n + 2);
        const pts = [`${x0},${s.y}`, `${x0 + step},${s.y}`, ...Array.from({ length: n }, (_, i) => `${x0 + step * (1.5 + i)},${s.y + (i % 2 ? 12 : -12)}`), `${x0 + step * (n + 1)},${s.y}`, `${x0 + s.w},${s.y}`];
        el('polyline', { points: pts.join(' '), class: 'bspring' }, g); el('rect', { x: x0, y: s.y - 14, width: s.w, height: 28, fill: 'transparent' }, g);
        if (sel) handle(g, s.x + s.w / 2, s.y, 'len', s.id, 'ew-resize');
      }
      if (s.kind === 'pivot'){ const t = pivotTop(s); el('polygon', { points: `${t.x},${t.y} ${s.x - 16},${s.y + 6} ${s.x + 16},${s.y + 6}`, class: 'bpivot' }, g); el('circle', { cx: t.x, cy: t.y, r: 5, class: 'bpivotdot' }, g); }
      if (s.kind === 'pulley'){ el('circle', { cx: s.x, cy: s.y, r: s.r || 18, class: 'bpulley' }, g); }
      if (s.kind === 'string' && s.ends && s.ends.length > 1){
        const pts = s.ends.map(id => shape(id)).filter(Boolean);
        el('polyline', { points: pts.map((p, i) => { const q = attach(p, pts[i + 1] || pts[i - 1]); return `${q.x},${q.y}`; }).join(' '), class: 'bstring' }, g);
      }
    }
    // contact markers
    for (const c of contacts()){ const b = shape(c.bodyId); el('circle', { cx: b.x, cy: b.y + (b.kind === 'block' ? b.h / 2 : b.r), r: 4, class: 'bcontact' }, setup); }
    if (st.mode === 'setup'){ renderVectors(); renderSpins(); }
    if (st.mode === 'forces') renderForces();
    if (st.stroke) el('polyline', { points: st.stroke.map(p => `${p.x},${p.y}`).join(' '), class: 'bstroke' });
    afterRender(svg);
  }
  // arrows
  const L = 105;
  function arrowEl(parent, x1, y1, ux, uy, color, cls, lab, len = L, tip = null){
    const x2 = x1 + ux * len, y2 = y1 + uy * len, a = Math.atan2(uy, ux);
    el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 4, class: 'farrow' }, parent);
    el('polygon', { points: `${x2},${y2} ${x2 - 14 * Math.cos(a - 0.4)},${y2 - 14 * Math.sin(a - 0.4)} ${x2 - 14 * Math.cos(a + 0.4)},${y2 - 14 * Math.sin(a + 0.4)}`, fill: color }, parent);
    if (lab){ const t = el('text', { x: x2 + ux * 22, y: y2 + uy * 22 + 7, class: 'flabel', 'text-anchor': 'middle', fill: color }, parent); t.textContent = lab; }
    // a wide, invisible hit area that starts away from the centre, so a new arrow can always start at the body
    if (cls) el('line', { x1: x1 + ux * 30, y1: y1 + uy * 30, x2, y2, stroke: 'transparent', 'stroke-width': 18, class: cls }, parent);
    // the tip: a small square to grab and turn
    if (tip) el('rect', { x: x2 - 6, y: y2 - 6, width: 12, height: 12, class: 'btip', ...tip }, parent);
  }
  // the unit vector a direction key names on this body
  const dirVec = (b, key) => dirsFor(b).find(d => d.key === key);
  // nearest named direction to (vx, vy), if it is within SNAP_DEG
  function snapDir(b, vx, vy, keys = null){
    const len = Math.hypot(vx, vy); if (!len) return { key: null, x: 1, y: 0 };
    const ux = vx / len, uy = vy / len;
    const best = dirsFor(b).filter(d => !keys || keys.includes(d.key)).map(d => ({ d, dot: d.x * ux + d.y * uy })).sort((p, q) => q.dot - p.dot)[0];
    if (best && best.dot >= Math.cos(rad(SNAP_DEG))) return { key: best.d.key, x: best.d.x, y: best.d.y };
    return { key: null, x: ux, y: uy };
  }
  function renderVectors(){
    const layer = el('g', { class: 'vectors' });
    for (const s of st.shapes.filter(isBody)){
      const c = centre(s);
      for (const k of ['v', 'a']){
        let v = s[k]; if (st.turn && st.turn.vec === k && st.turn.id === s.id) v = st.turn.to; if (!v) continue;
        const g = el('g', { 'data-vec': `${s.id}:${k}` }, layer);
        arrowEl(g, c.x, c.y, v.x, v.y, VECS[k].color, 'vhit', k, v.len, { 'data-vtip': `${s.id}:${k}`, fill: VECS[k].color });
      }
    }
  }
  // ω and α: curved arrows three-quarters round the body; the wheel's "a point" button and the point's vectors
  function renderSpins(){
    const layer = el('g', { class: 'spins' });
    for (const s of st.shapes.filter(spins)){
      for (const [k, d] of Object.entries(SPINS)){
        if (!s[k]) continue;
        const R = s.r + d.gap, cw = !s[k].ccw, end = { x: s.x + (cw ? R : -R), y: s.y };
        const g = el('g', { 'data-spin': `${s.id}:${k}`, class: 'bspin' }, layer);
        el('path', { d: `M ${s.x} ${s.y + R} A ${R} ${R} 0 1 ${cw ? 1 : 0} ${end.x} ${end.y}`, fill: 'none', stroke: d.color, 'stroke-width': 4 }, g);
        el('polygon', { points: `${end.x},${end.y + 14} ${end.x - 8},${end.y} ${end.x + 8},${end.y}`, fill: d.color }, g);
        el('path', { d: `M ${s.x} ${s.y + R} A ${R} ${R} 0 1 ${cw ? 1 : 0} ${end.x} ${end.y}`, fill: 'none', stroke: 'transparent', 'stroke-width': 16 }, g);
        label(s.x + (cw ? -1 : 1) * R * 0.75, s.y - R * 0.75 - 6, `${d.sym}${cw ? ' ↻' : ' ↺'}`, 'flabel', g).setAttribute('fill', d.color);
      }
      const txt = wheelButton(s);
      if (txt){
        // below the wheel, clear of the spin arrows (which start at its lowest point)
        const bx = clamp(s.x - 80, 4, W - 164), by = clamp(s.y + s.r + 44, 4, H - 32), b = el('g', { class: 'wbtn', 'data-wheelbtn': s.id }, layer);
        el('rect', { x: bx, y: by, width: 160, height: 28 }, b); label(bx + 80, by + 20, txt, 'wbtxt', b);
      }
      const vs = pointVectors(s);
      if (vs){
        const P = { x: s.x, y: s.y - s.r }, g = el('g', { class: 'ptvecs' }, layer);
        for (const v of vs){ const vg = el('g', { 'data-pvec': v.key, 'data-ux': v.x.toFixed(3), 'data-uy': v.y.toFixed(3) }, g); arrowEl(vg, P.x, P.y, v.x, v.y, v.color, null, v.label, v.len); }
        el('circle', { cx: P.x, cy: P.y, r: 6, class: 'fdot' }, g); label(P.x - 14, P.y - 10, 'P', 'blabel', g);
      }
    }
  }
  function renderForces(){
    const layer = el('g', { class: 'forces' });
    for (const b of bodies()){
      const s = shape(b.id), c = comOf(s), dirs = dirsFor(b), fs = forcesFor(b), ax = axisFor(b);
      // the axis for torques, and a dashed lever arm from it to every point where a force acts
      if (ax){
        const A = ax.centre || s.kind !== 'rod' ? { x: s.x, y: s.y } : rodPoint(s, ax.u), lg = el('g', { class: 'levers' }, layer);
        const seen = new Set();
        for (const f of fs){
          const P = forceStart(s, f), key = `${Math.round(P.x)},${Math.round(P.y)}`;
          if (seen.has(key) || Math.hypot(P.x - A.x, P.y - A.y) < 6) continue; seen.add(key);
          el('line', { x1: A.x, y1: A.y + 14, x2: P.x, y2: P.y + 14, class: 'blever' }, lg);
          label((A.x + P.x) / 2, (A.y + P.y) / 2 + 30, 'r', 'blabel lever', lg);
        }
        const m = el('g', { class: 'baxis', 'data-axis': b.id }, layer);
        el('circle', { cx: A.x, cy: A.y, r: 11 }, m); el('path', { d: `M ${A.x - 11} ${A.y} H ${A.x + 11} M ${A.x} ${A.y - 11} V ${A.y + 11}` }, m);
      }
      fs.forEach((f, i) => {
        let d = f.vec || dirs.find(q => q.key === f.dir);
        if (st.turn && st.turn.body === b.id && st.turn.i === i) d = st.turn.to;
        if (!d) return;
        const o = forceStart(s, f), g = el('g', { 'data-arrow': `${b.id}:${i}` }, layer);
        arrowEl(g, o.x, o.y, d.x, d.y, f.color, 'fhit', f.label, L, { 'data-ftip': `${b.id}:${i}`, fill: f.color });
        if (f.ptLabel) label(o.x, o.y + (s.kind === 'rod' ? 34 : 26), f.ptLabel, 'blabel prop', g);
      });
      if (st.preview && st.preview.body === b.id){ const d = st.preview.vec, o = st.preview.from || c; if (d) arrowEl(layer, o.x, o.y, d.x, d.y, st.preview.key ? '#ffffff' : '#ffd98a', 'fprev', st.preview.key ? '?' : `${Math.round(st.preview.deg)}°`); }
      if (s.kind === 'rod') continue; // a beam's forces start where they act, so no centre-of-mass marker to drag
      // the centre-of-mass marker: a quartered circle, drag it to move the point the forces act at
      const m = el('g', { class: 'com' + (st.sel === b.id ? ' sel' : ''), 'data-com': b.id }, layer);
      el('circle', { cx: c.x, cy: c.y, r: 9, class: 'fdot' + (st.sel === b.id ? ' sel' : '') }, m);
      el('path', { d: `M ${c.x} ${c.y} L ${c.x + 9} ${c.y} A 9 9 0 0 0 ${c.x} ${c.y - 9} Z M ${c.x} ${c.y} L ${c.x - 9} ${c.y} A 9 9 0 0 0 ${c.x} ${c.y + 9} Z`, class: 'comq' }, m);
    }
  }

  // ---- interaction
  let drag = null;
  // screen → drawing coordinates (works however the SVG is scaled or letterboxed)
  const pt = (e) => { const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return { x: p.x, y: p.y }; };
  const nearestBody = (p, max = 90) => {
    const b = st.shapes.filter(isBody).map(s => ({ s, d: s.kind === 'rod' ? rodU(s, p).d - (max - 60) : Math.hypot(p.x - s.x, p.y - s.y) - (s.r || Math.max(s.w, s.h) / 2) })).sort((a, c) => a.d - c.d)[0];
    return b && b.d <= max - 30 ? b.s : null;
  };
  const forceTool = () => st.tool === 'force' || st.tool.startsWith('f:');

  svg.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    const p0 = pt(e), t = e.target;
    // eraser: whatever is under the pointer goes
    if (st.tool === 'erase'){
      const ar = t.closest('[data-arrow]'), vc = t.closest('[data-vec]'), sp = t.closest('[data-spin]'), g = t.closest('[data-id]');
      if (sp){ checkpoint(); const [id, k] = sp.dataset.spin.split(':'); delete shape(id)[k]; render(); onChange(); return; }
      if (ar){ checkpoint(); const [bid, i] = ar.dataset.arrow.split(':'); onArrowErase(bid, +i); render(); return; }
      if (vc){ checkpoint(); const [id, k] = vc.dataset.vec.split(':'); delete shape(id)[k]; render(); onChange(); return; }
      if (g){ checkpoint(); st.sel = g.dataset.id; api.remove(true); }
      return;
    }
    if (st.mode === 'forces'){
      // the centre-of-mass marker, or the CoM tool: place / move the point the forces act at
      const cm = st.tool === 'com' && t.closest('[data-com]');
      if (st.tool === 'com'){
        const s = cm ? shape(cm.dataset.com) : nearestBody(p0); if (!s) return;
        checkpoint(); st.sel = s.id; drag = { com: s, start: p0 }; if (!cm) moveCom(s, p0);
        svg.setPointerCapture(e.pointerId); render(); onChange(); return;
      }
      if (st.tool === 'axis'){
        const s = nearestBody(p0); if (!s || !(s.kind === 'rod' || s.kind === 'wheel')) return;
        onAxisClick(s.id, s.kind === 'rod' ? rodU(s, p0).u : null); return;
      }
      const tip = t.dataset.ftip ? t.dataset.ftip : null, ar = t.closest('[data-arrow]');
      const nearCentre = st.shapes.filter(isBody).some(q => { const c = comOf(q); return q.kind !== 'rod' && Math.hypot(p0.x - c.x, p0.y - c.y) < 26; });
      if ((tip || ar) && !nearCentre){
        const [bid, i] = (tip || ar.dataset.arrow).split(':');
        drag = { turnForce: { body: bid, i: +i }, start: p0, moved: false, client: { x: e.clientX, y: e.clientY } };
        svg.setPointerCapture(e.pointerId); return;
      }
      // start a new arrow at the body nearest the pointer
      const s = nearestBody(p0); if (!s) return;
      const u = s.kind === 'rod' ? rodU(s, p0).u : null;
      st.sel = s.id; drag = { arrow: bodyOf(s.id), u, from: u === null ? null : rodPoint(s, u) }; svg.setPointerCapture(e.pointerId); render(); onChange(); return;
    }
    // setup mode
    const wb = t.closest('[data-wheelbtn]');
    if (wb){ onWheelButton(wb.dataset.wheelbtn); return; }
    if (st.tool === 'pen'){ drag = { stroke: true, client: { x: e.clientX, y: e.clientY } }; st.stroke = [p0]; st.sel = null; svg.setPointerCapture(e.pointerId); render(); return; }
    if (st.tool in SPINS){
      // click a wheel or ball: a counterclockwise arrow; click again to turn it clockwise
      const s = st.shapes.filter(spins).find(q => Math.hypot(p0.x - q.x, p0.y - q.y) <= q.r + 40); if (!s) return;
      checkpoint(); s[st.tool] = { ccw: s[st.tool] ? !s[st.tool].ccw : true }; st.sel = s.id; render(); onChange(); return;
    }
    if (t.dataset && t.dataset.prop && st.tool === 'select'){ onPropClick(t.dataset.shape, t.dataset.prop); return; }
    const vt = t.dataset && t.dataset.vtip, vc = t.closest('[data-vec]');
    if (vt || (vc && st.tool === 'select')){
      const [id, k] = (vt || vc.dataset.vec).split(':'); checkpoint();
      drag = { vec: k, s: shape(id) }; st.sel = id; svg.setPointerCapture(e.pointerId); render(); return;
    }
    if (st.tool === 'vel' || st.tool === 'acc'){
      const s = nearestBody(p0); if (!s) return;
      checkpoint(); drag = { vec: st.tool === 'vel' ? 'v' : 'a', s, fresh: true }; st.sel = s.id;
      svg.setPointerCapture(e.pointerId); render(); return;
    }
    const g = t.closest('[data-id]'); if (!g){ st.sel = null; render(); onChange(); return; }
    const s = shape(g.dataset.id); st.sel = s.id; checkpoint();
    drag = { s, handle: t.dataset.handle, start: p0, ox: s.x, oy: s.y, ow: s.w, oh: s.h, or: s.r };
    svg.setPointerCapture(e.pointerId); render(); onChange();
  });
  function moveCom(s, p){
    const lim = s.kind === 'block' ? Math.min(s.w, s.h) / 2 - 4 : (s.r || 20) - 4;
    let dx = p.x - s.x, dy = p.y - s.y; const d = Math.hypot(dx, dy);
    if (d < 5){ dx = 0; dy = 0; } else if (d > lim){ dx *= lim / d; dy *= lim / d; }
    s.com = { dx, dy };
  }
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pt(e);
    if (drag.stroke){ const q = st.stroke[st.stroke.length - 1]; if (Math.hypot(p.x - q.x, p.y - q.y) > 2){ st.stroke.push(p); render(); } return; }
    if (drag.com){ moveCom(drag.com, p); render(); return; }
    if (drag.turnForce){
      if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 5) return;
      drag.moved = true;
      const b = bodyOf(drag.turnForce.body), c = forceStart(shape(b.id), forcesFor(b)[drag.turnForce.i]), d = snapDir(b, p.x - c.x, p.y - c.y);
      st.turn = { ...drag.turnForce, to: d, key: d.key }; render(); return;
    }
    if (drag.arrow){
      const s = shape(drag.arrow.id), c = drag.from || comOf(s), vx = p.x - c.x, vy = p.y - c.y;
      if (Math.hypot(vx, vy) < 20){ st.preview = null; render(); return; }
      const d = snapDir(drag.arrow, vx, vy);
      st.preview = { body: drag.arrow.id, key: d.key, vec: { x: d.x, y: d.y }, from: drag.from, deg: (deg(Math.atan2(-d.y, d.x)) + 360) % 360 }; render(); return;
    }
    if (drag.vec){
      const s = drag.s, vx = p.x - s.x, vy = p.y - s.y, len = Math.hypot(vx, vy);
      if (len < 18) return;
      const b = bodyOf(s.id), d = snapDir(b, vx, vy);
      s[drag.vec] = { x: d.x, y: d.y, len: clamp(len, 50, 220), key: d.key }; render(); return;
    }
    const s = drag.s;
    if (drag.handle === 'angle'){ st.theta = clamp(deg(Math.atan2(FLOOR - p.y, s.w)), 5, maxTheta(s)); }
    else if (drag.handle === 'width'){ s.w = clamp(p.x - s.x, 120, W - s.x - 10); st.theta = Math.min(st.theta, maxTheta(s)); }
    else if (drag.handle === 'twidth'){ s.w = clamp(p.x - s.x, 80, W - s.x - 10); }
    else if (drag.handle === 'size'){
      const a = rad(s.tilt || 0), dx = p.x - s.x, dy = p.y - s.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      s.w = clamp(2 * Math.abs(lx), 30, 220); s.h = clamp(2 * Math.abs(ly), 24, 180); s.com = null;
    }
    else if (drag.handle === 'len'){ s.w = clamp(2 * Math.abs(p.x - s.x), 40, 600); }
    else if (drag.handle === 'radius'){ s.r = clamp(Math.hypot(p.x - s.x, p.y - s.y), 14, 170); s.com = null; }
    else if (s.kind !== 'floor'){ s.x = drag.ox + p.x - drag.start.x; s.y = drag.oy + p.y - drag.start.y; s.on = null; }
    snapAll(); render();
  });
  svg.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.stroke){ const pts = st.stroke; st.stroke = null; render(); readStroke(pts, d.client); return; }
    if (d.com){ render(); onChange(); return; }
    if (d.turnForce){
      const tn = st.turn; st.turn = null;
      if (!d.moved){ render(); onArrowClick(d.turnForce.body, d.turnForce.i, d.client); return; }
      checkpoint(); render(); if (tn) onArrowTurn(tn.body, tn.i, tn.key, { x: tn.to.x, y: tn.to.y }); return;
    }
    if (d.arrow){ const pv = st.preview; st.preview = null; render(); if (pv){ checkpoint(); onArrow(pv.body, pv.key, { x: e.clientX, y: e.clientY }, st.tool.startsWith('f:') ? st.tool.slice(2) : null, pv.vec, d.u); } return; }
    if (d.vec){ const v = d.s[d.vec]; render(); onChange(); if (v) onVector(d.s.id, d.vec, v.key); return; }
    snapAll(); render(); onChange();
  });

  const api = {
    add: (kind) => addFromTool(kind),
    template, contacts, strings, bodies, touching, render, undo, checkpoint, place, scene,
    // read a stroke (drawing coordinates) as if it had been drawn with the pen
    stroke: (points, client = { x: 0, y: 0 }) => readStroke(points, client),
    // a drawing point on screen (for tests and popovers)
    toScreen: (x, y) => { const q = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()); return { x: q.x, y: q.y }; },
    snap: () => { snapAll(); render(); onChange(); },
    setMode: (m) => { st.mode = m; st.preview = null; st.turn = null; st.stroke = null; if (m === 'forces' && !(forceTool() || st.tool === 'com' || st.tool === 'erase' || st.tool === 'axis')) st.tool = 'force'; if (m === 'setup' && (forceTool() || st.tool === 'com' || st.tool === 'axis')) st.tool = 'select'; render(); },
    get mode(){ return st.mode; },
    get tool(){ return st.tool; }, set tool(t){ st.tool = t; render(); },
    // where a shape's centre is on screen (for tests and popovers)
    screenOf: (id) => { const s = shape(id); return api.toScreen(s.x, s.y); },
    selected: () => st.shapes.find(s => s.id === st.sel) || null,
    remove: (skipCheckpoint) => { if (!skipCheckpoint) checkpoint(); const gone = st.sel; st.shapes = st.shapes.filter(s => s.id !== gone); st.shapes.forEach(s => { if (s.ends) s.ends = s.ends.filter(id => id !== gone); }); st.sel = null; snapAll(); render(); onChange(); },
    setProp: (key, v) => { const s = api.selected(); if (s){ checkpoint(); s.props[key] = v; render(); onChange(); } },
    setSize: (key, v) => { const s = api.selected(); if (!s) return; checkpoint(); s[key] = v; if (s.kind === 'ramp') st.theta = Math.min(st.theta, maxTheta(s)); snapAll(); render(); onChange(); },
    // turn a body's velocity or acceleration arrow to a named direction (keeps its length)
    // tilt a rod about its pin (degrees, + counterclockwise): the picture follows the beam's tilt in the free-body diagram
    setTilt: (id, a) => { const s = shape(id); if (s && s.kind === 'rod' && (s.ang || 0) !== a){ s.ang = a; render(); } },
    // a point a fraction u along a rod, on screen (for tests)
    rodScreen: (id, u) => { const q = rodPoint(shape(id), u); return api.toScreen(q.x, q.y); },
    rodAt: (id, u) => rodPoint(shape(id), u),
    // drawing-first tools (js/tools.js): add a shape of any kind, redraw after editing one, find a shape
    addRaw: (kind, o) => { checkpoint(); const s = make(kind, o); st.shapes.push(s); return s; },
    touch: () => { render(); onChange(); },
    shape,
    setVec: (id, k, key) => { const s = shape(id), b = bodyOf(id), d = b && dirVec(b, key); if (!s || !d || !s[k]) return; s[k] = { ...s[k], x: d.x, y: d.y, key }; render(); },
    get theta(){ return st.theta; }, set theta(v){ st.theta = v; snapAll(); render(); },
    get shapes(){ return st.shapes; },
    get canUndo(){ return hist.length > 0; },
    clear: () => { checkpoint(); st.shapes = []; st.sel = null; render(); onChange(); },
    KINDS,
  };
  render();
  return api;
}
