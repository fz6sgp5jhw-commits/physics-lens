// Physics Lens — the board: a quick organizing diagram (plan section 7). Cards and arrows; it organizes, it never solves.
// Cards: quantity (coloured by state: given, found, target, unknown), equation (shows its kind), note, state (a box).
// From a solved path the board lays itself out given → equation → found → target with a layered layout written here:
// layers by longest path, placeholder points for long arrows, barycenter sweeps seeded from the previous order.
// Notes, state boxes and cards the student dragged keep their place.

const SIZE = { quantity: [96, 40], equation: [176, 46], note: [170, 70] };
const COL = 220, ROW = 62, PAD = 24;
export const emptyBoard = () => ({ cards: [], arrows: [] });
const sizeOf = (c) => c.type === 'state' ? [c.w || 220, c.h || 160] : SIZE[c.type];

// steps: [{ ref, kind, label, text, ins: [ids], out: id }] in solving order
// q: { state(id) → 'given' | 'found' | 'target' | 'unknown', value(id) → text }
// prev: the board it replaces (its notes, state boxes and their arrows stay; card order seeds the layout)
export function fromPath(steps, q, prev = null){
  const b = emptyBoard(), qs = new Map();
  const qcard = (id) => {
    if (!qs.has(id)){ const c = { id: 'q:' + id, type: 'quantity', ref: id, state: q.state(id), value: q.value(id) || '' }; qs.set(id, c); b.cards.push(c); }
    return qs.get(id).id;
  };
  steps.forEach((s, i) => {
    const e = { id: `e${i}:${s.ref}`, type: 'equation', ref: s.ref, kind: s.kind, label: s.label || '', text: s.text || '' };
    b.cards.push(e);
    for (const x of s.ins) b.arrows.push({ from: qcard(x), to: e.id });
    b.arrows.push({ from: e.id, to: qcard(s.out) });
  });
  if (prev){
    const keep = prev.cards.filter(c => c.type === 'note' || c.type === 'state'), ids = new Set([...keep.map(c => c.id), ...b.cards.map(c => c.id)]);
    b.cards.push(...keep.map(c => ({ ...c })));
    b.arrows.push(...prev.arrows.filter(a => ids.has(a.from) && ids.has(a.to) && (keep.some(c => c.id === a.from) || keep.some(c => c.id === a.to))));
  }
  return layout(b, prev);
}

// ---- layered layout (left to right)
export function layout(board, prev = null){
  const free = board.cards.filter(c => !c.pinned && c.type !== 'note' && c.type !== 'state');
  const ids = new Set(free.map(c => c.id));
  const edges = board.arrows.filter(a => ids.has(a.from) && ids.has(a.to));
  // longest-path layers; an arrow that closes a loop (only on hand-built boards) is left out
  const out = new Map(free.map(c => [c.id, []])), layer = new Map(), state = new Map(), dag = [];
  for (const a of edges) out.get(a.from).push(a);
  const visit = (id) => {
    state.set(id, 1);
    for (const a of out.get(id)){ const s = state.get(a.to); if (s === 1) continue; dag.push(a); if (!s) visit(a.to); }
    state.set(id, 2);
  };
  for (const c of free) if (!state.get(c.id)) visit(c.id);
  const into = new Map(free.map(c => [c.id, []]));
  for (const a of dag) into.get(a.to).push(a.from);
  const depth = (id) => {
    if (!layer.has(id)) layer.set(id, Math.max(-1, ...into.get(id).map(depth)) + 1);
    return layer.get(id);
  };
  free.forEach(c => depth(c.id));
  // targets end the route: they sit in the last column
  const last = Math.max(0, ...layer.values());
  for (const c of free) if (c.state === 'target' && !out.get(c.id).length) layer.set(c.id, last);
  // placeholder points so a long arrow passes between the cards it skips
  const nodes = new Map(free.map(c => [c.id, { id: c.id, layer: layer.get(c.id), card: c }])), links = [];
  for (const a of dag){
    let from = a.from; const l0 = layer.get(a.from), l1 = layer.get(a.to); a.via = [];
    for (let l = l0 + 1; l < l1; l++){ const id = `~${a.from}>${a.to}@${l}`; nodes.set(id, { id, layer: l, dummy: true, arrow: a }); links.push([from, id]); a.via.push(id); from = id; }
    links.push([from, a.to]);
  }
  // order in each layer: seeded from where the cards were, then barycenter sweeps down and up
  const prevY = new Map((prev ? prev.cards : board.cards).map(c => [c.id, c.y]));
  const layers = [];
  for (const n of nodes.values()) (layers[n.layer] ||= []).push(n);
  layers.forEach(L => L.forEach((n, i) => { n.pos = prevY.has(n.id) && !n.dummy ? prevY.get(n.id) : i * ROW; }));
  const ups = new Map([...nodes.keys()].map(k => [k, []])), downs = new Map([...nodes.keys()].map(k => [k, []]));
  for (const [a, b] of links){ downs.get(a).push(b); ups.get(b).push(a); }
  const sortLayer = (L) => { L.sort((a, b) => a.pos - b.pos); L.forEach((n, i) => { n.pos = i; }); };
  layers.forEach(sortLayer);
  for (let sweep = 0; sweep < 4; sweep++){
    const down = sweep % 2 === 0, seq = down ? layers.slice(1) : layers.slice(0, -1).reverse();
    for (const L of seq){
      for (const n of L){ const nb = (down ? ups : downs).get(n.id).map(k => nodes.get(k).pos); if (nb.length) n.pos = nb.reduce((s, x) => s + x, 0) / nb.length + n.pos * 1e-3; }
      sortLayer(L);
    }
  }
  // coordinates: columns left to right, each column centred on the tallest
  const tall = Math.max(1, ...layers.map(L => L.length));
  layers.forEach((L, l) => L.forEach((n, i) => {
    const y = PAD + (i + (tall - L.length) / 2) * ROW;
    if (n.dummy){ n.x = PAD + l * COL + SIZE.equation[0] / 2; n.y = y + 20; return; }
    const [w] = sizeOf(n.card); n.card.x = PAD + l * COL + (SIZE.equation[0] - w) / 2; n.card.y = y;
  }));
  for (const a of dag) a.via = a.via.map(k => ({ x: nodes.get(k).x, y: nodes.get(k).y }));
  for (const a of board.arrows) if (!dag.includes(a)) delete a.via;
  // notes and state boxes without a place go below the route
  let below = PAD + tall * ROW + 12, right = PAD;
  for (const c of board.cards) if ((c.type === 'note' || c.type === 'state') && !c.pinned){
    const [w, h] = sizeOf(c); c.x = right; c.y = below; c.pinned = true; right += w + 16;
    if (right > PAD + 3 * COL){ right = PAD; below += h + 16; }
  }
  return board;
}

// ---- the board on the page
// host: an element; get() → the board (or null), set(board); label(card) → { html } for trusted app markup or { text };
// quantities() → [[id, plain name]] to add; say(text)
export function createBoardView({ host, get, set, label, quantities, equations, fromPath: build, say }){
  let mode = 'move', pick = null, sel = null, drag = null;
  const el = (tag, props = {}, kids = []) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };
  const NS = 'http://www.w3.org/2000/svg';
  const board = () => { let b = get(); if (!b){ b = emptyBoard(); set(b); } return b; };
  const uid = (t) => t[0] + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  host.innerHTML = `
    <div class="bdtools row" role="toolbar" aria-label="Board tools">
      <button type="button" class="go" data-bd="path" title="Lay out your solved path: given → equation → found → target">Lay out my path</button>
      <select data-bd="qty" aria-label="Add a quantity card"></select>
      <select data-bd="eqn" aria-label="Add an equation card"></select>
      <button type="button" data-bd="note" title="A free card for a formula or a reminder">+ Note</button>
      <button type="button" data-bd="state" title="A box for state 1, state 2 (before and after)">+ State box</button>
      <button type="button" data-bd="arrow" aria-pressed="false" title="Click one card, then another, to draw an arrow">Arrow</button>
      <button type="button" data-bd="del" title="Remove the selected card (or press Delete)">Remove</button>
      <button type="button" data-bd="tidy" title="Lay the route out again; dragged cards keep their place">Tidy</button>
      <button type="button" data-bd="wipe" class="warnbtn" title="Start an empty board">Empty</button>
    </div>
    <div class="bdhint small muted"></div>
    <div class="bdarea" tabindex="0"><svg class="bdlines" aria-hidden="true"></svg><div class="bdcards"></div></div>`;
  const area = host.querySelector('.bdarea'), lines = host.querySelector('.bdlines'), cardsEl = host.querySelector('.bdcards'), hint = host.querySelector('.bdhint');
  const tool = (k) => host.querySelector(`[data-bd="${k}"]`);

  function hintText(){
    hint.textContent = mode === 'arrow' ? (pick ? 'Now click the card the arrow points to.' : 'Click the card the arrow starts from.')
      : 'Drag cards to move them. Colours: given cyan, found amber, target pink, unknown grey. The board organizes; it doesn’t solve.';
  }
  function menus(){
    const qs = quantities(), es = equations();
    tool('qty').replaceChildren(el('option', { value: '', textContent: '+ Quantity…' }), ...qs.map(([id, n]) => el('option', { value: id, textContent: n })));
    tool('eqn').replaceChildren(el('option', { value: '', textContent: '+ Equation…' }), ...es.map(([id, n]) => el('option', { value: id, textContent: n })));
  }
  const centre = (c) => { const [w, h] = sizeOf(c); return { x: c.x + w / 2, y: c.y + h / 2, w, h }; };
  // where a line toward p leaves card c's edge
  function edge(c, p){
    const m = centre(c), dx = p.x - m.x, dy = p.y - m.y;
    if (!dx && !dy) return m;
    const s = Math.min(dx ? (m.w / 2) / Math.abs(dx) : Infinity, dy ? (m.h / 2) / Math.abs(dy) : Infinity);
    return { x: m.x + dx * s, y: m.y + dy * s };
  }
  function draw(){
    const b = get() || emptyBoard(), byId = new Map(b.cards.map(c => [c.id, c]));
    const W = Math.max(600, ...b.cards.map(c => c.x + sizeOf(c)[0] + PAD)), H = Math.max(300, ...b.cards.map(c => c.y + sizeOf(c)[1] + PAD));
    lines.setAttribute('width', W); lines.setAttribute('height', H); cardsEl.style.width = W + 'px'; cardsEl.style.height = H + 'px';
    lines.innerHTML = '<defs><marker id="bdHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>';
    for (const a of b.arrows){
      const f = byId.get(a.from), t = byId.get(a.to); if (!f || !t) continue;
      const via = a.via || [], p0 = edge(f, via[0] || centre(t)), p1 = edge(t, via[via.length - 1] || centre(f));
      const line = document.createElementNS(NS, 'polyline');
      line.setAttribute('points', [p0, ...via, p1].map(p => `${p.x},${p.y}`).join(' '));
      line.setAttribute('marker-end', 'url(#bdHead)'); line.setAttribute('class', 'bdarrow');
      lines.append(line);
      if (a.label){ const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', (p0.x + p1.x) / 2); tx.setAttribute('y', (p0.y + p1.y) / 2 - 4); tx.setAttribute('class', 'bdalabel'); tx.textContent = a.label; lines.append(tx); }
    }
    // state boxes first, so they sit behind the cards inside them
    const order = [...b.cards.filter(c => c.type === 'state'), ...b.cards.filter(c => c.type !== 'state')];
    cardsEl.replaceChildren(...order.map(cardNode));
    hintText();
  }
  function cardNode(c){
    const [w, h] = sizeOf(c);
    const d = el('div', { className: `bdcard bd-${c.type}${c.state ? ' st-' + c.state : ''}${c.id === sel ? ' sel' : ''}${c.id === pick ? ' pick' : ''}` });
    d.dataset.card = c.id; d.dataset.type = c.type; if (c.state) d.dataset.state = c.state;
    Object.assign(d.style, { left: c.x + 'px', top: c.y + 'px', width: w + 'px', ...(c.type === 'state' ? { height: h + 'px' } : { minHeight: h + 'px' }) });
    if (c.type === 'note'){
      const t = el('textarea', { className: 'bdnote', value: c.text || '', placeholder: 'A formula or a reminder', maxLength: 500, ariaLabel: 'Note' });
      t.oninput = () => { c.text = t.value; };
      d.append(t);
    } else if (c.type === 'state'){
      const t = el('input', { className: 'bdstate', value: c.text || '', placeholder: 'State 1', maxLength: 60, ariaLabel: 'State name' });
      t.oninput = () => { c.text = t.value; };
      d.append(t);
    } else {
      const lb = label(c), main = el('div', { className: 'bdmain' });
      if (lb.html) main.innerHTML = lb.html; else main.textContent = lb.text;
      d.append(main);
      if (c.type === 'equation' && c.kind) d.append(el('span', { className: 'bdkind', textContent: c.kind }));
      if (c.type === 'quantity' && c.value) d.append(el('span', { className: 'bdval', textContent: c.value }));
    }
    return d;
  }

  // ---- adding cards
  function add(c){
    const b = board(); b.cards.push(c);
    c.x = PAD; c.y = Math.max(PAD, ...b.cards.filter(x => x !== c).map(x => x.y + sizeOf(x)[1] + 16));
    sel = c.id; draw();
  }
  tool('qty').onchange = (e) => {
    const id = e.target.value; e.target.value = ''; if (!id) return;
    const b = board(); if (b.cards.some(c => c.type === 'quantity' && c.ref === id)){ say('That quantity already has a card on the board.'); return; }
    add({ id: 'q:' + id, type: 'quantity', ref: id, state: 'unknown', x: 0, y: 0 });
  };
  tool('eqn').onchange = (e) => {
    const id = e.target.value; e.target.value = ''; if (!id) return;
    const lb = equations().find(x => x[0] === id);
    add({ id: uid('e') + ':' + id, type: 'equation', ref: id, kind: lb ? lb[2] : '', x: 0, y: 0 });
  };
  tool('note').onclick = () => { add({ id: uid('n'), type: 'note', text: '', pinned: true, x: 0, y: 0 }); cardsEl.querySelector('.sel textarea')?.focus(); };
  tool('state').onclick = () => { const n = board().cards.filter(c => c.type === 'state').length + 1; add({ id: uid('s'), type: 'state', text: `State ${n}`, w: 220, h: 160, pinned: true, x: 0, y: 0 }); };
  tool('arrow').onclick = () => { mode = mode === 'arrow' ? 'move' : 'arrow'; pick = null; tool('arrow').setAttribute('aria-pressed', String(mode === 'arrow')); draw(); };
  tool('del').onclick = () => removeSel();
  tool('tidy').onclick = () => { const b = get(); if (b){ layout(b, b); draw(); } };
  tool('wipe').onclick = () => { set(emptyBoard()); sel = pick = null; draw(); };
  tool('path').onclick = () => { const r = build(); if (r) { sel = null; draw(); } };
  function removeSel(){
    const b = get(); if (!b || !sel) return;
    b.cards = b.cards.filter(c => c.id !== sel); b.arrows = b.arrows.filter(a => a.from !== sel && a.to !== sel); sel = null; draw();
  }
  area.addEventListener('keydown', (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && e.target === area) removeSel(); });

  // ---- moving cards and drawing arrows
  cardsEl.addEventListener('pointerdown', (e) => {
    const d = e.target.closest('.bdcard'); if (!d) return;
    const b = get(), c = b && b.cards.find(x => x.id === d.dataset.card); if (!c) return;
    if (mode === 'arrow'){
      if (!pick){ pick = c.id; draw(); return; }
      if (pick !== c.id && !b.arrows.some(a => a.from === pick && a.to === c.id)) b.arrows.push({ from: pick, to: c.id });
      pick = null; draw(); return;
    }
    sel = c.id;
    if (e.target.matches('textarea, input')){ draw(); return; }
    drag = { c, x: e.clientX, y: e.clientY, x0: c.x, y0: c.y, moved: false };
    d.setPointerCapture?.(e.pointerId); e.preventDefault();
    cardsEl.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); d.classList.add('sel');
  });
  cardsEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    drag.c.x = Math.max(0, drag.x0 + dx); drag.c.y = Math.max(0, drag.y0 + dy);
    const d = cardsEl.querySelector(`[data-card="${CSS.escape(drag.c.id)}"]`); if (d){ d.style.left = drag.c.x + 'px'; d.style.top = drag.c.y + 'px'; }
  });
  const drop = () => { if (!drag) return; if (drag.moved){ drag.c.pinned = true; const b = get(); b.arrows.forEach(a => { if (a.from === drag.c.id || a.to === drag.c.id) delete a.via; }); } drag = null; draw(); };
  cardsEl.addEventListener('pointerup', drop);
  cardsEl.addEventListener('pointercancel', drop);

  return { render(){ menus(); draw(); } };
}
