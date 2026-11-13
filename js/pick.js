// Physics Lens — help picking equations (phase G1). Pure code, no DOM, no numbers.
// From the structure of the problem alone (what is sought, what is known, which equations apply) it finds the smallest set of
// equations with as many equations as unknowns, then says it in words: the principle for each body, the link between bodies,
// and the count of unknowns against equations. It never solves anything and never mentions a value.
// Shortcut equations (flagged `shortcut` in a pack: a result that already combines others) are left out: the student should
// meet the laws, not the combined result.

const MAX_EQS = 6;

// every smallest square set of equations (n equations, n unknowns) that has the target among its unknowns
export function routes({ target, known, eqs, EQS, max = MAX_EQS }){
  const pool = eqs.filter(e => EQS[e] && !EQS[e].shortcut);
  const unk = (e) => EQS[e].vars.filter(v => !known.has(v));
  const out = [], seen = new Set();
  const dfs = (chosen, U, limit) => {
    if (chosen.length === U.size){
      if (U.has(target)){ const k = [...chosen].sort().join(' '); if (!seen.has(k)){ seen.add(k); out.push({ eqs: [...chosen], unknowns: [...U] }); } }
      return;
    }
    if (chosen.length >= limit) return;
    for (const e of pool){
      if (chosen.includes(e)) continue;
      const u = unk(e); if (!u.some(v => U.has(v))) continue;
      const U2 = new Set([...U, ...u]); if (U2.size > limit) continue;
      dfs([...chosen, e], U2, limit);
    }
  };
  for (let limit = 1; limit <= max && !out.length; limit++)
    for (const e of pool){ const u = unk(e); if (u.includes(target)) dfs([e], new Set(u), limit); }
  return out;
}

const ROLE = { law: 0, rel: 1, def: 2 };
const kindOf = (EQS, e) => EQS[e].kind || 'law';
// fewer definitions first, then fewer quantities in all: the plainest way through
const cost = (EQS, r) => r.eqs.filter(e => kindOf(EQS, e) === 'def').length * 10 + r.unknowns.length;

// plan for one target: { target, sought, known, steps: [{ eq, role, principle, why }], unknowns, count, lines } or { target, none: true }
export function plan({ targets, known, eqs, EQS, VARS }){
  const k = known instanceof Set ? known : new Set(known);
  const open = targets.filter(t => VARS[t] && !k.has(t));
  const sought = open.map(t => ({ id: t, sym: VARS[t].sym, plain: VARS[t].name || VARS[t].plain, name: VARS[t].name }));
  if (!open.length) return { sought, steps: [], eqs: [], none: true, lines: [] };
  // all the open targets together: the union of each one's best route, so a second part reuses what the first found
  const chosen = [];
  for (const t of open){
    const rs = routes({ target: t, known: k, eqs, EQS }).sort((a, b) => cost(EQS, a) - cost(EQS, b));
    if (!rs.length) return { sought, steps: [], eqs: [], none: true, noRoute: t, lines: [`Nothing in the equations that apply gets from what you know to ${VARS[t].plain}. Is a given or a condition missing?`] };
    const reuse = rs.find(r => r.eqs.every(e => chosen.some(c => c.eq === e)));
    for (const e of (reuse || rs[0]).eqs) if (!chosen.some(c => c.eq === e)) chosen.push({ eq: e, role: kindOf(EQS, e) });
  }
  const steps = chosen.sort((a, b) => ROLE[a.role] - ROLE[b.role]).map(c => ({
    eq: c.eq, role: c.role, principle: EQS[c.eq].principle || EQS[c.eq].cue, why: EQS[c.eq].meaning,
  }));
  const unknowns = [...new Set(steps.flatMap(s => EQS[s.eq].vars.filter(v => !k.has(v))))];
  const laws = steps.filter(s => s.role === 'law'), links = steps.filter(s => s.role === 'rel'), defs = steps.filter(s => s.role === 'def');
  const sym = (v) => VARS[v] ? VARS[v].sym.replace(/<\/?sub>/g, '') : v;
  const named = (v) => `${VARS[v].name || VARS[v].plain} (${sym(v)})`;
  const lines = [
    `You are looking for ${sought.map(s => `${s.plain} (${s.sym.replace(/<\/?sub>/g, '')})`).join(' and ')}.`,
    laws.length ? `Start with a law for each body or idea: ${laws.map(s => s.principle).join('; ')}.` : '',
    links.length ? `Then the links between them: ${links.map(s => s.principle).join('; ')}.` : '',
    defs.length ? `And the definitions and given facts that fill the rest in: ${defs.map(s => s.principle).join('; ')}.` : '',
    `Count before you solve: ${unknowns.length} unknown${unknowns.length === 1 ? '' : 's'} (${unknowns.map(sym).join(', ')}) need ${unknowns.length} equation${unknowns.length === 1 ? '' : 's'}. You have the right number when they match.`,
  ].filter(Boolean);
  return { sought, steps, eqs: steps.map(s => s.eq), unknowns, count: unknowns.length, lines };
}

// the strategy for gathering symbolic formulas, as short steps (the same for every problem)
export const STRATEGY = [
  'One law per body: write what acts on it and what it does (ΣF = ma, Στ = Iα, energy).',
  'Then the link between bodies: what a string, a contact or a rolling condition says they share.',
  'Then count: as many equations as unknowns. If you are short, find a link; if you have extra, one repeats another.',
  'Solve in symbols first; put numbers in last.',
];

// "What am I looking for?": what is sought, what is known, what is missing. Names only; the values never appear.
export function looking({ targets, known, VARS, plan: p }){
  const sym = (v) => VARS[v].sym.replace(/<\/?sub>/g, '');
  const ids = [...known].filter(v => VARS[v]);
  return {
    sought: p.sought.map(s => `${s.plain} (${s.sym.replace(/<\/?sub>/g, '')})`),
    known: ids.map(v => `${VARS[v].name || VARS[v].plain} (${sym(v)})`),
    missing: (p.unknowns || []).filter(v => !p.sought.some(s => s.id === v)).map(v => `${VARS[v].name || VARS[v].plain} (${sym(v)})`),
  };
}

// a wrong answer that is the right one in the wrong unit: a table of factors, never a guess at the cause beyond the table
export const UNIT_SLIPS = [
  { f: 100, says: 'a length in cm when the equation wants m (or m taken as cm)' },
  { f: 0.01, says: 'a length in m when it should have been cm (or cm put in as m)' },
  { f: 1000, says: 'a mass in g put in as kg, or a length in mm as m' },
  { f: 0.001, says: 'a mass in kg put in as g, or mm put in as m' },
  { f: 180 / Math.PI, says: 'radians read as degrees' },
  { f: Math.PI / 180, says: 'degrees put in as radians' },
  { f: 2 * Math.PI, says: 'revolutions and radians mixed up (one turn is 2π rad)' },
  { f: 1 / (2 * Math.PI), says: 'radians and revolutions mixed up (one turn is 2π rad)' },
];
export function unitSlip(correct, typed, match){
  if (!Number.isFinite(correct) || correct === 0) return null;
  return UNIT_SLIPS.find(s => match(correct * s.f, typed)) || null;
}

// a term of a sum left out: every way to delete one summand of one step's template tree (for the "What's wrong?" replay)
export function dropTerms(tree){
  const out = [];
  const walk = (n, rebuild) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((c, i) => walk(c, (v) => rebuild(n.map((x, j) => j === i ? v : x)))); return; }
    if (n.t === 'add' && n.a.length > 1)
      n.a.forEach((_, i) => { const rest = n.a.filter((__, j) => j !== i); out.push({ tree: rebuild(rest.length === 1 ? rest[0] : { ...n, a: rest }), dropped: i }); });
    for (const key of Object.keys(n)) if (key !== 't' && typeof n[key] === 'object') walk(n[key], (v) => rebuild({ ...n, [key]: v }));
  };
  walk(tree, (v) => v);
  return out;
}
