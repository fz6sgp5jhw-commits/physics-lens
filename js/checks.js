// Physics Lens — the checks behind the algebra workspace (phase 8b). Pure code, no DOM.
// Technique (docs/core-plan.md section 3, Andes's "color by numbers"): put numbers from the student's own setup into a line.
// Every symbol that the knowns list ties to the drawing gets its value; the symbols the problem leaves free (m, L) get "ugly"
// positive values, at TWO different points, so a wrong term that happens to be zero at one point still shows at the other.
// The code's own answer for the setup (the target's value at each point) is used only here, by the checks. It is never shown
// and never written into a line: a check says which line doesn't follow and why, and the student fixes it.
import { parse, toId, print, symsOf, display } from './algebra.js';
import { VARS } from './data.js';
import { parseUnit, toSI, fromSI, dimEq, dimStr, dimOf, MathError } from './expr.js';

export class Unjudged extends Error { constructor(id){ super(id); this.id = id; } }

// ---------------------------------------------------------------- numbers from a tree
export function evalTree(n, env){
  const go = (x) => evalTree(x, env);
  switch (n.t){
    case 'num': return n.v;
    case 'q': return n.v;
    case 'sym': { if (!(n.id in env)) throw new Unjudged(n.id); const v = env[n.id]; return typeof v === 'function' ? v() : v; }
    case 'add': return n.a.reduce((s, x) => s + go(x), 0);
    case 'neg': return -go(n.a);
    case 'mul': return n.a.reduce((s, x) => s * go(x), 1);
    case 'div': return go(n.n) / go(n.d);
    case 'pow': return Math.pow(go(n.b), go(n.e));
    case 'sqrt': return Math.sqrt(go(n.a));
    case 'fn': { const f = n.f.startsWith('a') ? Math['a' + n.f.slice(1)] : Math[n.f]; return f(go(n.a)); }
  }
  throw new Error('evalTree: bad node ' + n.t);
}

// ---------------------------------------------------------------- the setup: knowns → values at a point
// ctx: { knowns: [{ name, value (text), qty }], targets: [names], names: { A: tree } (pieces the student named) }
const HASH = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);
const pointValue = (id, k) => k === 0 ? 1.3 + (HASH(id) % 89) / 61 : 2.2 + ((HASH(id) * 7 + 3) % 83) / 29;
const QDIM = { mass: { kg: 1 }, length: { m: 1 }, force: { kg: 1, m: 1, s: -2 }, time: { s: 1 }, inertia: { kg: 1, m: 2 } };
const NUMERIC = /^(−|-)?(\d+\.?\d*|\.\d+)\s*(\S.*)?$/;

// each known: its id, a value tree (symbolic) or an SI number (with its unit text), and its dimension when the list says so
export function readKnowns(ctx){
  const out = [];
  for (const k of ctx.knowns) {
    const id = toId(k.name), key = id || k.name; if (k.value === 'not given' || (!id && !blockNo(k.name))) continue;   // coordinates like x(Block 1) are not symbols but still carry values
    const m = NUMERIC.exec(String(k.value).trim());
    let tree = null, num = null, unit = '';
    if (m && m[3]){
      try { num = (m[1] ? -1 : 1) * toSI(Number(m[2]), m[3]); unit = m[3]; } catch { continue; }
    } else {
      try { tree = parse(k.value); } catch { continue; }
    }
    out.push({ id: key, name: k.name, tree, num, unit, text: String(k.value), dim: k.qty ? QDIM[k.qty] : unit ? parseUnit(unit) : null });
  }
  return out;
}
const blockNo = (name) => { const m = /^x\((?:Block|Particle) (\d+)\)$/.exec(name); return m ? m[1] : null; };

// a value for every name the setup defines, at point k. numeric = true leaves free symbols out (for numbers last).
export function buildEnv(ctx, k, { numeric = false } = {}){
  const kn = readKnowns(ctx), env = {}, ids = new Set(kn.map(x => x.id));
  if (!numeric){
    for (const x of kn) if (x.tree) for (const id of symsOf(x.tree)) if (!ids.has(id) && !(id in env)) env[id] = pointValue(id, k);
  }
  for (let pass = 0; pass < 8; pass++){
    for (const x of kn){
      if (x.id in env) continue;
      if (x.num !== null){ env[x.id] = x.num; continue; }
      try { env[x.id] = evalTree(x.tree, env); } catch (e) { if (!(e instanceof Unjudged)) throw e; }
    }
  }
  // distances from the axis: r of a block is the size of its coordinate
  for (const x of kn){ const b = blockNo(x.name); if (b !== null && x.id in env) env['r_' + b] = Math.abs(env[x.id]); }
  for (const [id, tree] of Object.entries(ctx.names || {})) env[id] = () => evalTree(tree, env);
  return env;
}
// the dimensions of the symbols, for the unit check
export function dimsFor(ctx){
  const dims = {};
  for (const x of readKnowns(ctx)){
    if (!x.dim) continue;
    dims[x.id] = x.dim;
    if (x.tree){ const s = symsOf(x.tree); if (s.length === 1 && !(s[0] in dims)) dims[s[0]] = x.dim; }
    const b = blockNo(x.name); if (b !== null) dims['r_' + b] = x.dim;
  }
  return dims;
}
export const targetIds = (ctx) => (ctx.targets || []).map(toId).filter(Boolean);
const varOf = (id) => Object.values(VARS).find(v => v.plain && toId(v.plain) === id);
export const targetDim = (id) => { const v = varOf(id); try { return v && v.unit ? parseUnit(v.unit) : null; } catch { return null; } };
export const targetUnit = (id) => varOf(id)?.unit || '';

// ---------------------------------------------------------------- the code's own answer for the setup
// First scope: point masses (blocks) and a disc about its centre. A rod with mass, or a block with no coordinate, is not covered:
// the answer then says so and the checks refuse to judge instead of passing.
export function reference(ctx, target){
  const kn = readKnowns(ctx);
  if (target === 'I' || target === 'I_cm'){
    const rod = kn.find(x => x.id === 'M_rod');
    if (rod && !(rod.tree && rod.tree.t === 'num' && rod.tree.v === 0)) return { why: 'The code’s own answer covers light rods only, and this rod has mass.' };
    const terms = [];
    for (const x of kn){
      const b = blockNo(x.name); if (b === null) continue;
      if (!kn.some(y => y.id === 'm_' + b)) return { why: `Block ${b} has a position but no mass in the knowns list.` };
      terms.push(parse(`{m_${b}}{r_${b}}²`));
    }
    const disc = kn.find(x => x.id === 'I_cm');
    if (disc && disc.tree) terms.push(disc.tree);
    if (terms.length) return { tree: terms.length === 1 ? terms[0] : { t: 'add', a: terms } };
    return { why: 'Nothing in the setup gives this quantity yet: place the masses (coordinates) or choose a disc shape.' };
  }
  const given = kn.find(x => x.id === target && x.tree);
  return given ? { tree: given.tree } : { why: `The code has no answer of its own for ${display(target).text} in this setup yet.` };
}
const envAt = (ctx, k, tgt) => {
  const env = buildEnv(ctx, k);
  if (tgt && tgt.ref.tree){ try { env[tgt.id] = evalTree(tgt.ref.tree, env); } catch (e) { if (!(e instanceof Unjudged)) throw e; } }
  return env;
};
function theTarget(ctx){
  const id = targetIds(ctx)[0]; if (!id) return null;
  return { id, ref: reference(ctx, id) };
}

// ---------------------------------------------------------------- does a line hold; why not
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const NICE = [[2, 'twice'], [0.5, 'half'], [4, 'four times'], [0.25, 'a quarter of'], [3, 'three times'], [1 / 3, 'a third of']];
function holds(L, envs){
  const diffs = envs.map(env => [evalTree(L.l, env), evalTree(L.r, env)]);
  return { ok: diffs.every(([a, b]) => close(a, b)), diffs };
}
const flip = (side, j) => ({ t: 'add', a: (side.t === 'add' ? side.a : [side]).map((x, i) => i === j ? (x.t === 'neg' ? x.a : { t: 'neg', a: x }) : x) });
function whyNot(L, prev, envs, diffs){
  const [a1, b1] = diffs[0], [a2, b2] = diffs[1];
  const op = L.op;
  if (op && L.one && ['div', 'mul', 'add', 'sub', 'sq', 'sqrt'].includes(op.k) && prev && holds(prev, envs).ok)
    return `This line came from “${L.how}”, which changed one term and left the rest alone, so the two sides no longer match. Use Both sides (or Shift) when the whole equation should change.`;
  if (op && op.k === 'subst'){
    const bad = envs.some(env => { try { return !close(evalTree({ t: 'sym', id: op.sym }, env), evalTree(op.x, env)); } catch { return false; } });
    if (bad) return `${display(op.sym).text} is not equal to ${print(op.x)} in your setup, so this replacement changed what the line says. Look at where ${display(op.sym).text} comes from in the knowns list or the drawing.`;
  }
  if (b1 !== 0 && b2 !== 0 && close(a1 / b1, a2 / b2)){
    const r = a1 / b1;
    if (close(r, -1)) return 'The two sides are exactly opposite: a sign is wrong, or a term was moved across without its sign changing.';
    const nice = NICE.find(([v]) => close(r, v));
    if (nice) return `The left side is ${nice[1]} the right side at both test points: look for a missing or extra factor.`;
    return 'The left side is a fixed multiple of the right side, so a whole factor is missing or extra.';
  }
  for (const side of ['l', 'r']){
    const ts = L[side].t === 'add' ? L[side].a : [L[side]];
    if (ts.length < 2) continue;
    for (let j = 0; j < ts.length; j++){
      const t = { ...L, [side]: flip(L[side], j) };
      try { if (holds(t, envs).ok) return `A sign looks wrong in one term on the ${side === 'l' ? 'left' : 'right'} side.`; } catch {}
    }
  }
  return 'The two sides are not equal when the numbers from your setup go in (at two different test points).';
}

// ---------------------------------------------------------------- drawn labels: a force split onto tilted axes
const rad = (d) => d * Math.PI / 180;
export function checkLabels(tk){
  const out = [];
  if (!tk || !tk.axes) return out;
  const a = tk.axes, theta = a.name ? toId(a.name) : null;
  for (const f of tk.forces || []){
    if (!f.split) continue;
    const F = toId(f.label || '') || 'F';
    for (const [k, name] of [['x', 'lx'], ['y', 'ly']]){
      const text = f.split[name]; if (!text) continue;
      const bad = (why) => out.push({ kind: 'label', force: f.id, part: k, text, why: `Label “${text}” on the ${k} part of ${f.label || 'the force'}: ${why}` });
      let tree; try { tree = parse(text); } catch { bad('I can’t read it. Write something like W sin θ or −W cos θ.'); continue; }
      const want = (ang) => (k === 'x' ? f.ux * Math.cos(ang) + f.uy * -Math.sin(ang) : f.ux * -Math.sin(ang) + f.uy * -Math.cos(ang));
      const angles = theta ? [rad(a.ang), rad(a.ang) + 0.7] : [rad(a.ang)];
      try {
        const mine = angles.map((g, i) => { const env = { [F]: 1.7 + i * 0.9 }; if (theta) env[theta] = g; return [evalTree(tree, env), (1.7 + i * 0.9) * want(g)]; });
        if (mine.every(([m, w]) => close(m, w))) continue;
        if (mine.every(([m, w]) => close(m, -w))) bad('the size is right but the sign is wrong. Is that part along +' + k + ' or against it?');
        else {
          const other = angles.map((g, i) => { const w = (1.7 + i * 0.9) * (k === 'x' ? f.ux * -Math.sin(g) + f.uy * -Math.cos(g) : f.ux * Math.cos(g) + f.uy * -Math.sin(g)); return w; });
          if (mine.every(([m], i) => close(m, other[i]) || close(m, -other[i]))) bad('this looks like the other axis’s part: sin and cos are swapped. Which side of the angle is this part next to?');
          else bad('it is not the size of this part of the force. Look at the dashed part and the angle it makes.');
        }
      } catch (e) {
        if (e instanceof Unjudged) bad(`${display(e.id).text} isn’t a name I know here. Use the force’s own name (${f.label || 'its label'})${theta ? ' and the angle you named (' + a.name + ')' : ''}.`);
        else throw e;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- the checks
// lines: the active lines [{ l, r, how, op }]. Returns { status: 'pass'|'look', issues: [{ line (1-based) | null, kind, why }], notes, look: [target ids] }
export function runCheck(lines, ctx, { final = false, tk = null } = {}){
  const issues = [], notes = [], tgt = theTarget(ctx);
  const envs = [0, 1].map(k => envAt(ctx, k, tgt));
  if (!lines.length){
    const labels = checkLabels(tk).map(l => ({ line: null, ...l }));
    return { status: 'look', issues: labels.length ? labels : [{ line: null, kind: 'empty', why: 'There are no lines yet. Pick a relationship from the formula sheet or type one.' }], notes, look: [] };
  }
  let unjudged = null;
  for (let i = 0; i < lines.length; i++){
    try {
      const h = holds(lines[i], envs);
      if (!h.ok){ issues.push({ line: i + 1, kind: 'line', why: whyNot(lines[i], lines[i - 1], envs, h.diffs) }); break; }
    } catch (e) {
      if (!(e instanceof Unjudged)) throw e;
      if (tgt && e.id === tgt.id && !tgt.ref.tree){ unjudged = unjudged || { line: i + 1, why: tgt.ref.why }; continue; }
      unjudged = unjudged || { line: i + 1, why: `${display(e.id).text} has no value in your setup, so I can’t judge this line. Put it in the knowns list (a card name or a coordinate), or leave it out.` };
    }
  }
  if (!issues.length && unjudged) issues.push({ line: unjudged.line, kind: 'unjudged', why: unjudged.why });
  for (const l of checkLabels(tk)) issues.push({ line: null, ...l });
  if (final && !issues.length){
    const last = lines[lines.length - 1];
    const side = tgt && last.l.t === 'sym' && last.l.id === tgt.id ? 'r' : tgt && last.r.t === 'sym' && last.r.id === tgt.id ? 'l' : null;
    if (!tgt) issues.push({ line: null, kind: 'final', why: 'Pick a target in the knowns list first, so I know what the answer is.' });
    else if (!side) issues.push({ line: lines.length, kind: 'final', why: `The last line doesn’t have ${display(tgt.id).text} alone on one side yet.` });
    else {
      const rhs = last[side === 'r' ? 'r' : 'l'];
      const base = new Set(readKnowns(ctx).flatMap(x => x.tree ? symsOf(x.tree) : [])), known = new Set(readKnowns(ctx).map(x => x.id));
      const left = symsOf(rhs).filter(id => known.has(id) && !base.has(id) || id === tgt.id);
      if (left.length) issues.push({ line: lines.length, kind: 'final', why: `The answer still has ${left.map(id => display(id).text).join(', ')} in it. Put in what each one equals until only the problem’s own symbols are left.` });
      else if (!tgt.ref.tree) issues.push({ line: null, kind: 'final', why: tgt.ref.why });
    }
  }
  const look = issues.some(i => i.kind === 'line' || i.kind === 'final' || i.kind === 'unjudged') && tgt ? [tgt.id] : [];
  return { status: issues.length ? 'look' : 'pass', issues, notes, look };
}

// ---------------------------------------------------------------- numbers last, and the unit check
const exprOf = (n, dims, extra) => {
  const go = (x) => exprOf(x, dims, extra);
  switch (n.t){
    case 'num': { if (!n.dim) return { t: 'num', v: n.v }; const id = `#${Object.keys(extra).length}`; extra[id] = n.dim; return { t: 'var', id }; }
    case 'sym': return { t: 'var', id: n.id };
    case 'add': return { t: 'add', a: n.a.map(go) };
    case 'neg': return { t: 'neg', a: go(n.a) };
    case 'mul': return { t: 'mul', a: n.a.map(go) };
    case 'div': return { t: 'div', n: go(n.n), d: go(n.d) };
    case 'sqrt': return { t: 'sqrt', a: go(n.a) };
    case 'fn': return { t: 'fn', f: n.f, a: go(n.a) };
    case 'pow': { const e = n.e.t === 'num' ? n.e.v : NaN; if (!Number.isInteger(e)) throw new MathError('The unit check reads whole-number powers only.'); return { t: 'pow', b: go(n.b), e }; }
  }
};
// a line's side with the target alone on the other → { id, rhs } or null
export function isolated(line, ctx){
  const ids = targetIds(ctx);
  if (line.l.t === 'sym' && ids.includes(line.l.id)) return { id: line.l.id, rhs: line.r };
  if (line.r.t === 'sym' && ids.includes(line.r.id)) return { id: line.r.id, rhs: line.l };
  return null;
}
// every term of the answer must come out in the target's unit
export function unitCheck(tree, id, ctx){
  const dims = { ...dimsFor(ctx) }, extra = {};
  try {
    const need = targetDim(id);
    const e = exprOf(tree, dims, extra);
    const all = { ...dims, ...extra };
    const miss = symsOf(tree).filter(s => !(s in all));
    if (miss.length) return { ok: null, text: `I can’t check the units: ${miss.map(s => display(s).text).join(', ')} has no kind of quantity (mass, length…) in your setup.` };
    const d = dimOf(e, all);
    if (!need) return { ok: null, text: `Every term works out to ${dimStr(d)}.` };
    return dimEq(d, need) ? { ok: true, text: `Unit check: every term works out to ${dimStr(d)}, which is what ${display(id).text} is measured in.` }
      : { ok: false, text: `Unit check: this works out to ${dimStr(d)}, but ${display(id).text} is measured in ${dimStr(need)}. Look for a missing or extra length or mass.` };
  } catch (e) {
    if (e instanceof MathError) return { ok: false, text: `Unit check: ${e.message}` };
    throw e;
  }
}
// "put in my values": the answer line with each symbol's number and unit, then the worked-out number
const fmtNum = (v) => String(+v.toPrecision(4));
export function putValues(line, ctx){
  const iso = isolated(line, ctx); if (!iso) return { err: 'Get the target alone on one side in symbols first; numbers come last.' };
  const kn = readKnowns(ctx), env = buildEnv(ctx, 0, { numeric: true }), shown = {};
  for (const x of kn) if (x.num !== null) shown[x.id] = `${fmtNum(x.num / (x.unit ? toSI(1, x.unit) : 1))} ${x.unit}`.trim();
  for (const x of kn){ const b = blockNo(x.name); if (b !== null && x.num !== null) shown['r_' + b] = shown[x.id].replace(/^[−-]/, ''); }
  const miss = symsOf(iso.rhs).filter(id => !(id in env));
  if (miss.length) return { err: `I need a number with a unit for ${miss.map(s => display(s).text).join(', ')} first. A symbol like m stays a symbol until you give it a value on its card or in the knowns list.` };
  const swap = (n) => n.t === 'sym' ? (n.id in shown && !(n.id in (ctx.names || {})) ? { t: 'q', v: env[n.id], s: shown[n.id] } : n)
    : Object.fromEntries(Object.entries(n).map(([k, v]) => [k, Array.isArray(v) ? v.map(swap) : v && typeof v === 'object' ? swap(v) : v]));
  const withValues = swap(iso.rhs), si = evalTree(iso.rhs, env);
  const unit = targetUnit(iso.id), dimU = unit ? parseUnit(unit) : null;
  const out = dimU ? fromSI(si, unit) : si;
  return { id: iso.id, withValues, value: fmtNum(out), unit, si, tree: { t: 'sym', id: iso.id } };
}
// the dimension of a piece of a line, or null when a symbol in it has no kind of quantity
export function dimOfTree(tree, ctx){
  try { const extra = {}, e = exprOf(tree, null, extra), all = { ...dimsFor(ctx), ...extra }; return symsOf(tree).every(s => s in all) ? dimOf(e, all) : null; } catch { return null; }
}
export { dimStr };
