// Rotation Lab — a small expression engine.
// 1. parse(): reads an equation's plug-in template (`sub`, e.g. "{g}(sin {inc} − {mu} cos {inc})") into a tree.
// 2. evalNum(): evaluates the tree with numbers (angles inside sin/cos/tan are in degrees, like `inc`).
// 3. toRat(): evaluates the tree with symbols and simplifies it to a canonical rational form:
//    numerator = a sum of monomials, denominator = a product of irreducible sums. Like terms combine,
//    common factors cancel (including whole sums such as (m₁ + m₂)), and sin/cos print as tan.
// 4. toHTML() / toText(): print a simplified result. dimOf(): checks units term by term.
// No dependencies; data.js and app.js pass in names, sample values and units.

// ---------------------------------------------------------------- parsing
const SUP = { '²': 2, '³': 3, '⁴': 4, '⁵': 5 };

export function parse(src){
  let i = 0;
  const s = src;
  const ws = () => { while (i < s.length && s[i] === ' ') i++; };
  const peek = () => { ws(); return s[i]; };
  const startsFactor = () => { const c = peek(); return c !== undefined && (/[0-9.½{(\[√]/.test(c) || s.startsWith('sin', i) || s.startsWith('cos', i) || s.startsWith('tan', i)); };

  function expr(){
    ws();
    let first;
    if (s[i] === '−' || s[i] === '-'){ i++; first = { t: 'neg', a: term() }; }
    else if (s[i] === '±'){ i++; first = { t: 'pm', a: { t: 'num', v: 0 }, b: term() }; }
    else first = term();
    let node = first;
    for (;;){
      const c = peek();
      if (c === '+'){ i++; node = add(node, term()); }
      else if (c === '−' || c === '-'){ i++; node = add(node, { t: 'neg', a: term() }); }
      else if (c === '±'){ i++; node = { t: 'pm', a: node, b: term() }; }
      else return node;
    }
  }
  const add = (a, b) => a.t === 'add' ? { t: 'add', a: [...a.a, b] } : { t: 'add', a: [a, b] };
  function term(){
    let node = factor();
    for (;;){
      const c = peek();
      if (c === '/' ){ i++; node = { t: 'div', n: node, d: factor() }; }
      else if (startsFactor()) node = { t: 'mul', a: [node, factor()] };
      else return node;
    }
  }
  function factor(){
    let node = primary();
    for (;;){ const c = peek(); if (c in SUP){ i++; node = { t: 'pow', b: node, e: SUP[c] }; } else return node; }
  }
  function primary(){
    const c = peek();
    if (c === '½'){ i++; return { t: 'num', v: 0.5 }; }
    if (/[0-9.]/.test(c)){ const m = /^[0-9.]+/.exec(s.slice(i)); i += m[0].length; return { t: 'num', v: Number(m[0]) }; }
    if (c === '{'){ const j = s.indexOf('}', i); const id = s.slice(i + 1, j); i = j + 1; return { t: 'var', id }; }
    if (c === '(' || c === '['){ const close = c === '(' ? ')' : ']'; i++; const e = expr(); if (peek() !== close) throw new Error(`parse: expected ${close} at ${i} in "${s}"`); i++; return e; }
    if (c === '√'){ i++; return { t: 'sqrt', a: factor() }; }
    for (const f of ['sin', 'cos', 'tan']){
      if (s.startsWith(f, i)){
        i += 3;
        let name = f;
        if (s.startsWith('⁻¹', i)){ i += 2; name = 'a' + f; }
        return { t: 'fn', f: name, a: factor() };
      }
    }
    throw new Error(`parse: unexpected "${c}" at ${i} in "${s}"`);
  }
  const tree = expr();
  if (peek() !== undefined) throw new Error(`parse: leftover "${s.slice(i)}" in "${s}"`);
  return tree;
}

export const hasPM = (n) => n.t === 'pm' || (n.a && (Array.isArray(n.a) ? n.a.some(hasPM) : hasPM(n.a))) || (n.b && hasPM(n.b)) || (n.n && hasPM(n.n)) || (n.d && hasPM(n.d));

// ---------------------------------------------------------------- numbers
export class MathError extends Error {}
const D2R = Math.PI / 180;

// v: id → number. sign: which branch of ± (+1 or −1). name(id): plain name for error messages.
export function evalNum(n, v, sign = 1, name = (id) => id){
  switch (n.t){
    case 'num': return n.v;
    case 'var': { if (!(n.id in v)) throw new MathError(`${name(n.id)} isn’t known yet.`); return v[n.id]; }
    case 'neg': return -evalNum(n.a, v, sign, name);
    case 'add': return n.a.reduce((s, x) => s + evalNum(x, v, sign, name), 0);
    case 'mul': return n.a.reduce((s, x) => s * evalNum(x, v, sign, name), 1);
    case 'pm': return evalNum(n.a, v, sign, name) + sign * evalNum(n.b, v, sign, name);
    case 'pow': return evalNum(n.b, v, sign, name) ** n.e;
    case 'div': {
      const d = evalNum(n.d, v, sign, name);
      if (Math.abs(d) < 1e-12) throw new MathError(`${plainTree(n.d, name)} is zero, so you can’t divide by it.`);
      return evalNum(n.n, v, sign, name) / d;
    }
    case 'sqrt': {
      const x = evalNum(n.a, v, sign, name);
      if (x < -1e-12) throw new MathError('Can’t take the square root of a negative number.');
      return Math.sqrt(Math.max(0, x));
    }
    case 'fn': {
      const x = evalNum(n.a, v, sign, name);
      if (n.f === 'sin') return Math.sin(x * D2R);
      if (n.f === 'cos') return Math.cos(x * D2R);
      if (n.f === 'tan') return Math.tan(x * D2R);
      if (Math.abs(x) > 1 + 1e-12) throw new MathError(`${n.f === 'asin' ? 'sin⁻¹' : 'cos⁻¹'} needs a number between −1 and 1.`);
      return (n.f === 'asin' ? Math.asin(Math.max(-1, Math.min(1, x))) : Math.acos(Math.max(-1, Math.min(1, x)))) / D2R;
    }
  }
  throw new Error('evalNum: bad node ' + n.t);
}
// a tree printed back as plain text (for messages)
function plainTree(n, name){
  const p = (x) => (x.t === 'add' || x.t === 'pm') ? `(${plainTree(x, name)})` : plainTree(x, name);
  switch (n.t){
    case 'num': return n.v === 0.5 ? '½' : String(n.v);
    case 'var': return name(n.id);
    case 'neg': return '−' + p(n.a);
    case 'add': return n.a.map((x, k) => k && x.t === 'neg' ? ' − ' + p(x.a) : (k ? ' + ' : '') + plainTree(x, name)).join('');
    case 'mul': return n.a.map(p).join('');
    case 'pm': return `${plainTree(n.a, name)} ± ${p(n.b)}`;
    case 'pow': return p(n.b) + (n.e === 2 ? '²' : n.e === 3 ? '³' : '^' + n.e);
    case 'div': return `${p(n.n)} / ${p(n.d)}`;
    case 'sqrt': return `√(${plainTree(n.a, name)})`;
    case 'fn': return `${n.f.startsWith('a') ? n.f.slice(1) + '⁻¹' : n.f} ${p(n.a)}`;
  }
}

// ---------------------------------------------------------------- symbols: canonical rational form
// Mono = { c: number, e: { atomKey: integer power } }. Poly = Mono[]. Rat = { n: Poly, d: [{ p: Poly, k }] }.
// Atoms: 'v:<id>' a symbol, 'f:<fn>:<key>' sin/cos/tan of something, 'q:<key>' a square root that doesn't simplify.
const ATOMS = new Map(); // key → { kind, id | f, arg: Rat | base: Rat }
const EPS = 1e-10;

const monoKey = (m) => Object.keys(m.e).sort().map(k => `${k}^${m.e[k]}`).join('*');
const cleanE = (e) => { const o = {}; for (const k in e) if (e[k] !== 0) o[k] = e[k]; return o; };
function polyNorm(p){
  const map = new Map();
  for (const m of p){
    if (m.c === 0) continue;
    const e = cleanE(m.e), k = monoKey({ e });
    const old = map.get(k); if (old) old.c += m.c; else map.set(k, { c: m.c, e });
  }
  const out = [...map.values()];
  const big = Math.max(0, ...out.map(m => Math.abs(m.c)));
  return out.filter(m => Math.abs(m.c) > EPS * Math.max(1, big)).sort((a, b) => cmpMono(b, a));
}
const polyKey = (p) => p.map(m => `${+m.c.toPrecision(12)}#${monoKey(m)}`).join('+');
const ratKey = (r) => polyKey(r.n) + '/' + r.d.map(f => `(${polyKey(f.p)})^${f.k}`).join('');
const pMul = (a, b) => { const out = []; for (const x of a) for (const y of b){ const e = { ...x.e }; for (const k in y.e) e[k] = (e[k] || 0) + y.e[k]; out.push({ c: x.c * y.c, e }); } return polyNorm(out); };
const pAdd = (a, b) => polyNorm([...a, ...b]);
const pScale = (a, c, e = {}) => pMul(a, [{ c, e }]);
const pNeg = (a) => pScale(a, -1);

// lexicographic order on atom keys (used for division and for a stable term order)
function cmpMono(a, b){
  const keys = [...new Set([...Object.keys(a.e), ...Object.keys(b.e)])].sort();
  for (const k of keys){ const d = (a.e[k] || 0) - (b.e[k] || 0); if (d) return d; }
  return 0;
}

const num = (c) => ({ n: c === 0 ? [] : [{ c, e: {} }], d: [] });
export const isNumeric = (r) => !r.d.length && r.n.every(m => !Object.keys(m.e).length);
export const numValue = (r) => r.n.reduce((s, m) => s + m.c, 0);
const atomRat = (key) => ({ n: [{ c: 1, e: { [key]: 1 } }], d: [] });

// expand the denominator factors into one polynomial
const denPoly = (d) => d.reduce((acc, f) => { for (let j = 0; j < f.k; j++) acc = pMul(acc, f.p); return acc; }, [{ c: 1, e: {} }]);

// split P into (monomial content) × (primitive sum). Content takes the lowest power of each atom,
// and a coefficient so the remaining sum has small whole coefficients and is positive at the sample point.
let SAMPLE = {}; // id → number, used to choose signs and branches the way a physicist would
export function setSamples(s){ SAMPLE = s; }
function content(P){
  if (!P.length) return { m: { c: 0, e: {} }, rest: [] };
  const keys = new Set(P.flatMap(m => Object.keys(m.e)));
  const e = {};
  for (const k of keys) e[k] = Math.min(...P.map(m => m.e[k] || 0));
  let c;
  const ints = P.every(m => Math.abs(m.c - Math.round(m.c)) < 1e-9);
  if (ints){ const g = P.reduce((g, m) => gcd(g, Math.round(Math.abs(m.c))), 0); c = g || 1; }
  else c = Math.abs(P[0].c);
  const allKeys = Object.keys(e);
  let rest = polyNorm(P.map(m => ({ c: m.c / c, e: Object.fromEntries(allKeys.map(k => [k, (m.e[k] || 0) - e[k]])) })));
  if (rest.length > 1 ? polyEval(rest, SAMPLE) < 0 : rest[0].c < 0){ c = -c; rest = pNeg(rest); }
  return { m: { c, e: cleanE(e) }, rest };
}
const gcd = (a, b) => b ? gcd(b, a % b) : a;

// exact division N / D (D primitive, non-negative powers); null if D doesn't divide N
function pDiv(N, D){
  // clear negative powers of N first
  const shift = {};
  for (const m of N) for (const k in m.e) if (m.e[k] < 0) shift[k] = Math.max(shift[k] || 0, -m.e[k]);
  let R = pScale(N, 1, shift), Q = [];
  const lt = D[0];
  for (let guard = 0; R.length && guard < 400; guard++){
    const r = R[0], e = {};
    for (const k of new Set([...Object.keys(r.e), ...Object.keys(lt.e)])){ e[k] = (r.e[k] || 0) - (lt.e[k] || 0); if (e[k] < 0) return null; }
    const q = { c: r.c / lt.c, e };
    Q.push(q); R = pAdd(R, pNeg(pMul([q], D)));
  }
  if (R.length) return null;
  return pScale(polyNorm(Q), 1, Object.fromEntries(Object.entries(shift).map(([k, p]) => [k, -p])));
}

// put a rational in canonical form: denominators primitive, monomial parts moved up, common sums cancelled
function reduce(r){
  let n = r.n; const facs = [];
  for (const f of r.d){
    const { m, rest } = content(f.p);
    if (m.c === 0) throw new MathError('Division by zero.');
    // dividing by f = m·rest: divide n by m^k (monomial), keep rest^k as a factor
    for (let j = 0; j < f.k; j++) n = pScale(n, 1 / m.c, Object.fromEntries(Object.entries(m.e).map(([k, p]) => [k, -p])));
    if (rest.length === 1){ // the factor was a monomial after all
      for (let j = 0; j < f.k; j++) n = pScale(n, 1 / rest[0].c, Object.fromEntries(Object.entries(rest[0].e).map(([k, p]) => [k, -p])));
      continue;
    }
    const key = polyKey(rest), old = facs.find(x => polyKey(x.p) === key);
    if (old) old.k += f.k; else facs.push({ p: rest, k: f.k });
  }
  // cancel
  for (const f of facs){
    while (f.k > 0){ const q = pDiv(n, f.p); if (!q) break; n = q; f.k--; }
  }
  return fixSqrt({ n, d: facs.filter(f => f.k > 0) });
}
// √x · √x = x: replace square-root atoms raised to a power ≥ 2 (or ≤ −2)
function fixSqrt(r){
  let changed = false;
  let out = num(0);
  for (const m of r.n){
    let term = { n: [{ c: m.c, e: {} }], d: [] }, e = {};
    for (const [k, p] of Object.entries(m.e)){
      if (k.startsWith('q:') && Math.abs(p) >= 2){
        changed = true;
        const base = ATOMS.get(k).base, whole = Math.trunc(p / 2), left = p - 2 * whole;
        term = mulR(term, powR(base, whole), false);
        if (left) e[k] = left;
      } else e[k] = p;
    }
    term = mulR(term, { n: [{ c: 1, e }], d: [] }, false);
    out = addR(out, term, false);
  }
  if (!changed) return r;
  return reduce({ n: out.n, d: [...out.d, ...r.d] });
}

function addR(a, b, red = true){
  const keys = new Map();
  for (const f of [...a.d, ...b.d]){ const k = polyKey(f.p); keys.set(k, { p: f.p, k: Math.max(keys.get(k)?.k || 0, f.k) }); }
  const d = [...keys.values()];
  const lift = (r) => { let n = r.n; for (const f of d){ const have = r.d.find(x => polyKey(x.p) === polyKey(f.p))?.k || 0; for (let j = have; j < f.k; j++) n = pMul(n, f.p); } return n; };
  const out = { n: pAdd(lift(a), lift(b)), d };
  return red ? reduce(out) : out;
}
function mulR(a, b, red = true){
  const out = { n: pMul(a.n, b.n), d: [...a.d.map(f => ({ ...f })), ...b.d.map(f => ({ ...f }))] };
  return red ? reduce(out) : out;
}
function invR(a){
  if (!a.n.length) throw new MathError('Division by zero.');
  return reduce({ n: denPoly(a.d), d: [{ p: a.n, k: 1 }] });
}
function powR(a, k){
  if (k === 0) return num(1);
  if (k < 0) return powR(invR(a), -k);
  let out = num(1); for (let j = 0; j < k; j++) out = mulR(out, a); return out;
}
const negR = (a) => ({ n: pNeg(a.n), d: a.d });

function sqrtR(a){
  if (isNumeric(a)){ const x = numValue(a); if (x < -1e-12) throw new MathError('Can’t take the square root of a negative number.'); return num(Math.sqrt(Math.max(0, x))); }
  // a single monomial (over nothing) with even powers: take the root term by term (symbols stand for positive sizes)
  if (a.n.length === 1 && !a.d.length && a.n[0].c > 0 && Object.values(a.n[0].e).every(p => p % 2 === 0)){
    return { n: [{ c: Math.sqrt(a.n[0].c), e: Object.fromEntries(Object.entries(a.n[0].e).map(([k, p]) => [k, p / 2])) }], d: [] };
  }
  const key = 'q:' + ratKey(a);
  if (!ATOMS.has(key)) ATOMS.set(key, { kind: 'sqrt', base: a });
  return atomRat(key);
}
function fnR(f, a){
  if (isNumeric(a)){
    const x = numValue(a);
    return num(evalNum({ t: 'fn', f, a: { t: 'num', v: x } }, {}));
  }
  const key = `f:${f}:` + ratKey(a);
  if (!ATOMS.has(key)) ATOMS.set(key, { kind: 'fn', f, arg: a });
  return atomRat(key);
}

// Evaluate a template tree with known values given as rationals (symbols or numbers).
// env: id → Rat. sign: branch for ±.
export function toRat(n, env, sign = 1){ return tidyRoots(build(n, env, sign)); }
function build(n, env, sign){
  const toRat = build;
  switch (n.t){
    case 'num': return num(n.v);
    case 'var': { if (!(n.id in env)) throw new MathError(`${n.id} isn’t known yet.`); return env[n.id]; }
    case 'neg': return negR(toRat(n.a, env, sign));
    case 'add': return n.a.reduce((s, x) => addR(s, toRat(x, env, sign)), num(0));
    case 'mul': return n.a.reduce((s, x) => mulR(s, toRat(x, env, sign)), num(1));
    case 'pm': return addR(toRat(n.a, env, sign), sign < 0 ? negR(toRat(n.b, env, sign)) : toRat(n.b, env, sign));
    case 'pow': return powR(toRat(n.b, env, sign), n.e);
    case 'div': return mulR(toRat(n.n, env, sign), invR(toRat(n.d, env, sign)));
    case 'sqrt': return sqrtR(toRat(n.a, env, sign));
    case 'fn': return fnR(n.f, toRat(n.a, env, sign));
  }
  throw new Error('toRat: bad node ' + n.t);
}
// c·M·√b / D  →  c·M·√(b / D²) when the root and the denominator share a factor,
// so t = √(2gΔx(…)) / (g(…)) prints as √(2Δx / (g(…))). Symbols are positive sizes, so this is exact
// up to the sign of D, which stays outside.
function tidyRoots(r){
  if (r.n.length !== 1) return r;
  const m = r.n[0];
  const roots = Object.keys(m.e).filter(k => k.startsWith('q:'));
  if (roots.length !== 1 || m.e[roots[0]] !== 1) return r;
  const K = roots[0], b = ATOMS.get(K).base;
  const denMono = Object.fromEntries(Object.entries(m.e).filter(([k, p]) => p < 0).map(([k, p]) => [k, -p]));
  if (!r.d.length && !Object.keys(denMono).length) return r;
  const shares = r.d.some(f => pDiv(b.n, f.p)) || Object.keys(denMono).some(k => b.n.every(t => (t.e[k] || 0) > 0));
  if (!shares) return r;
  const D = { n: [{ c: 1, e: denMono }], d: r.d };
  const sgn = evalRat(D, SAMPLE) < 0 ? -1 : 1;
  const inv2 = Object.fromEntries(Object.entries(denMono).map(([k, p]) => [k, -2 * p]));
  const inside = reduce({ n: pScale(b.n, 1, inv2), d: [...b.d.map(f => ({ ...f })), ...r.d.map(f => ({ p: f.p, k: 2 * f.k }))] });
  const keep = Object.fromEntries(Object.entries(m.e).filter(([k, p]) => p > 0 && k !== K));
  return mulR({ n: [{ c: sgn * m.c, e: keep }], d: [] }, sqrtR(inside));
}
export const symbol = (id) => { const key = 'v:' + id; if (!ATOMS.has(key)) ATOMS.set(key, { kind: 'sym', id }); return atomRat(key); };
export const number = num;
export const scale = (r, c) => mulR(num(c), r);

// numeric value of a rational at given symbol values (id → number)
function atomVal(key, vals){
  const a = ATOMS.get(key);
  if (a.kind === 'sym'){ if (!(a.id in vals)) throw new MathError(`no value for ${a.id}`); return vals[a.id]; }
  if (a.kind === 'sqrt') return Math.sqrt(Math.max(0, evalRat(a.base, vals)));
  return evalNum({ t: 'fn', f: a.f, a: { t: 'num', v: evalRat(a.arg, vals) } }, {});
}
function polyEval(p, vals){
  let s = 0;
  for (const m of p){ let t = m.c; for (const [k, e] of Object.entries(m.e)){ const x = atomVal(k, vals); t *= x ** e; } s += t; }
  return s;
}
export function evalRat(r, vals){
  let d = 1; for (const f of r.d) d *= polyEval(f.p, vals) ** f.k;
  return polyEval(r.n, vals) / d;
}
// the symbols a rational depends on
export function symbolsOf(r, out = new Set()){
  const visit = (p) => { for (const m of p) for (const k of Object.keys(m.e)){ const a = ATOMS.get(k); if (a.kind === 'sym') out.add(a.id); else symbolsOf(a.kind === 'sqrt' ? a.base : a.arg, out); } };
  visit(r.n); r.d.forEach(f => visit(f.p));
  return out;
}

// ---------------------------------------------------------------- printing
// opts: { sym(id) → string (HTML or plain), order: [ids], spaced(id) → bool, html: bool, fmt(number) → string }
const SUPS = { 2: '²', 3: '³', 4: '⁴' };
const atomRank = (key, order) => { const a = ATOMS.get(key); if (a.kind === 'sym'){ const i = order.indexOf(a.id); return i < 0 ? 999 : i; } return a.kind === 'fn' ? 1000 : 2000; };
function fracOf(x){ // small fractions print as p/q
  for (let q = 1; q <= 6; q++){ const p = Math.round(x * q); if (Math.abs(p / q - x) < 1e-9 * Math.max(1, Math.abs(x))) return [p, q]; }
  return null;
}
// sin^a · cos^-b of the same angle → tan
function tanify(e){
  e = { ...e };
  for (const k of Object.keys(e)){
    if (!k.startsWith('f:sin:')) continue;
    const ck = 'f:cos:' + k.slice(6), tk = 'f:tan:' + k.slice(6);
    if (e[k] > 0 && (e[ck] || 0) < 0){
      const j = Math.min(e[k], -e[ck]);
      e[k] -= j; e[ck] += j; e[tk] = (e[tk] || 0) + j;
      if (!ATOMS.has(tk)) ATOMS.set(tk, { kind: 'fn', f: 'tan', arg: ATOMS.get(k).arg });
    }
  }
  return cleanE(e);
}
function atomStr(key, o){
  const a = ATOMS.get(key);
  if (a.kind === 'sym') return o.sym(a.id);
  if (a.kind === 'sqrt') return `√(${printRat(a.base, o)})`;
  const name = a.f.startsWith('a') ? a.f.slice(1) + '⁻¹' : a.f;
  const arg = a.arg, single = arg.n.length === 1 && !arg.d.length && arg.n[0].c === 1 && Object.keys(arg.n[0].e).length === 1 && Object.values(arg.n[0].e)[0] === 1;
  return single ? `${name} ${printRat(arg, o)}` : `${name}(${printRat(arg, o)})`;
}
const isWordy = (key, o) => { const a = ATOMS.get(key); return a.kind !== 'sym' || (o.spaced && o.spaced(a.id)); };
const powStr = (p) => p === 1 ? '' : SUPS[p] || `^${p}`;
// atoms of a monomial (positive powers only), in print order
function atomsStr(e, o){
  const keys = Object.keys(e).filter(k => e[k] > 0).sort((a, b) => atomRank(a, o.order) - atomRank(b, o.order) || (a < b ? -1 : 1));
  let s = '';
  keys.forEach((k, j) => {
    let part = atomStr(k, o) + powStr(e[k]);
    const a = ATOMS.get(k);
    if (a.kind === 'fn' && e[k] > 1) part = `${atomStr(k, o).replace(/^(\S+) /, `$1${powStr(e[k])} `)}`; // sin² θ
    if (j && (isWordy(k, o) || isWordy(keys[j - 1], o))) s += ' ';
    s += part;
  });
  return s;
}
function coefStr(c, o, alone){
  const f = fracOf(Math.abs(c));
  if (Math.abs(Math.abs(c) - 1) < 1e-12 && !alone) return '';
  if (f && f[1] === 1) return String(f[0]);
  return o.fmt(Math.abs(c));
}
// a sum of monomials with non-negative powers: positive terms first
function sumStr(P, o){
  const terms = P.map(m => ({ m, s: printMonoFlat(m, o) }));
  const pos = terms.filter(t => t.m.c > 0), neg = terms.filter(t => t.m.c < 0);
  return [...pos, ...neg].map((t, j) => (j ? (t.m.c < 0 ? ' − ' : ' + ') : (t.m.c < 0 ? '−' : '')) + t.s).join('');
}
function printMonoFlat(m, o){ // magnitude only, the sign is handled by the caller
  const e = tanify(m.e), body = atomsStr(e, o), negs = Object.keys(e).filter(k => e[k] < 0);
  let c = coefStr(m.c, o, !body);
  const f = fracOf(Math.abs(m.c));
  let top = body, bot = '';
  if (f && f[1] !== 1){ c = f[0] === 1 && body ? '' : String(f[0]); bot = String(f[1]); }
  top = c + (c && body && /^[0-9]/.test(body) ? '·' : '') + body;
  const negE = Object.fromEntries(negs.map(k => [k, -e[k]]));
  const botAtoms = atomsStr(negE, o);
  bot = bot + (bot && botAtoms ? '' : '') + botAtoms;
  return bot ? `${top || '1'}/${/[ ·]/.test(bot) || bot.length > 2 ? `(${bot})` : bot}` : (top || '1');
}
export function printRat(r, o){
  if (!r.n.length) return '0';
  if (isNumeric(r)){ const x = numValue(r); return (x < 0 ? '−' : '') + o.fmt(Math.abs(x)); }
  // numerator = content × (sum)
  const { m: C, rest } = r.n.length > 1 ? content(r.n) : { m: r.n[0], rest: [] };
  const e = tanify(C.e);
  const neg = C.c < 0;
  const f = fracOf(Math.abs(C.c));
  let topC = '', botC = '';
  if (f){ if (f[0] !== 1) topC = String(f[0]); if (f[1] !== 1) botC = String(f[1]); }
  else topC = o.fmt(Math.abs(C.c));
  const topAtoms = atomsStr(Object.fromEntries(Object.entries(e).filter(([, p]) => p > 0)), o);
  const botAtoms = atomsStr(Object.fromEntries(Object.entries(e).filter(([, p]) => p < 0).map(([k, p]) => [k, -p])), o);
  const sum = rest.length > 1 ? sumStr(rest, o) : '';
  const facs = r.d.map(fa => `(${sumStr(fa.p, o)})${powStr(fa.k)}`);
  // top
  let top = topC + (topC && topAtoms && /^[0-9]/.test(topAtoms) ? '·' : '') + topAtoms;
  if (sum) top = top ? `${top}(${sum})` : sum;
  const hasBot = botC || botAtoms || facs.length;
  if (!top) top = '1';
  if (!hasBot) return (neg ? '−' : '') + top;
  const botParts = [botC + (botC && botAtoms && /^[0-9]/.test(botAtoms) ? '·' : '') + botAtoms, ...facs].filter(Boolean);
  let bot = botParts.join('');
  const nBot = (botC ? 1 : 0) + Object.values(e).filter(p => p < 0).length + facs.length;
  if (nBot > 1 || (Object.values(e).some(p => p < -1) && nBot === 1 && !facs.length && / /.test(bot))) bot = `(${bot})`;
  const topWrap = sum && !(topC || topAtoms) ? `(${top})` : top;
  return (neg ? '−' : '') + `${topWrap} / ${bot}`;
}
export const toText = (r, o) => printRat(r, { ...o, html: false, sym: o.plain || ((id) => id) });
export const toHTML = (r, o) => printRat(r, { ...o, html: true, sym: o.html || ((id) => id) });

// ---------------------------------------------------------------- units
// A unit string like "m/s²" or "kg" → dimension vector { m, kg, s }. Angles (°, rad, rev) are dimensionless.
const BASE = { m: { m: 1 }, s: { s: 1 }, kg: { kg: 1 }, N: { kg: 1, m: 1, s: -2 }, rad: {}, '°': {}, rev: {}, '': {}, 'no unit': {}, g: { kg: 1 }, cm: { m: 1 }, min: { s: 1 }, h: { s: 1 }, km: { m: 1 }, rpm: { s: -1 } };
export function parseUnit(u){
  const out = {};
  const [top, ...bots] = u.split('/');
  const addPart = (part, sgn) => {
    for (const tok of part.trim().split(/[·*\s]+/).filter(Boolean)){
      const m = /^(.+?)([²³]?)$/.exec(tok); const base = BASE[m[1]];
      if (!base) throw new Error(`unknown unit ${m[1]} in ${u}`);
      const p = (m[2] ? SUP[m[2]] : 1) * sgn;
      for (const [k, x] of Object.entries(base)) out[k] = (out[k] || 0) + x * p;
    }
  };
  addPart(top === '1' ? '' : top, 1); bots.forEach(b => addPart(b, -1));
  return cleanE(out);
}
const dimEq = (a, b) => ['m', 'kg', 's'].every(k => Math.abs((a[k] || 0) - (b[k] || 0)) < 1e-9);
const NAMED = [[{ kg: 1, m: 1, s: -2 }, 'N'], [{ kg: 1, m: 1, s: -3 }, 'N/s'], [{ kg: 1, m: 2, s: -2 }, 'J']];
export const dimStr = (d) => { const parts = Object.entries(cleanE(d)); if (!parts.length) return 'no unit'; const nm = NAMED.find(([u]) => dimEq(u, d) && Object.keys(cleanE(d)).length === Object.keys(u).length); if (nm) return nm[1]; const top = parts.filter(([, p]) => p > 0).map(([k, p]) => k + powStr(p)).join('·') || '1', bot = parts.filter(([, p]) => p < 0).map(([k, p]) => k + powStr(-p)).join('·'); return bot ? `${top}/${bot}` : top; };
// dimension of a template tree; throws if two terms of a sum disagree. dims: id → dimension vector.
export function dimOf(n, dims){
  const mul = (a, b, s = 1) => { const o = { ...a }; for (const k in b) o[k] = (o[k] || 0) + s * b[k]; return cleanE(o); };
  switch (n.t){
    case 'num': return {};
    case 'var': return dims[n.id];
    case 'neg': return dimOf(n.a, dims);
    case 'add': case 'pm': {
      const parts = n.t === 'add' ? n.a : [n.a, n.b];
      const ds = parts.map(x => ({ x, d: dimOf(x, dims), zero: x.t === 'num' && x.v === 0 })).filter(p => !p.zero);
      for (const p of ds) if (!dimEq(p.d, ds[0].d)) throw new MathError(`units don’t match: ${dimStr(ds[0].d)} + ${dimStr(p.d)}`);
      return ds.length ? ds[0].d : {};
    }
    case 'mul': return n.a.reduce((s, x) => mul(s, dimOf(x, dims)), {});
    case 'div': return mul(dimOf(n.n, dims), dimOf(n.d, dims), -1);
    case 'pow': return Object.fromEntries(Object.entries(dimOf(n.b, dims)).map(([k, p]) => [k, p * n.e]));
    case 'sqrt': return Object.fromEntries(Object.entries(dimOf(n.a, dims)).map(([k, p]) => [k, p / 2]));
    case 'fn': { const d = dimOf(n.a, dims); if (Object.keys(d).length) throw new MathError(`${n.f} needs an angle or a pure number, not ${dimStr(d)}`); return {}; }
  }
}
export { dimEq };

// ---------------------------------------------------------------- polynomials in t (the motion ladder)
// A polynomial is an array of rationals: p[k] is the coefficient of tᵏ. Coefficients can hold symbols.
export const R = { add: addR, mul: mulR, neg: negR, inv: invR, sqrt: sqrtR, pow: powR, num, isZero: (r) => !r.n.length };
const trim = (p) => { const q = [...p]; while (q.length && !q[q.length - 1].n.length) q.pop(); return q; };
export const polyFromNumbers = (cs) => trim(cs.map(c => num(+c || 0)));
// d/dt (c·tᵏ) = k·c·tᵏ⁻¹
export const polyD = (p) => trim(p.slice(1).map((c, k) => scale(c, k + 1)));
// ∫₀ᵗ p dt + start
export const polyInt = (p, start) => trim([start, ...p.map((c, k) => scale(c, 1 / (k + 1)))]);
export const polyAt = (p, t) => p.reduce((s, c, k) => addR(s, mulR(c, powR(t, k))), num(0));
export const polyDegree = (p) => trim(p).length - 1;
export const polyNum = (p, t, vals = {}) => p.reduce((s, c, k) => s + evalRat(c, vals) * t ** k, 0);

// Solve p(t) = value. Returns { roots: [{ r: Rat, x: number at sample values }], method } with every real root,
// or throws MathError. Linear and quadratic are exact (symbols allowed); higher degrees need numbers.
export function polySolve(p, value){
  const q = trim(p.map((c, k) => k === 0 ? addR(c, negR(value)) : c));
  const deg = q.length - 1;
  const at = (r) => evalRat(r, SAMPLE);
  if (deg < 1) throw new MathError('It never changes, so there’s no single time when it has that value.');
  if (deg === 1){
    const r = mulR(negR(q[0]), invR(q[1]));
    return { roots: [{ r, x: at(r) }], method: 'linear', q };
  }
  if (deg === 2){
    const [c, b, a] = q;
    const disc = addR(mulR(b, b), scale(mulR(a, c), -4));
    if (at(disc) < -1e-12) throw new MathError('The quadratic has no real roots: it never reaches that value.');
    const sq = sqrtR(disc), den = invR(scale(a, 2));
    const roots = [1, -1].map(s => { const r = mulR(addR(negR(b), s > 0 ? sq : negR(sq)), den); return { r, x: at(r) }; });
    return { roots, method: 'quadratic', q, disc };
  }
  if (!q.every(isNumeric)) throw new MathError('With symbols, only linear and quadratic equations in t can be solved exactly.');
  // numbers only: scan for sign changes, then bisect
  const cs = q.map(numValue), f = (t) => cs.reduce((s, c, k) => s + c * t ** k, 0);
  const bound = 1 + Math.max(...cs.slice(0, -1).map(c => Math.abs(c / cs[cs.length - 1])));
  const roots = [], N = 4000;
  let x0 = -bound, f0 = f(x0);
  for (let i = 1; i <= N; i++){
    const x1 = -bound + 2 * bound * i / N, f1 = f(x1);
    if (f0 === 0) roots.push(x0);
    else if (f0 * f1 < 0){ let lo = x0, hi = x1; for (let j = 0; j < 80; j++){ const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; } roots.push((lo + hi) / 2); }
    x0 = x1; f0 = f1;
  }
  return { roots: roots.map(x => ({ r: num(x), x })), method: 'numeric', q };
}

// print a polynomial in t, lowest power first: 250 − 40.6t − 4.32t², ω₀ + 4t − 0.2t³
function polyPrint(p, o, tSym){
  const parts = [];
  p.forEach((c, k) => {
    if (!c.n.length) return;
    const neg = isNumeric(c) ? numValue(c) < 0 : (c.n.length === 1 && !c.d.length ? c.n[0].c < 0 : evalRat(c, SAMPLE) < 0);
    const mag = neg ? negR(c) : c;
    let cs = printRat(mag, o), dot = '';
    const one = isNumeric(mag) && Math.abs(numValue(mag) - 1) < 1e-12;
    if (k > 0 && one) cs = '';
    else if (k > 0 && (/[+−] /.test(cs) || / \/ /.test(cs))) cs = `(${cs})`;
    else if (k > 0 && !isNumeric(mag) && /\s/.test(o.html ? cs.replace(/<[^>]*>/g, '') : cs)) dot = '·';
    const tp = k === 0 ? '' : dot + tSym + (k === 1 ? '' : SUPS[k] || `^${k}`);
    parts.push({ neg, s: cs + tp });
  });
  if (!parts.length) return '0';
  parts.sort((a, b) => a.neg - b.neg); // positive terms first, each group in rising powers
  return parts.map((x, j) => (j ? (x.neg ? ' − ' : ' + ') : (x.neg ? '−' : '')) + x.s).join('');
}
export const polyText = (p, o) => polyPrint(p, { ...o, html: false, sym: o.plain || ((id) => id) }, (o.plain || ((id) => id))('t'));
export const polyHTML = (p, o) => polyPrint(p, { ...o, html: true, sym: o.html || ((id) => id) }, (o.html || ((id) => id))('t'));


// ---------------------------------------------------------------- functions of time as expressions in t
// polynomial ⇄ rational in the symbol t, so equations can take functions of time as inputs
export const polyToRat = (p) => p.reduce((acc, c, k) => addR(acc, mulR(c, powR(symbol('t'), k))), num(0));
// collect powers of one symbol: r = Σ p[k]·xᵏ with p[k] free of x. null if r isn't a polynomial in x.
export function ratToPolyIn(r, id = 't'){
  const key = 'v:' + id;
  const inside = (k) => { const a = ATOMS.get(k); return a.kind !== 'sym' && symbolsOf({ n: [{ c: 1, e: { [k]: 1 } }], d: [] }).has(id); };
  for (const f of r.d) for (const m of f.p) if (key in m.e || Object.keys(m.e).some(inside)) return null;
  const groups = [];
  for (const m of r.n){
    if (Object.keys(m.e).some(inside)) return null;
    const k = m.e[key] || 0;
    if (k < 0 || k !== Math.round(k)) return null;
    const e = { ...m.e }; delete e[key];
    (groups[k] = groups[k] || []).push({ c: m.c, e });
  }
  const out = [];
  for (let k = 0; k < groups.length; k++) out.push(groups[k] ? reduce({ n: polyNorm(groups[k]), d: r.d.map(f => ({ ...f })) }) : num(0));
  return trim(out);
}
export const ratToPoly = (r) => ratToPolyIn(r, 't');
// replace symbols by expressions: map id → Rat
export function substRat(r, map){
  const atom = (key) => {
    const a = ATOMS.get(key);
    if (a.kind === 'sym') return a.id in map ? map[a.id] : atomRat(key);
    if (a.kind === 'sqrt') return sqrtR(substRat(a.base, map));
    return fnR(a.f, substRat(a.arg, map));
  };
  const poly = (p) => p.reduce((acc, m) => addR(acc, Object.entries(m.e).reduce((t, [k, e]) => mulR(t, powR(atom(k), e)), num(m.c))), num(0));
  let out = poly(r.n);
  for (const f of r.d) out = mulR(out, powR(invR(poly(f.p)), f.k));
  return tidyRoots(out);
}
// Z = 0 is linear in the symbol id: return id = −(rest) / (coefficient). Throws if it isn't linear.
export function solveLinear(Z, id, name = id){
  const p = ratToPolyIn(Z, id);
  if (!p || p.length !== 2) throw new MathError(p && p.length > 2 ? `${name} appears squared here, so this isn’t a single linear step.` : `${name} isn’t in this equation in a way that can be isolated.`);
  if (!p[1].n.length) throw new MathError(`The coefficient of ${name} is zero.`);
  return tidyRoots(mulR(negR(p[0]), invR(p[1])));
}
export const zeroOf = (lhs, rhs) => addR(lhs, negR(rhs));
