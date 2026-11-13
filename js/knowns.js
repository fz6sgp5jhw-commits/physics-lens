// Physics Lens — names, knowns, freedoms and the counter (drawing-first).
// Every part's quantities have their own names (block 1's mass is m₁, the rod's length L_rod, string 1's tension T₁). On a card
// the student clicks "has mass" and says what it is: a symbol (m) or a number with its unit; that writes m₁ = m. A value of the
// wrong kind is refused with a reason. The knowns list shows every entry with its source (drawing, card or assumed); the student
// marks targets and anything "not needed" (greyed, never dropped). Freedoms per body (fixed, slide x, slide y, turn θ) and the
// constraints from the cards feed a counter of unknowns against relationships, which never says which relationship is missing.
// Design: docs/drawing-first-plan.md, sections 3, 4 and 6. No arithmetic here: the counter only counts.
import { parseUnit, dimEq } from './expr.js';

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).split('').map(d => SUB[+d]).join('');
const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// what each kind of quantity is measured in
const QTY = { mass: { units: 'kg or g', dim: { kg: 1 } }, length: { units: 'm or cm', dim: { m: 1 } }, force: { units: 'N', dim: { kg: 1, m: 1, s: -2 } } };
const WHAT = [['mass', 'mass'], ['length', 'length'], ['force', 'force'], ['time', 'time']];
const sameDim = dimEq;
const dimWord = (d) => (WHAT.find(([k]) => QTY[k] && sameDim(QTY[k].dim, d)) || (sameDim({ s: 1 }, d) ? [0, 'time'] : sameDim({ m: 1, s: -1 }, d) ? [0, 'speed'] : [0, 'something else']))[1];

// the quantities a part can name: key, the name the part gives it (base + number), the kind of quantity, and when the card asks
const NAMEABLE = {
  block:    [{ key: 'mass', base: 'm', qty: 'mass', ask: (p) => p.answers.mass === 'has', numbered: true }],
  particle: [{ key: 'mass', base: 'mp', qty: 'mass', ask: (p) => p.answers.mass === 'has', numbered: true }],
  rod:      [{ key: 'mass', base: 'M_rod', qty: 'mass', ask: (p) => p.answers.mass === 'uniform' }],
  wheel:    [{ key: 'mass', base: 'M_disc', qty: 'mass', ask: (p) => p.answers.mass === 'has' }],
  string:   [{ key: 'tension', base: 'T', qty: 'force', ask: () => true, numbered: true, optional: true }],
};
const I_CM = { solid: '½', ring: '', sphere: '⅖', shell: '⅔' };

export function createKnowns({ panel, setup: getSetup, build: B, say }){
  const st = { targets: [], marks: {}, err: null, sources: [] };
  const S = () => getSetup();

  // ---- names
  const multi = (p) => S().list().filter(q => q.kind === p.kind).length > 1;
  const nameOf = (p, d) => d.numbered ? `${d.base}${sub(p.n)}` : multi(p) ? `${d.base}${sub(p.n)}` : d.base;
  const nameables = (p) => (NAMEABLE[p.kind] || []).filter(d => d.ask(p));
  // symbols already tied to a kind of quantity: by the drawing's labels and by the other names
  function symbolKinds(except){
    const m = new Map();
    for (const s of B.shapes){
      if (s.kind === 'rod' || s.kind === 'wheel'){ if (s.props.length) m.set(s.props.length, ['length', `the ${s.kind}’s ${s.props.length}`]); if (s.props.radius) m.set(s.props.radius, ['length', `the ${s.kind}’s ${s.props.radius}`]); if (s.props.mass) m.set(s.props.mass, ['mass', `the ${s.kind}’s ${s.props.mass}`]); }
      if ((s.kind === 'block' || s.kind === 'particle') && s.props.mass && !m.has(s.props.mass)) m.set(s.props.mass, ['mass', `the blocks’ ${s.props.mass}`]);
    }
    for (const p of S().list()) for (const d of NAMEABLE[p.kind] || []){ const e = p.names && p.names[d.key]; if (e && e.sym && !(except && except.p === p && except.d === d)) m.set(e.sym, [d.qty, `${nameOf(p, d)}’s ${e.sym}`]); }
    return m;
  }
  // text → { sym } | { val, unit } | { err }
  function parseEntry(text, d, p){
    const t = text.trim();
    if (!t) return { err: `Say what it is: a symbol like m, or a number with its unit like 2 ${QTY[d.qty].units.split(' ')[0]}.` };
    const num = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(\S*)$/i.exec(t);
    if (num){
      const val = parseFloat(num[1]), unit = num[2];
      if (!unit){ return val === 0 ? { val, unit: '' } : { err: `A number needs its unit: ${QTY[d.qty].units}.` }; }
      let dim; try { dim = parseUnit(unit); } catch { return { err: `“${unit}” isn’t a unit I know. A ${d.qty} is in ${QTY[d.qty].units}.` }; }
      if (!sameDim(dim, QTY[d.qty].dim)) return { err: `${unit} measures ${dimWord(dim)}, not ${d.qty}. A ${d.qty} is in ${QTY[d.qty].units}.` };
      if (val < 0) return { err: `A ${d.qty} can’t be negative here. Directions give the signs, not the number.` };
      return { val, unit };
    }
    if (!/^[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω0-9_]{0,7}$/.test(t)) return { err: `Type a symbol like m or M, or a number with its unit like 2 ${QTY[d.qty].units.split(' ')[0]}.` };
    const used = symbolKinds({ p, d }).get(t);
    if (used && used[0] !== d.qty) return { err: `${t} is already ${used[1]}, a ${used[0]}. A ${d.qty} needs a symbol of its own.` };
    return { sym: t };
  }
  const shown = (e) => e.sym !== undefined ? e.sym : `${e.val}${e.unit ? ' ' + e.unit : ''}`;

  // ---- freedoms
  const FREE = [['x', 'slide x'], ['y', 'slide y'], ['th', 'turn θ']];
  const MOVERS = ['rod', 'block', 'particle', 'wheel'];
  const clampedBy = (p) => p.answers.held === 'clamped' || S().list().some(q => q.kind === 'conn' && q.answers.kind === 'clamped' && (B.shape(q.id)?.ends || []).includes(p.id));
  const freedoms = (p) => clampedBy(p) ? 0 : FREE.filter(([k]) => p.free && p.free[k]).length;

  // ---- the knowns list: drawing, cards and assumed defaults
  function entries(){
    const out = [], add = (name, value, source, extra = {}) => out.push({ name, value, source, ...extra });
    const parts = S().list();
    for (const p of parts){
      const shape = B.shape(p.id);
      for (const d of nameables(p)){ const e = p.names && p.names[d.key]; if (e) add(nameOf(p, d), shown(e), 'card', { qty: d.qty }); else if (d.optional) add(nameOf(p, d), 'not given', 'drawing', { unknown: true, qty: d.qty }); }
      if (p.kind === 'rod'){
        if (shape && shape.props.length) add('L_rod', shape.props.length, 'drawing', { qty: 'length' });
        if (p.answers.mass === 'light') add('M_rod', '0', 'card', { qty: 'mass' });
      }
      if (p.kind === 'wheel'){
        if (shape && shape.props.radius) add('R_disc', shape.props.radius, 'drawing', { qty: 'length' });
        if (p.answers.mass === 'light') add('M_disc', '0', 'card', { qty: 'mass' });
        if (p.answers.shape in I_CM) add('I_cm', `${I_CM[p.answers.shape]}M_disc·R_disc²`, 'card', { qty: 'inertia' });
      }
      if (p.kind === 'pulley' && !p.off.light) add('M_pulley', '0', 'assumed');
      if (p.kind === 'string' && !p.off.ideal) add(`m_string${sub(p.n)}`, '0', 'assumed');
      if (p.kind === 'system'){
        if (p.answers.gravity === 'earth') add('g', '9.81 m/s²', 'card');
        if (p.answers.gravity === 'symbol') add('g', 'g', 'card');
      }
    }
    for (const fn of st.sources) out.push(...fn());
    return out;
  }
  const markOf = (name) => st.marks[name] || '';
  const targetNames = () => [...new Set([...st.targets, ...Object.keys(st.marks).filter(k => st.marks[k] === 'target')])];

  // ---- the counter
  function counter(){
    const parts = S().list(), sys = parts.find(p => p.kind === 'system'), still = sys && (sys.answers.motion === 'eq' || sys.answers.motion === 'steady');
    const tensions = entries().filter(e => e.unknown && markOf(e.name) !== 'off' && markOf(e.name) !== 'target' && !st.targets.includes(e.name)).length;
    const accel = still ? 0 : parts.filter(p => MOVERS.includes(p.kind)).reduce((n, p) => n + freedoms(p), 0);
    const unknowns = targetNames().length + tensions + accel;
    let rel = 0;
    for (const p of parts){
      if (p.kind !== 'string') continue;
      const sh = B.shape(p.id), bodies = new Set((sh?.ends || []).filter(id => { const q = B.shape(id); return q && q.kind !== 'pulley'; }));
      if (!p.off.ideal && bodies.size > 1) rel += bodies.size - 1;
      if (!p.off.noslip && (sh?.ends || []).some(id => B.shape(id)?.kind === 'wheel')) rel += 1;
    }
    const s = (n) => n === 1 ? '' : 's', need = unknowns - rel;
    const verdict = need > 0 ? `${need === 1 ? 'one more is' : need + ' more are'} needed` : need === 0 ? 'the counts match' : 'there are more relationships than unknowns, so some repeat';
    return { unknowns, rel, text: `${unknowns} unknown${s(unknowns)}, ${rel} relationship${s(rel)}: ${verdict}` };
  }

  // ---- card extras (called by setup.js): names, then freedoms
  function cardHTML(p){
    let html = '';
    const ns = nameables(p);
    if (ns.length) html += `<div class="dfnames"><div class="subhead">Names</div>${ns.map(d => {
      const e = p.names && p.names[d.key], bad = st.err && st.err.part === p.id && st.err.key === d.key;
      return `<div class="dfname" data-name="${d.key}"><label for="dfNm-${d.key}"><b>${nameOf(p, d)}</b>${d.optional ? ' (only if the problem gives it)' : ''} =</label>
        <input id="dfNm-${d.key}" type="text" value="${esc(e ? shown(e) : '')}" autocomplete="off" placeholder="symbol or number + unit">
        <button class="dfmini" data-setname="${d.key}">Set</button>${bad ? `<p class="small warn" role="alert">${esc(st.err.text)}</p>` : ''}</div>`;
    }).join('')}<p class="small muted">A number stays with its own name; a symbol like m can be shared by equal blocks.</p></div>`;
    if (MOVERS.includes(p.kind)){
      const c = clampedBy(p);
      html += `<div class="dffree"><div class="subhead">Can move</div><div class="row">${c ? '<span class="small muted">Clamped: it has no freedom of its own, it moves with what holds it.</span>'
        : `<button class="dfmini" data-fixed aria-pressed="${!freedoms(p)}">fixed</button>${FREE.map(([k, w]) => `<button class="dfmini" data-free="${k}" aria-pressed="${!!(p.free && p.free[k])}">${w}</button>`).join('')}`}</div></div>`;
    }
    if (p.kind === 'conn') html += '<div class="row"><button class="dfmini" data-delconn>Remove this connection</button></div>';
    return html;
  }
  // returns true when the click was one of ours (setup then redraws)
  function click(t, p){
    if (!p) return false;
    if (t.dataset.setname){
      const d = (NAMEABLE[p.kind] || []).find(x => x.key === t.dataset.setname), r = parseEntry(document.getElementById(`dfNm-${d.key}`).value, d, p);
      if (r.err){ st.err = { part: p.id, key: d.key, text: r.err }; return true; }
      st.err = null; p.names = p.names || {}; p.names[d.key] = r;
      say(`<b>${esc(nameOf(p, d))} = ${esc(shown(r))}</b> is in the knowns list.`); return true;
    }
    if ('fixed' in t.dataset){ p.free = {}; return true; }
    if (t.dataset.free){ p.free = { ...(p.free || {}), [t.dataset.free]: !(p.free && p.free[t.dataset.free]) }; return true; }
    if ('delconn' in t.dataset){ const sh = B.shape(p.id); if (sh){ B.checkpoint(); B.shapes.splice(B.shapes.indexOf(sh), 1); B.touch(); } return false; }
    return false;
  }

  // ---- the knowns card (right column)
  function render(){
    if (!S() || !S().done){ panel.innerHTML = '<div class="titlebar"><h2>Knowns</h2></div><div class="body"><p class="small muted">Knowns, targets and the counter appear once you press <b>Done drawing</b>.</p></div>'; return; }
    const list = entries();
    const row = (e) => {
      const mk = markOf(e.name), cls = mk === 'off' ? 'off' : mk === 'target' ? 'target' : e.unknown ? 'unknown' : 'given';
      return `<li class="kn ${cls}" data-kn="${esc(e.name)}" draggable="${e.unknown ? 'false' : 'true'}" title="Drag onto a symbol in the algebra to put it in"><b>${esc(e.name)}</b> = ${esc(e.value)} <span class="small muted">${e.source}</span>
        <button class="dfmini" data-ktarget="${esc(e.name)}" aria-pressed="${mk === 'target'}">Target</button> <button class="dfmini" data-koff="${esc(e.name)}" aria-pressed="${mk === 'off'}">Not needed</button></li>`;
    };
    const targets = st.targets.map(n => `<li class="kn target" data-kn="${esc(n)}"><b>${esc(n)}</b> = ? <span class="small muted">target</span> <button class="dfmini" data-kdel="${esc(n)}">Remove</button></li>`).join('');
    const c = counter();
    panel.innerHTML = `<div class="titlebar"><h2>Knowns</h2></div><div class="body">
      <ul class="dfklist">${targets}${list.map(row).join('') || '<li class="small muted">Nothing yet: name quantities on the cards.</li>'}</ul>
      <div class="row"><label for="dfTarget" class="small">Target</label><input id="dfTarget" type="text" placeholder="I" autocomplete="off" size="6"><button class="dfmini" id="dfTargetAdd">Add target</button></div>
      <p class="small dfcounter" id="dfCounter" aria-live="polite">${esc(c.text)}</p></div>`;
  }
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'dfTargetAdd'){
      const v = panel.querySelector('#dfTarget').value.trim();
      if (/^[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω0-9_]{0,7}$/.test(v) && !st.targets.includes(v)) st.targets.push(v);
    } else if (t.dataset.kdel) st.targets = st.targets.filter(n => n !== t.dataset.kdel);
    else if (t.dataset.ktarget) st.marks[t.dataset.ktarget] = markOf(t.dataset.ktarget) === 'target' ? '' : 'target';
    else if (t.dataset.koff) st.marks[t.dataset.koff] = markOf(t.dataset.koff) === 'off' ? '' : 'off';
    else return;
    render();
  });

  return { cardHTML, click, render, entries, counter, freedoms, addSource: (fn) => st.sources.push(fn), get targets(){ return targetNames(); } };
}
