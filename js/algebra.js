// Physics Lens — the algebra workspace (drawing-first).
// Lines of algebra, one under the other, each on one line (no stacked fractions). The tree here keeps the student's form:
// nothing is simplified unless the student asks. Every operation is exact and structural (divide, multiply, add, subtract,
// square, square-root, substitute); Simplify goes through expr.js, which is also what the checks (phase 8b) will use.
// Tap a term → a menu; Shift (or "Both sides") applies the operation to both sides, otherwise to that term only, even when
// that makes the equation untrue. Names follow Python: m_1 → m₁, I_cm, theta → θ, ** or ^ for powers, sqrt(...).
// Design: docs/drawing-first-plan.md, sections 7 and 8.
import { parse as exprParse, toRat, toText, symbol, addSamples, MathError } from './expr.js';
import { VARS, EQS, CHAPTERS } from './data.js';

const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- names
const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', eta: 'η', theta: 'θ', lambda: 'λ', mu: 'μ', rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ', phi: 'φ', omega: 'ω', Omega: 'Ω' };
const FROM_GREEK = Object.fromEntries(Object.entries(GREEK).map(([k, v]) => [v, k]));
const SUBD = '₀₁₂₃₄₅₆₇₈₉', SUBL = { 'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x', 'ₕ': 'h', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₚ': 'p', 'ₛ': 's', 'ₜ': 't', '꜀': 'c' };
const MARKS = { '∥': 'par', '⊥': 'perp' }, FROM_MARK = { par: '∥', perp: '⊥' };
const INLINE = ['Delta', 'Sigma'];   // Δx and Στ are written side by side, not as a subscript
const ID = /^[A-Za-z][A-Za-z0-9]*(_[A-Za-z0-9]+)*$/;
const FNS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'];

// any spelling (m_1, m₁, θ, theta, ω₀, W∥, Δx) → the Python-style id (m_1, theta, omega_0, W_par, Delta_x); null if it isn't a name
export function toId(raw){
  let out = '';
  const sub = () => { if (!out.includes('_')) out += '_'; };
  const chars = [...String(raw).trim()];
  chars.forEach((c, j) => {
    if (FROM_GREEK[c]){ out += FROM_GREEK[c]; if (j + 1 < chars.length && (/[A-Za-z]/.test(chars[j + 1]) || FROM_GREEK[chars[j + 1]])) out += '_'; }
    else if (SUBD.includes(c)){ sub(); out += SUBD.indexOf(c); }
    else if (SUBL[c]){ sub(); out += SUBL[c]; }
    else if (MARKS[c]){ sub(); out += MARKS[c]; }
    else out += c;
  });
  return ID.test(out) && !FNS.includes(out) && out !== 'sqrt' ? out : null;
}
// id → how it is shown: { text, html }
export function display(id){
  const k = id.indexOf('_'), base = k < 0 ? id : id.slice(0, k), sub = k < 0 ? '' : id.slice(k + 1);
  const b = GREEK[base] || base;
  if (!sub) return { text: b, html: esc(b) };
  const s = GREEK[sub] || FROM_MARK[sub] || sub;
  if (INLINE.includes(base) || FROM_MARK[sub]) return { text: b + s, html: esc(b + s) };
  return { text: /^\d+$/.test(s) ? b + [...s].map(d => SUBD[+d]).join('') : `${b}_${s}`, html: `${esc(b)}<sub>${esc(s)}</sub>` };
}

// ---------------------------------------------------------------- parsing (one line, Python-style or the app's own notation)
// nodes: num {v, s} · sym {id} · add {a: []} · neg {a} · mul {a: []} · div {n, d} · pow {b, e} · sqrt {a} · fn {f, a}
const SUP = { '²': 2, '³': 3, '⁴': 4, '⁵': 5 };
export class InputError extends Error {}
export function parse(src){
  const s = String(src);
  let i = 0;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const peek = () => { ws(); return s[i]; };
  const fail = (why) => { throw new InputError(why); };
  const isName = (c) => c !== undefined && (/[A-Za-z]/.test(c) || FROM_GREEK[c]);
  const startsPrimary = () => { const c = peek(); return c !== undefined && (/[0-9.½({\[√]/.test(c) || isName(c)); };
  function expr(){
    let node;
    const c = peek();
    if (c === '-' || c === '−'){ i++; node = { t: 'neg', a: term() }; }
    else { if (c === '+') i++; node = term(); }
    const terms = [node];
    for (;;){
      const o = peek();
      if (o === '+'){ i++; terms.push(term()); }
      else if (o === '-' || o === '−'){ i++; terms.push({ t: 'neg', a: term() }); }
      else break;
    }
    return terms.length > 1 ? { t: 'add', a: terms } : node;
  }
  function term(){
    let node = unary();
    for (;;){
      const c = peek();
      if (c === '*' && s[i + 1] !== '*' || c === '·' || c === '×'){ i++; node = mul(node, unary()); }
      else if (c === '/' || c === '÷'){ i++; node = { t: 'div', n: node, d: unary() }; }
      else if (startsPrimary()) node = mul(node, power());
      else return node;
    }
  }
  const mul = (a, b) => a.t === 'mul' ? { t: 'mul', a: [...a.a, b] } : { t: 'mul', a: [a, b] };
  function unary(){ const c = peek(); if (c === '-' || c === '−'){ i++; return { t: 'neg', a: unary() }; } return power(); }
  function power(){
    let node = primary();
    for (;;){
      const c = peek();
      if (c in SUP){ i++; node = { t: 'pow', b: node, e: { t: 'num', v: SUP[c] } }; }
      else if (c === '^' || (c === '*' && s[i + 1] === '*')){ i += c === '^' ? 1 : 2; node = { t: 'pow', b: node, e: unary() }; }
      else return node;
    }
  }
  function primary(){
    const c = peek();
    if (c === undefined) fail('Something is missing at the end.');
    if (c === '½'){ i++; return { t: 'num', v: 0.5, s: '½' }; }
    if (/[0-9.]/.test(c)){ const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i)); if (!m) fail(`“${c}” isn’t a number.`); i += m[0].length; return { t: 'num', v: Number(m[0]), s: m[0] }; }
    if (c === '(' || c === '['){ const close = c === '(' ? ')' : ']'; i++; const e = expr(); if (peek() !== close) fail(`A “${c}” has no matching “${close}”.`); i++; return e; }
    if (c === '{'){ const j = s.indexOf('}', i); if (j < 0) fail('A “{” has no matching “}”.'); const id = s.slice(i + 1, j); i = j + 1; if (!ID.test(id)) fail(`“${id}” isn’t a name.`); return { t: 'sym', id }; }
    if (c === '√'){ i++; return { t: 'sqrt', a: power() }; }
    if (isName(c)){
      const m = /^[A-Za-z0-9_α-ωΑ-Ω₀-₉ₐₑₒₓₕₖₗₘₙₚₛₜ꜀∥⊥]+/.exec(s.slice(i)); i += m[0].length;
      let w = m[0];
      if (w === 'sqrt'){ if (peek() !== '(') fail('Write sqrt(…) with brackets.'); return { t: 'sqrt', a: primary() }; }
      if (['sin', 'cos', 'tan'].includes(w) && s.startsWith('⁻¹', i)){ i += 2; w = 'a' + w; }
      if (FNS.includes(w)) return { t: 'fn', f: w, a: peek() === '(' ? primary() : power() };
      const id = toId(w); if (!id) fail(`“${w}” isn’t a name. Names look like m, m_1, I_cm or theta.`);
      return { t: 'sym', id };
    }
    fail(`“${c}” can’t go there.`);
  }
  if (!s.trim()) fail('The line is empty.');
  const tree = expr();
  if (peek() !== undefined) fail(`I couldn’t read “${s.slice(i).trim()}”. Use * to multiply, / to divide, ** or ^ for powers.`);
  return tree;
}
export function parseEq(src){
  const parts = String(src).split('=');
  if (parts.length !== 2) throw new InputError(parts.length < 2 ? 'A line needs one = sign.' : 'A line has only one = sign.');
  return { l: parse(parts[0]), r: parse(parts[1]) };
}

// ---------------------------------------------------------------- printing (one line; text or HTML)
const RANK = { add: 1, neg: 2, mul: 3, div: 3, pow: 4, sqrt: 5, fn: 5, sym: 5, num: 5 };
const SUPC = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const fmt = (v) => String(+v.toPrecision(12));
export function print(n, o = {}){
  const P = (x) => print(x, o), wrap = (x, below) => RANK[x.t] <= below ? `(${P(x)})` : P(x);
  switch (n.t){
    case 'num': return n.s || fmt(n.v);
    case 'sym': { const d = display(n.id), cls = o.cls ? o.cls(n.id) : ''; return o.html ? `<span class="sym${cls ? ' ' + cls : ''}">${d.html}</span>` : d.text; }
    case 'add': return n.a.map((t, j) => t.t === 'neg' ? (j ? ' − ' : '−') + wrap(t.a, 2) : (j ? ' + ' : '') + P(t)).join('');
    case 'neg': return '−' + wrap(n.a, 2);
    case 'mul': {
      let out = '';
      n.a.forEach((f, j) => {
        const s = f.t === 'div' || RANK[f.t] <= 2 ? `(${P(f)})` : P(f), plain = o.html ? print(f, { ...o, html: false }) : s;
        if (j){ const prev = n.a[j - 1], under = (x) => !o.html && x.t === 'sym' && /_/.test(display(x.id).text); out += prev.t === 'fn' || f.t === 'fn' ? ' ' : /^[0-9.½]/.test(plain) || under(f) || under(prev) ? '·' : ''; }
        out += s;
      });
      return out;
    }
    case 'div': return `${n.n.t === 'div' ? `(${P(n.n)})` : wrap(n.n, 2)}/${n.d.t === 'mul' || n.d.t === 'div' ? `(${P(n.d)})` : wrap(n.d, 2)}`;
    case 'pow': {
      const b = n.b.t === 'sym' || (n.b.t === 'num' && !n.b.s?.includes('.')) ? P(n.b) : `(${P(n.b)})`;
      const e = n.e.t === 'num' && Number.isInteger(n.e.v) && n.e.v >= 0 && n.e.v < 10 ? n.e.v : null;
      if (o.html) return `${b}<sup>${e !== null ? e : P(n.e)}</sup>`;
      return e !== null ? b + SUPC[e] : `${b}^${RANK[n.e.t] >= 5 ? P(n.e) : `(${P(n.e)})`}`;
    }
    case 'sqrt': return '√' + (n.a.t === 'sym' || n.a.t === 'num' ? P(n.a) : `(${P(n.a)})`);
    case 'fn': { const name = n.f.startsWith('a') ? n.f.slice(1) + '⁻¹' : n.f; return n.a.t === 'sym' || n.a.t === 'num' ? `${name} ${P(n.a)}` : `${name}(${P(n.a)})`; }
  }
  throw new Error('print: bad node ' + n.t);
}
export const eqText = (eq, o) => `${print(eq.l, o)} = ${print(eq.r, o)}`;

// ---------------------------------------------------------------- tree helpers
export const termsOf = (side) => side.t === 'add' ? side.a : [side];
const fromTerms = (ts) => ts.length === 1 ? ts[0] : { t: 'add', a: ts };
const clone = (n) => JSON.parse(JSON.stringify(n));
export function symsOf(n, out = []){
  if (n.t === 'sym'){ if (!out.includes(n.id)) out.push(n.id); }
  else for (const k of ['a', 'b', 'e', 'n', 'd']) if (n[k]) (Array.isArray(n[k]) ? n[k] : [n[k]]).forEach(x => symsOf(x, out));
  return out;
}
const replace = (n, id, val) => n.t === 'sym' ? (n.id === id ? clone(val) : n)
  : Object.fromEntries(Object.entries(n).map(([k, v]) => [k, Array.isArray(v) ? v.map(x => replace(x, id, val)) : v && typeof v === 'object' ? replace(v, id, val) : v]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// the factors a student can divide or multiply by: the term itself, then its factors (numerator and denominator)
export function factorsOf(t){
  const inner = t.t === 'neg' ? t.a : t, out = [inner];
  const walk = (x) => { if (x.t === 'mul') x.a.forEach(walk); else if (x.t === 'div'){ walk(x.n); walk(x.d); } else if (!out.some(y => same(y, x))) out.push(x); };
  if (inner.t === 'mul' || inner.t === 'div') walk(inner);
  return out;
}

// ---------------------------------------------------------------- simplify (through expr.js: exact, canonical)
const NS = 'ws:';
function toExpr(n){
  switch (n.t){
    case 'num': return { t: 'num', v: n.v };
    case 'sym': return { t: 'var', id: NS + n.id };
    case 'add': return { t: 'add', a: n.a.map(toExpr) };
    case 'neg': return { t: 'neg', a: toExpr(n.a) };
    case 'mul': return { t: 'mul', a: n.a.map(toExpr) };
    case 'div': return { t: 'div', n: toExpr(n.n), d: toExpr(n.d) };
    case 'sqrt': return { t: 'sqrt', a: toExpr(n.a) };
    case 'fn': return { t: 'fn', f: n.f, a: toExpr(n.a) };
    case 'pow': {
      const e = n.e.t === 'num' ? n.e.v : n.e.t === 'neg' && n.e.a.t === 'num' ? -n.e.a.v : n.e.t === 'div' && n.e.n.t === 'num' && n.e.d.t === 'num' ? n.e.n.v / n.e.d.v : NaN;
      if (e === 0.5) return { t: 'sqrt', a: toExpr(n.b) };
      if (!Number.isInteger(e)) throw new MathError('Only whole-number powers and square roots can be simplified.');
      return { t: 'pow', b: toExpr(n.b), e };
    }
  }
}
// symbols stand for positive sizes; each gets a fixed sample value so roots and signs are read the way a physicist would
const sampleOf = (id) => 1.3 + ([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) % 89) / 61;
export function simplify(n){
  const ids = symsOf(n);
  addSamples(Object.fromEntries(ids.map(id => [NS + id, sampleOf(id)])));
  const r = toRat(toExpr(n), Object.fromEntries(ids.map(id => [NS + id, symbol(NS + id)])));
  return parse(toText(r, { plain: (id) => `{${id.slice(NS.length)}}`, order: ids.map(id => NS + id), fmt }));
}

// ---------------------------------------------------------------- operations
// op: { k: 'div'|'mul'|'add'|'sub'|'sq'|'sqrt'|'subst'|'simp', x (tree), sym (id, for subst) }
// at: { side: 'l'|'r', i } for one term, or null for both sides. Returns a new equation; the old one is untouched.
const times = (a, x) => x.t === 'num' ? { t: 'mul', a: [x, ...(a.t === 'mul' ? a.a : [a])] } : { t: 'mul', a: [...(a.t === 'mul' ? a.a : [a]), x] };
const ONE = {
  div: (t, op) => ({ t: 'div', n: t, d: clone(op.x) }),
  mul: (t, op) => times(t, clone(op.x)),
  sq: (t) => ({ t: 'pow', b: t, e: { t: 'num', v: 2 } }),
  sqrt: (t) => ({ t: 'sqrt', a: t }),
  subst: (t, op) => replace(t, op.sym, op.x),
  simp: (t) => simplify(t),
};
export function applyOp(eq, op, at){
  const e = clone(eq);
  if (!at){
    for (const side of ['l', 'r']){
      if (op.k === 'add' || op.k === 'sub') e[side] = fromTerms([...termsOf(e[side]), op.k === 'sub' ? { t: 'neg', a: clone(op.x) } : clone(op.x)]);
      else e[side] = ONE[op.k](e[side], op);
    }
    return e;
  }
  const ts = [...termsOf(e[at.side])], t = ts[at.i];
  if (op.k === 'add' || op.k === 'sub') ts.splice(at.i + 1, 0, op.k === 'sub' ? { t: 'neg', a: clone(op.x) } : clone(op.x));
  else if (op.k === 'sq' || op.k === 'sqrt') ts[at.i] = ONE[op.k](t, op);             // the signed term is squared or rooted
  else ts[at.i] = t.t === 'neg' ? { t: 'neg', a: ONE[op.k](t.a, op) } : ONE[op.k](t, op);  // the sign stays outside
  e[at.side] = fromTerms(ts);
  return e;
}
// what a line says it did
export function describe(op, at){
  const x = op.x ? print(op.x) : '';
  const what = { div: `÷ ${x}`, mul: `× ${x}`, add: `+ ${x}`, sub: `− ${x}`, sq: 'squared', sqrt: 'square-rooted', simp: 'simplified', subst: `${op.sym ? display(op.sym).text : ''} → ${x}` }[op.k];
  return at ? `${what}, this term only` : op.k === 'subst' ? `${what} everywhere` : `${what}, both sides`;
}
// typed operations: "/ 2", "* m", "+ x", "- x", "**2", "^2", "sqrt", "simplify", "m_1 = m"
export function parseOp(text){
  const t = text.trim();
  if (/^simplify$/i.test(t)) return { k: 'simp' };
  if (/^(sqrt(\(\))?|√)$/.test(t)) return { k: 'sqrt' };
  if (/^((\*\*|\^)\s*2|²)$/.test(t)) return { k: 'sq' };
  const m = /^([*·×/÷+\-−])\s*(.+)$/.exec(t);
  if (m) return { k: { '*': 'mul', '·': 'mul', '×': 'mul', '/': 'div', '÷': 'div', '+': 'add', '-': 'sub', '−': 'sub' }[m[1]], x: parse(m[2]) };
  const s = /^([^=]+)=([^=]+)$/.exec(t);
  if (s){ const l = parse(s[1]); if (l.t !== 'sym') throw new InputError('To substitute, put one symbol before the = sign, like r_1 = L/2.'); return { k: 'subst', sym: l.id, x: parse(s[2]) }; }
  throw new InputError('Type an operation: / 2, * m, + x, - x, **2, sqrt, simplify, or a substitution like r_1 = L/2.');
}

// ---------------------------------------------------------------- the formula sheet: the library, regrouped by idea, neutral
const pointMasses = (n) => {
  const t = (k) => n === 1 ? '{m}{r}²' : `{m_${k}}{r_${k}}²`;
  return { l: parse('{I}'), r: parse(Array.from({ length: n }, (_, k) => t(k + 1)).join(' + ')) };
};
let LIB = null;
function library(){
  if (LIB) return LIB;
  const groups = new Map(), seen = new Set();
  const group = (title, chapter) => { if (!groups.has(title)) groups.set(title, { title, chapter, items: [] }); return groups.get(title); };
  group('Moments of inertia', 'Rotation').items.push({ key: 'Isum', name: 'Point masses: I = Σ m r², one term per mass', vars: ['I', 'm', 'r'], words: 'moment of inertia point mass masses sum sigma' });
  for (const ch of Object.values(CHAPTERS)) for (const sec of ch.sections || []) for (const key of sec.eqs){
    const q = EQS[key]; if (!q || seen.has(key)) continue;
    const lhs = q.vars && q.vars[0], sol = q.solve && q.solve[lhs];
    if (!sol || !sol.sub) continue;
    const ids = {}; let ok = true;
    for (const id of q.vars){ const v = VARS[id], name = v && toId(v.plain); if (!name) ok = false; ids[id] = name; }
    if (!ok) continue;
    let line;
    try { line = { l: parse(`{${ids[lhs]}}`), r: parse(sol.sub.replace(/\{(\w+)\}/g, (_, id) => `{${ids[id] || toId(VARS[id]?.plain || '') || id}}`)) }; } catch { continue; }
    seen.add(key);
    group(sec.title, ch.short || ch.title).items.push({ key, line, name: q.meaning || '', vars: q.vars.map(id => ids[id]), words: [q.meaning, q.condition, ...q.vars.map(id => VARS[id].name)].join(' ') });
  }
  return (LIB = [...groups.values()]);
}
// entries matching a search, grouped; nMasses sets the terms of I = Σ m r²
export function sheet(query = '', nMasses = 1){
  const q = query.trim(), words = q.toLowerCase().split(/\s+/).filter(Boolean), qid = toId(q);
  const hit = (g, it) => !q || (qid && it.vars.includes(qid)) || words.every(w => `${g.title} ${g.chapter} ${it.name} ${it.words}`.toLowerCase().includes(w));
  return library().map(g => ({ ...g, items: g.items.filter(it => hit(g, it)).map(it => it.key === 'Isum' ? { ...it, line: pointMasses(nMasses) } : it) })).filter(g => g.items.length);
}

// ---------------------------------------------------------------- the workspace (UI)
export function createWorkspace({ panel, knowns, masses, say }){
  const st = { lines: [], cur: -1, sel: null, n: null, msg: '', ac: [] };
  const $ = (id) => document.getElementById(id);
  const pop = (id) => { let p = $(id); if (!p){ p = document.createElement('div'); p.id = id; p.className = 'pop algpop'; p.hidden = true; document.body.appendChild(p); } return p; };
  const menu = pop('algMenu'), sh = pop('algSheet');
  const active = () => st.lines.slice(0, st.cur + 1);

  // ---- symbols: the knowns list (names and values), targets, and every symbol on an active line
  function known(){
    const out = [];
    for (const e of knowns().entries()){
      let v = null; try { v = parse(e.value); } catch {}
      out.push({ id: toId(e.name), name: e.name, value: v, source: e.source });
    }
    return out;
  }
  function defined(){
    const s = new Set();
    for (const k of known()){ if (k.id) s.add(k.id); if (k.value) symsOf(k.value).forEach(x => s.add(x)); }
    for (const t of knowns().targets){ const id = toId(t); if (id) s.add(id); }
    for (const L of active()){ symsOf(L.l).forEach(x => s.add(x)); symsOf(L.r).forEach(x => s.add(x)); }
    return s;
  }
  function cls(id){
    if (knowns().targets.some(t => toId(t) === id)) return 's-target';
    return known().some(k => k.id === id && k.value) ? 's-given' : '';
  }
  // a typo can't make a new symbol: every name must already be defined
  function checkNames(trees){
    const def = defined();
    for (const id of trees.flatMap(t => symsOf(t))){
      if (def.has(id)) continue;
      const split = [...id].every(c => def.has(c)) ? ` Did you mean ${[...id].join('*')}?` : '';
      throw new InputError(`${display(id).text} isn’t defined in this problem.${split} Defined: ${[...def].map(x => display(x).text).join(', ') || 'nothing yet'}.`);
    }
  }

  // ---- lines
  function add(eq, how){
    st.lines = st.lines.slice(0, st.cur + 1);
    st.lines.push({ ...eq, how });
    st.cur = st.lines.length - 1; st.sel = null; st.msg = '';
    closeMenu(); render();
  }
  function run(op, at, lineIx){
    try { add(applyOp(st.lines[lineIx], op, at), describe(op, at)); return true; }
    catch (err){ if (!(err instanceof MathError || err instanceof InputError)) throw err; st.msg = err.message; render(); return false; }
  }
  const sideHTML = (side, i, live) => termsOf(st.lines[i][side]).map((t, j) => {
    const neg = t.t === 'neg', body = print(neg && j ? t.a : t, { html: true, cls });
    const op = j ? (neg ? ' − ' : ' + ') : '';
    const on = st.sel && st.sel.line === i && st.sel.side === side && st.sel.i === j;
    return op + (live ? `<button class="algterm${on ? ' on' : ''}" data-line="${i}" data-side="${side}" data-term="${j}" title="Tap for what you can do with this term">${body}</button>` : `<span class="algterm">${body}</span>`);
  }).join('');
  function render(){
    const rows = st.lines.map((L, i) => {
      const live = i <= st.cur;
      return `<li class="algline${live ? '' : ' grey'}${i === st.cur ? ' cur' : ''}" data-line="${i}"><span class="algeq">${sideHTML('l', i, live)} = ${sideHTML('r', i, live)}</span>
        <span class="small muted alghow">${esc(L.how)}</span>${i !== st.cur ? `<button class="dfmini" data-back="${i}" title="${live ? 'Continue from this line; the lines after it are greyed until you do' : 'Bring the lines back up to here'}">Back to here</button>` : ''}</li>`;
    }).join('');
    panel.innerHTML = `<div class="titlebar"><h2>Algebra</h2><button id="algSheetBtn" title="Every relationship in the library, by idea (or press / in the line box)">Formula sheet</button><button id="algUndo" title="Step back one line; later lines stay greyed until you continue">Undo</button></div>
      <div class="body"><ol class="alglines" id="algLines">${rows || '<li class="small muted">Pick a relationship from the <b>Formula sheet</b>, or type a line below.</li>'}</ol>
      <div class="row algrow"><input id="algIn" type="text" autocomplete="off" spellcheck="false" placeholder="Type a line (I = m_1*r_1**2) · / for the sheet" aria-label="Type a line or an operation"><button id="algGo">Add</button></div>
      <div class="algac" id="algAc"></div>
      <p class="small" id="algMsg" aria-live="polite">${esc(st.msg)}</p>
      <p class="small muted">Tap a term for what you can do with it; hold <b>Shift</b> to do it to both sides. Enter applies a typed operation (/ 2, * m, ^2, sqrt, simplify) to the term you picked; Shift+Enter to both sides, and Shift+Enter on r_1 = L/2 swaps r₁ for L/2 everywhere.</p></div>`;
  }

  // ---- autocomplete: only defined symbols
  function complete(input, box){
    const m = /[A-Za-z_][A-Za-z0-9_]*$/.exec(input.value.slice(0, input.selectionStart));
    st.ac = m ? [...defined()].filter(id => id.startsWith(m[0]) && id !== m[0]).sort().slice(0, 6) : [];
    st.acFor = { input, len: m ? m[0].length : 0 };
    box.innerHTML = st.ac.map((id, j) => `<button class="dfmini" data-ac="${j}" title="Tab takes the first">${display(id).html} <span class="muted">${esc(id)}</span></button>`).join('');
  }
  function acceptAc(j){
    const { input, len } = st.acFor, at = input.selectionStart, id = st.ac[j];
    input.value = input.value.slice(0, at - len) + id + input.value.slice(at);
    input.setSelectionRange(at - len + id.length, at - len + id.length);
    st.ac = []; input.dispatchEvent(new Event('input'));
  }

  // ---- the term menu
  function closeMenu(){ menu.hidden = true; st.menu = null; }
  function substitutes(id, lineIx){
    const out = [], seen = new Set(), push = (v, from) => { const k = print(v); if (seen.has(k) || (v.t === 'sym' && v.id === id)) return; seen.add(k); out.push({ v, from }); };
    for (const k of known()) if (k.id === id && k.value) push(k.value, `${k.name} (${k.source})`);
    active().forEach((L, j) => { if (j === lineIx) return; for (const [a, b] of [[L.l, L.r], [L.r, L.l]]) if (a.t === 'sym' && a.id === id && !symsOf(b).includes(id)) push(b, `line ${j + 1}`); });
    for (const k of known()) if (k.value && out.length < 8) push(k.value, `${k.name} (${k.source})`);
    return out;
  }
  const termBtn = (sel) => panel.querySelector(`button[data-line="${sel.line}"][data-side="${sel.side}"][data-term="${sel.i}"]`);
  function openMenu(sel){
    st.sel = sel; render();
    const t = termsOf(st.lines[sel.line][sel.side])[sel.i], opnds = factorsOf(t), subs = symsOf(t).map(id => ({ id, cands: substitutes(id, sel.line) }));
    st.menu = { opnds, subs, opnd: 0 };
    const chips = opnds.map((x, j) => `<button class="dfmini" data-opnd="${j}" aria-pressed="${j === 0}">${print(x, { html: true })}</button>`).join('');
    menu.innerHTML = `<div class="row"><span class="small">Term <b class="algmono">${print(t, { html: true })}</b></span><label class="small"><input type="checkbox" id="algBoth"> Both sides (or hold Shift)</label><button class="dfmini" data-close title="Close (Esc)">×</button></div>
      <div class="row small">By: ${chips}</div>
      <div class="row">${[['div', '÷'], ['mul', '×'], ['add', '+'], ['sub', '−']].map(([k, s]) => `<button data-op="${k}" title="${s} the one picked under By">${s}</button>`).join('')}<button data-op="sq">Square</button><button data-op="sqrt">√</button><button data-op="simp" title="Collect and cancel, exactly">Simplify</button></div>
      ${subs.map((s, a) => `<div class="row small"><span class="algmono">${display(s.id).html} =</span> ${s.cands.map((c, b) => `<button class="dfmini" data-subsym="${esc(s.id)}" data-subval="${esc(print(c.v))}" data-sub="${a}:${b}" title="${esc(c.from)}">${print(c.v, { html: true })}</button>`).join('') || '<span class="muted">nothing known yet: type it below, like ' + esc(s.id) + ' = …</span>'}</div>`).join('')}
      <input id="algOp" type="text" autocomplete="off" spellcheck="false" placeholder="/ 2 · * m · ^2 · sqrt · simplify · ${esc(subs[0]?.id || 'x')} = …" aria-label="Type an operation for this term">
      <div class="algac" id="algOpAc"></div><div class="small hot" id="algOpErr"></div>`;
    const r = termBtn(sel).getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(innerWidth - 350, r.left)) + 'px'; menu.style.top = Math.max(8, Math.min(innerHeight - 300, r.bottom + 6)) + 'px';
    menu.hidden = false; $('algOp').focus();
  }
  const both = (e) => e.shiftKey || $('algBoth')?.checked;
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !st.menu) return;
    const { line, side, i } = st.sel, at = both(e) ? null : { side, i };
    if (b.dataset.close !== undefined){ closeMenu(); st.sel = null; render(); return; }
    if (b.dataset.opnd){ st.menu.opnd = +b.dataset.opnd; menu.querySelectorAll('[data-opnd]').forEach(c => c.setAttribute('aria-pressed', String(c === b))); return; }
    if (b.dataset.ac) return acceptAc(+b.dataset.ac);
    if (b.dataset.op) run({ k: b.dataset.op, x: st.menu.opnds[st.menu.opnd] }, at, line);
    if (b.dataset.sub){ const [a, c] = b.dataset.sub.split(':').map(Number), s = st.menu.subs[a]; run({ k: 'subst', sym: s.id, x: s.cands[c].v }, at, line); }
  });
  menu.addEventListener('input', (e) => { if (e.target.id === 'algOp') complete(e.target, $('algOpAc')); });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){ closeMenu(); const sel = st.sel; st.sel = null; render(); if (sel) termBtn(sel)?.focus(); return; }
    if (e.target.id !== 'algOp') return;
    if (e.key === 'Tab' && st.ac.length){ e.preventDefault(); acceptAc(0); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    try { const op = parseOp(e.target.value); checkNames([op.x].filter(Boolean)); run(op, e.shiftKey ? null : { side: st.sel.side, i: st.sel.i }, st.sel.line); }
    catch (err){ if (!(err instanceof InputError)) throw err; $('algOpErr').textContent = err.message; }
  });

  // ---- the formula sheet popup
  function openSheet(){
    if (st.n === null) st.n = Math.max(1, masses());
    sh.innerHTML = `<div class="row"><input id="algSheetQ" type="search" autocomplete="off" placeholder="Search: moment of inertia, I, point mass" aria-label="Search the formula sheet"><button class="dfmini" data-close title="Close (Esc)">×</button></div><div class="algsheet" id="algSheetList"></div>`;
    sh.hidden = false; listSheet(); $('algSheetQ').focus();
  }
  function listSheet(){
    const q = $('algSheetQ').value;
    st.sheet = sheet(q, st.n).flatMap(g => g.items);
    $('algSheetList').innerHTML = sheet(q, st.n).map(g => `<div class="algsg"><div class="subhead">${esc(g.title)} <span class="muted small">${esc(g.chapter)}</span></div>${g.items.map(it => `<div class="algse">
      <button class="algpick" data-pick="${esc(it.key)}">${eqText(it.line, { html: true })}</button><span class="small muted">${esc(it.name)}</span>
      ${it.key === 'Isum' ? `<span class="small algsn"><button class="dfmini" data-sheetn="-1" aria-label="One mass fewer">−</button> <span id="algSheetN">${st.n}</span> mass${st.n === 1 ? '' : 'es'} <button class="dfmini" data-sheetn="1" aria-label="One more mass">+</button></span>` : ''}</div>`).join('')}</div>`).join('') || '<p class="small muted">Nothing matches. Try a word like “inertia”, “torque” or a symbol like I.</p>';
    st.pick = q.trim() ? 0 : -1; markPick();   // neutral: nothing is marked until the student searches or uses the arrows
  }
  const markPick = () => sh.querySelectorAll('.algpick').forEach((b, j) => b.classList.toggle('on', j === st.pick));
  function choose(key){
    const it = st.sheet.find(x => x.key === key); if (!it) return;
    sh.hidden = true; add(clone(it.line), 'from the formula sheet'); $('algIn')?.focus();
  }
  sh.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.close !== undefined){ sh.hidden = true; return; }
    if (b.dataset.sheetn){ st.n = Math.max(1, Math.min(12, st.n + +b.dataset.sheetn)); listSheet(); return; }
    if (b.dataset.pick) choose(b.dataset.pick);
  });
  sh.addEventListener('input', (e) => { if (e.target.id === 'algSheetQ') listSheet(); });
  sh.addEventListener('keydown', (e) => {
    const n = st.sheet?.length || 0;
    if (e.key === 'Escape'){ sh.hidden = true; $('algIn')?.focus(); }
    else if (e.key === 'ArrowDown' && n){ e.preventDefault(); st.pick = (st.pick + 1) % n; markPick(); }
    else if (e.key === 'ArrowUp' && n){ e.preventDefault(); st.pick = (Math.max(st.pick, 0) - 1 + n) % n; markPick(); }
    else if (e.key === 'Enter' && e.target.id === 'algSheetQ' && st.pick >= 0){ e.preventDefault(); choose(st.sheet[st.pick].key); }
  });

  // ---- the line box: a whole new line, or an operation on the picked term (Enter) or both sides (Shift+Enter)
  function enter(text, shift){
    const t = text.trim(); if (!t) return false;
    const lineIx = st.sel ? st.sel.line : st.cur;
    try {
      if (t.includes('=') && !(shift && st.cur >= 0)){
        const eq = parseEq(t); checkNames([eq.l, eq.r]); add(eq, 'typed'); return true;
      }
      const op = parseOp(t); checkNames([op.x].filter(Boolean));
      if (lineIx < 0) throw new InputError('There is no line yet: type one with an = sign, or press / for the formula sheet.');
      if (!shift && !st.sel) throw new InputError('Pick a term first (tap it, or Tab to it), or press Shift+Enter to do it to both sides.');
      return run(op, shift ? null : { side: st.sel.side, i: st.sel.i }, lineIx);
    } catch (err){ if (!(err instanceof InputError || err instanceof MathError)) throw err; st.msg = err.message; render(); $('algIn').value = t; $('algIn').focus(); return false; }
  }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'algSheetBtn') return openSheet();
    if (b.id === 'algUndo'){ if (st.cur >= 0){ st.cur--; st.sel = null; closeMenu(); render(); } return; }
    if (b.id === 'algGo'){ if (enter($('algIn').value, e.shiftKey)) $('algIn').focus(); return; }
    if (b.dataset.back){ st.cur = +b.dataset.back; st.sel = null; closeMenu(); render(); return; }
    if (b.dataset.ac){ acceptAc(+b.dataset.ac); return; }
    if (b.dataset.term) openMenu({ line: +b.dataset.line, side: b.dataset.side, i: +b.dataset.term });
  });
  panel.addEventListener('input', (e) => { if (e.target.id === 'algIn') complete(e.target, $('algAc')); });
  panel.addEventListener('keydown', (e) => {
    if (e.target.id !== 'algIn') return;
    if (e.key === '/' && !e.target.value && !st.sel){ e.preventDefault(); openSheet(); }
    else if (e.key === 'Tab' && st.ac.length){ e.preventDefault(); acceptAc(0); }
    else if (e.key === 'Enter'){ e.preventDefault(); if (enter(e.target.value, e.shiftKey)) $('algIn').focus(); }
  });

  function clear(){ st.lines = []; st.cur = -1; st.sel = null; st.n = null; st.msg = ''; closeMenu(); sh.hidden = true; render(); }
  return { render, clear, state: () => ({ lines: st.lines.map(L => eqText(L)), cur: st.cur, how: st.lines.map(L => L.how) }) };
}
