// Rotation Lab — the build canvas: shapes that snap together, each with named properties.
// The student builds the setup (or loads a template); contacts found here drive the free-body checker.
// SVG, no dependencies. Coordinates are in a 880 × 520 viewBox; the floor is at y = FLOOR.

const W = 880, H = 520, FLOOR = 470, SNAP = 36;
const NS = 'http://www.w3.org/2000/svg';
const deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180;

// default named properties per shape: the symbol each property is tied to
const KINDS = {
  floor:  { label: 'Floor', props: { friction: false } },
  ramp:   { label: 'Ramp', props: { angle: 'inc', friction: false } },
  table:  { label: 'Table', props: { friction: false } },
  block:  { label: 'Block', props: { mass: 'm' }, body: true },
  ball:   { label: 'Ball', props: { mass: 'm', radius: 'r' }, body: true },
  wheel:  { label: 'Wheel', props: { radius: 'r' }, body: true },
  pulley: { label: 'Pulley', props: {} },
  string: { label: 'String', props: {} },
};
export const PALETTE = ['ramp', 'block', 'ball', 'wheel', 'pulley', 'string', 'floor', 'table'];

// Options: onChange(); nameOf(id) → label text; and for the free-body layer (mode 'forces'):
//   dirsFor(body) → [{ key, x, y }] unit vectors in drawing coordinates (y down) the arrows snap to
//   forcesFor(body) → [{ dir, label, color }]; onArrow(bodyId, dirKey, clientXY); onArrowClick(bodyId, i, clientXY)
//   onPropClick(shapeId, prop) when a property label (mass, angle) is clicked in setup mode
export function createBuild(svg, { onChange = () => {}, nameOf = (id) => id, dirsFor = () => [], forcesFor = () => [], onArrow = () => {}, onArrowClick = () => {}, onPropClick = () => {} } = {}){
  const st = { shapes: [], sel: null, seq: 0, theta: 30, mode: 'setup', preview: null };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const add = (kind, o = {}) => { const s = { id: kind + (++st.seq), kind, x: 200, y: 200, w: 70, h: 46, r: 30, props: { ...KINDS[kind].props }, ...o }; st.shapes.push(s); snapAll(); render(); onChange(); return s; };
  const byKind = (k) => st.shapes.filter(s => s.kind === k);

  // ramp geometry: low end at (x, FLOOR), rising to the right over width w at angle θ
  const rampTop = (r) => ({ x: r.x + r.w, y: FLOOR - r.w * Math.tan(rad(st.theta)) });
  const surfaces = () => {
    const out = [];
    for (const r of byKind('ramp')){ const t = rampTop(r); out.push({ shape: r, x1: r.x, y1: FLOOR, x2: t.x, y2: t.y, angle: st.theta }); }
    for (const t of byKind('table')) out.push({ shape: t, x1: t.x, y1: t.y, x2: t.x + t.w, y2: t.y, angle: 0 });
    for (const f of byKind('floor')) out.push({ shape: f, x1: 0, y1: FLOOR, x2: W, y2: FLOOR, angle: 0 });
    return out;
  };
  // put a body on the nearest surface if it was dropped close to it
  function snap(b){
    if (!KINDS[b.kind].body) return;
    b.on = null;
    let best = null, bd = SNAP;
    for (const s of surfaces()){
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const u = Math.max(0, Math.min(L, (b.x - s.x1) * ux + (b.y - s.y1) * uy));
      const px = s.x1 + ux * u, py = s.y1 + uy * u;
      const lift = b.kind === 'block' ? b.h / 2 : b.r; // centre sits this far above the surface
      const nx = uy, ny = -ux; // outward normal (up for floors, up-left for the ramp)
      const cx = px + (ny < 0 ? nx : -nx) * lift, cy = py + (ny < 0 ? ny : -ny) * lift;
      const d = Math.hypot(b.x - cx, b.y - cy);
      if (d < bd && u > 4 && u < L - 4){ bd = d; best = { s, cx, cy }; }
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
    for (const b of st.shapes) if (b.on){ const s = st.shapes.find(x => x.id === b.on); out.push({ body: b.kind, bodyId: b.id, surface: s.kind, surfaceId: s.id, friction: !!s.props.friction, angle: b.tilt || 0 }); }
    return out;
  }
  function strings(){
    return byKind('string').map(s => ({ id: s.id, ends: s.ends || [] }));
  }
  const bodies = () => st.shapes.filter(s => KINDS[s.kind].body).map(b => ({ id: b.id, kind: b.kind, mass: b.props.mass, on: b.on, hanging: !!b.hanging, x: b.x, frame: b.hanging ? 'hanging' : b.on ? (st.shapes.find(x => x.id === b.on).kind === 'ramp' ? 'slope' : 'flat') : 'free' }));

  // ---- templates: the three existing diagrams
  function template(name){
    st.shapes = []; st.seq = 0; st.sel = null;
    if (name === 'incline'){
      add('floor'); const r = add('ramp', { x: 150, w: 560 });
      const t = rampTop(r); add('block', { x: (r.x + t.x) / 2 + 40, y: (FLOOR + t.y) / 2 - 40 });
    } else if (name === 'pulley'){
      add('floor'); const t = add('table', { x: 60, y: 260, w: 520, h: 18 });
      const b1 = add('block', { x: 300, y: 230, props: { mass: 'm1' } });
      const p = add('pulley', { x: 600, y: 250, r: 18 });
      const b2 = add('block', { x: 614, y: 380, hanging: true, props: { mass: 'm2' } });
      add('string', { ends: [b1.id, p.id, b2.id] });
    } else if (name === 'blocks'){
      add('floor');
      const a = add('block', { x: 330, y: 440, w: 90, h: 62, props: { mass: 'mA' } });
      add('block', { x: 330 + 45 + 35, y: 445, w: 70, h: 50, props: { mass: 'mB' } });
    } else if (name === 'wheel'){
      add('wheel', { x: 440, y: 260, r: 120 });
    }
    snapAll(); render(); onChange();
  }

  // ---- drawing
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
  const label = (x, y, txt, cls = 'blabel', parent = svg) => { const t = el('text', { x, y, class: cls, 'text-anchor': 'middle' }, parent); t.textContent = txt; return t; };
  const propLabel = (x, y, s, prop, parent) => { const t = label(x, y, nameOf(s.props[prop], prop), 'blabel prop', parent); t.dataset.prop = prop; t.dataset.shape = s.id; return t; };
  const centre = (b) => ({ x: b.x, y: b.y });
  function render(){
    svg.innerHTML = '';
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'bbg' });
    const setup = el('g', { class: 'setup' + (st.mode === 'forces' ? ' faded' : '') });
    for (const s of st.shapes){
      const g = el('g', { class: 'shape' + (st.sel === s.id ? ' sel' : ''), 'data-id': s.id }, setup);
      if (s.kind === 'floor'){ el('line', { x1: 0, y1: FLOOR, x2: W, y2: FLOOR, class: 'bsurf' }, g); }
      if (s.kind === 'ramp'){
        const t = rampTop(s);
        el('polygon', { points: `${s.x},${FLOOR} ${t.x},${FLOOR} ${t.x},${t.y}`, class: 'bramp' + (s.props.friction ? ' rough' : '') }, g);
        el('path', { d: `M ${s.x + 70} ${FLOOR} A 70 70 0 0 0 ${s.x + 70 * Math.cos(rad(st.theta))} ${FLOOR - 70 * Math.sin(rad(st.theta))}`, class: 'barc' }, g);
        propLabel(s.x + 112, FLOOR - 14, s, 'angle', g).setAttribute('fill', '#ffd166');
        el('circle', { cx: t.x, cy: t.y, r: 10, class: 'bhandle', 'data-handle': 'angle' }, g);
      }
      if (s.kind === 'table'){ el('rect', { x: s.x, y: s.y, width: s.w, height: s.h, class: 'bramp' + (s.props.friction ? ' rough' : '') }, g); el('line', { x1: s.x + 20, y1: s.y + s.h, x2: s.x + 20, y2: FLOOR, class: 'bleg' }, g); el('line', { x1: s.x + s.w - 20, y1: s.y + s.h, x2: s.x + s.w - 20, y2: FLOOR, class: 'bleg' }, g); }
      if (s.kind === 'block'){
        const a = -(s.tilt || 0);
        el('rect', { x: s.x - s.w / 2, y: s.y - s.h / 2, width: s.w, height: s.h, class: 'bbody', transform: `rotate(${a} ${s.x} ${s.y})` }, g);
        propLabel(s.x, s.y + 7, s, 'mass', g);
      }
      if (s.kind === 'ball' || s.kind === 'wheel'){
        el('circle', { cx: s.x, cy: s.y, r: s.r, class: 'bbody round' }, g);
        el('line', { x1: s.x, y1: s.y, x2: s.x + s.r, y2: s.y, class: 'bspoke' }, g);
        propLabel(s.x, s.y - 8, s, s.props.mass ? 'mass' : 'radius', g);
      }
      if (s.kind === 'pulley'){ el('circle', { cx: s.x, cy: s.y, r: s.r || 18, class: 'bpulley' }, g); }
      if (s.kind === 'string' && s.ends && s.ends.length > 1){
        const pts = s.ends.map(id => st.shapes.find(x => x.id === id)).filter(Boolean);
        el('polyline', { points: pts.map(p => p.kind === 'pulley' ? `${p.x},${p.y - (p.r || 18)}` : `${p.x},${p.y}`).join(' '), class: 'bstring' }, g);
      }
    }
    // contact markers
    for (const c of contacts()){ const b = st.shapes.find(x => x.id === c.bodyId); el('circle', { cx: b.x, cy: b.y + (b.kind === 'block' ? b.h / 2 : b.r), r: 4, class: 'bcontact' }, setup); }
    if (st.mode === 'forces') renderForces();
  }
  // the free-body layer: each body's forces as arrows from its centre, over the faded setup
  const L = 105;
  function arrowEl(parent, x1, y1, ux, uy, color, cls, lab){
    const x2 = x1 + ux * L, y2 = y1 + uy * L, a = Math.atan2(uy, ux);
    el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 4, class: 'farrow' }, parent);
    el('polygon', { points: `${x2},${y2} ${x2 - 14 * Math.cos(a - 0.4)},${y2 - 14 * Math.sin(a - 0.4)} ${x2 - 14 * Math.cos(a + 0.4)},${y2 - 14 * Math.sin(a + 0.4)}`, fill: color }, parent);
    if (lab){ const t = el('text', { x: x2 + ux * 22, y: y2 + uy * 22 + 7, class: 'flabel', 'text-anchor': 'middle', fill: color }, parent); t.textContent = lab; }
    // a wide, invisible hit area that starts away from the centre, so a new arrow can always start at the body
    el('line', { x1: x1 + ux * 30, y1: y1 + uy * 30, x2, y2, stroke: 'transparent', 'stroke-width': 18, class: cls }, parent);
  }
  function renderForces(){
    const layer = el('g', { class: 'forces' });
    for (const b of bodies()){
      const s = st.shapes.find(x => x.id === b.id), c = centre(s), dirs = dirsFor(b);
      el('circle', { cx: c.x, cy: c.y, r: 7, class: 'fdot' + (st.sel === b.id ? ' sel' : '') }, layer);
      forcesFor(b).forEach((f, i) => {
        const d = dirs.find(q => q.key === f.dir); if (!d) return;
        const g = el('g', { 'data-arrow': `${b.id}:${i}` }, layer);
        arrowEl(g, c.x, c.y, d.x, d.y, f.color, 'fhit', f.label);
      });
      if (st.preview && st.preview.body === b.id){ const d = dirs.find(q => q.key === st.preview.dir); if (d) arrowEl(layer, c.x, c.y, d.x, d.y, '#ffffff', 'fprev', '?'); }
    }
  }

  // ---- interaction: drag shapes, drag the ramp's angle handle
  let drag = null;
  // screen → drawing coordinates (works however the SVG is scaled or letterboxed)
  const pt = (e) => { const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return { x: p.x, y: p.y }; };
  svg.addEventListener('pointerdown', (e) => {
    if (st.mode === 'forces'){
      const ar = e.target.closest('[data-arrow]'), p0 = pt(e);
      const nearCentre = bodies().some(x => { const q = st.shapes.find(r => r.id === x.id); return Math.hypot(p0.x - q.x, p0.y - q.y) < 26; });
      if (ar && !nearCentre){ const [bid, i] = ar.dataset.arrow.split(':'); onArrowClick(bid, +i, { x: e.clientX, y: e.clientY }); return; }
      // start an arrow at the body nearest the pointer
      const p = pt(e), b = bodies().map(x => ({ x, s: st.shapes.find(q => q.id === x.id) })).sort((a, c) => Math.hypot(p.x - a.s.x, p.y - a.s.y) - Math.hypot(p.x - c.s.x, p.y - c.s.y))[0];
      if (!b || Math.hypot(p.x - b.s.x, p.y - b.s.y) > 90) return;
      st.sel = b.x.id; drag = { arrow: b.x }; svg.setPointerCapture(e.pointerId); render(); onChange(); return;
    }
    if (e.target.dataset && e.target.dataset.prop && !e.button){ onPropClick(e.target.dataset.shape, e.target.dataset.prop); return; }
    const g = e.target.closest('[data-id]'); if (!g) { st.sel = null; render(); onChange(); return; }
    const s = st.shapes.find(x => x.id === g.dataset.id); st.sel = s.id;
    drag = { s, handle: e.target.dataset.handle, start: pt(e), ox: s.x, oy: s.y };
    svg.setPointerCapture(e.pointerId); render(); onChange();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.arrow){
      const p = pt(e), s = st.shapes.find(q => q.id === drag.arrow.id), vx = p.x - s.x, vy = p.y - s.y, len = Math.hypot(vx, vy);
      if (len < 20){ st.preview = null; render(); return; }
      const best = dirsFor(drag.arrow).map(d => ({ d, dot: (d.x * vx + d.y * vy) / len })).sort((a, b) => b.dot - a.dot)[0];
      st.preview = best ? { body: drag.arrow.id, dir: best.d.key } : null; render(); return;
    }
    const p = pt(e), s = drag.s;
    if (drag.handle === 'angle'){ st.theta = Math.max(5, Math.min(75, deg(Math.atan2(FLOOR - p.y, s.w)))); }
    else if (s.kind !== 'floor'){ s.x = drag.ox + p.x - drag.start.x; s.y = drag.oy + p.y - drag.start.y; s.on = null; }
    snapAll(); render();
  });
  svg.addEventListener('pointerup', (e) => {
    if (drag && drag.arrow){ const pv = st.preview; drag = null; st.preview = null; render(); if (pv) onArrow(pv.body, pv.dir, { x: e.clientX, y: e.clientY }); return; }
    if (drag){ drag = null; snapAll(); render(); onChange(); }
  });

  const api = {
    add: (kind) => { const s = add(kind, { x: 120 + 60 * (st.seq % 8), y: 120 }); st.sel = s.id; if (kind === 'string'){ const bs = st.shapes.filter(x => KINDS[x.kind].body || x.kind === 'pulley'); s.ends = bs.slice(-3).map(x => x.id); } render(); onChange(); return s; },
    template, contacts, strings, bodies, touching, render,
    snap: () => { snapAll(); render(); onChange(); },
    setMode: (m) => { st.mode = m; st.preview = null; render(); },
    get mode(){ return st.mode; },
    // where a shape's centre is on screen (for tests and popovers)
    screenOf: (id) => { const s = st.shapes.find(x => x.id === id), m = svg.getScreenCTM(); const q = new DOMPoint(s.x, s.y).matrixTransform(m); return { x: q.x, y: q.y }; },
    selected: () => st.shapes.find(s => s.id === st.sel) || null,
    remove: () => { st.shapes = st.shapes.filter(s => s.id !== st.sel); st.sel = null; snapAll(); render(); onChange(); },
    setProp: (key, v) => { const s = api.selected(); if (s){ s.props[key] = v; render(); onChange(); } },
    get theta(){ return st.theta; }, set theta(v){ st.theta = v; snapAll(); render(); },
    get shapes(){ return st.shapes; },
    clear: () => { st.shapes = []; st.sel = null; render(); onChange(); },
    KINDS,
  };
  render();
  return api;
}
