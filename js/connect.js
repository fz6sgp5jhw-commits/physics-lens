// Physics Lens — the connect tool (drawing-first): drag from one part to another and a connector appears, with its own dot
// and card (clamped, resting on, hangs by a string, sliding along). A connection to a rod adds a tick there. Strings use the
// same drag: over each pulley to the last body, or off a disc's rim; they become ordinary string shapes, each with its own
// tension name. Connectors are shapes (kind 'conn', ends [a, b], u = fraction along the rod), so undo and Clear cover them.
// Design: docs/drawing-first-plan.md, section 3 (connections and strings).

const BODIES = ['block', 'particle', 'ball', 'wheel', 'rod'];
const SVGNS = 'http://www.w3.org/2000/svg';

// where along a rod (0 to 1) a drawing point projects, and how far off the rod it is
export function rodProject(B, rod, p){
  const a = B.rodAt(rod.id, 0), b = B.rodAt(rod.id, 1), L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (L * L), u = Math.max(0, Math.min(1, t)), q = B.rodAt(rod.id, u);
  return { u, d: Math.hypot(p.x - q.x, p.y - q.y) };
}

// the two drawing points of a connector, or null when a part it joined has been erased
export function connEnds(B, s){
  const [x, y] = (s.ends || []).map(id => B.shape(id));
  if (!x || !y || s.ends.length !== 2) return null;
  const at = (q) => q.kind === 'rod' ? B.rodAt(q.id, s.u ?? 0.5) : { x: q.x, y: q.y };
  return { a: at(x), b: at(y), rod: x.kind === 'rod' ? x : y.kind === 'rod' ? y : null };
}

export function createConnect({ build: B, tools, say }){
  let prev = null;

  const hit = (p) => {
    const s = B.shapes;
    return s.find(q => q.kind === 'pulley' && Math.hypot(p.x - q.x, p.y - q.y) <= (q.r || 18) + 8)
      || s.find(q => q.kind === 'wheel' && Math.hypot(p.x - q.x, p.y - q.y) <= q.r + 8)
      || s.find(q => (q.kind === 'block' && Math.abs(p.x - q.x) <= q.w / 2 + 6 && Math.abs(p.y - q.y) <= q.h / 2 + 6) || ((q.kind === 'particle' || q.kind === 'ball') && Math.hypot(p.x - q.x, p.y - q.y) <= q.r + 8))
      || s.find(q => q.kind === 'rod' && rodProject(B, q, p).d <= q.h / 2 + 10);
  };

  function make(from, to, pulleys, p){
    const ok = (q) => q.kind === 'pulley' || BODIES.includes(q.kind);
    if (!ok(from) || !ok(to) || from === to){ say('Drag from one part to another: a block to the rod, or a string from a block over a pulley to another block.'); return; }
    const rim = [from, to].some(q => q.kind === 'wheel') && [from, to].every(q => q.kind !== 'rod');
    if (pulleys.length || from.kind === 'pulley' || to.kind === 'pulley' || rim){
      const ends = [from.id, ...pulleys.map(q => q.id), to.id].filter((id, i, a) => id !== a[i - 1]);
      B.addRaw('string', { ends }); B.touch();
      say(`A <b>string</b> now runs ${ends.length > 2 ? 'over the pulley' : 'between the two parts'}. It gets a dot and a tension name: press <b>Done drawing</b> again to set it.`);
      return;
    }
    if (B.shapes.some(q => q.kind === 'conn' && q.ends && q.ends.includes(from.id) && q.ends.includes(to.id))){ say('Those two parts are already connected.'); return; }
    const rod = [from, to].find(q => q.kind === 'rod'), other = rod === from ? to : from;
    const u = rod ? (other.kind === 'rod' ? 0.5 : rodProject(B, rod, { x: other.x, y: other.y }).u) : 0.5;
    B.addRaw('conn', { ends: [from.id, to.id], u: Math.round(u * 1000) / 1000 }); B.touch();
    say(`Connected${rod ? ', with a tick on the rod' : ''}. Press <b>Done drawing</b> to give the connection its card: clamped, resting on, hanging by a string or sliding.`);
  }

  tools.register('connect', {
    down: (p) => { const from = hit(p); if (!from){ say('Start the drag on a part: a block, the rod, a disc or a pulley.'); return null; } prev = { from, to: p, pulleys: [] }; B.render(); return prev; },
    move: (p, e, st) => {
      st.to = p;
      const pul = B.shapes.find(q => q.kind === 'pulley' && q !== st.from && Math.hypot(p.x - q.x, p.y - q.y) <= (q.r || 18) + 4);
      if (pul && !st.pulleys.includes(pul)) st.pulleys.push(pul);
      B.render();
    },
    up: (p, e, st) => {
      prev = null;
      const to = hit(p);
      // a pulley passed on the way is not the end of the string
      if (to) make(st.from, to, st.pulleys.filter(q => q !== to), p); else { say('Let go on the part you want to connect to.'); B.render(); }
    },
  });

  // draw connectors (and the drag in progress) over the canvas
  function render(svg){
    const layer = document.createElementNS(SVGNS, 'g'); layer.setAttribute('class', 'dfconns'); svg.appendChild(layer);
    const line = (a, b, cls) => { const l = document.createElementNS(SVGNS, 'line'); for (const [k, v] of Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: cls })) l.setAttribute(k, v); layer.appendChild(l); };
    for (const s of B.shapes.filter(q => q.kind === 'conn')){ const c = connEnds(B, s); if (c) line(c.a, c.b, 'dfconn'); }
    if (prev) line({ x: prev.from.x, y: prev.from.y }, prev.to, 'dfconn drag');
  }

  return { render, hit };
}
