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

export function createBuild(svg, { onChange = () => {}, nameOf = (id) => id } = {}){
  const st = { shapes: [], sel: null, seq: 0, theta: 30 };
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
  const label = (x, y, txt, cls = 'blabel') => { const t = el('text', { x, y, class: cls, 'text-anchor': 'middle' }); t.textContent = txt; return t; };
  function render(){
    svg.innerHTML = '';
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'bbg' });
    for (const s of st.shapes){
      const g = el('g', { class: 'shape' + (st.sel === s.id ? ' sel' : ''), 'data-id': s.id });
      if (s.kind === 'floor'){ el('line', { x1: 0, y1: FLOOR, x2: W, y2: FLOOR, class: 'bsurf' }, g); }
      if (s.kind === 'ramp'){
        const t = rampTop(s);
        el('polygon', { points: `${s.x},${FLOOR} ${t.x},${FLOOR} ${t.x},${t.y}`, class: 'bramp' + (s.props.friction ? ' rough' : '') }, g);
        el('path', { d: `M ${s.x + 70} ${FLOOR} A 70 70 0 0 0 ${s.x + 70 * Math.cos(rad(st.theta))} ${FLOOR - 70 * Math.sin(rad(st.theta))}`, class: 'barc' }, g);
        label(s.x + 100, FLOOR - 14, `${nameOf(s.props.angle)} = ${Math.round(st.theta)}°`).setAttribute('fill', '#ffe600');
        el('circle', { cx: t.x, cy: t.y, r: 10, class: 'bhandle', 'data-handle': 'angle' }, g);
      }
      if (s.kind === 'table'){ el('rect', { x: s.x, y: s.y, width: s.w, height: s.h, class: 'bramp' + (s.props.friction ? ' rough' : '') }, g); el('line', { x1: s.x + 20, y1: s.y + s.h, x2: s.x + 20, y2: FLOOR, class: 'bleg' }, g); el('line', { x1: s.x + s.w - 20, y1: s.y + s.h, x2: s.x + s.w - 20, y2: FLOOR, class: 'bleg' }, g); }
      if (s.kind === 'block'){
        const a = -(s.tilt || 0);
        el('rect', { x: s.x - s.w / 2, y: s.y - s.h / 2, width: s.w, height: s.h, class: 'bbody', transform: `rotate(${a} ${s.x} ${s.y})` }, g);
        label(s.x, s.y + 6, nameOf(s.props.mass));
      }
      if (s.kind === 'ball' || s.kind === 'wheel'){
        el('circle', { cx: s.x, cy: s.y, r: s.r, class: 'bbody round' }, g);
        el('line', { x1: s.x, y1: s.y, x2: s.x + s.r, y2: s.y, class: 'bspoke' }, g);
        label(s.x, s.y - 8, s.props.mass ? nameOf(s.props.mass) : nameOf(s.props.radius));
      }
      if (s.kind === 'pulley'){ el('circle', { cx: s.x, cy: s.y, r: s.r || 18, class: 'bpulley' }, g); }
      if (s.kind === 'string' && s.ends && s.ends.length > 1){
        const pts = s.ends.map(id => st.shapes.find(x => x.id === id)).filter(Boolean);
        el('polyline', { points: pts.map(p => p.kind === 'pulley' ? `${p.x},${p.y - (p.r || 18)}` : `${p.x},${p.y}`).join(' '), class: 'bstring' }, g);
      }
    }
    // contact markers
    for (const c of contacts()){ const b = st.shapes.find(x => x.id === c.bodyId); el('circle', { cx: b.x, cy: b.y + (b.kind === 'block' ? b.h / 2 : b.r), r: 4, class: 'bcontact' }); }
  }

  // ---- interaction: drag shapes, drag the ramp's angle handle
  let drag = null;
  const pt = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  svg.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('[data-id]'); if (!g) { st.sel = null; render(); onChange(); return; }
    const s = st.shapes.find(x => x.id === g.dataset.id); st.sel = s.id;
    drag = { s, handle: e.target.dataset.handle, start: pt(e), ox: s.x, oy: s.y };
    svg.setPointerCapture(e.pointerId); render(); onChange();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pt(e), s = drag.s;
    if (drag.handle === 'angle'){ st.theta = Math.max(5, Math.min(75, deg(Math.atan2(FLOOR - p.y, s.w)))); }
    else if (s.kind !== 'floor'){ s.x = drag.ox + p.x - drag.start.x; s.y = drag.oy + p.y - drag.start.y; s.on = null; }
    snapAll(); render();
  });
  svg.addEventListener('pointerup', () => { if (drag){ drag = null; snapAll(); render(); onChange(); } });

  const api = {
    add: (kind) => { const s = add(kind, { x: 120 + 60 * (st.seq % 8), y: 120 }); st.sel = s.id; if (kind === 'string'){ const bs = st.shapes.filter(x => KINDS[x.kind].body || x.kind === 'pulley'); s.ends = bs.slice(-3).map(x => x.id); } render(); onChange(); return s; },
    template, contacts, strings, bodies, touching, render,
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
