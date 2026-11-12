// Physics Lens — drawing-first setup: after Done drawing, every part gets a dot with its title; pressing a dot opens
// that part's card (its condition groups, one click per group, never typed); a summary lists every choice, the assumed
// defaults and the conflicts, and closes only when there are none. The vocabulary below is the single source:
// groups, choices (the term, one plain line, what it adds), assumed defaults with the words that overturn them,
// and the conflict rules (`needs` / `clash` name a fact read from the drawing in CTX).
// Design: docs/drawing-first-plan.md, section 3.
import { connEnds } from './connect.js';

// facts read from the drawing, per part: `yes` / `no` finish a conflict sentence ("Block 2 is drawn on the rod")
const CTX = {
  onRod:   { yes: 'is drawn on the rod', no: 'is not drawn on a rod' },
  string:  { yes: 'has a string tied to it', no: 'has no string drawn to it' },
  pinned:  { yes: 'is drawn on a pivot', no: 'is not drawn on a pivot' },
  support: { yes: 'has a support drawn', no: 'has no support drawn under it' },
  surface: { yes: 'sits on a surface', no: 'is not drawn on a surface' },
  disc:    { yes: 'holds a disc', no: 'holds no disc' },
  moving:  { yes: 'has a v or a arrow' },
  slides:  { yes: 'moves along a surface' },
  wound:   { yes: 'is wound on a disc' },
};

// "Not sure" is offered in every group: `unsure` says how to tell from the problem text
const PART_ORDER = ['rod', 'block', 'particle', 'wheel', 'pivot', 'string', 'pulley', 'conn'];
export const VOCAB = {
  rod: { title: 'Rod', groups: [
    { key: 'mass', q: 'Mass', unsure: 'Look for “light”, “massless” or “negligible mass”: then its mass is left out. A mass given for the rod itself means it has one.', choices: [
      { key: 'light', term: 'Negligible mass', plain: 'so light next to the rest that its own mass is left out.', adds: 'M_rod = 0: no weight of its own, nothing added to I.' },
      { key: 'uniform', term: 'Uniform, mass M', plain: 'its mass is spread evenly along it.', adds: 'its weight Mg at its centre; its I from the shape table.' },
      { key: 'pieces', term: 'Given in pieces', plain: 'different stretches have different masses.', adds: 'each piece’s mass and where it sits.' } ] },
    { key: 'held', q: 'Held by', unsure: '“Pivoted” or “hinged” means a pivot; “hangs from a cable” a cable; “rests on” supports. If the problem only asks for I, nothing holds it.', choices: [
      { key: 'pivot', term: 'A pivot or hinge', as: 'held by a pivot', plain: 'it turns about a fixed pin.', adds: 'a hinge force with two parts, H_x and H_y.',
        needs: ['pinned', 'A pivot has to be drawn under the rod for it to turn about one. Draw it, or pick another choice.'] },
      { key: 'cable', term: 'A cable', as: 'held by a cable', plain: 'a rope or cable holds it up.', adds: 'a tension along the cable.',
        needs: ['string', 'A cable is a string from the rod to a support. Draw it, or pick another choice.'] },
      { key: 'supports', term: 'Rests on supports', as: 'resting on supports', plain: 'it lies on supports that push up.', adds: 'a normal force at each support.',
        needs: ['support', 'Supports push up from below, so they have to be drawn. Draw a pivot or a table under the rod, or pick another choice.'] },
      { key: 'free', term: 'Nothing (free)', as: 'free', plain: 'no support touches it, as when you only want its I.', adds: 'no support forces.',
        clash: ['pinned', 'The pivot under it holds it up and lets it turn. Pick “a pivot or hinge”, or move the rod off the pivot.'] } ] } ],
    assumed: [{ key: 'rigid', term: 'Rigid', plain: 'it doesn’t bend or stretch.', adds: 'every point turns through the same angle, with the same ω and α.', overturn: '“bends”, “flexible”, “sags”' }] },

  block: { title: 'Block', numbered: true, groups: [
    { key: 'size', q: 'Size', unsure: '“Small”, “tiny” or “particle” means a point mass. A size given for the block (a side, a radius) means it has size.', choices: [
      { key: 'point', term: 'Point mass', plain: 'so small that only its distance from the axis matters.', adds: 'I = mr² about the axis.' },
      { key: 'sized', term: 'Has size', plain: 'its own shape matters as it turns.', adds: 'its shape’s I_cm plus md² (parallel axes).' } ] },
    { key: 'mass', q: 'Mass', unsure: 'Every block has a mass. If the problem names none, it is still an unknown you may not need.', choices: [
      { key: 'has', term: 'Has mass', plain: 'it has a mass of its own.', adds: 'its own name: block 1’s mass is m₁, block 2’s is m₂, and so on.' } ] },
    { key: 'held', q: 'Held by', unsure: '“Fixed”, “attached” or “clamped” means clamped. “Hangs from” means a string. “Placed on” means it rests.', choices: [
      { key: 'clamped', term: 'Clamped to the rod', as: 'clamped to the rod', plain: 'it can’t slide or turn on the rod; it moves with the rod.', adds: 'its distance from the axis stays fixed.',
        needs: ['onRod', 'To be clamped to the rod it has to be drawn on it. Move it onto the rod, or pick another choice.'] },
      { key: 'hangs', term: 'Hangs from it by a string', as: 'hanging by a string', plain: 'it hangs below on a string.', adds: 'its weight pulls at the hook.',
        needs: ['string', 'Hanging needs a string from the block up to the rod. Draw it, or pick another choice.'] },
      { key: 'rests', term: 'Rests on it', as: 'resting on the rod', plain: 'it sits on top, held only by its weight.', adds: 'a normal force between them.',
        needs: ['onRod', 'To rest on the rod it has to be drawn on it. Move it onto the rod, or pick another choice.'] },
      { key: 'surface', term: 'Sits on a surface', as: 'sitting on a surface', plain: 'it sits on a floor, table or ramp.', adds: 'a contact with that surface.',
        needs: ['surface', 'A surface has to be drawn under it. Draw a floor or table, or pick another choice.'] },
      { key: 'free', term: 'Free', as: 'free', plain: 'nothing holds it.', adds: 'no link.',
        clash: ['onRod', 'A block drawn on the rod is held by it somehow: clamped, resting, or hanging below. Change the choice, or move the block off the rod.'] } ] },
    { key: 'where', q: 'Where', when: 'onRod', unsure: 'The problem says where: “at the ends”, “at the centre”, “a distance d from one end”.', choices: [
      { key: 'left', term: 'Left end', plain: 'at the rod’s left end.', adds: 'its place on the rod; you give its coordinate on the axes later.' },
      { key: 'centre', term: 'Centre', plain: 'halfway along the rod.', adds: 'its place on the rod; you give its coordinate on the axes later.' },
      { key: 'right', term: 'Right end', plain: 'at the rod’s right end.', adds: 'its place on the rod; you give its coordinate on the axes later.' },
      { key: 'dist', term: 'At a distance d from an end', plain: 'somewhere in between.', adds: 'a distance you name later.' } ] },
    // motion groups only once a v or a arrow is drawn on it
    { key: 'motion', q: 'Motion', when: 'moving', unsure: '“Constant speed” or “steadily” means a = 0. “Speeds up”, “slows”, “released” means it accelerates.', choices: [
      { key: 'steady', term: 'Moves at constant speed', plain: 'its velocity doesn’t change.', adds: 'a = 0.' },
      { key: 'accel', term: 'Speeds up or slows down', plain: 'its velocity changes.', adds: 'a ≠ 0: ΣF = ma.' } ] },
    { key: 'friction', q: 'Friction', when: 'slides', unsure: '“Smooth” or “frictionless” means none. A μ given means friction; “slides” means kinetic, “doesn’t slip” static.', choices: [
      { key: 'kinetic', term: 'Kinetic friction', plain: 'it slides and the surface rubs.', adds: 'f = μk N, against the sliding.' },
      { key: 'static', term: 'Static friction', plain: 'it grips without sliding.', adds: 'f ≤ μs N.' },
      { key: 'none', term: 'Frictionless', plain: 'the surface is smooth.', adds: 'no friction force.' } ] } ] },

  wheel: { title: 'Disc', groups: [
    { key: 'shape', q: 'Shape', unsure: '“Disc”, “cylinder” or “solid wheel” is a solid disc; “ring”, “hoop” or “bicycle wheel” puts the mass at the rim.', choices: [
      { key: 'solid', term: 'Solid disc or cylinder', plain: 'its mass is spread through the whole disc.', adds: 'I_cm = ½MR².' },
      { key: 'ring', term: 'Thin ring or hoop', plain: 'all its mass is at the rim.', adds: 'I_cm = MR².' },
      { key: 'sphere', term: 'Solid sphere', plain: 'a solid ball.', adds: 'I_cm = ⅖MR².' },
      { key: 'shell', term: 'Hollow sphere', plain: 'a thin shell.', adds: 'I_cm = ⅔MR².' } ] },
    { key: 'mass', q: 'Mass', unsure: '“Light” or “massless” means negligible. A mass given for the disc means it has one.', choices: [
      { key: 'light', term: 'Negligible mass', plain: 'too light to matter.', adds: 'I = 0.' },
      { key: 'has', term: 'Mass M', plain: 'it has a mass of its own.', adds: 'its mass M.' } ] } ],
    assumed: [{ key: 'axle', term: 'Frictionless axle', plain: 'the axle doesn’t rub.', adds: 'the axle’s force has no torque.', overturn: '“friction in the axle”, “a frictional torque”' }] },

  string: { title: 'String', numbered: true, groups: [],
    assumed: [
      { key: 'ideal', term: 'Massless and doesn’t stretch', plain: 'a light, taut string.', adds: 'one tension all along it; bodies tied by it share their acceleration along it.', overturn: '“a heavy rope”, “an elastic cord”' },
      { key: 'noslip', when: 'wound', term: 'Doesn’t slip on the disc', plain: 'the string and the rim move together.', adds: 'a = Rα.', overturn: '“slips”, “slides on the rim”' }] },

  pivot: { title: 'Pivot', groups: [
    { key: 'kind', q: 'Kind', unsure: '“Hinged” or “pinned” means a hinge. “Balanced on” or “fulcrum” means a knife edge. A wheel on a fixed shaft turns on an axle.', choices: [
      { key: 'hinge', term: 'Hinge or pin', plain: 'it pushes or pulls any way.', adds: 'two force parts (H_x, H_y), or one force at an angle.' },
      { key: 'knife', term: 'Knife edge (fulcrum)', plain: 'it pushes up only.', adds: 'one normal force N.' },
      { key: 'axle', term: 'Axle', as: 'an axle', plain: 'it holds a disc at its centre.', adds: 'a force on the disc at its centre.',
        needs: ['disc', 'An axle holds a disc at its centre. Drop a disc onto it, or pick another choice.'] } ] }],
    assumed: [{ key: 'smooth', term: 'Frictionless', plain: 'it turns freely.', adds: 'no torque from the pivot itself.', overturn: '“a rusty hinge”, “friction at the pivot”' }] },

  // a connection drawn with the connect tool: what joins the two parts
  conn: { title: 'Connection', numbered: true, groups: [
    { key: 'kind', q: 'Connection', unsure: '“Fixed”, “attached” or “clamped” means clamped. “Rests on” means resting. “Hangs from” means a string. A bead or ring “on” a rod slides.', choices: [
      { key: 'clamped', term: 'Clamped', as: 'clamped', plain: 'it can’t slide or turn; the two move as one.', adds: 'no freedom of its own: it shares the rod’s turn.' },
      { key: 'rests', term: 'Resting on', as: 'resting on', plain: 'held only by its weight, pushing on what it sits on.', adds: 'a normal force between them.' },
      { key: 'string', term: 'Hangs by a string', as: 'hanging by a string', plain: 'a light string joins them.', adds: 'a tension along the string.' },
      { key: 'slides', term: 'Sliding along', as: 'sliding along', plain: 'it can slide along the other part.', adds: 'a freedom along it.' } ] }] },

  pulley: { title: 'Pulley', groups: [],
    assumed: [
      { key: 'light', term: 'Massless', plain: 'turning it takes no torque.', adds: 'the tension is the same on both sides.', overturn: '“a pulley of mass M”' },
      { key: 'smooth', term: 'Frictionless', plain: 'it turns freely on its axle.', adds: 'no torque at its axle.', overturn: '“friction in the pulley”' }] },

  system: { title: 'System', groups: [
    { key: 'gravity', q: 'Gravity', unsure: 'If weight matters (something hangs, balances or falls), gravity is in. A question only about I doesn’t need it.', choices: [
      { key: 'earth', term: 'On Earth', plain: 'g = 9.81 m/s², straight down.', adds: 'g known.' },
      { key: 'symbol', term: 'g as a symbol', plain: 'keep g as a letter.', adds: 'g a symbol.' },
      { key: 'none', term: 'Not needed', plain: 'no weights in this problem, as when you only want I.', adds: 'no weights.' } ] },
    { key: 'motion', q: 'Motion', unsure: '“At rest”, “balanced” or “in equilibrium” means equilibrium. “Released” or “starts to turn” means it spins up.', choices: [
      { key: 'eq', term: 'In equilibrium', plain: 'nothing speeds up or turns faster.', adds: 'ΣF = 0 and Στ = 0.' },
      { key: 'spin', term: 'Spinning up or slowing', plain: 'its turning changes (α ≠ 0).', adds: 'Στ = Iα.' },
      { key: 'steady', term: 'Turning steadily', plain: 'constant ω.', adds: 'Στ = 0, α = 0.' } ] }] },
};
VOCAB.particle = { ...VOCAB.block, title: 'Particle' };
const UNSURE = 'unsure';

// ---- pure helpers: what a part's card shows, and what clashes with the drawing
const fits = (x, ctx) => !x.when || ctx.has(x.when);
export const groupsFor = (kind, ctx) => VOCAB[kind].groups.filter(g => fits(g, ctx));
export const assumedFor = (kind, ctx) => (VOCAB[kind].assumed || []).filter(a => fits(a, ctx));
const choiceOf = (g, key) => g.choices.find(c => c.key === key);
export function conflictsOf(part, ctx){
  const out = [];
  for (const g of groupsFor(part.kind, ctx)){
    const c = choiceOf(g, part.answers[g.key]); if (!c) continue;
    const marked = `but it is marked <b>${c.as || c.term.toLowerCase()}</b>.`;
    if (c.needs && !ctx.has(c.needs[0])) out.push({ part: part.id, group: g.key, text: `${part.title} ${CTX[c.needs[0]].no}, ${marked} ${c.needs[1]}` });
    if (c.clash && ctx.has(c.clash[0])) out.push({ part: part.id, group: g.key, text: `${part.title} ${CTX[c.clash[0]].yes}, ${marked} ${c.clash[1]}` });
  }
  return out;
}
const isSet = (part, ctx) => groupsFor(part.kind, ctx).every(g => part.answers[g.key]);

// ---- the drawing-first setup panel, dots and summary
// build: the canvas API; svg: its element; panel: the card's container; count / doneBtn / sumBtn: the canvas bar; say(html): the assistant line;
// active(): true in drawing-first mode (the dots show only then)
// ext: { cardHTML(part), click(button, part) → true to redraw, refresh() } — names, freedoms and the knowns card (knowns.js)
export function createSetup({ build: B, svg, panel, count, doneBtn, sumBtn, say, active, ext = {} }){
  const st = { done: false, parts: {}, view: null, closed: false, allSet: false };

  // ---- facts read from the drawing
  const shapeOf = (id) => B.shapes.find(s => s.id === id);
  function onRod(b){
    const half = b.kind === 'block' ? b.h / 2 : (b.r || 8);
    return B.shapes.filter(s => s.kind === 'rod').some(r => {
      const p = B.rodAt(r.id, 0), q = B.rodAt(r.id, 1), L = Math.hypot(q.x - p.x, q.y - p.y), ux = (q.x - p.x) / L, uy = (q.y - p.y) / L;
      const t = (b.x - p.x) * ux + (b.y - p.y) * uy, d = Math.abs((b.x - p.x) * uy - (b.y - p.y) * ux);
      return t > -8 && t < L + 8 && d <= half + r.h / 2 + 10;
    });
  }
  function ctxOf(id){
    const s = shapeOf(id), c = new Set(); if (!s) return c;
    const strings = B.strings(), tied = strings.filter(x => x.ends.includes(id));
    if ((s.kind === 'block' || s.kind === 'particle') && onRod(s)) c.add('onRod');
    if (tied.length) c.add('string');
    if (s.pivot) c.add('pinned');
    if (B.shapes.some(x => ['pivot', 'table', 'floor', 'ramp'].includes(x.kind))) c.add('support');
    if (s.on) c.add('surface');
    if (s.kind === 'pivot' && B.shapes.some(w => w.kind === 'wheel' && w.pivot === id)) c.add('disc');
    if (s.v || s.a){ c.add('moving'); if (s.on) c.add('slides'); }
    if (s.kind === 'string' && (s.ends || []).some(e => shapeOf(e)?.kind === 'wheel')) c.add('wound');
    return c;
  }
  // the parts on show, in the popup's order: bodies (rod, then blocks left to right), the rest, then the whole system
  const alive = (p) => { const s = shapeOf(p.id); return s && (s.kind !== 'conn' || connEnds(B, s)); };
  const list = () => [...Object.values(st.parts).filter(p => p.id !== 'system' && alive(p))
    .sort((a, b) => PART_ORDER.indexOf(a.kind) - PART_ORDER.indexOf(b.kind) || a.n - b.n), ...(st.parts.system ? [st.parts.system] : [])];
  const ctx = (p) => p.id === 'system' ? new Set() : ctxOf(p.id);
  const allConflicts = () => list().flatMap(p => conflictsOf(p, ctx(p)));
  const setCount = () => list().filter(p => isSet(p, ctx(p))).length;

  // ---- Done drawing: every part without a dot gets one (new parts are marked new); numbering is left to right
  function done(){
    const fresh = B.shapes.filter(s => VOCAB[s.kind] && alive({ id: s.id }) && !(st.parts[s.id] && st.parts[s.id].kind === s.kind)).sort((a, b) => PART_ORDER.indexOf(a.kind) - PART_ORDER.indexOf(b.kind) || a.x - b.x);
    if (!fresh.length && !list().some(p => p.id !== 'system')){ say('Draw the problem first: a rod, the blocks on it, a pivot or a string. Then press <b>Done drawing</b>.'); return; }
    const again = st.done;
    for (const p of Object.values(st.parts)) p.isNew = false;
    for (const s of fresh){
      const same = list().filter(p => p.kind === s.kind).map(p => p.n);
      let n = 1; while (same.includes(n)) n++;
      st.parts[s.id] = { id: s.id, kind: s.kind, n, title: '', answers: {}, off: {}, isNew: again };
    }
    for (const kind of new Set(list().map(p => p.kind))){
      const of = list().filter(p => p.kind === kind), v = VOCAB[kind];
      for (const p of of) p.title = v.numbered || of.length > 1 ? `${v.title} ${p.n}` : v.title;
    }
    st.parts.system = st.parts.system || { id: 'system', kind: 'system', n: 0, title: 'System', answers: {}, off: {} };
    st.done = true; st.closed = false; st.view = null;
    say(again && fresh.length ? `New part${fresh.length > 1 ? 's' : ''} marked <b>new</b> on the drawing. Press a dot to set it.`
      : 'Every part has a dot. Press one to set that part: what the picture can’t show, clicked from a short list. Any order is fine.');
    refresh();
  }

  // ---- the panel: a hint, a part's card, or the summary
  const choiceHTML = (p, g, c) => `<button class="dfchoice" data-choice="${c.key}" aria-pressed="${p.answers[g.key] === c.key}"><b>${c.term}</b>: ${c.plain}${c.adds ? `<span class="dfadds">Adds: ${c.adds}</span>` : ''}</button>`;
  function assumedHTML(p){
    const as = assumedFor(p.kind, ctx(p)); if (!as.length) return '';
    return `<div class="dfassumed"><div class="subhead">Assumed</div>${as.map(a => `<div class="dfassume${p.off[a.key] ? ' off' : ''}"><b>${a.term}</b>: ${a.plain} <span class="dfadds">Adds: ${a.adds}</span>
      <span class="small muted">Overturned by: ${a.overturn}.</span> <button class="dfmini" data-assume="${p.id}:${a.key}" aria-pressed="${!!p.off[a.key]}">${p.off[a.key] ? 'Changed: keep it instead' : 'Change'}</button></div>`).join('')}</div>`;
  }
  function cardHTML(p){
    const all = list(), i = all.indexOf(p), groups = groupsFor(p.kind, ctx(p));
    const body = groups.map(g => `<fieldset class="dfgroup" data-group="${g.key}"><legend>${g.q}</legend>${g.choices.map(c => choiceHTML(p, g, c)).join('')}
      ${choiceHTML(p, g, { key: UNSURE, term: 'Not sure', plain: 'leave it open for now.' })}${p.answers[g.key] === UNSURE ? `<p class="small dfhow">How to tell: ${g.unsure}</p>` : ''}</fieldset>`).join('');
    const conf = conflictsOf(p, ctx(p)).map(c => `<p class="small warn">${c.text}</p>`).join(''), extra = ext.cardHTML ? ext.cardHTML(p) : '';
    return `<div class="titlebar"><h2>${p.title}</h2><span class="small muted">Part ${i + 1} of ${all.length}</span><button class="x" data-dfx title="Close">×</button></div>
      <div class="body">${groups.length ? '' : '<p class="small muted">Nothing to ask here: what this part does comes from the drawing.</p>'}${body}${extra}${conf}${assumedHTML(p)}
      <div class="row dffoot"><button data-next>Next part →</button><button data-sum>Summary</button></div></div>`;
  }
  function summaryHTML(){
    const conf = allConflicts(), open = [];
    const rows = list().map(p => {
      const groups = groupsFor(p.kind, ctx(p));
      const picks = groups.map(g => { const k = p.answers[g.key]; if (k === UNSURE) open.push(`${p.title}: ${g.q.toLowerCase()}`); return `${g.q}: ${k === UNSURE ? '<i>not sure</i>' : k ? choiceOf(g, k).term : '<i>not set</i>'}`; });
      return `<li><button class="dflink" data-open="${p.id}">${p.title}</button> ${picks.join(' · ') || '<span class="muted">from the drawing</span>'}</li>`;
    }).join('');
    const assumed = list().map(p => assumedFor(p.kind, ctx(p)).length ? `<div class="dfapart"><b>${p.title}</b>${assumedHTML(p).replace('<div class="subhead">Assumed</div>', '')}</div>` : '').join('');
    return `<div class="titlebar"><h2>Summary</h2><button class="x" data-dfx title="Close">×</button></div>
      <div class="body" id="dfSummary"><div class="subhead">Your choices</div><ul class="dflist">${rows}</ul>
      ${open.length ? `<div class="subhead">Open</div><p class="small">Still open: ${open.join('; ')}. You can come back to them.</p>` : ''}
      ${assumed ? `<div class="subhead">Assumed</div><p class="small muted">The standard ideal model, unless the problem says otherwise. Change any that the problem overturns.</p>${assumed}` : ''}
      <div class="subhead">Conflicts</div>${conf.length ? conf.map(c => `<p class="small warn">${c.text} <button class="dfmini" data-open="${c.part}">Fix</button></p>`).join('') : '<p class="small">No conflicts: your choices fit the drawing.</p>'}
      <div class="row dffoot"><button class="go" id="dfClose" ${conf.length ? 'disabled' : ''}>Close the setup</button>${conf.length ? `<span class="small muted">Fix ${conf.length > 1 ? 'the conflicts' : 'the conflict'} first.</span>` : ''}</div></div>`;
  }
  function renderPanel(){
    const p = st.parts[st.view];
    if (st.view === 'summary') panel.innerHTML = summaryHTML();
    else if (p) panel.innerHTML = cardHTML(p);
    else panel.innerHTML = `<div class="titlebar"><h2>Setup</h2></div><div class="body"><p class="small">${!st.done
      ? 'Draw the problem with the tools beside the canvas, or sketch it with the pen: a rod, the blocks on it, a pivot or a string. Press <b>Done drawing</b> when it’s all there.'
      : st.closed ? 'Setup closed. Press a dot to change a part, or <b>Summary</b> to see it all again.'
      : 'Press a dot on the drawing to set that part, in any order. The summary opens when every part is set.'}</p></div>`;
  }
  function refresh(){
    const total = list().length, n = setCount();
    count.textContent = st.done ? `${n} of ${total} parts set` : '';
    sumBtn.hidden = !st.done;
    // every part set: the summary opens by itself (once each time the last part is set)
    const all = st.done && total > 0 && n === total;
    if (all && !st.allSet && st.view !== 'summary'){ st.view = 'summary'; say('Every part is set. Check the summary: your choices, what is assumed, and anything that doesn’t fit the drawing.'); }
    st.allSet = all;
    renderPanel(); B.render(); if (ext.refresh) ext.refresh();
  }

  // ---- dots on the drawing (called after every canvas render); the open part glows, the rest dims
  const SVGNS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
  function dotAt(p){
    if (p.id === 'system') return { x: 22, y: 24 };
    const s = shapeOf(p.id);
    if (s.kind === 'rod'){ const q = B.rodAt(s.id, 0.25); return { x: q.x, y: q.y + s.h / 2 + 22 }; }
    if (s.kind === 'pivot') return { x: s.x, y: s.y + 26 };
    if (s.kind === 'conn'){ const c = connEnds(B, s); return c ? { x: (c.a.x + c.b.x) / 2 + 14, y: (c.a.y + c.b.y) / 2 + 18 } : { x: 0, y: 0 }; }
    if (s.kind === 'string'){ const [a, b] = (s.ends || []).map(shapeOf).filter(Boolean); return a && b ? { x: (a.x + b.x) / 2 + 10, y: (a.y + b.y) / 2 } : { x: s.x, y: s.y }; }
    const top = s.kind === 'block' ? s.h / 2 : (s.r || 18);
    return { x: s.x - 10, y: s.y - top - 18 };
  }
  function decorate(svg){
    if (!st.done || !active()) return;
    const open = st.parts[st.view] && st.view !== 'system' ? st.view : null;
    if (open) svg.querySelectorAll('.setup > .shape').forEach(g => g.classList.add(g.dataset.id === open ? 'dfglow' : 'dfdim'));
    const layer = mk('g', { class: 'dfdots' }, svg), bad = new Set(allConflicts().map(c => c.part));
    for (const p of list()){
      const { x, y } = dotAt(p), set = isSet(p, ctx(p)), label = p.title + (p.isNew ? ' · new' : '');
      const g = mk('g', { class: `dfdot${set ? ' set' : ''}${bad.has(p.id) ? ' conflict' : ''}${st.view === p.id ? ' open' : ''}`, 'data-dot': p.id, 'data-title': p.title,
        tabindex: '0', role: 'button', 'aria-label': `${p.title}: ${bad.has(p.id) ? 'conflict' : set ? 'set' : 'not set'}` }, layer);
      const w = 30 + label.length * 9.5;
      mk('rect', { x: x - 13, y: y - 13, width: w, height: 26, class: 'dfbg' }, g);
      mk('circle', { cx: x, cy: y, r: 7, class: 'dfpip' }, g);
      mk('text', { x: x + 13, y: y + 6, class: 'dftxt' }, g).textContent = label;
    }
  }

  // ---- events
  const open = (id) => { st.view = id; refresh(); };
  // a dot is pressed, not dragged: keep the canvas tools from seeing it
  svg.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-dot]')) e.stopPropagation(); }, true);
  svg.addEventListener('click', (e) => { const d = e.target.closest('[data-dot]'); if (d) open(d.dataset.dot); });
  svg.addEventListener('keydown', (e) => { const d = e.target.closest('[data-dot]'); if (d && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); open(d.dataset.dot); } });
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const p = st.parts[st.view];
    if (ext.click && p && ext.click(t, p)){ refresh(); return; }
    if (t.dataset.choice && p){ const g = t.closest('[data-group]').dataset.group; p.answers[g] = t.dataset.choice; refresh(); return; }
    if (t.dataset.assume){ const [id, k] = t.dataset.assume.split(':'), q = st.parts[id]; q.off[k] = !q.off[k]; refresh(); return; }
    if (t.dataset.open){ open(t.dataset.open); return; }
    if ('dfx' in t.dataset){ st.view = null; refresh(); return; }
    if ('sum' in t.dataset){ open('summary'); return; }
    if ('next' in t.dataset){ const all = list(), i = all.indexOf(p), next = all.slice(i + 1).concat(all.slice(0, i)).find(q => !isSet(q, ctx(q))) || all[(i + 1) % all.length]; open(next.id); return; }
    if (t.id === 'dfClose' && !allConflicts().length){
      st.closed = true; st.view = null; refresh();
      say('Setup closed: every part is set and nothing clashes with the drawing.');
    }
  });
  doneBtn.addEventListener('click', done);
  sumBtn.addEventListener('click', () => { if (st.done) open('summary'); });

  return {
    decorate, render: renderPanel,
    // the drawing changed: parts that were erased drop out (undo brings them back with their answers)
    changed(){ if (!st.done){ if (ext.refresh) ext.refresh(); return; } if (!list().some(p => p.id !== 'system')){ st.done = false; st.view = null; st.allSet = false; } else if (st.parts[st.view] && st.view !== 'system' && !shapeOf(st.view)) st.view = null; refresh(); },
    get done(){ return st.done; }, get closed(){ return st.closed; }, get parts(){ return st.parts; }, get view(){ return st.view; },
    conflicts: allConflicts, list, ctxOf: ctx, show: open,
    // the notebook keeps each part's answers with the drawing
    save: () => ({ done: st.done, parts: JSON.parse(JSON.stringify(st.parts)) }),
    load(o){ st.done = !!(o && o.done); st.parts = o && o.parts && typeof o.parts === 'object' ? o.parts : {}; st.view = null; st.allSet = false; st.closed = false; refresh(); },
  };
}
