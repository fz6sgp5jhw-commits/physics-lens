// Physics Lens — the drawing-first toolkit (phase 7): one set of x–y axes, forces split onto them, rod ticks and gap labels,
// typed coordinates, the rotation-axis marker and a fade control for the setup lines. The student places and names everything;
// the code only draws what was asked and snaps to meaningful points and directions. Nothing here does physics or arithmetic.
// All of it lives in one hidden shape of kind 'tk' (its data is `shape.d`), so undo, Clear and the snapshots already cover it.
// Design: docs/drawing-first-plan.md, section 5.
import { rodProject, connEnds } from './connect.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
const BODY_PTS = ['block', 'particle', 'ball', 'wheel'];
const LEN = 150;                       // drawn length of an axis
const LABEL_OK = /^[A-Za-zΑ-Ωα-ω0-9_+\-−*/().· ]{1,24}$/;   // a name or a short expression, never markup
const fresh = () => ({ axes: null, forces: [], ticks: {}, dims: [], coords: {}, axis: null, letters: false, fade: 1, seq: 0 });
const r3 = (u) => Math.round(u * 1000) / 1000;

export function createToolkit({ build: B, tools, hit, say, setup: getSetup, bar }){
  let prev = null;                     // a drag in progress, drawn as a preview

  // ---- the stored data (undo-safe: it is a shape)
  const shapeTk = () => B.shapes.find(s => s.kind === 'tk');
  const data = () => (shapeTk() || { d: fresh() }).d;
  // change it with one undo step
  function mut(fn){ let t = shapeTk(); if (!t) t = B.addRaw('tk', { d: fresh() }); else B.checkpoint(); fn(t.d); B.touch(); }
  // change it while dragging (no undo step per move); the end of the drag calls B.touch()
  function live(fn){ let t = shapeTk(); if (!t) t = B.addRaw('tk', { d: fresh() }); fn(t.d); B.render(); }

  // ---- points of interest: rod ends, centre, pivot, connections, ticks the student added; body centres; the axes' origin
  const keyR = (id, u) => `r:${id}:${r3(u)}`;
  function rodUs(rod){
    const d = data(), us = [[0, 'end'], [0.5, 'centre'], [1, 'end']];
    if (rod.pivot && rod.pinU !== undefined && rod.pinU !== null) us.push([rod.pinU, 'pivot']);
    for (const c of B.shapes.filter(s => s.kind === 'conn' && connEnds(B, s)?.rod === rod)) us.push([c.u, 'connection']);
    for (const u of d.ticks[rod.id] || []) us.push([u, 'tick']);
    const out = [];
    for (const [u, why] of us) if (!out.some(o => Math.abs(o.u - u) < 0.012)) out.push({ u: r3(u), why });
    return out.sort((a, b) => a.u - b.u);
  }
  function points(){
    const out = [];
    for (const rod of B.shapes.filter(s => s.kind === 'rod')) for (const o of rodUs(rod)){ const q = B.rodAt(rod.id, o.u); out.push({ key: keyR(rod.id, o.u), ...q, why: o.why, rod: rod.id, u: o.u }); }
    for (const s of B.shapes.filter(s => BODY_PTS.includes(s.kind))) out.push({ key: `b:${s.id}`, x: s.x, y: s.y, why: 'body', id: s.id });
    const a = data().axes; if (a) out.push({ key: 'o', x: a.x, y: a.y, why: 'origin' });
    return out;
  }
  const at = (key) => points().find(q => q.key === key) || null;
  // the nearest point of interest to a drawing point (bodies win over a rod tick underneath them)
  function snapPt(p, reach = 22){
    let best = null, bd = reach;
    for (const q of points()){ const d = Math.hypot(p.x - q.x, p.y - q.y) - (q.why === 'body' ? 4 : 0); if (d < bd){ bd = d; best = q; } }
    return best;
  }
  const titleOf = (key) => {
    const q = at(key); if (!q) return '?';
    const P = getSetup && getSetup(), part = q.id && P && P.parts[q.id];
    return part ? part.title : q.rod ? `${letterOf(key) || (q.why === 'centre' ? 'centre' : q.why === 'end' ? (q.u ? 'right end' : 'left end') : 'tick')}` : 'origin';
  };
  // optional point letters A, B, C…: the rod's points from left to right
  function letterOf(key){
    if (!data().letters) return '';
    const rods = points().filter(q => q.rod).sort((a, b) => a.x - b.x), i = rods.findIndex(q => q.key === key);
    return i < 0 ? '' : String.fromCharCode(65 + i);
  }

  // ---- axes: snap directions
  const dirs = () => {
    const c = [0];
    if (B.shapes.some(s => s.kind === 'ramp')) c.push(B.theta);
    for (const s of B.shapes){
      if (s.kind === 'rod' && s.ang) c.push(s.ang);
      if (s.kind === 'string' && s.ends && s.ends.length === 2){ const [a, b] = s.ends.map(id => B.shape(id)); if (a && b) c.push(deg(Math.atan2(-(b.y - a.y), b.x - a.x))); }
    }
    return c.flatMap(a => [0, 90, 180, 270].map(k => ((a + k) % 360 + 360) % 360));
  };
  const snapAng = (a) => { a = (a % 360 + 360) % 360; const best = dirs().map(c => ({ c, d: Math.min(Math.abs(c - a), 360 - Math.abs(c - a)) })).sort((x, y) => x.d - y.d)[0]; return best && best.d <= 8 ? best.c : Math.round(a); };
  const ex = (a) => ({ x: Math.cos(rad(a.ang)), y: -Math.sin(rad(a.ang)) }), ey = (a) => ({ x: -Math.sin(rad(a.ang)), y: -Math.cos(rad(a.ang)) });
  const angText = (a) => a.name || `${Math.round(a.ang)}°`;

  tools.register('axes', {
    down: (p) => {
      const a = data().axes;
      if (a){
        const tip = { x: a.x + ex(a).x * LEN, y: a.y + ex(a).y * LEN };
        if (Math.hypot(p.x - tip.x, p.y - tip.y) < 20){ B.checkpoint(); return { mode: 'rot' }; }
        const lab = { x: a.x + 46 * Math.cos(rad(a.ang / 2)), y: a.y - 46 * Math.sin(rad(a.ang / 2)) };
        if (a.ang % 360 && Math.hypot(p.x - lab.x, p.y - lab.y) < 22){ nameAngle(a); return null; }
        if (Math.hypot(p.x - a.x, p.y - a.y) > 22){ say('Drag the round handle to move the origin, or the square one at the end of x to turn the axes.'); return null; }
        B.checkpoint(); return { mode: 'move' };
      }
      const q = snapPt(p, 30) || p;
      mut((d) => { d.axes = { x: q.x, y: q.y, ang: 0, name: '' }; });
      say('Axes placed. Drag the origin onto a point (a body, the rod’s centre), or turn them by the square handle: they click onto horizontal, vertical and along a ramp or rod.');
      return null;
    },
    move: (p, e, st) => live((d) => {
      if (st.mode === 'rot'){ d.axes.ang = snapAng(deg(Math.atan2(-(p.y - d.axes.y), p.x - d.axes.x))); d.axes.name = d.axes.name && Math.round(d.axes.ang) ? d.axes.name : ''; }
      else { const q = snapPt(p, 18); d.axes.x = q ? q.x : p.x; d.axes.y = q ? q.y : p.y; }
    }),
    up: () => B.touch(),
  });
  function nameAngle(a){
    tools.ask({ q: 'Name the angle between x and the horizontal (θ), or give a number', value: a.name, at: { x: a.x + 40, y: a.y - 40 }, check: (t) => LABEL_OK.test(t) ? '' : 'Use a short name like θ or a number.', done: (t) => mut((d) => { d.axes.name = t; }) });
  }

  // ---- forces on the drawing, and "split onto the axes"
  const forceDirs = () => {
    const a = data().axes, c = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    if (a) for (const s of [1, -1]){ c.push([s * ex(a).x, s * ex(a).y], [s * ey(a).x, s * ey(a).y]); }
    return c;
  };
  const snapDir = (vx, vy) => {
    const L = Math.hypot(vx, vy) || 1, u = [vx / L, vy / L];
    const best = forceDirs().map(c => ({ c, dot: c[0] * u[0] + c[1] * u[1] })).sort((m, n) => n.dot - m.dot)[0];
    return best && best.dot > Math.cos(rad(9)) ? { x: best.c[0], y: best.c[1] } : { x: u[0], y: u[1] };
  };
  const startOf = (s, p) => s.kind === 'rod' ? B.rodAt(s.id, rodProject(B, s, p).u) : { x: s.x, y: s.y };
  tools.register('force', {
    down: (p) => { const s = hit(p); if (!s || s.kind === 'pulley'){ say('Start the arrow on the body the force acts on.'); return null; } const o = startOf(s, p); prev = { o, d: null, len: 0 }; return { s, o }; },
    move: (p, e, st) => { const vx = p.x - st.o.x, vy = p.y - st.o.y; prev.len = Math.hypot(vx, vy); prev.d = prev.len > 12 ? snapDir(vx, vy) : null; B.render(); },
    up: (p, e, st) => {
      const pv = prev; prev = null;
      if (!pv.d || pv.len < 30){ B.render(); say('Drag farther to draw the arrow, in the direction the force pushes or pulls.'); return; }
      const id = 'f' + (data().seq + 1);
      mut((d) => { d.seq++; d.forces.push({ id, body: st.s.id, x: st.o.x, y: st.o.y, ux: pv.d.x, uy: pv.d.y, len: Math.max(70, Math.min(170, pv.len)), label: '', split: null }); });
      tools.ask({ q: 'Name this force (W, N, T, f…)', at: { x: st.o.x + pv.d.x * 60, y: st.o.y + pv.d.y * 60 }, check: (t) => LABEL_OK.test(t) ? '' : 'Use a short name like W or N.', done: (t) => mut((d) => { d.forces.find(f => f.id === id).label = t; }) });
    },
  });
  const nearForce = (p) => data().forces.find(f => {
    const L = f.len, t = Math.max(0, Math.min(L, (p.x - f.x) * f.ux + (p.y - f.y) * f.uy));
    return Math.hypot(p.x - (f.x + f.ux * t), p.y - (f.y + f.uy * t)) < 12;
  });
  tools.register('split', {
    down: (p, e) => {
      const lab = e.target.closest && e.target.closest('[data-flab]');
      if (lab){
        const [id, k] = lab.dataset.flab.split(':'), f = data().forces.find(x => x.id === id);
        tools.ask({ q: `Label the ${k} part of ${f.label || 'the force'} (W sin θ, −W cos θ…)`, value: f.split['l' + k], at: p, check: (t) => LABEL_OK.test(t) ? '' : 'Use a short expression like W sin θ.', done: (t) => mut((d) => { d.forces.find(x => x.id === id).split['l' + k] = t; }) });
        return null;
      }
      const f = nearForce(p);
      if (!f){ say('Click a force arrow to split it onto the axes, or a dashed part’s label to name it.'); return null; }
      if (!data().axes){ say('Place the axes first (the <b>Axes</b> tool): a force is split onto them.'); return null; }
      mut((d) => { const g = d.forces.find(x => x.id === f.id); g.split = g.split ? null : { lx: '', ly: '' }; });
      if (data().forces.find(x => x.id === f.id).split) say('Dashed parts show the force along x and along y. Click each part’s label to say what it is. It is checked only when you use a check.');
      return null;
    },
  });

  // ---- ticks, gap labels (dimension lines), coordinates, the rotation axis
  tools.register('tick', {
    down: (p) => {
      const rod = B.shapes.filter(s => s.kind === 'rod').map(s => ({ s, ...rodProject(B, s, p) })).sort((a, b) => a.d - b.d)[0];
      if (!rod || rod.d > rod.s.h / 2 + 14){ say('Click on the rod to add a tick where something happens.'); return null; }
      const id = rod.s.id, u = r3(rod.u), mine = data().ticks[id] || [], near = mine.findIndex(t => Math.abs(t - u) < 0.02);
      if (near < 0 && rodUs(rod.s).some(o => Math.abs(o.u - u) < 0.02)){ say('That point already has a tick.'); return null; }
      mut((d) => { d.ticks[id] = d.ticks[id] || []; if (near >= 0) d.ticks[id].splice(near, 1); else d.ticks[id].push(u); });
      return null;
    },
  });
  tools.register('dim', {
    down: (p) => { const q = snapPt(p); if (!q){ say('Start on a point: a tick on the rod, a body or the origin.'); return null; } prev = { from: q, to: p }; return { a: q }; },
    move: (p) => { prev.to = p; B.render(); },
    up: (p, e, st) => {
      prev = null; const b = snapPt(p);
      if (!b || b.key === st.a.key){ B.render(); say('Let go on a different point to measure the gap between them.'); return; }
      tools.ask({ q: 'Length of this gap (L/2, d, L − d…)', at: { x: (st.a.x + b.x) / 2, y: Math.max(st.a.y, b.y) + 40 }, check: (t) => LABEL_OK.test(t) ? '' : 'Use a short name or expression like L/2.',
        done: (t) => mut((d) => { d.dims.push({ a: st.a.key, b: b.key, text: t }); }) });
    },
  });
  tools.register('coord', {
    down: (p) => {
      const q = snapPt(p); if (!q){ say('Click a point: a tick on the rod, a body or the origin.'); return null; }
      if (!data().axes){ say('Place the axes first (the <b>Axes</b> tool): coordinates are measured on them.'); return null; }
      tools.ask({ q: `Coordinate of ${titleOf(q.key)} on x (L/2, −L/2, 0, d…)`, value: data().coords[q.key] || '', at: q, check: (t) => LABEL_OK.test(t) ? '' : 'Use 0, a name, or a short expression like −L/2.',
        done: (t) => mut((d) => { d.coords[q.key] = t; }) });
      return null;
    },
  });
  tools.register('axis', {
    down: (p) => {
      const q = snapPt(p); if (!q){ say('Click the point the body turns about.'); return null; }
      mut((d) => { const same = d.axis && d.axis.key === q.key; d.axis = !same ? { key: q.key, style: 'dot' } : d.axis.style === 'dot' ? { key: q.key, style: 'line' } : null; });
      say(data().axis ? 'Rotation axis marked: ⊙ is an axis pointing out of the page; click again for a dashed line, and once more to remove it.' : 'Rotation axis removed.');
      return null;
    },
  });

  // ---- letters and the fade control (buttons in the toolbar)
  const lettersBtn = bar.querySelector('#dfLetters'), fade = bar.querySelector('#dfFade');
  lettersBtn.addEventListener('click', () => mut((d) => { d.letters = !d.letters; }));
  fade.addEventListener('input', () => live((d) => { d.fade = +fade.value / 100; }));
  fade.addEventListener('change', () => B.touch());

  // ---- drawing (after every canvas render)
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
  const txt = (parent, x, y, s, cls, attrs = {}) => { const t = mk('text', { x, y, class: cls, 'text-anchor': 'middle', ...attrs }, parent); t.textContent = s; return t; };
  const arrow = (g, x1, y1, x2, y2, cls) => {
    mk('line', { x1, y1, x2, y2, class: cls }, g);
    const a = Math.atan2(y2 - y1, x2 - x1), h = 10;
    mk('polygon', { points: `${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}`, class: cls + ' head' }, g);
  };
  function render(svg){
    const d = data(), g = mk('g', { class: 'dftk' }, svg), armed = tools.tool;
    svg.style.setProperty('--dffade', String(d.fade));
    fade.value = String(Math.round(d.fade * 100));
    lettersBtn.setAttribute('aria-pressed', String(d.letters));
    // rod ticks (every point of interest) and optional letters
    for (const rod of B.shapes.filter(s => s.kind === 'rod')) for (const o of rodUs(rod)){
      const q = B.rodAt(rod.id, o.u), a = rad(rod.ang || 0), nx = Math.sin(a), ny = Math.cos(a);
      mk('line', { x1: q.x - nx * 4, y1: q.y - ny * 4, x2: q.x + nx * 12, y2: q.y + ny * 12, class: 'dftick' + (o.why === 'tick' ? ' mine' : ''), 'data-tick': keyR(rod.id, o.u) }, g);
      const L = letterOf(keyR(rod.id, o.u)); if (L) txt(g, q.x + nx * 26, q.y + ny * 26 + 5, L, 'dfletter');
    }
    // gap labels as dimension lines
    d.dims.forEach((m, i) => {
      const A = at(m.a), Bp = at(m.b); if (!A || !Bp) return;
      const y = Math.max(A.y, Bp.y) + 38 + 18 * i, x1 = Math.min(A.x, Bp.x), x2 = Math.max(A.x, Bp.x), dg = mk('g', { class: 'dfdim', 'data-dim': String(i) }, g);
      mk('line', { x1: A.x, y1: A.y + 6, x2: A.x, y2: y + 6, class: 'dfext' }, dg); mk('line', { x1: Bp.x, y1: Bp.y + 6, x2: Bp.x, y2: y + 6, class: 'dfext' }, dg);
      mk('line', { x1, y1: y, x2, y2: y, class: 'dfdimline' }, dg);
      for (const x of [x1, x2]) mk('line', { x1: x - 5, y1: y + 5, x2: x + 5, y2: y - 5, class: 'dfdimline' }, dg);
      txt(dg, (x1 + x2) / 2, y - 5, m.text, 'dfdimtxt');
    });
    // coordinates typed on points
    for (const [key, v] of Object.entries(d.coords)){ const q = at(key); if (q) txt(g, q.x, q.why === 'body' ? q.y - (B.shape(q.id)?.h || 40) / 2 - 24 : q.y + 28, `x = ${v}`, 'dfcoord', { 'data-coord': key }); }
    // the rotation axis
    if (d.axis){
      const q = at(d.axis.key);
      if (q){
        if (d.axis.style === 'line') mk('line', { x1: q.x, y1: q.y - 80, x2: q.x, y2: q.y + 80, class: 'dfrotaxis' }, g);
        else { mk('circle', { cx: q.x, cy: q.y, r: 11, class: 'dfrotdot' }, g); mk('circle', { cx: q.x, cy: q.y, r: 3, class: 'dfrotpip' }, g); }
      }
    }
    // axes
    if (d.axes){
      const a = d.axes, X = ex(a), Y = ey(a), ag = mk('g', { class: 'dfaxes' }, g);
      arrow(ag, a.x - X.x * 30, a.y - X.y * 30, a.x + X.x * LEN, a.y + X.y * LEN, 'dfaxis');
      arrow(ag, a.x - Y.x * 20, a.y - Y.y * 20, a.x + Y.x * (LEN - 20), a.y + Y.y * (LEN - 20), 'dfaxis');
      txt(ag, a.x + X.x * (LEN + 14), a.y + X.y * (LEN + 14) + 5, 'x', 'dfaxlab'); txt(ag, a.x + Y.x * (LEN - 6), a.y + Y.y * (LEN - 6) - 6, 'y', 'dfaxlab');
      if (a.ang % 360){
        const m = rad(a.ang / 2), r = 46;
        mk('path', { d: `M ${a.x + r} ${a.y} A ${r} ${r} 0 ${a.ang > 180 ? 1 : 0} 0 ${a.x + r * Math.cos(rad(a.ang))} ${a.y - r * Math.sin(rad(a.ang))}`, class: 'dfaxarc' }, ag);
        txt(ag, a.x + (r + 16) * Math.cos(m), a.y - (r + 16) * Math.sin(m) + 5, angText(a), 'dfaxang', { 'data-axang': '1' });
      }
      if (armed === 'axes'){ mk('circle', { cx: a.x, cy: a.y, r: 8, class: 'dfhandle' }, ag); mk('rect', { x: a.x + X.x * LEN - 7, y: a.y + X.y * LEN - 7, width: 14, height: 14, class: 'dfhandle' }, ag); }
    }
    // forces, and their parts on the axes
    for (const f of d.forces){
      if (!B.shape(f.body)) continue;
      const fg = mk('g', { class: 'dfforce', 'data-force': f.id }, g), tx = f.x + f.ux * f.len, ty = f.y + f.uy * f.len;
      arrow(fg, f.x, f.y, tx, ty, 'dffline');
      if (f.label) txt(fg, tx + f.ux * 16, ty + f.uy * 16 + 5, f.label, 'dfflab');
      if (f.split && d.axes){
        const X = ex(d.axes), Y = ey(d.axes);
        for (const [k, V, name] of [['x', X, 'lx'], ['y', Y, 'ly']]){
          const c = (f.ux * V.x + f.uy * V.y) * f.len, px = f.x + V.x * c, py = f.y + V.y * c;
          mk('line', { x1: f.x, y1: f.y, x2: px, y2: py, class: 'dfproj' }, fg); mk('line', { x1: px, y1: py, x2: tx, y2: ty, class: 'dfguide' }, fg);
          const w = f.split[name];
          txt(fg, (f.x + px) / 2 - (k === 'y' ? 18 : 0) * Math.sign(V.x || 1), (f.y + py) / 2 + (k === 'x' ? 18 : 0) + 4, w || `${k}?`, 'dfprojlab' + (w ? '' : ' empty'), { 'data-flab': `${f.id}:${k}` });
        }
      }
    }
    if (prev && prev.d) arrow(g, prev.o.x, prev.o.y, prev.o.x + prev.d.x * Math.min(prev.len, 170), prev.o.y + prev.d.y * Math.min(prev.len, 170), 'dffline prev');
    if (prev && prev.from) mk('line', { x1: prev.from.x, y1: prev.from.y, x2: prev.to.x, y2: prev.to.y, class: 'dfdimline prev' }, g);
    // while a point tool is armed, every point of interest shows
    if (['dim', 'coord', 'axis'].includes(armed)) for (const q of points()) mk('circle', { cx: q.x, cy: q.y, r: 5, class: 'dfpoi' }, g);
  }

  // what the toolkit adds to the knowns list
  function knowns(){
    const d = data(), out = [];
    for (const [key, v] of Object.entries(d.coords)) if (at(key)) out.push({ name: `x(${titleOf(key)})`, value: v, source: 'toolkit' });
    for (const m of d.dims) if (at(m.a) && at(m.b)) out.push({ name: `gap ${titleOf(m.a)}–${titleOf(m.b)}`, value: m.text, source: 'toolkit' });
    return out;
  }

  return { render, knowns, state: () => JSON.parse(JSON.stringify(data())), points: () => points().map(({ key, x, y, why }) => ({ key, x, y, why })), letterOf };
}
