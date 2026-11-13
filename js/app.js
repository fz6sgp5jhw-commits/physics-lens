import { VARS, EQS, CHAPTERS, PRACTICE, LESSONS, SLIPS, COMPONENTS, V, fmt, SAMPLE, PRINT_ORDER, DIMS, sizeSI, withUnit } from './data.js';
import { createBuild, PALETTE } from './build.js';
import * as X from './expr.js';
import { readyBlocks, eliminate, structure } from './systems.js';
import { createField } from './field.js';
import * as TQ from './torque.js';
import { createSetup } from './setup.js';
import { createKnowns } from './knowns.js';
import { createTools } from './tools.js';
import { createConnect } from './connect.js';
import { createToolkit } from './toolkit.js';
import { createWorkspace } from './algebra.js';
import { createNotebook } from './notebook.js';
import { fromPath, createBoardView } from './board.js';
import { createMC } from './mc.js';
import { createCourse, sigMatch } from './course.js';

const $ = (id) => document.getElementById(id);
// text the student typed or pasted is escaped before it goes into HTML
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ESC[c]);
const field = createField($('fieldArrows'), $('fieldTrails'));
const S = window.__rl = {
  ch: Object.keys(CHAPTERS)[0], cond: {}, condOk: false, givens: {}, found: {}, funcs: {}, gen: {}, custom: [], samples: {}, span: null, targets: [], sheet: [], path: [],
  bank: null, editing: null, focus: [], hot: [], hover: null, busy: false, sound: false, anim: false, inspectName: null, lastStep: 0,
  // how symbolic answers are printed (also used by the tests)
  field,
  printOpts: { plain: (id) => VARS[id].plain, html: (id) => V(id), order: PRINT_ORDER, spaced: (id) => /[A-Za-zα-ω_]{2,}/.test(VARS[id].plain), fmt },
};
S.isKnown = (id) => known(id);
S.sampleOf = (id) => sampleOf(id);
S.eqText = (id) => EQS[id].text || '';
const isMoment = (id) => id === 't' || !!(S.givens[id] && S.givens[id].moment) || !!(S.found[id] && S.found[id].moment);
const symEnv = (ids) => Object.fromEntries(ids.map(id => [id, X.symbol(id)]));
// ---------- equations written by the app (free-body diagrams, combined systems) ----------
let genSeq = 0;
function addGenerated({ label, vars, zsub, Z, lhs, rhs, condition, meaning, unitText, key }){
  const id = 'G' + (++genSeq);
  if (!Z) Z = X.toRat(X.parse(zsub), symEnv(vars));
  const solve = Object.fromEntries(vars.map(v => [v, { generated: true, steps: [], sub: '' }]));
  const form = lhs ? `${lhs.html} = ${rhs.html}` : `${X.toHTML(Z, S.printOpts)} = 0`;
  const text = lhs ? `${lhs.text} = ${rhs.text}` : `${X.toText(Z, S.printOpts)} = 0`;
  EQS[id] = { label, vars, form, text, Z, zsub, generated: true, key, condition, meaning: meaning || '', calc: '', solve, unitText };
  S.gen[id] = EQS[id];
  S.sheet.push(id);
  return id;
}
function dropGenerated(pred){
  for (const id of Object.keys(S.gen)) if (pred(S.gen[id])){ delete S.gen[id]; delete EQS[id]; S.sheet = S.sheet.filter(e => e !== id); }
}
// a constant written as a letter in a function of time (k in F = kt): a new symbol with its own unit
function registerCustom(name, unit, fromId, k){
  const id = 'c_' + name;
  if (!VARS[id]){
    VARS[id] = { sym: name, plain: name, name: `constant ${name} in ${VARS[fromId].plain}(t)`, unit, units: { [unit]: 1 } };
    DIMS[id] = X.parseUnit(unit);
    SAMPLE[id] = SAMPLE[fromId] / Math.max(1, 2 ** k);
    PRINT_ORDER.push(id);
  }
  if (!S.custom.includes(id)) S.custom.push(id);
  S.givens[id] = { from: 'you', kind: 'symbol', custom: true, mag: null, unit, dir: 0, val: SAMPLE[id] };
  return id;
}
S.polyText = (p) => X.polyText(p, S.printOpts);

// ---------- state helpers ----------
const chapter = () => CHAPTERS[S.ch];
// Unit hooks: what differs between units lives in the unit's data (packs), each with its default here.
const HOOKS = {
  startCond: {},          // the conditions a unit starts with
  slopeAxis: false,       // + can be flipped to up the slope (signs, directions, the axis note, drawn slope arrows)
  extended: false,        // beams and discs: torque tools, axis, force kinds, hung loads, signs of force parts
  points: false,          // a wheel can show a tracked point
  angular: false,         // graphs are θ, ω, α
  posLabel: 'x(t) along ramp  m',
  flatPlus: 'forward',    // + on a flat surface
  presets: [],            // drawing templates in the Build tab: [template, icon]
  sim: () => {},          // (defaults, cond): made-up values for the picture
  stuck: 'Is a given hidden in the wording, or a condition not set?',
};
const hook = (k, ch = S.ch) => CHAPTERS[ch]?.[k] ?? HOOKS[k];
const DRAW_UNIT = Object.keys(CHAPTERS).find(c => CHAPTERS[c].drawFirst) || Object.keys(CHAPTERS)[0];
const K = () => chapter().kin;
// a unit's quantities, plus the ones a condition brings in (rimVars; condVars: { conditionKey: [ids] })
const chVars = () => [...chapter().vars, ...(S.cond.rim ? chapter().rimVars || [] : []), ...Object.entries(chapter().condVars || {}).flatMap(([k, ids]) => S.cond[k] ? ids : []), ...S.custom];
const sectionOk = (sec) => !sec.applies || sec.applies(S.cond);
const chEqs = () => chapter().sections.flatMap(sec => sec.eqs.map(e => ({ e, sec })));
const applies = (e) => { const sec = chapter().sections.find(s => s.eqs.includes(e)); return (!sec || sectionOk(sec)) && (!EQS[e].applies || EQS[e].applies(S.cond)); };
const naReason = (e) => { const sec = chapter().sections.find(s => s.eqs.includes(e)); if (sec && !sectionOk(sec)) return sec.needs; return EQS[e].needs || ''; };
const appEqs = () => [...chEqs().map(x => x.e).filter(applies), ...Object.keys(S.gen)];
// targets and knowns can be scalars ('w') or functions of time ('fn:w')
const isFn = (id) => typeof id === 'string' && id.startsWith('fn:');
const isRank = (id) => typeof id === 'string' && id.startsWith('rank:');
const baseOf = (id) => isRank(id) ? id.slice(5) : id;
const known = (id) => isRank(id) ? (id.slice(5) in S.found && S.scen.rows.length > 1 && scenReady()) : isFn(id) ? id.slice(3) in S.funcs : id in S.givens || id in S.found;
// typical values for symbols; the sliders under the diagram change them (for the replay only)
const sampleOf = (id) => id in S.samples ? S.samples[id] : SAMPLE[id];
const samplesNow = () => ({ ...SAMPLE, ...S.samples });
const val = (id) => {
  const g = S.givens[id];
  if (g) return g.kind === 'symbol' ? (g.dir ? -1 : 1) * sampleOf(id) : g.val;
  const f = S.found[id]; if (!f) return undefined;
  return f.expr && !X.isNumeric(f.expr) ? X.evalRat(f.expr, samplesNow()) : f.val;
};
const vals = () => { const o = {}; for (const id of chVars()) if (known(id)) o[id] = val(id); if (hook('slopeAxis')) o.__u0sign = (S.cond.up ? -1 : 1) * (S.cond.upAxis ? -1 : 1); return o; };
const curTarget = () => S.targets.find(t => !known(t)) || null;
const stateOf = (id) => id in S.givens ? 'given' : id in S.found ? 'found' : S.targets.includes(id) ? 'target' : 'unknown';
const spanIds = () => Object.keys(chapter().spanVars || {});
const knownSet = () => new Set([...chVars().filter(known), ...spanIds().filter(known), ...Object.keys(S.funcs).map(x => 'fn:' + x), ...chVars().filter(x => known(x) && isMoment(x)).map(x => 'm:' + x)]);
const unknownsOf = (e, ks) => EQS[e].vars.filter(v => !ks.has(v));
const solvable = (e, ks) => { const u = unknownsOf(e, ks); return u.length === 1 && EQS[e].solve[u[0]] ? u[0] : null; };
const plain = (id) => VARS[id].plain;
const nm = (id) => (chapter().names && chapter().names[id]) || VARS[id].name;
// direction words; on a ramp the student can choose + up the slope, which swaps them
// direction words: the unit's own, else the quantity's; a unit can say false (a size with no direction there), or decide from the conditions
const dr = (id) => { let o = chapter().dirs?.[id]; if (typeof o === 'function') o = o(S.cond); const d = (o ?? VARS[id].dir) || null; return d && hook('slopeAxis') && S.cond.upAxis ? [d[1], d[0]] : d; };
const unitOf = (id) => VARS[id].unit;
const calm = () => document.body.classList.contains('calm');
const userGivens = () => Object.values(S.givens).filter(g => g.from === 'you').length + Object.values(S.funcs).filter(f => f.from === 'given').length;
const symOf = (id) => isRank(id) ? `ranking by ${VARS[id.slice(5)].sym}` : isFn(id) ? `${VARS[id.slice(3)].sym}(t)` : VARS[id].sym;
const plainOf = (id) => isRank(id) ? `ranking by ${VARS[id.slice(5)].plain}` : isFn(id) ? `${VARS[id.slice(3)].plain}(t)` : VARS[id].plain;
// the motion ladder: active when acceleration varies with time, or once any function of t is known
const ladder = () => (chapter().ladder && (S.cond.varA || Object.keys(S.funcs).length)) ? chapter().ladder : null;
const polyHTML = (p) => X.polyHTML(p, S.printOpts);
// the unit of the tᵏ coefficient of a quantity: rad/s → rad/s, rad/s², rad/s³ …
const SUPN = ['', '', '²', '³', '⁴', '⁵'];
function unitPer(id, k){
  const u = VARS[id].unit, [top, bot = ''] = u.split('/'), sp = bot ? (bot === 's' ? 1 : bot === 's²' ? 2 : bot === 's³' ? 3 : 0) : 0;
  const n = sp + k; return n ? `${top}/s${SUPN[n]}` : top;
}
// ---------- symbols ----------
// A symbol given has no number: it stands for the size, and the direction toggle carries the sign.
// Internally it still gets a typical value (SAMPLE) so roots, signs and the diagram can be chosen.
const isSymGiven = (id) => S.givens[id] && S.givens[id].kind === 'symbol';
const anySym = () => Object.values(S.givens).some(g => g.kind === 'symbol');
const exprOf = (id) => {
  const g = S.givens[id];
  if (g) return g.kind === 'symbol' ? X.scale(X.symbol(id), g.dir ? -1 : 1) : X.number(g.val);
  const f = S.found[id]; return f.expr || X.number(f.val);
};
const isSymbolic = (id) => isRank(id) || isFn(id) || isSymGiven(id) || !!(S.found[id] && S.found[id].expr && !X.isNumeric(S.found[id].expr));
// a known's value for display: a number with its unit, or its symbolic form
const showVal = (id) => {
  if (isRank(id)) return rankText(id.slice(5)).order;
  if (isFn(id)) return polyHTML(S.funcs[id.slice(3)].poly);
  if (isSymGiven(id)) return (S.givens[id].dir ? '−' : '') + VARS[id].sym;
  if (isSymbolic(id)) return X.toHTML(S.found[id].expr, S.printOpts);
  return `${fmt(val(id))} ${unitOf(id)}`;
};
const letter = (i) => '(' + 'abcdefgh'[i] + ')';
// the part a found value belongs to: the target being worked on when it was found (or the target itself)
const partOf = (f) => f && S.targets.includes(f.part) ? letter(S.targets.indexOf(f.part)) : '';
const partTag = (f) => `<span class="kpart">found${partOf(f) ? ' · ' + partOf(f) : ''}</span>`;

function shortest(eqList, from, target){
  if (!target) return null;
  if (from.has(target)) return [];
  const key = (s) => [...s].sort().join(',');
  const seen = new Set([key(from)]);
  let frontier = [{ k: from, path: [] }];
  for (let depth = 0; depth < 14 && frontier.length; depth++){
    const next = [];
    for (const { k, path } of frontier){
      for (const m of moves(eqList, k)){
        const u = m.v;
        const k2 = new Set(k); k2.add(u); if (m.moment) k2.add('m:' + u);
        const p2 = [...path, m];
        if (u === target) return p2;
        const kk = key(k2); if (seen.has(kk)) continue; seen.add(kk);
        next.push({ k: k2, path: p2 });
      }
    }
    frontier = next;
  }
  return null;
}

// Every move available from the known set ks: equations, then the motion ladder.
//   deriv: d/dt down a rung · integ: ∫dt up a rung (needs the start value) · eval: a function at the known t
//   solveT: the time when a function has a known value · start: a function at t = 0 gives the start value
function moves(eqList, ks){
  const out = [];
  for (const e of eqList){
    const u = solvable(e, ks); if (u) out.push({ kind: 'eq', eq: e, v: u, moment: EQS[e].vars.some(x => ks.has('m:' + x)) });
    const fu = fnSolvable(e, ks); if (fu) out.push({ kind: 'eq', eq: e, v: 'fn:' + fu, fn: true });
  }
  for (const b of systems(eqList, ks)) for (const x of b.keeps) out.push({ kind: 'sys', ...b, v: x });
  const L = ladder(); if (!L) return out;
  const f = (x) => ks.has('fn:' + x), R = L.rungs;
  for (let i = 0; i < R.length - 1; i++) if (f(R[i]) && !f(R[i + 1])) out.push({ kind: 'deriv', from: R[i], v: 'fn:' + R[i + 1] });
  for (let i = 1; i < R.length; i++){ const st = L.start[R[i - 1]]; if (f(R[i]) && !f(R[i - 1]) && (!st || ks.has(st))) out.push({ kind: 'integ', from: R[i], v: 'fn:' + R[i - 1], start: st }); }
  for (const x of R){
    if (!f(x)) continue;
    if (ks.has('t') && !ks.has(x)) out.push({ kind: 'eval', from: x, v: x, moment: true });
    if (ks.has(x) && !ks.has('t')) out.push({ kind: 'solveT', from: x, v: 't', moment: true });
    const st = L.start[x]; if (st && !ks.has(st)) out.push({ kind: 'start', from: x, v: st });
  }
  // between two moments: only for quantities the question asks for, once both moments are set
  const SV = chapter().spanVars;
  if (SV && spanReady() && spanNeeds().every(f))
    for (const [x, need] of Object.entries(SV)) if (S.targets.includes(x) && !ks.has(x) && f(need)) out.push({ kind: 'span', from: need, v: x });
  return out;
}

// An equation gives a function of time when some of its quantities are functions of t, the others are
// constants (not values at a particular moment), and exactly one is left: that one becomes a function too.
function fnSolvable(e, ks){
  const eq = EQS[e], vars = eq.vars;
  if (!vars.some(x => ks.has('fn:' + x))) return null;
  const constK = (x) => ks.has(x) && !ks.has('m:' + x) && x !== 't';
  const u = vars.filter(x => !ks.has('fn:' + x) && !constK(x));
  if (u.length !== 1) return null;
  const sol = eq.solve[u[0]]; if (!sol) return null;
  if (!eq.generated && (X.hasPM(sol.tree) || sol.alt)) return null;
  return u[0];
}

// ---------- sound ----------
let ac = null;
function beep(freq = 660, dur = 0.08, type = 'square', when = 0){
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = 0.06; o.connect(g); g.connect(ac.destination);
    const t0 = ac.currentTime + when; o.start(t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.stop(t0 + dur + 0.02);
  } catch {}
}
const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.12, 'square', i * 0.11));

// ---------- assistant line (hints and feedback) ----------
let sayTimer = 0;
function say(html){
  clearTimeout(sayTimer); sayTimer = setTimeout(() => $('bubble').classList.add('hide'), 20000);
  const b = $('bubble'); b.classList.remove('hide'); b.innerHTML = html;
}

// ---------- dialog ----------
function dialog(title, msg, good = false){
  $('dlgTitle').textContent = title;
  $('dlgMsg').innerHTML = msg;
  $('dlg').classList.toggle('good', good);
  $('dicon').textContent = good ? '✓' : '!';
  $('dlg').classList.add('show'); $('dlgOk').focus();
  good ? fanfare() : beep(180, 0.25, 'sawtooth');
}
// a question with Cancel: resolves true for the yes button, false for Cancel or Esc
let answer = null;
function ask(title, msg, yes){
  dialog(title, msg); $('dlgCancel').hidden = false; $('dlgOk').textContent = yes; $('dlgCancel').focus();
  return new Promise(r => { answer = r; });
}
function closeDialog(ok){
  $('dlg').classList.remove('show'); $('dlgCancel').hidden = true; $('dlgOk').textContent = 'OK';
  const a = answer; answer = null; if (a) a(ok);
}
$('dlgOk').onclick = () => closeDialog(true);
$('dlgCancel').onclick = () => closeDialog(false);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape'){ closeDialog(false); $('bank').classList.remove('show'); $('boardWrap').classList.remove('show'); $('mcWrap').classList.remove('show'); $('routeWrap').classList.remove('show'); } });
// changing an input makes every answer found so far wrong: ask before clearing them
function beforeClearing(what){
  if (!S.path.length) return Promise.resolve(true);
  const parts = [...new Set(S.path.map(p => p.part).filter(t => S.targets.includes(t)))].map(t => letter(S.targets.indexOf(t)));
  return ask('Clear your answers?', `<b>THIS CLEARS ${S.path.length} SOLVED STEP${S.path.length > 1 ? 'S' : ''}</b>${what} changes what the answers depend on, so every value found so far${parts.length ? ` (part${parts.length > 1 ? 's' : ''} ${parts.join(', ')})` : ''} would be wrong. They will be cleared. Your givens, conditions and sheet stay.`, 'Clear them');
}

// ---------- chapter / reset ----------
function defaultsFor(ch){ return { ...hook('startCond', ch) }; }
// a condition's value: most are yes/no, some name a choice (the torque unit's shape and axis)
const condIs = (key, v) => typeof v === 'boolean' ? !!S.cond[key] === v : S.cond[key] === v;
// the drawing stays when the unit changes; its quantities come back as givens if the new unit uses them
function switchChapter(ch){ S.ch = ch; S.cond = defaultsFor(ch); resetAll(false); if (S.build) syncDrawingGivens(); }
function resetAll(keepText = true){
  dropGenerated(() => true); S.custom = []; S.samples = {}; if (S.scen) S.scen = { cols: [], rows: [] };
  S.givens = {}; S.found = {}; S.funcs = {}; S.span = newSpan(); S.targets = []; S.sheet = []; S.path = []; S.focus = []; S.condOk = false; S.editing = null; S.inspectName = null; S.pointView = null;
  if (!keepText){ $('problem').value = ''; S.bank = null; }
  S.cond = { ...defaultsFor(S.ch), ...Object.fromEntries(Object.entries(S.cond).filter(([k]) => k in defaultsFor(S.ch))) };
  applyHidden(); clearWork(); resetInspector();
}
function clearDerived(){ S.found = {}; S.path = []; for (const [id, f] of Object.entries(S.funcs)) if (f.from !== 'given') delete S.funcs[id]; clearWork(); }
function clearWork(){ $('work').innerHTML = '<div class="empty">Gather equations onto your sheet, pick a target, then solve a glowing equation. Its algebra appears here, one step at a time.</div>'; $('workTitle').textContent = 'Work'; }

// hidden givens that come from conditions (“starts from rest” → v₀ = 0)
function applyHidden(){
  for (const [id, g] of Object.entries(S.givens)) if (g.from === 'condition') delete S.givens[id];
  for (const c of chapter().conditions){
    if (c.type !== 'hidden' || !S.cond[c.key]) continue;
    for (const [id, x] of Object.entries(c.sets)){
      if (S.givens[id] && S.givens[id].from === 'you') continue;
      S.givens[id] = { from: 'condition', why: c.label, mag: Math.abs(x), unit: VARS[id].unit, dir: 0, val: x };
      S.targets = S.targets.filter(t => t !== id);
    }
  }
}

// ---------- 1. unit + givens ----------
function renderUnit(){
  const p = $('chPick'); p.innerHTML = '';
  for (const [id, c] of Object.entries(CHAPTERS)){
    const b = document.createElement('button'); b.textContent = c.title; b.setAttribute('aria-pressed', String(id === S.ch));
    b.onclick = () => { if (S.busy || id === S.ch) return; switchChapter(id); renderAll(); say(`Unit: <b>${c.title}</b>. The library and the quantity palette now match it.`); };
    p.appendChild(b);
  }
  $('bankTitle').textContent = S.bank ? `Practice: ${S.bank.title}` : '';
}
function describe(id, g){
  const d = VARS[id];
  const dirTxt = dr(id) ? ` ${dr(id)[g.dir]} <span class="small muted">(${g.dir ? '−' : '+'})</span>` : '';
  if (g.kind === 'symbol') return `<span class="small muted">${g.scenario ? 'a column of the scenario table' : 'symbol, no number'}</span>${dirTxt}`;
  return `${fmt(g.mag)} ${g.unit === 'no unit' ? '' : g.unit}${dirTxt}`;
}
// torque: which way a found force part points; a negative one is explained, not hidden (its arrow was drawn the other way)
function foundDir(id){
  if (!hook('extended') || !VARS[id].dir || isSymbolic(id)) return '';
  const v = val(id); if (Math.abs(v) < 1e-12) return '';
  return ` <span class="kdir">${v > 0 ? dr(id)[0] : `${dr(id)[1]}: it came out negative, so it points opposite to the arrow you drew`}</span>`;
}
function renderKnowns(){
  const box = $('knowns'); box.innerHTML = '';
  const ids = chVars().filter(known);
  if (!ids.length && !Object.keys(S.funcs).length){ box.innerHTML = '<div class="small muted">Nothing yet. Read the problem and add each quantity it gives you.</div>'; }
  for (const id of ids){
    const g = S.givens[id], f = S.found[id];
    const row = document.createElement('div'); row.className = 'known ' + (f ? 'found' : g.from === 'condition' ? 'cond' : ''); row.dataset.v = id;
    let txt, sub, act = '';
    if (f){ txt = showVal(id) + foundDir(id) + partTag(f); sub = `found in step ${f.step}${partOf(f) ? `, part ${partOf(f)}` : ''}`; }
    else { txt = describe(id, g); sub = g.from === 'condition' ? `from condition: ${g.why}` : g.from === 'drawing' ? `${nm(id)} (from your drawing)` : nm(id); act = g.from === 'you' || g.from === 'drawing' ? `<button data-edit="${id}" title="Edit">✎</button><button data-del="${id}" title="Remove">×</button>` : ''; }
    row.innerHTML = `<div class="vsym">${VARS[id].sym}</div><div><div class="kv">${VARS[id].sym}${g && g.kind === 'symbol' ? ':' : ' ='} ${txt}</div><div class="kd">${sub}</div></div><div class="kact">${act}</div>`;
    row.title = sub.replace(/<[^>]*>/g, '');
    row.addEventListener('mouseenter', () => setHover(id)); row.addEventListener('mouseleave', () => setHover(null));
    box.appendChild(row);
  }
  for (const [id, f] of Object.entries(S.funcs)){
    const row = document.createElement('div'); row.className = 'known fn ' + (f.from === 'given' ? '' : 'found'); row.dataset.v = id;
    const act = f.from === 'given' ? `<button data-edit="${id}" title="Edit">✎</button><button data-delfn="${id}" title="Remove">×</button>` : '';
    row.innerHTML = `<div class="vsym">${VARS[id].sym}(t)</div><div><div class="kv">${VARS[id].sym}(t) = ${polyHTML(f.poly)}${f.from === 'given' ? '' : partTag(f)}</div><div class="kd">${f.from === 'given' ? `${nm(id)}, as a function of time` : `found in step ${f.step}${partOf(f) ? `, part ${partOf(f)}` : ''}`}</div></div><div class="kact">${act}</div>`;
    box.appendChild(row);
  }
  box.querySelectorAll('[data-delfn]').forEach(b => b.onclick = async () => { if (!await beforeClearing('Removing a given')) return; delete S.funcs[b.dataset.delfn]; clearDerived(); renderAll(false); });
  box.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openEditor(b.dataset.edit));
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!await beforeClearing('Removing a given')) return; const id = b.dataset.del, c = S.scen.cols.indexOf(id); if (c >= 0){ S.scen.cols.splice(c, 1); S.scen.rows.forEach(r => r.splice(c, 1)); } delete S.givens[id]; clearDerived(); renderAll(false); });
  const pal = $('palette'); pal.innerHTML = '';
  for (const id of chVars()){
    if (known(id)) continue;
    const b = document.createElement('button'); b.innerHTML = `+ ${VARS[id].sym}<small>${nm(id)}</small>`; b.title = `Add ${nm(id)}`;
    b.onclick = () => openEditor(id); pal.appendChild(b);
  }
  renderEditor();
}
function openEditor(id, moment = false){ if (S.busy) return; const g = S.givens[id], fg = !g && !moment && S.funcs[id] && S.funcs[id].from === 'given' ? S.funcs[id] : null; S.editing = { id, moment, fnText: fg ? fg.text : '', kind: fg ? 'fn' : g && g.kind === 'symbol' ? 'symbol' : 'value', mag: g && g.mag !== null ? g.mag : '', unit: g ? g.unit : (Object.keys(VARS[id].units)[0]), dir: g ? g.dir : 0 }; renderEditor(); setTimeout(() => $('edVal')?.focus(), 0); }
const FORCE_IDS = ['Fp', 'N', 'N1', 'f', 'Tn'];
const canFn = (id) => !!(S.cond.varA && ((chapter().ladder && chapter().ladder.rungs.includes(id)) || FORCE_IDS.includes(id)));
function renderEditor(){
  const slot = $('editorSlot');
  if (!S.editing){ slot.innerHTML = ''; return; }
  const { id, mag, unit, dir, kind } = S.editing, d = VARS[id];
  slot.innerHTML = `<div class="editor"><div><b>${d.sym}</b>: ${nm(id)}</div>
    ${S.editing.moment ? `<div class="erow small">Its value <b>at the moment the question asks about</b>. The app finds the time t when it has this value.</div>` : ''}
    <div class="erow kinds"><button data-kind="value" aria-pressed="${kind === 'value'}">Number</button><button data-kind="symbol" aria-pressed="${kind === 'symbol'}">Symbol only</button><button data-kind="scenario" aria-pressed="${kind === 'scenario'}" title="Different values in different cases">Scenario table</button>${canFn(id) ? `<button data-kind="fn" aria-pressed="${kind === 'fn'}">Function of t</button>` : ''}</div>
    ${!canFn(id) && chapter().ladder && chapter().ladder.rungs.includes(id) && !S.cond.varA ? `<div class="erow small muted">Given as a function of time or a graph? Pick <b>varies with time</b> under <b>This problem</b>, above the givens.</div>` : ''}
    ${kind === 'fn'
      ? `<div class="erow fnrow"><label for="edFn"><b>${d.sym}(t) =</b></label> <input id="edFn" type="text" spellcheck="false" autocomplete="off" value="${esc(S.editing.fnText)}" placeholder="${FN_EXAMPLE[id] || '4 − 0.5t²'}"></div>
         <div class="erow small">Write it as you would on paper: numbers, <b>t</b>, powers like t² or t^2, and a letter for a constant you don’t know (like <b>k</b>, <b>β</b>, or type <b>beta</b>). + is ${dr(id) ? dr(id)[0] : 'positive'}.
           From a straight-line graph: (value at t = 0) + (slope)·t, where the slope is rise ÷ run read off the grid.</div>
         <div id="edFnPreview" class="fnprev" aria-live="polite"></div>`
      : kind === 'scenario'
      ? `<div class="erow small">Its value changes from case to case: it becomes a column of the scenario table under the givens, and the problem is solved with <b>${d.sym}</b> as a symbol.</div>`
      : kind === 'symbol'
      ? `<div class="erow small">No number: you’ll get the answer in symbols, with <b>${d.sym}</b> in it. Its unit is ${d.unit || 'none'}.</div>`
      : `<div class="erow"><input id="edVal" type="text" inputmode="decimal" value="${esc(mag)}" placeholder="size"><select id="edUnit">${Object.keys(d.units).map(u => `<option ${u === unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>`}
    ${dr(id) && kind !== 'fn' ? `<div class="erow dirs">Direction: ${dr(id).map((w, i) => `<button data-dir="${i}" aria-pressed="${i === dir}">${w} (${i ? '−' : '+'})</button>`).join('')}</div>` : ''}
    <div class="erow"><button class="go" id="edSave">Add known</button><button id="edCancel">Cancel</button>${S.targets.includes(id) ? '<span class="small warn">This is one of your targets: adding it as a known removes it.</span>' : ''}</div></div>`;
  const keep = () => { if ($('edVal')){ S.editing.mag = $('edVal').value; S.editing.unit = $('edUnit').value; } if ($('edFn')) S.editing.fnText = $('edFn').value; };
  slot.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { keep(); S.editing.dir = +b.dataset.dir; renderEditor(); });
  slot.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { keep(); S.editing.kind = b.dataset.kind; renderEditor(); });
  $('edCancel').onclick = () => { S.editing = null; renderEditor(); };
  const save = () => {
    if (S.editing.kind === 'fn'){
      keep();
      let fn;
      try { fn = X.parseFn(S.editing.fnText); } catch (e){ if (!(e instanceof X.MathError)) throw e; dialog('Can’t read that', `<b>SYNTAX ERROR</b>${esc(e.message)}`); return; }
      for (const [name, k] of Object.entries(fn.consts)) registerCustom(name, unitPer(id, k), id, k);
      S.funcs[id] = { from: 'given', poly: fn.poly, text: S.editing.fnText };
      S.editing = null; clearDerived(); renderAll(false); beep(880, 0.05);
      return;
    }
    if (S.editing.kind === 'symbol' || S.editing.kind === 'scenario'){
      const dirI = dr(id) ? S.editing.dir : 0;
      S.givens[id] = { from: 'you', kind: 'symbol', scenario: S.editing.kind === 'scenario', mag: null, unit: d.unit, dir: dirI, val: (dirI ? -1 : 1) * SAMPLE[id] };
      if (S.editing.kind === 'scenario' && !S.scen.cols.includes(id)){ S.scen.cols.push(id); S.scen.rows.forEach(r => r.push('')); }
      S.targets = S.targets.filter(t => t !== id);
      S.editing = null; clearDerived(); renderAll(false); beep(880, 0.05);
      return;
    }
    const txt = $('edVal').value.trim().replace(',', '.'), x = Number(txt);
    if (txt === '' || !isFinite(x)){ dialog('Not a number', `<b>SYNTAX ERROR</b>Type the size as a number, like <b>12</b> or <b>2.5e3</b>. Use the direction buttons for which way it points.`); return; }
    let dirI = S.editing.dir;
    if (x < 0 && dr(id)){ dirI = 1 - dirI; say(`I flipped the direction for you: sizes are always positive, and the direction buttons carry the sign.`); }
    const u = $('edUnit').value, abs = VARS[id].absolute, mag = abs ? x : Math.abs(x);
    if (abs && sizeSI(id, x, u) <= 0){ dialog('Below absolute zero', `<b>THAT’S TOO COLD</b>A temperature can’t be at or below absolute zero (0 K = −273.15 °C).`); return; }
    if (!dr(id) && x < 0 && !['inc'].includes(id) && !abs){ dialog('Negative size?', `<b>THAT CAN’T BE NEGATIVE</b>${nm(id)} is a size with no direction, so it can’t be negative.`); return; }
    S.givens[id] = { from: 'you', mag, unit: u, dir: dirI, val: (dirI ? -1 : 1) * sizeSI(id, mag, u), moment: S.editing.moment };
    S.targets = S.targets.filter(t => t !== id);
    S.editing = null; clearDerived(); renderAll(false); beep(880, 0.05);
  };
  const trySave = async () => { if (await beforeClearing('Changing a given')) save(); };
  $('edSave').onclick = trySave;
  $('edVal')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') trySave(); });
  const fnBox = $('edFn');
  if (fnBox){
    fnBox.addEventListener('input', () => { S.editing.fnText = fnBox.value; fnPreview(id); });
    fnBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') trySave(); });
    fnPreview(id);
  }
}
// what the one-box function entry read: the polynomial, and the unit each new constant gets
const FN_EXAMPLE = { theta: '250t − 20.3t² − 1.44t³', w: 'γ − βt²', alpha: '4 − 0.6t²', vf: '3 + 2t', dx: '5t − t²', Fp: 'kt' };
function fnPreview(id){
  const box = $('edFnPreview'), txt = S.editing.fnText.trim();
  if (!box) return;
  if (!txt){ box.innerHTML = '<span class="muted">The app shows here how it reads what you type.</span>'; return; }
  try {
    const fn = X.parseFn(txt);
    const sym = (c) => VARS[c] ? V(c) : `<span class="sym">${esc(c.slice(2))}</span>`;
    const opts = { ...S.printOpts, html: sym, spaced: (c) => !!VARS[c] && S.printOpts.spaced(c) };
    const units = Object.entries(fn.consts).map(([name, k]) => `<b>${esc(name)}</b> is a constant in ${esc(unitPer(id, k))}`);
    box.innerHTML = `Reads as <b>${VARS[id].sym}(t) = ${X.polyHTML(fn.poly, opts)}</b>${units.length ? `<br>${units.join(' · ')}` : ''}`;
    box.classList.remove('bad');
  } catch (e){
    if (!(e instanceof X.MathError)) throw e;
    box.textContent = e.message; box.classList.add('bad');
  }
}

// ---------- 2. conditions ----------
function renderConds(){
  const box = $('conds'); box.innerHTML = '';
  const drawn = drawnConds();
  for (const c of chapter().conditions){
    const el = document.createElement('div'); el.className = 'cgroup';
    if (c.key in drawn){
      el.innerHTML = `<div class="clabel">${c.label}</div><div class="settled"><b>${c.options.find(o => o[0] === drawn[c.key])[1]}</b>: settled by your drawing. ${DRAWN_WHY[c.key]}</div>`;
    } else if (c.type === 'choice'){
      el.innerHTML = `<div class="clabel">${c.label}</div><div class="opts">${c.options.map(([v, w], i) => `<button data-i="${i}" aria-pressed="${condIs(c.key, v)}">${w}</button>`).join('')}</div>`;
      el.querySelectorAll('button').forEach(b => b.onclick = () => setCond(c.key, c.options[+b.dataset.i][0]));
    } else if (c.type === 'locked'){
      el.innerHTML = `<label class="ccheck"><input type="checkbox" checked disabled><span>${c.label}<small>${c.note}</small></span></label>`;
    } else {
      const sets = c.sets ? Object.entries(c.sets).map(([id, x]) => `${plain(id)} = ${x}`).join(', ') : '';
      el.innerHTML = `<label class="ccheck"><input type="checkbox" ${S.cond[c.key] ? 'checked' : ''}><span>${c.label}${sets ? `<small>hidden given: ${sets}</small>` : ''}</span></label>`;
      el.querySelector('input').onchange = (e) => setCond(c.key, e.target.checked);
    }
    box.appendChild(el);
  }
  $('condOk').setAttribute('aria-pressed', String(S.condOk));
  $('condOk').textContent = S.condOk ? '✓ Conditions set' : '✓ These conditions are right';
}
// the problem-type choices asked with the givens (Phase 4b): the student picks them before entering quantities,
// so the function box (varies with time) and r (a point on the body) are there when needed. Conditions shows them too.
function renderKind(){
  const box = $('kindRow'), cs = chapter().conditions.filter(c => c.ask);
  box.hidden = !cs.length; if (!cs.length) return;
  box.innerHTML = '<span class="lbl">This problem</span>' + cs.map(c => `<span class="kgroup"><span class="small muted">${c.ask[0]}</span>${c.ask[1].map(([v, w], i) => `<button data-ck="${c.key}" data-i="${i}" aria-pressed="${condIs(c.key, v)}">${w}</button>`).join('')}</span>`).join('');
  box.querySelectorAll('[data-ck]').forEach(b => b.onclick = () => { const c = cs.find(x => x.key === b.dataset.ck); setKind(c.key, c.ask[1][+b.dataset.i][0]); });
}
async function setKind(key, v){
  if (S.busy || condIs(key, v) || !await beforeClearing('Changing what the problem is about')) return;
  S.cond[key] = v; applyHidden(); clearDerived(); syncDrawingGivens(); renderAll(false);
}
async function setCond(key, v){
  if (S.busy || condIs(key, v) && S.condOk) return;
  if (!await beforeClearing('Changing a condition')) return;
  if (key === 'upAxis' && !!S.cond.upAxis !== !!v) for (const [id, g] of Object.entries(S.givens)) if (g.from === 'you' && VARS[id].dir && g.kind !== 'fn'){ g.dir = 1 - g.dir; if (g.kind !== 'symbol') g.val = -g.val; }
  S.cond[key] = v; S.condOk = true; applyHidden(); clearDerived();
  if (key === 'up' && S.build) for (const b of S.build.bodies()) if (b.frame === 'slope') S.build.setVec(b.id, 'v', v ? 'up-slope' : 'down-slope');
  S.sheet = S.sheet.filter(e => applies(e) || true);
  renderAll(false);
}
$('condOk').onclick = () => {
  S.condOk = true; renderAll(false);
  if (solveOpen()){ openStage(3); say('Conditions locked in. On to <b>Solve</b>: equations that don’t fit them are greyed out in the library, and ones you can use right now <b>glow</b>.'); }
  else say(`Conditions locked in. <b>Solve</b> unlocks when <b>${STAGES[firstOpen(stageChecks())].name}</b> passes its check.`);
};
// what the picture already shows: a rough surface means friction; v drawn along the slope says which way it moves
const DRAWN_WHY = { friction: 'To change it, select the surface on the drawing and switch its friction.', up: 'To change it, turn the velocity arrow on the drawing.',
  shape: 'To change it, draw a different body.', axis: 'To change it, move the pivot on the drawing.' };
function drawnConds(){
  const out = {}; if (!S.build) return out;
  const cs = S.build.contacts();
  if (cs.length && chapter().conditions.some(c => c.key === 'friction')) out.friction = cs.some(c => c.friction);
  if (hook('slopeAxis')) for (const b of drawnBodies()) if (b.frame === 'slope'){
    const k = S.build.shapes.find(x => x.id === b.id)?.v?.key;
    if (k === 'up-slope' || k === 'down-slope') out.up = k === 'up-slope';
  }
  // torque: a drawn disc or rod is the shape; where it is pinned says whether it turns about its centre
  if (hook('extended')){
    const bs = S.build.bodies(), w = bs.find(b => b.kind === 'wheel'), r = bs.find(b => b.kind === 'rod');
    if (w){ out.shape = 'disc'; if (w.pivot) out.axis = 'centre'; }
    else if (r){ out.shape = 'rod'; if (r.pinAt) out.axis = r.pinAt === 'centre' ? 'centre' : 'other'; }
  }
  return out;
}
// returns the labels of the conditions the drawing just changed
function syncDrawnConds(){
  const changed = [];
  for (const [k, v] of Object.entries(drawnConds())) if (!condIs(k, v)){ S.cond[k] = v; const c = chapter().conditions.find(x => x.key === k); changed.push(`${c.label}: ${c.options.find(o => o[0] === v)[1]}`); }
  if (changed.length){ applyHidden(); clearDerived(); }
  return changed;
}

// ---------- 3. library ----------
function renderLibrary(){
  const lib = $('lib'); lib.innerHTML = '';
  const ks = knownSet(), ready = S.condOk && Object.keys(S.givens).length > 0;
  const order = [S.ch, ...Object.keys(CHAPTERS).filter(c => c !== S.ch)];
  for (const cid of order){
    const ch = CHAPTERS[cid], active = cid === S.ch;
    const box = document.createElement(active ? 'div' : 'details'); box.className = 'chapter' + (active ? '' : ' other');
    if (!active){ box.innerHTML = `<summary><span class="small">Other unit: <b>${ch.title}</b> (switch in step 1)</span></summary>`; }
    let html = `<h3>${active ? 'UNIT' : 'OTHER UNIT'}: ${ch.title.toUpperCase()}</h3>`;
    if (active){
      html += `<div class="intro">${ch.intro}</div>`;
      if (!ready) html += `<div class="sheet-status">${!Object.keys(S.givens).length ? 'Add your givens and' : ''} ${!S.condOk ? 'confirm the conditions' : ''} to see which equations apply and which glow.</div>`;
    }
    for (const sec of ch.sections){
      html += `<div class="section-h">${sec.title}</div><div class="section-n">${sec.note}</div>`;
      for (const e of sec.eqs){
        const eq = EQS[e];
        let cls = 'lib-eq', status;
        if (!active){ status = ''; cls += ' na'; }
        else if (!S.condOk){ status = `<span>only if ${eq.condition}</span>`; }
        else if (!applies(e)){ cls += ' na'; status = `<span class="warn">doesn’t apply here: needs ${naReason(e)}</span>`; }
        else {
          const u = unknownsOf(e, ks), s = solvable(e, ks);
          if (ready && s){ if (S.help.glow){ cls += ' lit'; status = `<span class="hot">★ 1 unknown: ${VARS[s].sym}</span>`; } else status = ''; } // glow off in a lesson's twin
          else if (u.length === 0) status = '<span>all known</span>';
          else if (u.length === 1) status = `<span>1 unknown, but ${VARS[u[0]].sym} can’t be isolated here</span>`;
          else status = `<span>${u.length} unknowns: ${u.map(x => VARS[x].sym).join(', ')}</span>`;
        }
        const on = S.sheet.includes(e);
        if (on) cls += ' onsheet';
        if (active && S.focus.length && eq.vars.some(v => S.focus.includes(v))) cls += ' rel';
        html += `<div class="${cls}" data-eq="${e}"><div><div class="lmeta"><span class="tag">${eq.label}</span><span>only if ${eq.condition}</span></div><div class="lform">${eq.form}</div></div>
          ${active ? `<button class="gbtn ${on ? '' : 'go'}" data-gather="${e}">${on ? '✓ On sheet' : '+ Gather'}</button>` : ''}
          <div class="lmean">${eq.meaning} <span class="lmeta" style="display:inline-flex">${status}</span></div>
          <details><summary>Where it comes from</summary>${eq.calc}</details></div>`;
      }
    }
    box.insertAdjacentHTML('beforeend', html);
    lib.appendChild(box);
  }
  lib.querySelectorAll('[data-gather]').forEach(b => b.onclick = async () => {
    const e = b.dataset.gather;
    if (COURSE.active && !S.sheet.includes(e) && !S.busy && !await COURSE.kindTap(e)) return; // in a lesson: what kind of equation is it?
    gather(e);
  });
  const fb = $('focusbar');
  if (S.focus.length){ fb.classList.add('show'); fb.innerHTML = `Equations with ${S.focus.map(V).join(', ')}<button id="unfocus">Show all ×</button>`; $('unfocus').onclick = () => { S.focus = []; renderLibrary(); paintSyms(); }; }
  else fb.classList.remove('show');
}
function gather(e){
  if (S.busy) return;
  if (S.sheet.includes(e)){ S.sheet = S.sheet.filter(x => x !== e); renderAll(false); return; }
  if (S.condOk && !applies(e)){ dialog('Illegal operation', `<b>DOESN’T APPLY HERE</b>${EQS[e].label} only holds when: <b>${EQS[e].condition}</b>. Your conditions say otherwise, so using it would give a wrong answer. Check the conditions if you think they are wrong.`); return; }
  S.sheet.push(e); beep(990, 0.05); renderAll(false);
}

// ---------- 4–5. sheet + targets ----------
function renderTargets(){
  const box = $('targets');
  const opts = chVars().filter(id => !known(id) && !S.targets.includes(id));
  box.innerHTML = `<span class="small"><b>🎯 The question asks for:</b></span>` + S.targets.map((t, i) => `<span class="tchip ${known(t) ? 'done' : t === curTarget() ? 'current' : ''}">${letter(i)} ${symOf(t)}${known(t) ? ` = ${showVal(t)}` : ''}${S.path.some(p => p.part === t) ? `<button data-clr="${t}" title="Clear part ${letter(i)}: remove what it found">↺</button>` : `<button data-rmt="${t}" title="Remove target">×</button>`}</span>`).join('')
    + `<select id="addTarget"><option value="">+ add a target…</option>${opts.map(id => `<option value="${id}">${VARS[id].plain}: ${nm(id)}</option>`).join('')}${ladderTargets()}${spanTargets()}${pointTargets()}${rankTargets()}</select>`;
  box.querySelectorAll('[data-rmt]').forEach(b => b.onclick = () => { S.targets = S.targets.filter(t => t !== b.dataset.rmt); renderAll(false); });
  box.querySelectorAll('[data-clr]').forEach(b => b.onclick = () => clearPart(b.dataset.clr));
  $('addTarget').onchange = (e) => {
    const id = e.target.value; if (!id) return;
    if (id.startsWith('when:')){ // the time when X has a value: target t, and X at that moment becomes a given
      const x = id.slice(5); if (!S.targets.includes('t') && !known('t')) S.targets.push('t');
      renderAll(false); openEditor(x, true); say(`🎯 Target: the <b>time</b> when ${VARS[x].sym} has the value you type. That value is a given: it’s what ${VARS[x].sym} is at that moment.`);
      return;
    }
    if (id.startsWith('pt:')){ // a point on the body: start tracking one, then target it
      S.cond.rim = true; addTarget(id.slice(3));
      say(`🎯 Now tracking a point at distance <b>r</b> from the axis (see Conditions). Add r as a given if the problem gives it. Its acceleration has two parts at right angles: aₜ = rα along its path and a꜀ = ω²r toward the centre.`);
      return;
    }
    addTarget(id);
    if (spanIds().includes(id) && !spanReady()) say(`🎯 Target: <b>${VARS[id].sym}</b>, ${nm(id)}. Pick the two moments under <b>Between two moments</b> on your sheet.`);
  };
}
// clear one part: its steps and every step after it (later parts may use what it found); earlier parts stay
async function clearPart(t){
  if (S.busy) return;
  const from = S.path.findIndex(p => p.part === t); if (from < 0) return;
  const lost = S.path.slice(from), i = S.targets.indexOf(t);
  const later = lost.some(p => p.part !== t);
  if (!await ask(`Clear part ${letter(i)}?`, `<b>CLEAR PART ${letter(i)}${later ? ' AND THE STEPS AFTER IT' : ''}</b>This removes ${lost.map(p => symOf(p.v)).join(', ')}${later ? ', because later steps may use what it found' : ''}. Values found before it stay as knowns.`, 'Clear')) return;
  S.path = S.path.slice(0, from);
  for (const [id, f] of Object.entries(S.found)) if (f.step > from) delete S.found[id];
  for (const [id, f] of Object.entries(S.funcs)) if (f.from !== 'given' && f.step > from) delete S.funcs[id];
  clearWork(); renderAll(false);
  say(`Part ${letter(i)} is cleared. Its target is still on your sheet.`);
}
function rankTargets(){
  if (S.scen.rows.length < 2) return '';
  const opts = chVars().filter(id => !S.givens[id] && !S.targets.includes('rank:' + id) && VARS[id].unit);
  return `<optgroup label="Compare the scenarios">${opts.map(id => `<option value="rank:${id}">Rank the cases by ${VARS[id].plain}: ${nm(id)}</option>`).join('')}</optgroup>`;
}
function ladderTargets(){
  const L = ladder(); if (!L || !S.cond.varA) return '';
  return `<optgroup label="Functions of time">${[...L.rungs, ...FORCE_IDS.filter(id => chVars().includes(id))].filter(x => !known('fn:' + x) && !S.targets.includes('fn:' + x)).map(x => `<option value="fn:${x}">${VARS[x].plain}(t): ${nm(x)} as a function of time</option>`).join('')}</optgroup>`
    + (known('t') ? '' : `<optgroup label="⏱ The time when …">${L.rungs.filter(x => !known(x)).map(x => `<option value="when:${x}">t when ${VARS[x].plain} = …</option>`).join('')}</optgroup>`);
}
// the quantities between two moments (with functions of time), and a point on the body even before it's tracked
function spanTargets(){
  if (!ladder() || !chapter().spanVars) return '';
  const opts = spanIds().filter(x => !known(x) && !S.targets.includes(x));
  return opts.length ? `<optgroup label="⏮⏭ Between two moments">${opts.map(x => `<option value="${x}">${VARS[x].plain}: ${nm(x)}</option>`).join('')}</optgroup>` : '';
}
function pointTargets(){
  const R = chapter().rimVars; if (!R || S.cond.rim) return '';
  return `<optgroup label="A point on the body">${R.filter(x => x !== 'r').map(x => `<option value="pt:${x}">${VARS[x].plain}: ${nm(x)}</option>`).join('')}</optgroup>`;
}
function addTarget(id){
  if (S.targets.includes(id) || known(id)) return;
  S.targets.push(id); renderAll(false);
  say(`🎯 Target ${letter(S.targets.length - 1)}: <b>${symOf(id)}</b>, ${isRank(id) ? 'across your scenarios' : `the ${nm(isFn(id) ? id.slice(3) : id)}${isFn(id) ? ' as a function of time' : ''}`}. ${S.sheet.length ? 'Look for a glowing equation on your sheet.' : 'Now gather equations that contain it.'}`);
}
const MOVE_TXT = {
  deriv: (m) => `d/dt ↓ ${symOf(m.v)}`, integ: (m) => `∫dt ↑ ${symOf(m.v)}`, eval: (m) => `Put in t → ${symOf(m.v)}`,
  solveT: (m) => `Solve ${VARS[m.from].sym}(t) = ${showVal(m.from)} for t`, start: (m) => `Set t = 0 → ${symOf(m.v)}`,
  span: (m) => `work out ${symOf(m.v)} between your two moments`,
};
function ladderCard(L, ks){
  const card = document.createElement('div');
  const mv = moves([], ks);
  const lastP = S.path[S.path.length - 1];
  card.className = 'eq ladder ' + (mv.length ? 'lit' : 'dim') + (lastP && lastP.kind !== 'eq' ? ' last' : '');
  const rung = (x, i) => {
    const here = mv.filter(m => m.from === x && m.kind !== 'span');
    const val = S.funcs[x] ? polyHTML(S.funcs[x].poly) : '<span class="muted">?</span>';
    return `<div class="rung"><span class="rname">${VARS[x].sym}(t)</span> = <span class="rval">${val}</span><span class="small muted"> ${unitPer(x, 0)}</span>
      <div class="ract">${here.map(m => `<button class="go" data-move="${mv.indexOf(m)}">${MOVE_TXT[m.kind](m)} ▶</button>`).join('')}</div></div>${i < L.rungs.length - 1 ? `<div class="rlink small muted">↓ d/dt · ↑ ∫dt${L.start[x] ? '' : ''}</div>` : ''}`;
  };
  const missing = L.rungs.slice(1).map((x, i) => [L.rungs[i], x]).filter(([hi, lo]) => S.funcs[lo] && !S.funcs[hi] && L.start[hi] && !ks.has(L.start[hi])).map(([hi]) => `To go up to ${VARS[hi].sym}(t) with ∫dt you need the start value ${VARS[L.start[hi]].sym}.`);
  card.innerHTML = `<div class="eqhead"><span class="eqlabel">LADDER</span><span class="cond">${S.cond.varA ? 'acceleration varies with time' : 'functions of time'}</span></div>
    <div class="ladderbody">${L.rungs.map(rung).join('')}</div>${missing.length ? `<div class="small warn">${missing.join(' ')}</div>` : ''}`;
  card.querySelectorAll('[data-move]').forEach(b => b.onclick = () => { if (!S.busy) ladderOp(mv[+b.dataset.move]); });
  return card;
}
function renderSheet(){
  const box = $('sheet'), ww = $('workWin');
  if (ww.parentElement === box) box.after(ww); // take the work panel out before rebuilding the cards
  box.innerHTML = '';
  const ks = knownSet();
  const L = ladder();
  if (L) box.appendChild(ladderCard(L, ks));
  if (!S.sheet.length && !L) box.innerHTML = '<div class="sheet-empty">Your sheet is empty. Open the <b>Library</b> (top right of the canvas) and press <b>+ Gather</b> on the equations you think this problem needs, or draw a free-body diagram in <b>Forces</b>.</div>';
  const stepsOf = (e) => S.path.map((p, i) => i).filter(i => S.path[i].kind === 'eq' && S.path[i].eq === e);
  const order = S.sheet.map((e, k) => ({ e, at: stepsOf(e)[0] ?? S.path.length + k })).sort((a, b) => a.at - b.at).map(x => x.e);
  for (const e of order){
    const eq = EQS[e], ok = applies(e), u = unknownsOf(e, ks), s = solvable(e, ks), fu = fnSolvable(e, ks);
    const card = document.createElement('div');
    const rel = S.focus.length && eq.vars.some(v => S.focus.includes(v));
    card.className = 'eq ' + (!ok ? 'dim' : (s || fu) ? (S.help.glow ? 'lit' : 'ready') : u.length === 0 ? 'done' : 'dim') + (S.focus.length ? (rel ? ' rel' : ' faded') : '');
    card.dataset.eq = e;
    let act;
    if (!ok) act = `<span class="small warn">Doesn’t apply now (needs ${naReason(e)})</span>`;
    else if (s) act = `<button class="go" data-solve="${s}">Solve for ${VARS[s].sym} ▶</button>${s === curTarget() ? '<span class="small hot">← target!</span>' : ''}`;
    else if (fu) act = `<button class="go" data-solve="fn:${fu}">Solve for ${symOf('fn:' + fu)} ▶</button>${'fn:' + fu === curTarget() ? '<span class="small hot">← target!</span>' : ''}`;
    else if (u.length === 0) act = `<button data-check="1">Check ✓</button><span class="small muted">All known.</span>`;
    else act = `<span class="small muted">Still missing: ${u.filter(x => !ks.has('fn:' + x)).map(x => VARS[x].sym).join(', ')}</span>`;
    const got = S.path.filter(p => p.kind === 'eq' && p.eq === e).map(p => `→ ${symOf(p.v)} = ${isFn(p.v) ? polyHTML(p.poly) : p.expr && !X.isNumeric(p.expr) ? X.toHTML(p.expr, S.printOpts) : `${fmt(p.val)} ${unitOf(p.v)}`}`);
    const lastP = S.path[S.path.length - 1];
    if (lastP && lastP.kind === 'eq' && lastP.eq === e) card.classList.add('last');
    const nums = stepsOf(e);
    card.innerHTML = `<button class="rm" data-rm="1" title="Remove from sheet">×</button><div class="eqhead">${nums.length ? `<span class="stepno">Step ${nums.map(i => i + 1).join(' · ')}</span>` : ''}<span class="eqlabel">${eq.label}</span><span class="cond">only if ${eq.condition}</span></div>
      <div class="form">${eq.form}</div>${got.length ? `<div class="found">${got.join('<br>')}</div>` : ''}${nums.map(usesHTML).join('')}${got.length && u.length === 0 ? '' : `<div class="act">${act}</div>`}`;
    card.addEventListener('click', (ev) => {
      if (S.busy) return;
      if (ev.target.closest('[data-solve], [data-check]') && solveLocked()) return;
      if (ev.target.closest('[data-rm]')){ S.sheet = S.sheet.filter(x => x !== e); renderAll(false); return; }
      const sb = ev.target.closest('[data-solve]'); if (sb){ solve(e, sb.dataset.solve); return; }
      if (ev.target.closest('[data-check]')){ check(e); return; }
      if (ev.target.closest('.sym')) return;
      if (ok && u.length > 1) dialog('Illegal operation', `<b>TOO MANY UNKNOWNS</b>${eq.label} still has <b>${u.length}</b> unknowns: ${u.map(x => VARS[x].sym).join(' and ')}. One equation can only pin down one unknown. Find one of them first and this one will light up.`);
    });
    box.appendChild(card);
  }
  // the work opens under the card that was solved last
  const last = box.querySelector('.eq.last'); if (last) last.after(ww);
  // status line
  const st = $('sheetStatus'), cur = curTarget();
  if (!S.targets.length) st.innerHTML = 'Pick what the question asks for with <b>🎯 add a target</b>.';
  else if (!cur) st.innerHTML = 'Every target is found.' + (K() ? ' Press <b>Replay motion</b> to watch it.' : '');
  else {
    const sp = shortest(S.sheet.filter(applies), ks, baseOf(cur)), lp = shortest(appEqs(), ks, baseOf(cur));
    const tl = `${letter(S.targets.indexOf(cur))} ${symOf(cur)}`;
    if (sp) st.innerHTML = `Your sheet can reach ${tl} in <b>${sp.length}</b> step${sp.length > 1 ? 's' : ''}.`;
    else if (lp) st.innerHTML = `Your sheet can’t reach ${tl} yet. Gather more from the library, or press <b>Hint</b>.`;
    else st.innerHTML = `Even the whole library can’t reach ${tl} yet. Is there a hidden given or a condition to set?`;
    const sys = findSystem(ks);
    if (sys){
      const U = sys.pair.map(x => VARS[x].sym), la = EQS[sys.a].label, lb = EQS[sys.b].label;
      const k = sys.eqs.length, words = ['', '', 'two', 'three', 'four', 'five', 'six'][k] || k;
      const txt = k > 2
        ? `${sysLabel(sys, ', ')} hold ${words} unknowns, ${U.slice(0, -1).join(', ')} and ${U[k - 1]}, and none of them can be found alone: that’s a <b>system of ${words} equations</b>. Solve one for an unknown and put it into another that holds it, then do it again: one equation with one unknown is left.`
        : `${la} and ${lb} share the same two unknowns, ${U[0]} and ${U[1]}: that’s a <b>system of two equations</b>. Solve ${la} for one of them and substitute it into ${lb}: it drops out, leaving one equation with one unknown.`;
      st.innerHTML += `<div class="sysnote">🧩 ${txt} <button class="go" id="sysBtn" style="margin-left:4px">Combine them ▶</button></div>`;
      $('sysBtn').onclick = () => combine(sys);
    }
  }
}

// which earlier steps a solved step used: the inputs of its equation that were found, not given
function usesHTML(i){
  const p = S.path[i], x = isFn(p.v) ? p.v.slice(3) : p.v;
  const used = EQS[p.eq].vars.filter(w => w !== x).map(w => [w, S.path.findIndex((q, k) => k < i && (q.v === w || q.v === 'fn:' + w))]).filter(([, k]) => k >= 0);
  return `<div class="uses">Step ${i + 1} uses ${used.length ? used.map(([w, k]) => `step ${k + 1}, which found ${VARS[w].sym}`).join('; ') : 'only givens'}.</div>`;
}

// ---------- the four stages: Setup → Forces / motion diagram → Conditions → Solve ----------
// Each stage earns a star when its check passes. You can open any stage up to one past the first stage that
// hasn't passed (a peek ahead); stages further on stay locked. The sheet can always be read, but solving
// waits until Solve is unlocked.
const STAGES = [
  { name: 'Setup', tip: 'Draw the setup (or load a template), and add each quantity the problem gives you.' },
  { name: 'Forces', tip: 'Draw the forces on each body and write ΣF = ma onto your sheet, or draw its motion arrows (v, a, or ω, α round a wheel).' },
  { name: 'Conditions', tip: 'Set what the picture can’t show: hidden givens like “starts from rest”, your axis, constant or changing acceleration.' },
  { name: 'Solve', tip: 'Pick what the question asks for, gather equations, and solve the glowing ones one step at a time.' },
];
S.stage = 0;
const drawnBodies = () => S.build ? fbdBodies() : [];
// true = passed, false = not yet, null = nothing drawn, so no diagram to check (it doesn't block)
function stageChecks(){
  const bs = drawnBodies();
  const fbd = bs.some(b => Object.values(S.gen).some(g => g.key === 'fbd:' + b.id));
  const motion = bs.some(b => { const sh = S.build.shapes.find(x => x.id === b.id); return !!(sh && (sh.v || sh.a || sh.omega || sh.alpha)); });
  const forces = !bs.length ? null : chapter().forcesOptional ? (motion || null) : fbd || motion;
  return [bs.length > 0 || userGivens() > 0, forces, S.condOk, S.targets.length > 0 && !curTarget()];
}
const firstOpen = (c) => { const i = c.indexOf(false); return i < 0 ? STAGES.length : i; };
const reach = (c = stageChecks()) => Math.min(STAGES.length - 1, firstOpen(c) + 1);
const solveOpen = () => reach() >= 3;
const lockText = () => { const f = firstOpen(stageChecks()); return `Solving unlocks when <b>${STAGES[f].name}</b> passes its check. ${STAGES[f].tip}`; };
function solveLocked(){ if (solveOpen()) return false; say(lockText()); return true; }
// open a stage's panels beside the canvas (Solve can always be opened to read the sheet)
function openStage(i, quiet = false){
  const c = stageChecks();
  if (i > reach(c) && i !== 3){ if (!quiet) say(`<b>${STAGES[i].name}</b> unlocks when <b>${STAGES[firstOpen(c)].name}</b> passes its check. ${STAGES[firstOpen(c)].tip}`); return false; }
  S.stage = i;
  if (i > 0) COURSE.event('leftSetup');
  COURSE.event(['start', 'forces', 'conditions', 'solve'][i]);
  if (i === 0 && S.dtab === 'forces') showTab('build');
  if (i === 1 && S.dtab !== 'forces') showTab('forces');
  renderStage(); return true;
}
function renderStage(){
  const i = S.stage, locked = i === 3 && !solveOpen();
  document.querySelectorAll('.ws-right [data-stage]').forEach(el => el.classList.toggle('off', !el.dataset.stage.split(' ').includes(String(i))));
  $('paneForces').hidden = i !== 1; $('paneSide').hidden = i === 1;
  $('sheetWin').classList.toggle('locked', locked);
  $('sheetLock').hidden = !locked; if (locked) $('sheetLock').innerHTML = `🔒 You can read your sheet. ${lockText()}`;
  const bs = drawnBodies().length, g = Object.values(S.givens).some(x => x.from !== 'condition') || Object.keys(S.funcs).length;
  $('setupGuide').innerHTML = `<ul class="sguide"><li class="${bs ? 'ok' : ''}">${bs ? '✓' : '○'} Draw the setup with the tools beside the canvas, or load a template.</li><li class="${g ? 'ok' : ''}">${g ? '✓' : '○'} Give each quantity a value, or keep it as a symbol: click its label on the drawing, or + Add a given.</li></ul>`;
  steps();
}
function steps(){
  const c = stageChecks(), f = firstOpen(c), r = reach(c);
  const state = (i) => c[i] ? 'passed: star earned' : c[i] === null ? (drawnBodies().length ? 'optional here: draw ω or α on the wheel for a star' : 'nothing drawn, so no diagram to check') : i > r ? `locked until ${STAGES[f].name} passes` : 'not passed yet';
  $('steps').innerHTML = STAGES.map((st, i) => `<button data-stage="${i}" class="${c[i] ? 'done' : ''}${c[i] === null ? ' na' : ''}${i === S.stage ? ' now' : ''}${i > r ? ' locked' : ''}" ${i === S.stage ? 'aria-current="step"' : ''} title="${st.name}: ${state(i)}"><b>${i + 1}</b>${st.name}<i class="st" aria-hidden="true"></i></button>`).join('<i class="sep">›</i>')
    + `<button id="sheetTab" class="${S.stage === 3 ? 'now' : ''}" title="Your sheet, from any stage">Sheet · ${S.sheet.length}</button>`;
  $('steps').querySelectorAll('[data-stage]').forEach(b => b.onclick = () => openStage(+b.dataset.stage));
  $('sheetTab').onclick = () => openStage(3);
  if (f !== S.lastStep){
    if (f < STAGES.length && S.lastStep !== -1 && f > S.lastStep) say(`${c[S.lastStep] ? `⭐ ${STAGES[S.lastStep].name} passed. ` : ''}Next: <b>${STAGES[f].name}</b>. ${STAGES[f].tip}`);
    S.lastStep = f;
  }
}
function paintSyms(){
  document.querySelectorAll('.sym').forEach(el => { const id = el.dataset.v; el.className = 'sym s-' + stateOf(id) + (S.hover === id ? ' hl' : ''); });
  document.querySelectorAll('.known').forEach(r => r.classList.toggle('hl', r.dataset.v === S.hover));
}
function setHover(id){ if (S.hover === id) return; S.hover = id; paintSyms(); if (!S.anim) draw(); }
document.addEventListener('mouseover', (e) => { const s = e.target.closest('.sym'); if (s) setHover(s.dataset.v); });
document.addEventListener('mouseout', (e) => { const s = e.target.closest('.sym'); if (s) setHover(null); });

// ---------- solving ----------
const sleep = (ms) => new Promise(r => setTimeout(r, calm() ? 0 : ms));
const plug = (sub, v) => sub.replace(/\{(\w+)\}/g, (_, id) => id === 'inc' ? `<span class="num">${fmt(v[id])}°</span>` : `<span class="num">(${fmt(v[id])}${unitOf(id) ? ' ' + unitOf(id) : ''})</span>`);
function extras(id, x){
  const dd = dr(id);
  if (dd && x !== 0) return ` <span class="small muted">${x < 0 ? '−' : '+'}: ${dd[x < 0 ? 1 : 0]}</span>`;
  if (id === 'theta') return ` <span class="small muted">= ${fmt(x / (2 * Math.PI))} rev</span>`;
  return '';
}
// symbols and numbers put into a template, for the "put in what you know" line
const plugSym = (sub) => sub.replace(/\{(\w+)\}/g, (_, id) => {
  if (isSymGiven(id)) return S.givens[id].dir ? `(−${V(id)})` : V(id);
  if (isSymbolic(id)) return `(${X.toHTML(S.found[id].expr, S.printOpts)})`;
  return id === 'inc' ? `<span class="num">${fmt(val(id))}°</span>` : `<span class="num">(${fmt(val(id))}${unitOf(id) ? ' ' + unitOf(id) : ''})</span>`;
});
// random values for the symbols, near their typical sizes
function randomSymbols(ids){
  const o = {};
  for (const id of ids) o[id] = id === 'inc' ? 15 + 50 * Math.random() : SAMPLE[id] * (0.6 + 0.8 * Math.random());
  return o;
}
// Re-run the whole path with plain numbers at random values for the symbols (templates only, no simplifier)
// and compare with the simplified symbolic answer at the same values. last(v, fns, rnd) → [stepwise, simplified, extra text].
function checkWithNumbers(last){
  const syms = Object.keys(S.givens).filter(isSymGiven);
  for (let tries = 0; tries < 6; tries++){
    const rnd = randomSymbols(syms);
    try {
      const v = {}, fns = {};
      for (const [id, g] of Object.entries(S.givens)) v[id] = g.kind === 'symbol' ? (g.dir ? -1 : 1) * rnd[id] : g.val;
      for (const [id, f] of Object.entries(S.funcs)) if (f.from === 'given') fns[id] = f.poly.map(c => X.evalRat(c, rnd));
      for (const p of S.path) routeStep(p, v, fns);
      const [stepwise, simplified, extra = ''] = last(v, fns, rnd);
      if (!isFinite(stepwise) || !isFinite(simplified)) continue;
      return { ok: Math.abs(stepwise - simplified) <= 1e-6 * Math.max(1, Math.abs(stepwise)), rnd, stepwise, simplified, extra };
    } catch (e){ if (!(e instanceof X.MathError)) throw e; }
  }
  return null;
}
function checkText(c){
  if (!c) return 'Couldn’t find random values that work for every step, so no numeric check this time.';
  const at = Object.entries(c.rnd).map(([id, x]) => `${VARS[id].plain} = ${fmt(x)}${id === 'inc' ? '°' : unitOf(id) ? ' ' + unitOf(id) : ''}`).join(', ') + c.extra;
  return c.ok ? `✓ At random values (${at}), working step by step with numbers gives ${fmt(c.stepwise)} and the simplified answer gives ${fmt(c.simplified)}.`
    : `✗ At ${at} the step-by-step numbers give ${fmt(c.stepwise)} but the simplified answer gives ${fmt(c.simplified)}. The simplifier slipped: please report this problem.`;
}
// ---------- the work panel: every kind of step writes its algebra here ----------
function startWork(title, heading){
  $('workTitle').textContent = title;
  $('work').innerHTML = ''; workBlock('section', heading, true);
  $('workWin').scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'nearest' });
}
function workBlock(cls, content, asText = false){
  const d = document.createElement('div'); d.className = cls;
  if (asText) d.textContent = content; else d.innerHTML = content;
  $('work').appendChild(d); return d;
}
// one line of algebra (with its reason, if any), revealed with a tick
async function workLine(html, why){
  const d = workBlock('line', why === undefined ? html : `${html}<span class="why">${why}</span>`);
  paintSyms(); await sleep(30); d.classList.add('show'); beep(880, 0.04); await sleep(400);
}
const targetNote = (v) => `🎯 That’s target ${letter(S.targets.indexOf(v))}. ${curTarget() ? `Next up: ${symOf(curTarget())}.` : 'Solved!'}`;
// the step is done: keep its work for the Path panel, update everything, celebrate the last target
// the part it belongs to: the target it found, or else the target being worked on
function finishStep(entry, cur){
  const part = S.targets.includes(entry.v) ? entry.v : cur, x = isFn(entry.v) ? entry.v.slice(3) : entry.v, rec = isFn(entry.v) ? S.funcs[x] : S.found[x];
  if (rec) rec.part = part;
  S.path.push({ ...entry, part, html: $('work').innerHTML, title: $('workTitle').textContent });
  beep(1200, 0.06); S.busy = false; renderAll(false); stepPulse();
  document.querySelector('#sheet .eq.last')?.scrollIntoView({ block: 'nearest' });
  if (entry.v === cur && !curTarget()) celebrate();
}
// one step of the path, redone with plain numbers (v: scalars, fns: id → numeric coefficients)
function routeStep(p, v, fns){
  const L = chapter().ladder, poly = (cs, t) => cs.reduce((s, c, k) => s + c * t ** k, 0);
  if (p.kind === 'eq' && (p.fn || p.gen)){
    const eq = EQS[p.eq], x = isFn(p.v) ? p.v.slice(3) : p.v, env = {};
    for (const w of eq.vars) if (w !== x) env[w] = (p.useFn || []).includes(w) ? X.polyToRat(X.polyFromNumbers(fns[w])) : X.number(v[w]);
    const R = eq.generated ? X.solveLinear(X.substRat(eq.Z, env), x) : X.toRat(eq.solve[x].tree, env, 1);
    if (p.fn) fns[x] = X.ratToPoly(R).map(c => X.numValue(c)); else v[x] = X.evalRat(R, {});
    return;
  }
  if (p.kind === 'eq'){ v[p.v] = X.evalNum(p.tree, v, p.branch); return; }
  const x = isFn(p.v) ? p.v.slice(3) : p.v;
  if (p.kind === 'deriv') fns[x] = fns[p.from].slice(1).map((c, k) => c * (k + 1));
  else if (p.kind === 'integ') fns[x] = [p.start ? v[p.start] : 0, ...fns[p.from].map((c, k) => c / (k + 1))];
  else if (p.kind === 'eval') v[x] = poly(fns[p.from], v.t);
  else if (p.kind === 'start') v[x] = fns[p.from][0] || 0;
  else if (p.kind === 'span') v[x] = X.numValue(spanMath(x, Object.fromEntries(Object.entries(fns).map(([k, cs]) => [k, X.polyFromNumbers(cs)]))).value);
  else if (p.kind === 'solveT'){
    const cs = fns[p.from].map((c, k) => k ? c : c - v[p.from]);
    const sol = X.polySolve(X.polyFromNumbers(cs), X.number(0));
    const pos = sol.roots.map(r => r.x).filter(t => t > 1e-12).sort((a, b) => a - b);
    if (!pos.length) throw new X.MathError('no positive root');
    v.t = pos[0];
  }
}
const MOVE_LABEL = { sys: 'system', deriv: 'd/dt', integ: '∫dt', eval: 'put in t', solveT: 'solve for t', start: 't = 0', span: 'between moments' };
// a ladder move: differentiate, integrate, evaluate, solve for t, or read the start value. All exact (symbols allowed).
async function ladderOp(m){
  if (m.kind === 'span') return spanOp(m);
  if (solveLocked()) return;
  const L = chapter().ladder, step = S.path.length + 1, cur = curTarget();
  const x = isFn(m.v) ? m.v.slice(3) : m.v, from = m.from, P = S.funcs[from].poly;
  const sy = (id) => VARS[id].sym, fnS = (id) => `${V(id)}(${V('t')})`;
  const fm = (x) => fmt(x).replace(/^-/, '−');
  const lines = []; let result, poly = null, expr = null, val = null, note = '';
  try {
    if (m.kind === 'deriv'){
      poly = X.polyD(P);
      lines.push([`${fnS(x)} = d${V(from)}/d${V('t')}`, `${sy(x)} is the rate of change of ${sy(from)}`]);
      lines.push([`${fnS(x)} = d/d${V('t')} [ ${polyHTML(P)} ]`, `put in ${sy(from)}(t)`]);
      lines.push([`${fnS(x)} = ${polyHTML(poly)}`, 'differentiate each term: d/dt (c·tⁿ) = n·c·tⁿ⁻¹']);
      note = `Units: each coefficient’s unit gains another /s (${P.map((c, k) => c.n.length && k ? unitPer(from, k) + ' → ' + unitPer(x, k - 1) : '').filter(Boolean).join(', ')}).`;
    } else if (m.kind === 'integ'){
      const start = m.start ? exprOf(m.start) : X.number(0);
      poly = X.polyInt(P, start);
      lines.push([`${fnS(x)} = ${x === L.rungs[0] ? '' : `${m.start ? V(m.start) : '0'} + `}∫₀<sup>t</sup> ${V(from)} d${V('t')}`, m.start ? `${sy(x)} starts at ${sy(m.start)} and changes by the area under ${sy(from)}(t)` : L.zeroNote[x]]);
      lines.push([`${fnS(x)} = ${m.start ? showVal(m.start) + ' + ' : ''}∫₀<sup>t</sup> [ ${polyHTML(P)} ] d${V('t')}`, `put in ${sy(from)}(t)${m.start ? ` and ${sy(m.start)}` : ''}`]);
      lines.push([`${fnS(x)} = ${polyHTML(poly)}`, 'integrate each term: ∫ c·tⁿ dt = c·tⁿ⁺¹/(n + 1)']);
      note = 'Units: each coefficient’s unit loses a /s, and the start value supplies the constant.';
    } else if (m.kind === 'eval'){
      expr = X.polyAt(P, exprOf('t'));
      lines.push([`${V(x)} = ${fnS(from)} at the known ${V('t')}`, `${sy(x)} is the value of ${sy(from)}(t) at that moment`]);
      lines.push([`${V(x)} = ${polyHTML(P).replaceAll(V('t'), `(${showVal('t')})`)}`, 'put in t']);
    } else if (m.kind === 'start'){
      expr = P[0] || X.number(0);
      lines.push([`${V(x)} = ${fnS(from)} at ${V('t')} = 0`, `${sy(x)} is the value at the start`]);
      lines.push([`${V(x)} = ${polyHTML(P).replaceAll(V('t'), '(0)')}`, 'every term with t vanishes']);
    } else if (m.kind === 'solveT'){
      const want = exprOf(from);
      const sol = X.polySolve(P, want), q = sol.q;
      lines.push([`${fnS(from)} = ${showVal(from)}`, `the moment the question asks about`]);
      lines.push([`${polyHTML(q)} = 0`, 'move everything to one side']);
      lines.push(...rootLines(sol, V('t')));
      const sorted = [...sol.roots].sort((a, b) => a.x - b.x), pos = sorted.filter(r => r.x > 1e-12);
      if (!pos.length) throw new X.MathError(`No positive time works: ${sy(from)} never reaches that value after the clock starts.`);
      const keep = pos[0];
      const rejected = sorted.filter(r => r !== keep).map(r => r.x <= 1e-12 ? `${fm(r.x)} s is rejected: it’s before the clock started (t < 0)` : `${fm(r.x)} s is a later time it has this value again`);
      if (rejected.length) note = `Keep t = ${fm(keep.x)} s, the first time after t = 0. ${rejected.join('; ')}.`;
      expr = keep.r;
    }
  } catch (e){ if (!(e instanceof X.MathError)) throw e; dialog('Math says no', `<b>CAN’T DO THAT</b>${e.message}`); return; }
  S.busy = true;
  if (expr) val = X.evalRat(expr, SAMPLE);
  startWork(`Work · step ${step}: ladder ${MOVE_LABEL[m.kind]} → ${plainOf(m.v)}`, `MOTION LADDER: ${MOVE_LABEL[m.kind].toUpperCase()}`);
  for (const [h, why] of lines) await workLine(h, why);
  workBlock('result', poly ? `${symOf(m.v)} = ${polyHTML(poly)}` : `${VARS[x].sym} = ${X.isNumeric(expr) ? withUnit(x, val) : X.toHTML(expr, S.printOpts)}`);
  if (note) workBlock('note', note, true);
  if (poly) S.funcs[x] = { from: 'ladder', poly, step };
  else S.found[x] = { val, expr: X.isNumeric(expr) ? null : expr, step };
  workBlock('feedback', m.v === cur ? targetNote(m.v) : `Found ${symOf(m.v)}.`);
  finishStep({ kind: m.kind, from, start: m.start, v: m.v, val, expr, poly }, cur);
}
// the real roots of a polynomial equation in t, written out: linear, quadratic formula, or found numerically
function rootLines(sol, tH){
  const fm = (x) => fmt(x).replace(/^-/, '−'), q = sol.q;
  const show = (r) => X.isNumeric(r.r) ? `${fm(r.x)} s` : X.toHTML(r.r, S.printOpts);
  if (sol.method === 'linear') return [[`${tH} = ${show(sol.roots[0])}`, 'it’s linear in t: isolate t']];
  if (sol.method === 'quadratic'){
    const [c, b, a] = q.map(r => X.isNumeric(r) ? fm(X.numValue(r)) : `(${X.toHTML(r, S.printOpts)})`);
    return [[`${tH} = [−b ± √(b² − 4ac)] / (2a)`, `quadratic formula with a = ${a}, b = ${b}, c = ${c}`], [`${tH} = ${sol.roots.map(show).join(' or ')}`, 'two roots']];
  }
  return [[`${tH} = ${sol.roots.map(show).join(' or ')}`, `degree ${q.length - 1}: the real roots, found numerically`]];
}

// ---------- between two moments (Phase 3) ----------
// Each moment is a time (x = 't') or the first time after the previous moment that θ, ω or α has a value.
// Sizes are typed without a sign; the direction (dir) carries it, as everywhere else.
const newSpan = () => ({ A: { x: 't', mag: '0', dir: 0 }, B: { x: 't', mag: '', dir: 0 } });
const evNum = (e) => { const m = Number(String(e.mag).trim().replace(',', '.')); return String(e.mag).trim() !== '' && isFinite(m) && m >= 0 ? (e.dir ? -1 : 1) * m : null; };
const spanReady = () => !!S.span && evNum(S.span.A) !== null && evNum(S.span.B) !== null;
const spanNeeds = () => [S.span.A, S.span.B].map(e => e.x).filter(x => x !== 't');
const evUnit = (x) => x === 't' ? 's' : unitOf(x);
const evText = (e) => { const v = evNum(e); return `${e.x === 't' ? 't' : VARS[e.x].sym} = ${v === null ? '…' : fmt(v).replace(/^-/, '−')} ${evUnit(e.x)}`; };
// The math, written once: P maps rung ids to polynomials (exact, symbols allowed). Returns { value, lines, note }.
// Used for the work panel (spanOp) and, with plain numbers, for “check with numbers” (routeStep).
function spanMath(x, P){
  const lines = [], notes = [], at = (r) => X.evalRat(r, SAMPLE), fm = (v) => fmt(v).replace(/^-/, '−');
  const sub = { A: 'A', B: 'B' }, tH = (k) => `${V('t')}<sub>${sub[k]}</sub>`;
  const times = {};
  for (const k of ['A', 'B']){
    const e = S.span[k], v = evNum(e), after = k === 'A' ? 0 : times.A.x;
    if (e.x === 't'){
      if (k === 'B' && v <= after + 1e-12) throw new X.MathError('The second moment has to come after the first.');
      times[k] = { r: X.number(v), x: v };
      lines.push([`${tH(k)} = ${fm(v)} s`, `the ${k === 'A' ? 'first' : 'second'} moment is a time you chose`]);
      continue;
    }
    const sol = X.polySolve(P[e.x], X.number(v));
    lines.push([`${V(e.x)}(${tH(k)}) = ${fm(v)} ${evUnit(e.x)}`, `the ${k === 'A' ? 'first' : 'second'} moment: when ${VARS[e.x].sym} = ${fm(v)}${k === 'B' ? `, after ${tH('A')}` : ''}`]);
    lines.push([`${polyHTML(sol.q)} = 0`, `put in ${VARS[e.x].sym}(t) and move everything to one side`]);
    lines.push(...rootLines(sol, tH(k)));
    const sorted = [...sol.roots].sort((a, b) => a.x - b.x), keep = sorted.find(r => r.x > after + 1e-9);
    if (!keep) throw new X.MathError(`${VARS[e.x].sym} never equals ${fm(v)} ${evUnit(e.x)} ${k === 'A' ? 'after the clock starts' : 'after the first moment'}.`);
    const why = (r) => Math.abs(r.x) <= 1e-9 ? 't = 0 s is where it starts, not a later moment' : r.x < 0 ? `${fm(r.x)} s is rejected: it’s before the clock started (t < 0)` : r.x <= after + 1e-9 ? `${fm(r.x)} s is rejected: it’s before the first moment` : `${fm(r.x)} s is a later time it has this value again`;
    const rej = sorted.filter(r => r !== keep);
    if (rej.length) notes.push(`${k === 'A' ? 'First' : 'Second'} moment: keep ${tH(k).replace(/<[^>]+>/g, '')} = ${fm(keep.x)} s, the first time after ${k === 'A' ? 't = 0' : 'the first moment'}. ${rej.map(why).join('; ')}.`);
    times[k] = keep;
  }
  const { A, B } = times, dt = X.R.add(B.r, X.R.neg(A.r));
  const valAt = (id, k) => X.polyAt(P[id], times[k].r);
  const show = (r) => X.isNumeric(r) ? fm(X.numValue(r)) : `(${X.toHTML(r, S.printOpts)})`;
  let value;
  if (x === 'aavg'){
    const wA = valAt('w', 'A'), wB = valAt('w', 'B');
    lines.push([`${V('aavg')} = Δ${V('w')} / Δ${V('t')} = [${V('w')}(${tH('B')}) − ${V('w')}(${tH('A')})] / (${tH('B')} − ${tH('A')})`, 'average angular acceleration: the change in ω divided by the time it took']);
    value = X.R.mul(X.R.add(wB, X.R.neg(wA)), X.R.inv(dt));
    lines.push([`${V('aavg')} = [${show(wB)} − ${show(wA)}] / [${show(B.r)} − ${show(A.r)}]`, 'put in ω at each moment (from ω(t)) and the two times']);
    notes.push('The average is not α at any one moment: α(t) = dω/dt changes over the interval.');
  } else {
    const thA = valAt('theta', 'A'), thB = valAt('theta', 'B'), dth = X.R.add(thB, X.R.neg(thA));
    lines.push([`Δ${V('theta')} = ${V('theta')}(${tH('B')}) − ${V('theta')}(${tH('A')})`, 'the angle turned between the moments: where it ends minus where it starts']);
    lines.push([`Δ${V('theta')} = ${show(thB)} − ${show(thA)}`, 'put each time into θ(t)']);
    // does it turn back in between? ω = dθ/dt changes sign at a root of ω(t) inside the interval
    const w = P.w || X.polyD(P.theta);
    let turns = [];
    try { turns = X.polySolve(w, X.number(0)).roots.filter(r => r.x > A.x + 1e-9 && r.x < B.x - 1e-9).sort((a, b) => a.x - b.x); }
    catch (e){ if (!(e instanceof X.MathError)) throw e; if (x === 'dtrav') throw new X.MathError('To add up the angle travelled, the app needs the times when ω = 0, and with these symbols it can’t solve for them exactly.'); }
    let trav = null;
    if (turns.length){
      const pts = [A, ...turns, B].map(tt => X.polyAt(P.theta, tt.r));
      trav = pts.slice(1).reduce((acc, q, i) => { const d = X.R.add(q, X.R.neg(pts[i])); return X.R.add(acc, at(d) < 0 ? X.R.neg(d) : d); }, X.number(0));
    }
    const turnTxt = turns.map(r => `${fm(r.x)} s`).join(' and ');
    if (x === 'dtrav'){
      if (!turns.length){ value = at(dth) < 0 ? X.R.neg(dth) : dth; lines.push([`${V('dtrav')} = |Δ${V('theta')}|`, 'ω keeps one sign between the moments, so it never turns back: the angle travelled is the size of Δθ']); }
      else {
        value = trav;
        lines.push([`${V('w')}(t) = 0 at t = ${turnTxt}`, `ω(t) = ${P.w ? '' : 'dθ/dt = '}${polyHTML(w)} changes direction there`]);
        lines.push([`${V('dtrav')} = ${[A, ...turns, B].slice(1).map((_, i) => `|${V('theta')}(t<sub>${i + 1}</sub>) − ${V('theta')}(t<sub>${i}</sub>)|`).join(' + ')}`, 'add the size of each stretch where it turns one way']);
        notes.push(`It changes direction at t = ${turnTxt}, so the net angle Δθ = ${X.isNumeric(dth) ? fm(X.numValue(dth)) + ' rad' : X.toHTML(dth, S.printOpts)} is smaller than the angle travelled.`);
      }
    } else {
      value = dth;
      if (x !== 'dth') lines.push([`Δ${V('theta')} = ${show(dth)}${X.isNumeric(dth) ? ' rad' : ''}`, 'subtract']);
      if (x === 'nrev'){
        lines.push([`${V('nrev')} = Δ${V('theta')} / 2π`, 'one revolution is 2π rad']);
        lines.push([`${V('nrev')} = ${show(dth)} / 2π`, 'put in Δθ']); value = X.scale(dth, 1 / (2 * Math.PI));
      }
      if (x === 'wavg'){
        lines.push([`${V('wavg')} = Δ${V('theta')} / (${tH('B')} − ${tH('A')})`, 'average angular velocity: angle turned divided by the time it took']);
        lines.push([`${V('wavg')} = ${show(dth)} / [${show(B.r)} − ${show(A.r)}]`, 'put in Δθ and the two times']); value = X.R.mul(dth, X.R.inv(dt));
      }
      if (turns.length){
        const tv = X.isNumeric(trav) ? X.numValue(trav) : null;
        notes.push(`⚠ ω changes direction at t = ${turnTxt}: it turns back, so this counts the <b>net</b> angle${x === 'wavg' ? '' : ` (Δθ = ${X.isNumeric(dth) ? fm(X.numValue(dth)) + ' rad' : X.toHTML(dth, S.printOpts)})`}. The angle travelled both ways is ${tv === null ? X.toHTML(trav, S.printOpts) : `${fm(tv)} rad = ${fm(tv / (2 * Math.PI))} rev`}. Add the target θ_trav if the question means that.`);
      }
    }
  }
  return { value, lines, note: notes.join(' ') };
}
async function spanOp(m){
  if (solveLocked()) return;
  const step = S.path.length + 1, cur = curTarget(), x = m.v;
  const P = Object.fromEntries(Object.entries(S.funcs).map(([k, f]) => [k, f.poly]));
  let r;
  try { r = spanMath(x, P); } catch (e){ if (!(e instanceof X.MathError)) throw e; dialog('Math says no', `<b>CAN’T DO THAT</b>${e.message}`); return; }
  S.busy = true;
  const expr = r.value, val = X.evalRat(expr, SAMPLE);
  startWork(`Work · step ${step}: between two moments → ${plainOf(x)}`, 'BETWEEN TWO MOMENTS');
  for (const [h, why] of r.lines) await workLine(h, why);
  workBlock('result', `${VARS[x].sym} = ${X.isNumeric(expr) ? withUnit(x, val) : X.toHTML(expr, S.printOpts)}`);
  if (r.note) workBlock('note', r.note);
  S.found[x] = { val, expr: X.isNumeric(expr) ? null : expr, step };
  workBlock('feedback', x === cur ? targetNote(x) : `Found ${symOf(x)}.`);
  finishStep({ kind: 'span', from: m.from, v: x, val, expr }, cur);
}
// the card on the sheet where the student picks the two moments
function renderSpan(){
  const box = $('spanCard'), on = !!chapter().spanVars && S.targets.some(t => spanIds().includes(t));
  box.hidden = !on; if (!on) return;
  const L = chapter().ladder, sp = S.span;
  const row = (k) => { const e = sp[k];
    return `<div class="spanrow"><span class="spanlbl">${k === 'A' ? 'From' : 'to'}</span><select id="span${k}x" aria-label="${k === 'A' ? 'First' : 'Second'} moment">${['t', ...L.rungs].map(x => `<option value="${x}" ${e.x === x ? 'selected' : ''}>${x === 't' ? 't =' : `when ${VARS[x].plain} =`}</option>`).join('')}</select>`
      + `<input id="span${k}v" type="text" inputmode="decimal" value="${esc(e.mag)}" placeholder="size" aria-label="Value"><span class="small muted">${evUnit(e.x)}</span>`
      + (e.x !== 't' && dr(e.x) ? `<select id="span${k}d" aria-label="Direction">${dr(e.x).map((w, i) => `<option value="${i}" ${e.dir === i ? 'selected' : ''}>${w}</option>`).join('')}</select>` : '') + '</div>'; };
  const moves = spanReady() ? spanIds().filter(x => S.targets.includes(x) && !known(x)) : [];
  const ks = knownSet(), avail = new Set(moves.filter(x => known('fn:' + chapter().spanVars[x]) && spanNeeds().every(n => ks.has('fn:' + n))));
  box.innerHTML = `<div class="eqhead"><span class="eqlabel">⏮⏭</span><b>Between two moments</b></div>${row('A')}${row('B')}
    <div class="small">${spanReady() ? `From <b>${evText(sp.A)}</b> to ${sp.B.x === 't' ? '' : 'the first time after it that '}<b>${evText(sp.B)}</b>.` : 'Pick both moments: a time, or when θ, ω or α has a value (like “when ω = 0”).'}</div>
    ${moves.length ? `<div class="act">${moves.map(x => avail.has(x) ? `<button class="go" data-span="${x}">Find ${VARS[x].sym} ▶</button>` : `<span class="small muted">${VARS[x].sym} needs ${[chapter().spanVars[x], ...spanNeeds()].filter((n, i, a) => a.indexOf(n) === i && !ks.has('fn:' + n)).map(n => VARS[n].sym + '(t)').join(' and ')} first (use the ladder).</span>`).join(' ')}</div>` : ''}`;
  const commit = async (k, patch) => {
    if (S.path.some(p => p.kind === 'span') && !await beforeClearing('Changing a moment')){ renderSpan(); return; }
    if (S.path.some(p => p.kind === 'span')) clearDerived();
    Object.assign(S.span[k], patch); renderAll(false);
  };
  for (const k of ['A', 'B']){
    $(`span${k}x`).onchange = (e) => commit(k, { x: e.target.value, dir: 0 });
    $(`span${k}v`).oninput = (e) => { if (!S.path.some(p => p.kind === 'span')) S.span[k].mag = e.target.value; }; // kept while typing, applied on change
    $(`span${k}v`).onchange = (e) => {
      const t = e.target.value.trim().replace(',', '.'), v = Number(t);
      if (t !== '' && !isFinite(v)){ dialog('Not a number', '<b>SYNTAX ERROR</b>Type the size as a number, like <b>0</b> or <b>2.5</b>.'); return; }
      if (v < 0){ if (S.span[k].x === 't'){ dialog('Before the start?', '<b>TIME CAN’T BE NEGATIVE HERE</b>The clock starts at t = 0, so pick a time of 0 or later.'); return; }
        say('I flipped the direction for you: sizes are always positive, and the direction picker carries the sign.'); commit(k, { mag: String(-v), dir: 1 - S.span[k].dir }); return; }
      commit(k, { mag: t });
    };
    const d = $(`span${k}d`); if (d) d.onchange = (e) => commit(k, { dir: +e.target.value });
  }
  box.querySelectorAll('[data-span]').forEach(b => b.onclick = () => { if (!S.busy) spanOp({ kind: 'span', v: b.dataset.span, from: chapter().spanVars[b.dataset.span] }); });
}
// Solve any equation with symbols, functions of time and numbers:
// generated equations (Z = 0, linear in the unknown) and library equations whose inputs include functions of t.
async function solveSym(eqId, target){
  const fnMode = isFn(target), x = fnMode ? target.slice(3) : target, eq = EQS[eqId];
  const useFn = [], env = {};
  for (const w of eq.vars){
    if (w === x) continue;
    const scalarConst = known(w) && !isMoment(w);
    if (S.funcs[w] && (fnMode ? !scalarConst : !known(w))){ env[w] = X.polyToRat(S.funcs[w].poly); useFn.push(w); }
    else if (known(w)) env[w] = exprOf(w);
  }
  let R, iso, poly = null;
  try {
    if (eq.generated){ iso = X.solveLinear(eq.Z, x, plain(x)); R = X.solveLinear(X.substRat(eq.Z, env), x, plain(x)); }
    else { iso = X.toRat(eq.solve[x].tree, symEnv(eq.vars), 1); R = X.toRat(eq.solve[x].tree, env, 1); }
    if (fnMode || useFn.length){ poly = X.ratToPoly(R); if (!poly) throw new X.MathError(`${plain(x)} doesn’t come out as a polynomial in t here.`); }
  } catch (e){ if (!(e instanceof X.MathError)) throw e; dialog('Math says no', `<b>CAN’T SOLVE THAT</b>${e.message}`); return; }
  const asFn = !!poly && (fnMode || poly.length > 1);
  const symb = !X.isNumeric(R);
  const value = asFn ? null : X.evalRat(R, samplesNow());
  S.busy = true;
  const cur = curTarget(), step = S.path.length + 1, tgt = asFn ? 'fn:' + x : x;
  startWork(`Work · step ${step}: ${eq.label} → ${plainOf(tgt)}`, 'ISOLATE (SYMBOLS FIRST)');
  await workLine(eq.form, `start from ${eq.label}${eq.condition ? ` (${eq.condition})` : ''}`);
  if (eq.generated) await workLine(`${V(x)} = ${X.toHTML(iso, S.printOpts)}`, `isolate ${plain(x)}: move the other terms across, then divide by what multiplies ${plain(x)}`);
  else for (const st of eq.solve[x].steps) await workLine(st.eq, st.why);
  workBlock('section', 'PUT IN WHAT YOU KNOW', true);
  for (const w of useFn) await workLine(`${V(w)}(${V('t')}) = ${polyHTML(S.funcs[w].poly)}`, `${plain(w)} is a function of time`);
  workBlock('result', asFn ? `${symOf('fn:' + x)} = ${polyHTML(poly)}` : `${VARS[x].sym} = ${symb ? X.toHTML(R, S.printOpts) : withUnit(x, value)}`); paintSyms();
  workBlock('small units', `Units ✓ every term works out to ${eq.generated ? (eq.unitText || 'the same unit') : eq.solve[x].unitText}.`);
  if (asFn) S.funcs[x] = { from: 'eq', poly, step };
  else S.found[x] = { val: value, expr: symb ? R : null, step, moment: eq.vars.some(w => w !== x && known(w) && isMoment(w)) };
  if (symb){
    workBlock('section', 'CHECK WITH NUMBERS', true);
    const c = checkWithNumbers((v, fns, rnd) => {
      routeStep({ kind: 'eq', eq: eqId, v: tgt, fn: asFn, gen: !!eq.generated, useFn }, v, fns);
      if (!asFn) return [v[x], X.evalRat(R, rnd)];
      const tt = 0.5 + 3 * Math.random(), at = (cs) => cs.reduce((a, c, k) => a + c * tt ** k, 0);
      return [at(fns[x]), at(poly.map(c => X.evalRat(c, rnd))), `, t = ${fmt(tt)} s`];
    });
    workBlock('small check', checkText(c));
  }
  workBlock('feedback', tgt === cur ? targetNote(tgt) : `Found ${symOf(tgt)}.`);
  finishStep({ kind: 'eq', eq: eqId, v: tgt, fn: asFn, gen: !!eq.generated, useFn, poly, expr: asFn ? null : R, val: value }, cur);
}
async function solve(eqId, target){
  if (solveLocked()) return;
  if (EQS[eqId].generated || isFn(target)) return solveSym(eqId, target);
  const eq = EQS[eqId], sol = eq.solve[target], v = vals();
  let res = sol.f(v); if (typeof res === 'number') res = { value: res };
  if (res.error){ dialog('Math says no', `<b>CAN’T SOLVE THAT</b>${res.error}`); return; }
  // symbolic answer: the same template, with symbols and found expressions put in, then simplified
  let R = null;
  if (anySym()){
    try { const env = {}; for (const x of eq.vars) if (known(x)) env[x] = exprOf(x); R = X.toRat(res.tree, env, res.branch); }
    catch (e){ if (!(e instanceof X.MathError)) throw e; dialog('Math says no', `<b>CAN’T SOLVE THAT</b>${e.message}`); return; }
  }
  const symb = R && !X.isNumeric(R);
  if (!symb && target === 't' && res.value < 0){ dialog('Time travel detected', `<b>NEGATIVE TIME!</b>That gives t = ${fmt(res.value)} s: it would have had to happen before the clock started. Check the directions of your givens.`); return; }
  if (!symb && ['m', 'W', 'N', 'mu', 'f', 'g'].includes(target) && res.value < 0){ dialog('Impossible value', `<b>NEGATIVE ${plain(target).toUpperCase()}?!</b>That gives ${plain(target)} = ${fmt(res.value)}, but it’s a size and can’t be negative. Check the directions and the conditions (is friction really slowing it this way?).`); return; }
  S.busy = true;
  const cur = curTarget(), before = shortest(appEqs(), knownSet(), cur), step = S.path.length + 1;
  startWork(`Work · step ${step}: ${eq.label} → ${plain(target)}`, 'ISOLATE (SYMBOLS FIRST)');
  await workLine(eq.form, `start from ${eq.label} (only if ${eq.condition})${sol.steps.length ? '' : `; it’s already solved for ${plain(target)}`}`);
  for (const st of sol.steps) await workLine(st.eq, st.why);
  const tree = res.tree, sub = tree === sol.tree ? sol.sub : sol.alt.find(a => a.tree === tree).sub;
  if (symb){
    workBlock('section', 'PUT IN WHAT YOU KNOW', true);
    await workLine(`${V(target)} = ${plugSym(sub)}`);
    workBlock('section', 'SIMPLIFY', true);
    workBlock('result', `${symOf(target)} = ${X.toHTML(R, S.printOpts)}`); paintSyms();
  } else {
    workBlock('section', 'PLUG IN NUMBERS (SI UNITS, SIGNS FROM DIRECTIONS)', true);
    await workLine(`${V(target)} = ${plug(sub, v)}`);
    workBlock('result', `${symOf(target)} = ${withUnit(target, res.value)}`);
    const ex = extras(target, res.value); if (ex) workBlock('', ex);
  }
  workBlock('small units', `Units ✓ every term works out to ${sol.unitText}.`);
  if (res.note) workBlock('note', (symb && res.branch !== undefined && X.hasPM(tree) ? 'Root chosen with typical values for the symbols. ' : '') + res.note, true);
  if (symb){
    workBlock('section', 'CHECK WITH NUMBERS', true);
    workBlock('small check', checkText(checkWithNumbers((v, fns, rnd) => [X.evalNum(tree, v, res.branch), X.evalRat(R, rnd)])));
  }
  S.found[target] = { val: res.value, expr: R, step };
  const after = shortest(appEqs(), knownSet(), curTarget());
  let fb;
  if (target === cur) fb = targetNote(target);
  else if (!cur) fb = `Found ${symOf(target)}. Add a 🎯 target to get feedback on your route.`;
  else if (before && after && after.length < before.length) fb = `✔ Good move: one step closer. ${after.length} step${after.length > 1 ? 's' : ''} to go.`;
  else if (after) fb = `Valid algebra, but ${symOf(target)} doesn’t bring ${symOf(cur)} closer. The shortest route is still ${after.length} step${after.length > 1 ? 's' : ''}. More knowns never hurt, though.`;
  else fb = `Found ${symOf(target)}. The target still isn’t reachable: look for a hidden given or a condition.`;
  workBlock('feedback', fb);
  finishStep({ kind: 'eq', eq: eqId, v: target, val: res.value, expr: R, tree, branch: res.branch }, cur);
}
function check(eqId){
  const eq = EQS[eqId], v = vals(), id = eq.vars.find(x => eq.solve[x]);
  if (eq.generated){ // all known: both sides must agree
    try { const env = Object.fromEntries(eq.vars.map(x => [x, X.number(val(x))])); const z = X.evalRat(X.substRat(eq.Z, env), {}); const scale = Math.max(1, ...eq.vars.map(x => Math.abs(val(x))));
      if (Math.abs(z) < 1e-6 * scale) say(`✔ ${eq.label} checks out: both sides agree.`); else dialog('Inconsistent data', `<b>THE NUMBERS DISAGREE</b>${eq.label} is off by ${fmt(z)}. Check the directions, units and conditions.`); }
    catch (e){ if (!(e instanceof X.MathError)) throw e; dialog('Check failed', `<b>CAN’T CHECK</b>${e.message}`); }
    return;
  }
  let res = eq.solve[id].f(v); if (typeof res === 'number') res = { value: res };
  if (res.error){ dialog('Check failed', `<b>CAN’T CHECK</b>${res.error}`); return; }
  const actual = v[id], diff = Math.abs(res.value - actual) / Math.max(1e-9, Math.abs(actual), Math.abs(res.value));
  if (diff < 0.01) say(`✔ ${eq.label} checks out: both sides agree.`);
  else dialog('Inconsistent data', `<b>THE NUMBERS DISAGREE</b>${eq.label} predicts ${VARS[id].sym} = ${fmt(res.value)} ${unitOf(id)}, but you have ${fmt(actual)} ${unitOf(id)}. Check the directions, units and conditions.`);
}

// hints come in levels (Andes): pointing → teaching → bottom-out; pressing Hint again on the same step goes one level deeper.
// Only a bottom-out hint costs a star in a lesson.
function hintFor(){
  const cur = curTarget();
  if (!userGivens()) return 'Start with the givens: add the quantities your problem gives you.';
  if (!S.condOk) return 'Set the conditions first. They decide which equations even apply.';
  if (!S.targets.length) return 'Add a 🎯 target on your sheet: what does the question ask for?';
  if (!cur) return 'All targets found! Press <b>Replay motion</b>.';
  const ks = knownSet(), lp = shortest(appEqs(), ks, baseOf(cur));
  if (!lp) return 'No route yet. ' + hook('stuck');
  const sp = shortest(S.sheet.filter(applies), ks, baseOf(cur));
  if (sp && sp[0].kind === 'sys') return { key: 'sys' + sysLabel(sp[0]), point: 'Some equations on your sheet share their unknowns: none can be solved alone, but together they can.',
    teach: 'Equations that share unknowns are a system: as many equations as unknowns, solved together by putting one into the other.',
    bottom: `<b>${sysLabel(sp[0], '</b> and <b>')}</b> share ${sp[0].eqs.length === 3 ? 'three unknowns, two at a time' : 'the same two unknowns'}: a system. Combine them.` };
  if (sp && sp[0].kind !== 'eq'){ const n = sp[0]; return { key: 'lad' + n.kind + n.v, point: 'Your motion ladder can take the next step.', teach: 'Going down the ladder is d/dt; going up is ∫dt with a start value.', bottom: `On your <b>motion ladder</b>, you can ${MOVE_TXT[n.kind](n)}. ${n.v === cur ? 'That’s your target!' : 'That gets you closer.'}` }; }
  if (sp){ const n = sp[0], e = EQS[n.eq]; return { key: 'eq' + n.eq + n.v, point: `Psst… one equation on your sheet has just one unknown.`, teach: `Look for the equation about ${e.cue}: everything in it but one quantity is known.`, bottom: `<b>${e.label}</b> has just one unknown, <b>${symOf(n.v)}</b>. ${n.v === cur ? 'And it’s your target!' : 'Finding it gets you closer.'} Click it to solve.` }; }
  const miss = lp.find(s => s.kind === 'eq' && !S.sheet.includes(s.eq));
  if (!miss) return 'Your motion ladder can get there: look at the buttons on its rungs.';
  const sec = chapter().sections.find(x => x.eqs.includes(miss.eq)), e = EQS[miss.eq];
  return { key: 'miss' + miss.eq, point: sheetStructure(baseOf(cur)) || 'Your sheet is missing a link.',
    teach: `Look for an equation that connects <b>${e.vars.map(x => VARS[x].sym).join(', ')}</b>, in the library section “${sec.title}”: it’s for ${e.cue}.`,
    bottom: `Gather <b>${e.label}</b>: ${e.form}. I’ve put it on your sheet.`, act: () => { if (!S.sheet.includes(miss.eq)){ S.sheet.push(miss.eq); renderAll(false); } } };
}
// what the sheet's equations can and can't pin down (C1's matching): an unknown no equation can take, and equations that add nothing
function sheetStructure(target){
  const ks = knownSet(), eqs = S.sheet.filter(applies), unk = (e) => unknownsOf(e, ks);
  if (!eqs.length) return '';
  const st = structure(eqs, unk), short = st.under.filter(u => u !== target && VARS[u]);
  const parts = [];
  if (short.length) parts.push(`You still need an equation with <b>${short.map(u => VARS[u].sym).join('</b> or <b>')}</b>: nothing on your sheet pins ${short.length > 1 ? 'them' : 'it'} down.`);
  else if (st.missing.includes(target) || !eqs.some(e => EQS[e].vars.includes(target))) parts.push(`Nothing on your sheet holds your target, <b>${VARS[target] ? VARS[target].sym : target}</b>, with only knowns and things you can find.`);
  if (st.extra.length) parts.push(`${st.extra.map(e => `<b>${EQS[e].label}</b>`).join(', ')} add${st.extra.length > 1 ? '' : 's'} nothing new: ${st.extra.length > 1 ? 'their' : 'its'} unknowns are already pinned down by the others.`);
  return parts.join(' ');
}
let hintAt = { key: null, level: 0 };
$('hintBtn').onclick = () => {
  if (solveLocked()) return;
  if (!S.help.hints){ say('Hints are off in this stop: it checks what you can do on your own. You can still open the Map and redo the long stop.'); return; }
  const h = hintFor();
  if (typeof h === 'string'){ hintAt = { key: null, level: 0 }; say(h); return; }
  hintAt = { key: h.key, level: hintAt.key === h.key ? Math.min(3, hintAt.level + 1) : 1 };
  const lv = hintAt.level;
  if (lv === 3){ h.act?.(); COURSE.bottomOut(); }
  say(`<span class="hlv">${['', 'Hint', 'Teaching hint', 'Bottom-out hint'][lv]}</span> ${[0, h.point, h.teach, h.bottom][lv]}${lv < 3 ? ` <i>Press Hint again for more${COURSE.active && lv === 2 ? ' (the next one costs a star)' : ''}.</i>` : ''}`);
};
$('showBtn').onclick = async () => {
  if (S.busy || solveLocked()) return;
  if (!S.help.showMe){ say('Show me is off in this stop of the lesson: choose the equations yourself. Hint still points the way.'); return; }
  if (!S.condOk || !S.targets.length){ say('Set the conditions and add a 🎯 target first, then I’ll walk the shortest path.'); return; }
  while (curTarget()){
    const goal = baseOf(curTarget());
    if (known(goal)){ say(isRank(curTarget()) ? 'To rank the cases, add at least two complete rows to the scenario table.' : ''); return; }
    const lp = shortest(appEqs(), knownSet(), goal);
    if (!lp){ dialog('No route', '<b>TARGET UNREACHABLE</b>No chain of equations gets from your knowns to the target. Look for a hidden given or a condition you haven’t set.'); return; }
    for (const s of lp) if (s.kind === 'eq' && !S.sheet.includes(s.eq)){ S.sheet.push(s.eq); renderAll(false); await sleep(350); }
    say(`Path to ${symOf(goal)}: ${lp.map(s => `${s.kind === 'eq' ? EQS[s.eq].label : s.kind === 'sys' ? sysLabel(s) : MOVE_LABEL[s.kind]}→${symOf(s.v)}`).join(', then ')}.`);
    for (const s of lp){ if (s.kind === 'eq') await solve(s.eq, s.v); else if (s.kind === 'sys') await sysOp(s); else await ladderOp(s); await sleep(450); }
    if (lp.length && !known(lp[lp.length - 1].v)) return; // a step was refused (its dialog explains why)
  }
};

function renderPath(){
  const box = $('pathList');
  if (!S.path.length){ box.innerHTML = '<div class="empty">Your steps will stack up here: which equation, what it found.</div>'; return; }
  box.innerHTML = '<ol>' + S.path.map((p, i) => `<li data-i="${i}">${p.kind === 'eq' ? EQS[p.eq].label : MOVE_LABEL[p.kind]} → ${symOf(p.v)} = ${isFn(p.v) ? polyHTML(p.poly) : p.expr && !X.isNumeric(p.expr) ? X.toHTML(p.expr, S.printOpts) : `${fmt(p.val)} ${unitOf(p.v)}`}</li>`).join('') + '</ol>';
  box.querySelectorAll('li').forEach(li => li.onclick = () => { const p = S.path[+li.dataset.i]; $('work').innerHTML = p.html; $('work').querySelectorAll('.line').forEach(l => l.classList.add('show')); $('workTitle').textContent = p.title; paintSyms(); });
}

// ---------- practice bank + setup check ----------
$('bankBtn').onclick = () => {
  const list = $('bankList');
  list.innerHTML = Object.entries(CHAPTERS).map(([cid, ch]) => `<div class="subhead">${ch.title}</div>` + PRACTICE.map((p, i) => p.ch !== cid ? '' : `<div class="bitem"><div><b>${p.title}</b><div class="btxt">${p.text}</div></div><button class="go" data-load="${i}">Load</button></div>`).join('')).join('');
  list.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
    const p = PRACTICE[+b.dataset.load];
    switchChapter(p.ch); S.bank = p; $('problem').value = p.text; $('bank').classList.remove('show'); S.lastStep = -1; S.stage = 0; renderAll();
    say(`Loaded “${p.title}”. Read it, draw it or add each given with <b>+ Add a given</b>, set the conditions, then press <b>✔ Check my setup</b>.`);
  });
  $('bank').classList.add('show');
};
$('bankX').onclick = () => $('bank').classList.remove('show');
$('checkSetup').onclick = () => {
  const p = S.bank; if (!p) return;
  const lines = []; let bad = 0;
  for (const [id, [mag, unit, dir]] of Object.entries(p.key.givens)){
    const g = S.givens[id];
    if (mag === null){ // the problem names it but gives no size: it must be a symbol (it cancels)
      if (g && g.kind === 'symbol') lines.push(`✓ ${VARS[id].sym} as a symbol: the problem gives no value, so it must cancel`);
      else { lines.push(`✗ ${VARS[id].sym} (${nm(id)}): the problem doesn’t give it. Add it as a <b>symbol</b>; it will cancel.`); bad++; }
      continue;
    }
    const want = (dir ? -1 : 1) * sizeSI(id, mag, unit);
    if (!g){ lines.push(`✗ Missing a known: <b>${VARS[id].sym}</b> (${nm(id)}). ${want === 0 ? 'It’s hidden in the wording.' : ''}`); bad++; continue; }
    const close = (a, b) => Math.abs(a - b) <= 0.01 * Math.max(1e-9, Math.abs(b)) || (Math.abs(b) < 1e-9 && Math.abs(a) < 1e-9);
    if (g.kind === 'symbol'){
      if (want === 0){ lines.push(`✗ ${VARS[id].sym} is zero here (it’s hidden in the wording), not an unknown size: give it as a number.`); bad++; }
      else if ((want < 0) === (g.dir === 1)) lines.push(`✓ ${VARS[id].sym} given as a symbol${dr(id) ? `, ${dr(id)[g.dir]}` : ''}`);
      else { lines.push(`✗ ${VARS[id].sym}: right to use a symbol, but the <b>direction is backwards</b>.`); bad++; }
      continue;
    }
    if (close(g.val, want)) lines.push(`✓ ${VARS[id].sym} = ${describe(id, g)}`);
    else if (close(-g.val, want)){ lines.push(`✗ ${VARS[id].sym}: right size, but the <b>direction is backwards</b>.`); bad++; }
    else { lines.push(`✗ ${VARS[id].sym}: the value doesn’t match the problem. Check the number and the unit.`); bad++; }
  }
  // a given that is a function of time: the same polynomial, coefficient by coefficient
  for (const [id, text] of Object.entries(p.key.fns || {})){
    const f = S.funcs[id], want = X.parseFn(text).poly.map(c => X.numValue(c));
    const got = f && f.from === 'given' && f.poly.every(c => X.isNumeric(c)) ? f.poly.map(c => X.numValue(c)) : null;
    const same = got && Array.from({ length: Math.max(got.length, want.length) }, (_, k) => [got[k] || 0, want[k] || 0]).every(([a, b]) => Math.abs(a - b) <= 0.01 * Math.max(1e-9, Math.abs(b)));
    if (same) lines.push(`✓ ${VARS[id].sym}(t) = ${polyHTML(f.poly)}`);
    else if (got){ lines.push(`✗ ${VARS[id].sym}(t) doesn’t match the problem. Check each term’s number, its sign and its power of t.`); bad++; }
    else { lines.push(`✗ <b>${VARS[id].sym}</b> (${nm(id)}) is given as a <b>function of time</b>: pick “varies with time” under This problem, then give it as a function of t.`); bad++; }
  }
  for (const id of Object.keys(S.funcs)) if (S.funcs[id].from === 'given' && !(id in (p.key.fns || {}))){ lines.push(`? ${VARS[id].sym}(t) isn’t stated in the problem as a function of time.`); bad++; }
  for (const id of Object.keys(S.givens)) if (!(id in p.key.givens)){ lines.push(`? ${VARS[id].sym} isn’t stated in the problem. If you worked it out, it belongs in the path, not the givens.`); bad++; }
  for (const [k, want] of Object.entries(p.key.cond)){
    const c = chapter().conditions.find(x => x.key === k); if (!c) continue;
    if ((c.type === 'choice' ? S.cond[k] : !!S.cond[k]) !== want){ const w = c.type === 'choice' ? c.options.find(o => o[0] === want)[1] : (want ? 'on' : 'off'); lines.push(`✗ Condition “${c.label}” should be: <b>${w}</b>.`); bad++; }
  }
  if (!S.condOk){ lines.push('✗ You haven’t confirmed the conditions yet.'); bad++; }
  for (const t of p.key.targets) if (!S.targets.includes(t)){ lines.push(`✗ The question asks for <b>${symOf(t)}</b> (${nm(t)}): add it as a 🎯 target.`); bad++; }
  dialog(bad ? 'Setup check' : 'Setup check: perfect!', `<b>${bad ? `${bad} THING${bad > 1 ? 'S' : ''} TO FIX` : 'ALL SET UP CORRECTLY'}</b>${lines.join('<br>')}`, !bad);
};

// ---------- simulation values for the diagram ----------
// numeric position polynomial from the ladder (symbols at their typical values), or null
function ladderPositionPoly(){
  const L = ladder(); if (!L) return null;
  const num = (id) => S.funcs[id] ? S.funcs[id].poly.map(c => X.evalRat(c, samplesNow())) : null;
  const [p, u, a] = L.rungs, st = (id) => L.start[id] && known(L.start[id]) ? val(L.start[id]) : 0;
  const int = (cs, c0) => [c0, ...cs.map((c, k) => c / (k + 1))];
  if (num(p)) return num(p);
  if (num(u)) return int(num(u), 0);
  if (num(a)) return int(int(num(a), st(u)), 0);
  return null;
}
function simValues(){
  const k = K(), v = vals(); let illus = false;
  const fp = ladderPositionPoly();
  if (fp){
    const T = known('t') && val('t') > 0 ? val('t') : 4;
    v.__P = fp; v[k.t] = T; v[k.u0] = fp[1] || 0; v[k.a] = posAccel(v, k, T); v[k.p] = posAt(v, k, T);
    if (S.cond.rim && !('r' in v)) v.r = 0.5;
    return { v, illus: !known('t') };
  }
  const eqs = appEqs().filter(e => !EQS[e].generated);
  const close = () => { let changed = true; while (changed){ changed = false; for (const e of eqs){ const u = EQS[e].vars.filter(x => !(x in v)); if (u.length !== 1 || !EQS[e].solve[u[0]]) continue; let r = EQS[e].solve[u[0]].f(v); if (typeof r === 'number') r = { value: r }; if (r && !r.error && isFinite(r.value)){ v[u[0]] = r.value; changed = true; } } } };
  close();
  const defs = { ...chapter().defaults };
  hook('sim')(defs, S.cond);
  if (!S.cond.rim) delete defs.r;
  for (const [id, d] of Object.entries(defs)){ if (!(id in v)){ v[id] = d; illus = true; close(); } }
  if (!(k.a in v)){ v[k.a] = 1; illus = true; close(); }
  if (!(k.t in v) || !(v[k.t] > 0)){
    const u0 = v[k.u0], a = v[k.a];
    v[k.t] = (u0 * a < 0) ? -u0 / a : 2;
    illus = true; close();
  }
  if (!(k.p in v)) v[k.p] = v[k.u0] * v[k.t] + 0.5 * v[k.a] * v[k.t] ** 2;
  return { v, illus };
}
const posAt = (v, k, tau) => v.__P ? v.__P.reduce((s, c, n) => s + c * tau ** n, 0) : v[k.u0] * tau + 0.5 * v[k.a] * tau * tau;
const velAt = (v, k, tau) => v.__P ? v.__P.reduce((s, c, n) => n ? s + n * c * tau ** (n - 1) : s, 0) : v[k.u0] + v[k.a] * tau;
const posAccel = (v, k, tau) => v.__P ? v.__P.reduce((s, c, n) => n > 1 ? s + n * (n - 1) * c * tau ** (n - 2) : s, 0) : v[k.a];

// ---------- drawing helpers ----------
const COL = { given: '#4fd1ff', found: '#ffd166', target: '#ff6bd6', unknown: '#8b9bb2' };
const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";
const px = (n) => Math.round(n * 0.68); // canvas text sizes were set for a narrow pixel font
const colOf = (id) => COL[stateOf(id)];
const hl = (id, w) => S.hover === id ? w + 3 : w;
function hot(spot){ S.hot.push(spot); }
function arrow(ctx, x1, y1, x2, y2, color, w = 3, id = null, dash = false){
  if (Math.hypot(x2 - x1, y2 - y1) < 2) return;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  const a = Math.atan2(y2 - y1, x2 - x1), h = 14 + w;
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)); ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  if (id) hot({ kind: 'var', id, x: (x1 + x2) / 2, y: (y1 + y2) / 2, r: 24 });
}
function arcArrow(ctx, cx, cy, r, a0, a1, color, w = 3){
  if (Math.abs(a1 - a0) < 0.02) return;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.arc(cx, cy, r, -a0, -a1, a1 > a0); ctx.stroke();
  const ex = cx + r * Math.cos(-a1), ey = cy + r * Math.sin(-a1), dir = a1 > a0 ? 1 : -1, ta = -a1 - dir * Math.PI / 2, h = 12 + w;
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - h * Math.cos(ta - 0.45), ey - h * Math.sin(ta - 0.45)); ctx.lineTo(ex - h * Math.cos(ta + 0.45), ey - h * Math.sin(ta + 0.45)); ctx.closePath(); ctx.fill();
}
function label(ctx, txt, x, y, color, id, size = 44){
  const h = S.hover === id;
  ctx.font = `600 ${px(h ? size + 8 : size)}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = h ? '#ffd166' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = h ? 16 : 6;
  ctx.fillStyle = color; ctx.fillText(txt, x, y); ctx.shadowBlur = 0;
  if (id) hot({ kind: 'var', id, x, y, r: Math.max(24, ctx.measureText(txt).width / 2 + 6) });
}
function pointMark(ctx, x, y, name, color = '#fff'){
  const sel = S.inspectName === name;
  ctx.fillStyle = sel ? '#ffd166' : color; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, sel ? 14 : 11, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = sel ? '#ffd166' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.stroke();
  hot({ kind: 'point', name, x, y, r: 26 });
}
function grid(ctx, Wd, Hd){
  ctx.fillStyle = '#0b1036'; ctx.fillRect(0, 0, Wd, Hd);
  // a pixel dot grid: small crosses at every 40 px, like graph paper drawn in starlight
  ctx.fillStyle = 'rgba(135,150,255,.16)';
  for (let x = 0; x <= Wd; x += 40) for (let y = 0; y <= Hd; y += 40){ ctx.fillRect(x - 1, y - 4, 3, 9); ctx.fillRect(x - 4, y - 1, 9, 3); }
}
// the moving body: a glowing block (ghost copies are drawn fainter)
function body(ctx, x, y, w, h, rot = 0, alpha = 1){
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= alpha;
  ctx.shadowColor = 'rgba(255,107,214,.8)'; ctx.shadowBlur = 18 * alpha;
  ctx.fillStyle = 'rgba(255,107,214,.22)'; ctx.strokeStyle = '#ff6bd6'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function fbdBox(ctx, x, y, w, h, title){
  ctx.fillStyle = 'rgba(9,13,42,.94)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#c9973f'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.fillStyle = '#fff1b8'; for (const [cx, cy] of [[x + 3, y + 3], [x + w - 6, y + 3], [x + 3, y + h - 6], [x + w - 6, y + h - 6]]) ctx.fillRect(cx, cy, 3, 3);
  ctx.font = `19px ${MONO}`; ctx.fillStyle = '#ffd166'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, x + 10, y + 8); ctx.textBaseline = 'middle';
}
function caption(ctx, txt, Hd){ ctx.font = `19px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(txt, 20, Hd - 20); }

// ---------- diagrams ----------
function draw(tau = null){
  const cv = $('dg'), ctx = cv.getContext('2d'); S.hot = [];
  grid(ctx, cv.width, cv.height);
  if (!K()){ $('dgNote').textContent = 'This unit has no motion picture.'; return; } // a unit without motion (kin) has no replay
  const { v, illus } = simValues(), k = K(), T = v[k.t], now = tau === null ? T : tau;
  ({ incline: drawIncline, pulley: drawPulley, blocks: drawBlocks, wheel: drawWheel, beam: drawTorque })[chapter().diagram]?.(ctx, v, k, T, now, tau, cv.width, cv.height);
  $('dgNote').textContent = illus ? 'Some values are made up for the picture until you give or find them.' : 'Drawn to scale with your numbers.';
  drawGraphs(v, k, tau);
}

function drawIncline(ctx, v, k, T, now, tau, Wd, Hd){
  const thd = Math.min(80, Math.max(3, v.inc ?? 30)), th = thd * Math.PI / 180;
  const base = Hd - 60, x0 = 40;
  const L = Math.min((Wd - 340) / Math.cos(th), (base - 70) / Math.sin(th));
  const top = { x: x0, y: base - L * Math.sin(th) }, bot = { x: x0 + L * Math.cos(th), y: base };
  const d = { x: Math.cos(th), y: Math.sin(th) }, n = { x: Math.sin(th), y: -Math.cos(th) };
  // ground + ramp
  ctx.fillStyle = '#1d1440'; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.lineTo(x0, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f7f4ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(Wd, base); ctx.stroke();
  if (S.cond.friction){ ctx.strokeStyle = 'rgba(255,230,0,.5)'; ctx.lineWidth = 1; for (let s = 10; s < L; s += 16){ const px = top.x + d.x * s, py = top.y + d.y * s; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - n.x * 7 + d.x * 5, py - n.y * 7 + d.y * 5); ctx.stroke(); } }
  // angle θ at the bottom
  ctx.strokeStyle = colOf('inc'); ctx.lineWidth = hl('inc', 3); ctx.beginPath(); ctx.arc(bot.x, bot.y, 80, Math.PI, Math.PI + th); ctx.stroke();
  label(ctx, `θ${known('inc') ? '' : '?'}`, bot.x - 115 * Math.cos(th / 2), bot.y - 115 * Math.sin(th / 2), colOf('inc'), 'inc', 40);
  // positions along the ramp (+ = down the slope)
  const ss = Array.from({ length: 61 }, (_, i) => posAt(v, k, i * T / 60));
  let lo = Math.min(0, ...ss), hi = Math.max(0, ...ss); if (hi - lo < 0.2){ hi += 0.1; lo -= 0.1; }
  const P = (s) => { const u = 70 + (s - lo) / (hi - lo) * (L - 140); return { x: top.x + d.x * u, y: top.y + d.y * u }; };
  const at = (s, off) => { const p = P(s); return { x: p.x + n.x * off, y: p.y + n.y * off }; };
  const N = 7; let last = null;
  for (let i = 0; i < N; i++){
    const t = i * T / (N - 1); if (t > now + 1e-9) break;
    const c = at(posAt(v, k, t), 26);
    body(ctx, c.x, c.y, 46, 34, th, 0.15 + 0.35 * i / (N - 1));
    const lp = at(posAt(v, k, t), 64);
    if (!last || Math.hypot(lp.x - last.x, lp.y - last.y) > 56){ ctx.font = `15px ${MONO}`; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.textAlign = 'center'; ctx.fillText(`${fmt(t)}s`, lp.x, lp.y); last = lp; }
  }
  const c = at(posAt(v, k, now), 30);
  body(ctx, c.x, c.y, 60, 44, th);
  const vNow = velAt(v, k, now), vs = Math.min(14, 180 / Math.max(0.5, Math.abs(v.v0), Math.abs(velAt(v, k, T))));
  const va = at(posAt(v, k, now), 96);
  arrow(ctx, va.x, va.y, va.x + d.x * vNow * vs, va.y + d.y * vNow * vs, colOf('vf'), hl('vf', 5), 'vf');
  label(ctx, tau === null ? 'v' : `v=${fmt(vNow)}`, va.x + d.x * vNow * vs / 2 + n.x * 30, va.y + d.y * vNow * vs / 2 + n.y * 30, colOf('vf'), 'vf', 38);
  const s0 = at(0, 96);
  if (Math.abs(v.v0) > 1e-9){ arrow(ctx, s0.x, s0.y, s0.x + d.x * v.v0 * vs, s0.y + d.y * v.v0 * vs, colOf('v0'), hl('v0', 5), 'v0'); }
  label(ctx, 'v₀', s0.x + n.x * 34, s0.y + n.y * 34, colOf('v0'), 'v0', 38);
  const aa = at(posAt(v, k, now), -4), al = Math.sign(v.a) * Math.min(110, 20 + Math.abs(v.a) * 10);
  arrow(ctx, aa.x - n.x * 0, aa.y, aa.x + d.x * al, aa.y + d.y * al, colOf('a'), hl('a', 4), 'a');
  label(ctx, 'a', aa.x + d.x * al - n.x * 26, aa.y + d.y * al - n.y * 26, colOf('a'), 'a', 36);
  // Δx along the ramp
  const e0 = at(0, 150), e1 = at(posAt(v, k, T), 150);
  ctx.strokeStyle = colOf('dx'); ctx.lineWidth = hl('dx', 3); ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
  for (const e of [e0, e1]){ ctx.beginPath(); ctx.moveTo(e.x - n.x * 10, e.y - n.y * 10); ctx.lineTo(e.x + n.x * 10, e.y + n.y * 10); ctx.stroke(); }
  label(ctx, 'Δx', (e0.x + e1.x) / 2 + n.x * 28, (e0.y + e1.y) / 2 + n.y * 28, colOf('dx'), 'dx', 40);
  label(ctx, `t = ${fmt(now)} s`, Wd - 420, 40, colOf('t'), 't', 38);
  // points
  const p0 = P(0); pointMark(ctx, p0.x, p0.y, 'start', '#4fd1ff');
  const tStop = v.v0 * v.a < 0 ? -v.v0 / v.a : null;
  if (tStop !== null && tStop < T - 1e-6){ const ps = P(posAt(v, k, tStop)); pointMark(ctx, ps.x, ps.y, 'stop', '#ff6bd6'); }
  const pe = P(posAt(v, k, T)); pointMark(ctx, pe.x, pe.y, 'end', '#ffd166');
  // free-body diagram
  const bx = Wd - 300, by = 14, bw = 286, bh = 300, ox = bx + 140, oy = by + 160, Lf = 100;
  fbdBox(ctx, bx, by, bw, bh, 'Free-body diagram');
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox - d.x * 110 - n.x * 16, oy - d.y * 110 - n.y * 16); ctx.lineTo(ox + d.x * 110 - n.x * 16, oy + d.y * 110 - n.y * 16); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox, oy, 11, 0, 7); ctx.fill(); hot({ kind: 'var', id: 'm', x: ox, y: oy, r: 18 });
  arrow(ctx, ox, oy, ox, oy + Lf, colOf('W'), hl('W', 5), 'W'); label(ctx, 'W', ox - 18, oy + Lf + 14, colOf('W'), 'W', 32);
  arrow(ctx, ox, oy, ox + d.x * Lf * Math.sin(th), oy + d.y * Lf * Math.sin(th), colOf('Wpar'), hl('Wpar', 3), 'Wpar', true); label(ctx, 'W∥', ox + d.x * (Lf * Math.sin(th) + 26), oy + d.y * (Lf * Math.sin(th) + 26), colOf('Wpar'), 'Wpar', 30);
  arrow(ctx, ox, oy, ox - n.x * Lf * Math.cos(th), oy - n.y * Lf * Math.cos(th), colOf('Wperp'), hl('Wperp', 3), 'Wperp', true); label(ctx, 'W⊥', ox - n.x * (Lf * Math.cos(th) + 24) + 18, oy - n.y * (Lf * Math.cos(th) + 24), colOf('Wperp'), 'Wperp', 30);
  arrow(ctx, ox, oy, ox + n.x * Lf * Math.cos(th), oy + n.y * Lf * Math.cos(th), colOf('N'), hl('N', 5), 'N'); label(ctx, 'N', ox + n.x * (Lf * Math.cos(th) + 22), oy + n.y * (Lf * Math.cos(th) + 22), colOf('N'), 'N', 32);
  if (S.cond.friction){ const fs = S.cond.up ? 1 : -1; arrow(ctx, ox + n.x * 8, oy + n.y * 8, ox + n.x * 8 + d.x * fs * 60, oy + n.y * 8 + d.y * fs * 60, colOf('f'), hl('f', 4), 'f'); label(ctx, 'f', ox + n.x * 30 + d.x * fs * 70, oy + n.y * 30 + d.y * fs * 70, colOf('f'), 'f', 32); }
  label(ctx, 'Fnet', bx + 50, by + bh - 26, colOf('F'), 'F', 28);
  label(ctx, 'μk', bx + bw - 40, by + bh - 26, colOf('mu'), S.cond.friction ? 'mu' : null, 28);
  caption(ctx, '+ is down the slope. Click points, arrows or labels.', Hd);
}


function drawPulley(ctx, v, k, T, now, tau, Wd, Hd){
  const TY = 250, TX = 560, R = 30, PX = TX + 30, PY = TY - 28 + R, ys = TY - 28, sx = PX + R;
  // table + pulley
  ctx.fillStyle = '#3a2a6a'; ctx.fillRect(20, TY, TX - 20, 34); ctx.fillStyle = '#251a48'; ctx.fillRect(20, TY + 34, TX - 20, 10);
  ctx.strokeStyle = '#f7f4ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(20, TY); ctx.lineTo(TX, TY); ctx.stroke();
  if (S.cond.friction){ ctx.strokeStyle = 'rgba(255,230,0,.55)'; ctx.lineWidth = 1; for (let x = 28; x < TX; x += 14){ ctx.beginPath(); ctx.moveTo(x, TY + 2); ctx.lineTo(x + 7, TY + 9); ctx.stroke(); } }
  ctx.strokeStyle = '#9a9aaa'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(TX - 10, TY + 10); ctx.lineTo(PX, PY); ctx.stroke();
  ctx.fillStyle = '#6b6b80'; ctx.beginPath(); ctx.arc(PX, PY, R, 0, 7); ctx.fill(); ctx.strokeStyle = '#f7f4ff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ff6bd6'; ctx.beginPath(); ctx.arc(PX, PY, 6, 0, 7); ctx.fill();
  // positions: both blocks move the same distance
  const ss = Array.from({ length: 61 }, (_, i) => posAt(v, k, i * T / 60));
  let lo = Math.min(0, ...ss), hi = Math.max(0, ...ss); if (hi - lo < 0.05){ hi += 0.05; }
  const sc = Math.min(340, 210) / (hi - lo);
  const X1 = (s) => 100 + (s - lo) * sc, Y2 = (s) => PY + 50 + (s - lo) * sc;
  const N = 6;
  for (let i = 0; i < N; i++){
    const t = i * T / (N - 1); if (t > now + 1e-9) break; const s = posAt(v, k, t);
    ctx.globalAlpha = 0.12 + 0.35 * i / (N - 1);
    ctx.fillStyle = '#ff6bd6'; ctx.fillRect(X1(s) - 40, TY - 56, 80, 56);
    body(ctx, sx, Y2(s) + 34, 60, 60, 0, 1);
    ctx.globalAlpha = 1;
  }
  const s = posAt(v, k, now), x1 = X1(s), y2 = Y2(s);
  // string
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = hl('Tn', 3);
  ctx.beginPath(); ctx.moveTo(x1 + 40, ys); ctx.lineTo(PX, ys); ctx.arc(PX, PY, R, -Math.PI / 2, 0); ctx.lineTo(sx, y2 + 6); ctx.stroke();
  label(ctx, 'T', (x1 + 40 + PX) / 2, ys - 22, colOf('Tn'), 'Tn', 36);
  label(ctx, 'T', sx + 28, (PY + y2) / 2, colOf('Tn'), 'Tn', 36);
  // block 1 + hanging mass
  ctx.fillStyle = '#ff6bd6'; ctx.fillRect(x1 - 40, TY - 56, 80, 56); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(x1 - 40, TY - 56, 80, 56);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(x1 - 40, TY - 56); ctx.lineTo(x1 + 40, TY); ctx.moveTo(x1 + 40, TY - 56); ctx.lineTo(x1 - 40, TY); ctx.stroke();
  label(ctx, 'm₁', x1, TY - 28, '#000', null, 34); hot({ kind: 'var', id: 'm1', x: x1, y: TY - 28, r: 34 });
  body(ctx, sx, y2 + 40, 70, 70);
  label(ctx, 'm₂', sx - 70, y2 + 40, colOf('m2'), 'm2', 34);
  // motion arrows (same v and a for both)
  const vNow = velAt(v, k, now), vs = Math.min(18, 130 / Math.max(0.3, Math.abs(v.v0), Math.abs(velAt(v, k, T))));
  arrow(ctx, x1, TY - 92, x1 + vNow * vs, TY - 92, colOf('vf'), hl('vf', 5), 'vf');
  label(ctx, tau === null ? 'v' : `v=${fmt(vNow)}`, x1 - 30, TY - 92, colOf('vf'), 'vf', 34);
  arrow(ctx, sx + 64, y2 + 10, sx + 64, y2 + 10 + vNow * vs, colOf('vf'), hl('vf', 4));
  const al = Math.sign(v.a) * Math.min(90, 16 + Math.abs(v.a) * 12);
  if (Math.abs(v.a) > 1e-9){ arrow(ctx, sx + 104, y2 + 10, sx + 104, y2 + 10 + al, colOf('a'), hl('a', 4), 'a'); }
  label(ctx, 'a', sx + 128, y2 + 30, colOf('a'), 'a', 34);
  // Δx along the table
  const dy0 = TY - 140, xa = X1(0), xb = X1(posAt(v, k, T));
  ctx.strokeStyle = colOf('dx'); ctx.lineWidth = hl('dx', 3); ctx.beginPath(); ctx.moveTo(xa, dy0); ctx.lineTo(xb, dy0); ctx.moveTo(xa, dy0 - 10); ctx.lineTo(xa, dy0 + 10); ctx.moveTo(xb, dy0 - 10); ctx.lineTo(xb, dy0 + 10); ctx.stroke();
  label(ctx, 'Δx', (xa + xb) / 2, dy0 - 26, colOf('dx'), 'dx', 38);
  pointMark(ctx, xa, dy0, 'start', '#4fd1ff');
  const tStop = v.v0 * v.a < 0 ? -v.v0 / v.a : null;
  if (tStop !== null && tStop < T - 1e-6) pointMark(ctx, X1(posAt(v, k, tStop)), dy0, 'stop', '#ff6bd6');
  pointMark(ctx, xb, dy0, 'end', '#ffd166');
  label(ctx, `t = ${fmt(now)} s`, 110, 34, colOf('t'), 't', 36);
  // free-body diagrams, one per block
  const f1 = { x: 20, y: 316, w: 290, h: 270 }, f2 = { x: 326, y: 316, w: 200, h: 270 };
  fbdBox(ctx, f1.x, f1.y, f1.w, f1.h, 'FBD: block m₁');
  let ox = f1.x + 145, oy = f1.y + 150;
  ctx.fillStyle = '#ff6bd6'; ctx.fillRect(ox - 16, oy - 16, 32, 32);
  arrow(ctx, ox, oy - 16, ox, oy - 92, colOf('N1'), hl('N1', 4), 'N1'); label(ctx, 'N₁', ox + 26, oy - 82, colOf('N1'), 'N1', 30);
  arrow(ctx, ox, oy + 16, ox, oy + 92, colOf('W1'), hl('W1', 4), 'W1'); label(ctx, 'W₁', ox + 28, oy + 82, colOf('W1'), 'W1', 30);
  arrow(ctx, ox + 16, oy, ox + 110, oy, colOf('Tn'), hl('Tn', 4), 'Tn'); label(ctx, 'T', ox + 100, oy - 20, colOf('Tn'), 'Tn', 30);
  if (S.cond.friction){ arrow(ctx, ox - 16, oy, ox - 100, oy, colOf('f'), hl('f', 4), 'f'); label(ctx, 'f', ox - 92, oy - 20, colOf('f'), 'f', 30); label(ctx, 'μk', f1.x + f1.w - 34, f1.y + f1.h - 22, colOf('mu'), 'mu', 26); }
  else { ctx.font = `15px ${MONO}`; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.textAlign = 'left'; ctx.fillText('no friction', f1.x + 12, f1.y + f1.h - 20); }
  fbdBox(ctx, f2.x, f2.y, f2.w, f2.h, 'FBD: m₂');
  ox = f2.x + 100; oy = f2.y + 150;
  ctx.fillStyle = '#f7f4ff'; ctx.beginPath(); ctx.arc(ox, oy, 16, 0, 7); ctx.fill();
  arrow(ctx, ox, oy - 16, ox, oy - 92, colOf('Tn'), hl('Tn', 4), 'Tn'); label(ctx, 'T', ox + 24, oy - 82, colOf('Tn'), 'Tn', 30);
  arrow(ctx, ox, oy + 16, ox, oy + 98, colOf('W2'), hl('W2', 4), 'W2'); label(ctx, 'W₂', ox + 30, oy + 86, colOf('W2'), 'W2', 30);
  label(ctx, 'Fnet?', f2.x + 50, f2.y + f2.h - 20, colOf('a'), 'a', 22);
  ctx.font = `16px ${MONO}`; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.textAlign = 'left'; ctx.fillText('+ = forward: m₁ toward the pulley, m₂ down.', 200, 36);
}

// two touching blocks pushed along a floor: ghosts, F on A, the contact pair P, friction if any
function drawBlocks(ctx, v, k, T, now, tau, Wd, Hd){
  const FY = Hd - 170, ss = Array.from({ length: 41 }, (_, i) => posAt(v, k, i * T / 40));
  let lo = Math.min(0, ...ss), hi = Math.max(0, ...ss); if (hi - lo < 0.2){ hi += 0.1; lo -= 0.1; }
  const X = (s) => 170 + (s - lo) / (hi - lo) * (Wd - 460);
  ctx.strokeStyle = '#7fb8e6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(30, FY); ctx.lineTo(Wd - 30, FY); ctx.stroke();
  if (S.cond.friction){ ctx.strokeStyle = 'rgba(127,184,230,.35)'; ctx.lineWidth = 1; for (let x = 40; x < Wd - 30; x += 16){ ctx.beginPath(); ctx.moveTo(x, FY); ctx.lineTo(x - 8, FY + 10); ctx.stroke(); } }
  const wA = 110, hA = 84, wB = 90, hB = 66;
  for (let i = 0; i < 6; i++){ const t = i * T / 5; if (t > now + 1e-9) break; const x = X(posAt(v, k, t)); body(ctx, x, FY - hA / 2, wA, hA, 0, 0.12 + 0.3 * i / 5); body(ctx, x + wA / 2 + wB / 2, FY - hB / 2, wB, hB, 0, 0.12 + 0.3 * i / 5); }
  const x = X(posAt(v, k, now)), xb = x + wA / 2 + wB / 2;
  body(ctx, x, FY - hA / 2, wA, hA); body(ctx, xb, FY - hB / 2, wB, hB);
  label(ctx, 'A', x, FY - hA / 2, '#fff', 'mA', 34); label(ctx, 'B', xb, FY - hB / 2, '#fff', 'mB', 34);
  arrow(ctx, x - wA / 2 - 120, FY - hA / 2, x - wA / 2 - 4, FY - hA / 2, colOf('Fp'), hl('Fp', 4), 'Fp'); label(ctx, 'F', x - wA / 2 - 70, FY - hA / 2 - 26, colOf('Fp'), 'Fp', 38);
  arrow(ctx, x + wA / 2, FY - 20, x + wA / 2 + 60, FY - 20, colOf('P'), hl('P', 3), 'P'); arrow(ctx, x + wA / 2, FY - 34, x + wA / 2 - 60, FY - 34, colOf('P'), hl('P', 3)); label(ctx, 'P', x + wA / 2, FY - hA - 20, colOf('P'), 'P', 34);
  if (S.cond.friction){ arrow(ctx, x, FY + 14, x - 70, FY + 14, colOf('fA'), hl('fA', 3), 'fA'); arrow(ctx, xb, FY + 14, xb - 60, FY + 14, colOf('fB'), hl('fB', 3), 'fB'); }
  const vNow = velAt(v, k, now), vs = Math.min(30, 160 / Math.max(0.5, Math.abs(velAt(v, k, T))));
  arrow(ctx, xb + wB / 2 + 20, FY - hB - 30, xb + wB / 2 + 20 + vNow * vs, FY - hB - 30, colOf('vf'), hl('vf', 4), 'vf'); label(ctx, tau === null ? 'v' : `v=${fmt(vNow)}`, xb + wB / 2 + 40 + vNow * vs / 2, FY - hB - 56, colOf('vf'), 'vf', 34);
  pointMark(ctx, X(0), FY + 40, 'start', '#4fd1ff'); pointMark(ctx, X(posAt(v, k, T)), FY + 40, 'end', '#ffd166');
  label(ctx, `t = ${fmt(now)} s`, Wd - 150, 40, colOf('t'), 't', 38);
  caption(ctx, '+ is forward: the way F pushes. Click arrows or labels.', Hd);
}
function drawWheel(ctx, v, k, T, now, tau, Wd, Hd){
  const cx = 360, cy = Hd / 2 + 10, R = Math.min(200, Hd / 2 - 70), thetaAt = (x) => posAt(v, k, x), N = 7;
  for (let i = 0; i < N; i++){
    const tk = (i / (N - 1)) * now, a = thetaAt(tk), x = cx + R * Math.cos(-a), y = cy + R * Math.sin(-a);
    ctx.strokeStyle = `rgba(255,230,0,${0.12 + 0.5 * i / (N - 1)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = `rgba(255,43,214,${0.25 + 0.6 * i / (N - 1)})`; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
  }
  const ang = thetaAt(now), om = velAt(v, k, now);
  ctx.strokeStyle = '#f7f4ff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#6b6b80'; ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++){ const a = ang + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(-a), cy + R * Math.sin(-a)); ctx.stroke(); }
  ctx.strokeStyle = '#ff6bd6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(-ang), cy + R * Math.sin(-ang)); ctx.stroke();
  ctx.fillStyle = '#ff6bd6'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.fill();
  const sweep = Math.min(Math.abs(ang), 2 * Math.PI - 0.1) * Math.sign(ang);
  arcArrow(ctx, cx, cy, R - 34, 0, sweep, colOf('theta'), hl('theta', 4));
  label(ctx, `θ${Math.abs(ang) > 2 * Math.PI ? ` (${fmt(ang / (2 * Math.PI))} rev)` : ''}`, cx + (R - 70) * Math.cos(-sweep / 2), cy + (R - 70) * Math.sin(-sweep / 2), colOf('theta'), 'theta');
  const wm = Math.max(Math.abs(v.w0), Math.abs(om), 0.01);
  arcArrow(ctx, cx, cy, 58, Math.PI * 0.75, Math.PI * 0.75 + 1.6 * v.w0 / wm, colOf('w0'), hl('w0', 4)); label(ctx, 'ω₀', cx - 92, cy - 80, colOf('w0'), 'w0');
  arcArrow(ctx, cx, cy, 96, Math.PI * 1.25, Math.PI * 1.25 + 2.4 * om / wm, colOf('w'), hl('w', 5)); label(ctx, tau === null ? 'ω' : `ω=${fmt(om)}`, cx - 70, cy + 140, colOf('w'), 'w');
  if (Math.abs(v.alpha) > 1e-9) arcArrow(ctx, cx, cy, R + 50, Math.PI * 0.18, Math.PI * 0.18 + 0.55 * Math.sign(v.alpha), colOf('alpha'), hl('alpha', 4));
  label(ctx, 'α', cx + R + 60, cy - R * 0.55, colOf('alpha'), 'alpha');
  label(ctx, `t = ${fmt(now)} s`, Wd - 150, 40, colOf('t'), 't', 38);
  pointMark(ctx, cx + R, cy, 'start', '#4fd1ff');
  if (S.cond.rim){
    const px = cx + R * Math.cos(-ang), py = cy + R * Math.sin(-ang), tx = -Math.sin(-ang) * Math.sign(om || 1), ty = Math.cos(-ang) * Math.sign(om || 1);
    ctx.strokeStyle = colOf('r'); ctx.lineWidth = hl('r', 3); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    label(ctx, 'r', cx + (R * 0.55) * Math.cos(-ang) + 22, cy + (R * 0.55) * Math.sin(-ang) - 22, colOf('r'), 'r');
    ctx.strokeStyle = colOf('s'); ctx.lineWidth = hl('s', 6); ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, -sweep, sweep > 0); ctx.stroke();
    label(ctx, 's', cx + (R + 34) * Math.cos(-sweep * 0.25), cy + (R + 34) * Math.sin(-sweep * 0.25), colOf('s'), 's');
    const vl = 110; arrow(ctx, px, py, px + vl * tx, py + vl * ty, colOf('v'), hl('v', 4), 'v'); label(ctx, 'v', px + (vl + 22) * tx, py + (vl + 22) * ty, colOf('v'), 'v');
    const nx = (cx - px) / R, ny = (cy - py) / R;
    arrow(ctx, px, py, px + 80 * nx, py + 80 * ny, colOf('ac'), hl('ac', 4), 'ac'); label(ctx, 'a꜀', px + 112 * nx + 20 * tx, py + 112 * ny + 20 * ty, colOf('ac'), 'ac');
    const sa = Math.sign(v.alpha) || 1;
    arrow(ctx, px + 22 * nx, py + 22 * ny, px + 22 * nx + 60 * sa * (-Math.sin(-ang)), py + 22 * ny + 60 * sa * Math.cos(-ang), colOf('at'), hl('at', 4), 'at');
    label(ctx, 'aₜ', px + 22 * nx + 88 * sa * (-Math.sin(-ang)), py + 22 * ny + 88 * sa * Math.cos(-ang), colOf('at'), 'at');
  }
  pointMark(ctx, cx + R * Math.cos(-ang), cy + R * Math.sin(-ang), 'end', '#ffd166');
  caption(ctx, '+ is counterclockwise. Ghost spokes = equal time steps.', Hd);
}

// torque: a still picture of the setup (a beam on a pivot, or a disc spun by a hanging mass); nothing moves in equilibrium
function drawTorque(ctx, v, k, T, now, tau, Wd, Hd){
  const cx = Wd / 2, cy = Hd / 2 - 10;
  ctx.lineCap = 'round';
  if (S.cond.dyn){
    const R = 130, mx = cx - R, my = cy + R + 60;
    ctx.strokeStyle = '#f7f4ff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e6eef8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, cy); ctx.lineTo(mx, my - 30); ctx.stroke();
    body(ctx, mx, my, 70, 60);
    ctx.strokeStyle = colOf('R'); ctx.lineWidth = hl('R', 3); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    label(ctx, 'R', cx + R / 2, cy - 22, colOf('R'), 'R'); label(ctx, 'M', cx + 30, cy + 50, colOf('M'), 'M'); label(ctx, 'm', mx, my + 6, colOf('m'), 'm');
    label(ctx, 'T', mx - 30, cy + R / 2, colOf('Tn'), 'Tn');
    arrow(ctx, mx + 70, my - 30, mx + 70, my + 40, colOf('a'), hl('a', 4), 'a'); label(ctx, 'a', mx + 95, my + 10, colOf('a'), 'a');
    arcArrow(ctx, cx, cy, R + 34, Math.PI * 0.55, Math.PI * 1.05, colOf('alpha'), hl('alpha', 4)); label(ctx, 'α', cx - R - 10, cy - R - 10, colOf('alpha'), 'alpha');
    caption(ctx, '+ is counterclockwise: the mass falls on the left, so the disc turns counterclockwise.', Hd);
    return;
  }
  const L = Math.min(620, Wd - 160), x0 = cx - L / 2, px = x0 + 0.15 * L;
  ctx.fillStyle = 'rgba(255,107,214,.35)'; ctx.strokeStyle = '#ff6bd6'; ctx.lineWidth = 3; ctx.fillRect(x0, cy - 8, L, 16); ctx.strokeRect(x0, cy - 8, L, 16);
  ctx.strokeStyle = '#ffd98a'; ctx.beginPath(); ctx.moveTo(px, cy + 8); ctx.lineTo(px - 22, cy + 50); ctx.lineTo(px + 22, cy + 50); ctx.closePath(); ctx.stroke();
  arrow(ctx, cx, cy, cx, cy + 110, colOf('M'), hl('M', 4), 'M'); label(ctx, 'Mg', cx + 34, cy + 100, colOf('M'), 'M');
  arrow(ctx, px, cy, px + 90, cy, colOf('Hx'), hl('Hx', 4), 'Hx'); label(ctx, 'Hₓ', px + 110, cy + 30, colOf('Hx'), 'Hx');
  arrow(ctx, px, cy, px, cy - 100, colOf('Hy'), hl('Hy', 4), 'Hy'); label(ctx, 'H_y', px + 20, cy - 110, colOf('Hy'), 'Hy');
  arrow(ctx, x0 + 0.8 * L, cy, x0 + 0.8 * L - 80, cy - 100, colOf('Tn'), hl('Tn', 4), 'Tn'); label(ctx, 'T', x0 + 0.8 * L - 100, cy - 110, colOf('Tn'), 'Tn');
  label(ctx, 'L', cx, cy - 40, colOf('L'), 'L');
  caption(ctx, '+ is counterclockwise. In equilibrium ΣFx = 0, ΣFy = 0 and Στ = 0 about any point.', Hd);
}

// ---------- graphs ----------
function drawGraph(id, fn, T, labelTxt, color, tau, sub, shade){
  const cv = $(id), ctx = cv.getContext('2d'), Wd = cv.width, Hd = cv.height, L = 90, Rm = 24, Tp = 30, B = 42;
  ctx.fillStyle = '#0b1036'; ctx.fillRect(0, 0, Wd, Hd);
  const N = 120, xs = Array.from({ length: N + 1 }, (_, i) => i * T / N), ys = xs.map(fn);
  let lo = Math.min(0, ...ys), hi = Math.max(0, ...ys); if (hi - lo < 1e-9){ hi += 1; lo -= 1; }
  const X = t => L + (t / T) * (Wd - L - Rm), Y = y => Tp + (1 - (y - lo) / (hi - lo)) * (Hd - Tp - B);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(L, Tp); ctx.lineTo(L, Hd - B); ctx.lineTo(Wd - Rm, Hd - B); ctx.stroke(); ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(Wd - Rm, Y(0)); ctx.stroke();
  if (shade){ ctx.fillStyle = 'rgba(255,230,0,.15)'; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); xs.forEach((t, i) => { if (tau === null || t <= tau) ctx.lineTo(X(t), Y(ys[i])); }); ctx.lineTo(X(tau === null ? T : tau), Y(0)); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); xs.forEach((t, i) => i ? ctx.lineTo(X(t), Y(ys[i])) : ctx.moveTo(X(t), Y(ys[i]))); ctx.stroke();
  ctx.font = `26px ${MONO}`; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(labelTxt, L + 12, Tp + 24);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `20px ${MONO}`; ctx.textAlign = 'right'; ctx.fillText(fmt(hi), L - 8, Tp + 8); ctx.fillText(fmt(lo), L - 8, Hd - B);
  ctx.textAlign = 'center'; ctx.fillText('0', X(0), Hd - 10); ctx.fillText(`${fmt(T)} s`, X(T) - 30, Hd - 10);
  if (sub){ ctx.textAlign = 'right'; ctx.fillText(sub, Wd - Rm - 6, Tp + 24); }
  if (tau !== null){ ctx.strokeStyle = '#ff6bd6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(tau), Tp); ctx.lineTo(X(tau), Hd - B); ctx.stroke(); ctx.fillStyle = '#ff6bd6'; ctx.beginPath(); ctx.arc(X(tau), Y(fn(tau)), 7, 0, 7); ctx.fill(); }
}
function drawGraphs(v, k, tau){
  const T = v[k.t], rot = hook('angular');
  drawGraph('gTheta', t => posAt(v, k, t), T, rot ? 'θ(t)  rad' : hook('posLabel'), '#ff6bd6', tau, 'slope = velocity');
  drawGraph('gOmega', t => velAt(v, k, t), T, rot ? 'ω(t)  rad/s' : 'v(t)  m/s', '#4fd1ff', tau, `shaded area = ${rot ? 'θ' : 'Δx'}`, true);
  drawGraph('gAlpha', () => v[k.a], T, rot ? 'α(t)  rad/s²' : 'a(t)  m/s²', '#ffd166', tau, 'flat: constant');
}

// ---------- diagram clicks ----------
function canvasPos(e){ const cv = $('dg'), r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
function hitAt(p){ let best = null, bd = 1e9; for (const h of S.hot){ const d = Math.hypot(p.x - h.x, p.y - h.y); if (d <= h.r && d < bd){ best = h; bd = d; } } return best; }
$('dg').addEventListener('mousemove', (e) => { const h = hitAt(canvasPos(e)); $('dg').classList.toggle('pointer', !!h); if (h && h.kind === 'var') setHover(h.id); else if (!h) setHover(null); });
$('dg').addEventListener('mouseleave', () => setHover(null));
$('dg').addEventListener('click', (e) => { const h = hitAt(canvasPos(e)); if (!h) return; beep(740, 0.04); if (h.kind === 'var') inspectVar(h.id); else if (h.kind === 'point') inspectPoint(h.name); });

function chip(id){
  const st = stateOf(id), x = known(id) ? `= ${showVal(id)}` : st === 'target' ? '🎯' : '?';
  const acts = known(id) ? '' : `<button data-add="${id}" title="Add as a known">+ known</button>${st !== 'target' ? `<button data-tgt="${id}" title="Make it a target">🎯</button>` : ''}`;
  return `<span class="ichip ${st}" data-v="${id}">${VARS[id].sym} ${x}${acts}</span>`;
}
function wireInspector(){
  const box = $('inspector');
  box.querySelectorAll('[data-tgt]').forEach(b => b.onclick = (e) => { e.stopPropagation(); addTarget(b.dataset.tgt); inspectRefresh(); });
  box.querySelectorAll('[data-add]').forEach(b => b.onclick = (e) => { e.stopPropagation(); openEditor(b.dataset.add); $('editorSlot').scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }); });
  box.querySelectorAll('.ichip').forEach(c => { c.onmouseenter = () => setHover(c.dataset.v); c.onmouseleave = () => setHover(null); });
  box.querySelectorAll('[data-cond]').forEach(b => b.onclick = () => { setCond(b.dataset.cond, true); say(b.dataset.say); });
}
let inspectRefresh = () => {};
function resetInspector(){ S.inspectName = null; $('inspector').innerHTML = '<h3>CLICK THE DIAGRAM</h3><p>Click a point on the path, a force arrow in the free-body diagram, or any label. You’ll see what it means, add it as a known or a 🎯 target, and the library outlines the equations that use it.</p>'; }
function inspectVar(id){
  S.inspectName = null; inspectRefresh = () => inspectVar(id);
  const eqs = chEqs().map(x => x.e).filter(e => EQS[e].vars.includes(id));
  $('inspector').innerHTML = `<h3>${VARS[id].plain.toUpperCase()}: ${nm(id).toUpperCase()}</h3><div class="ivars">${chip(id)}</div><p>Appears in ${eqs.map(e => EQS[e].label).join(', ')}. They’re outlined in cyan in the library.</p>`;
  wireInspector(); S.focus = [id]; renderLibrary(); renderSheet(); paintSyms(); document.querySelector('#lib .lib-eq.rel')?.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' }); draw();
}
function inspectPoint(name){
  const k = K(); S.inspectName = name; inspectRefresh = () => inspectPoint(name);
  let title, ids, text, act = '';
  if (name === 'start'){ title = 'START (t = 0)'; ids = [k.u0]; text = 'The clock starts here and distances are measured from here, so only the starting velocity describes this moment.'; }
  else if (name === 'end'){ title = 'END POINT'; ids = [k.t, k.p, k.u]; text = 'How long it took, how far it went and how fast it’s going at the end. “How long until…” asks for t at this point; “how fast when…” asks for the final velocity here.'; }
  else { title = 'STOP POINT'; ids = [k.u]; text = 'Here it has slowed to a halt, so <b>v = 0</b> for an instant. That’s a hidden given if the problem asks about the moment it stops.';
    act = `<button class="go" data-cond="stop" data-say="Condition on: comes to a stop, so the final velocity is 0.">Use this as the end point (turn on “Comes to a stop”)</button>`; }
  $('inspector').innerHTML = `<h3>📍 ${title}</h3><div class="ivars">${ids.map(chip).join('')}</div><p>${text}</p><div class="iact">${act}</div>`;
  wireInspector(); S.focus = ids; renderLibrary(); renderSheet(); paintSyms(); draw();
}

// ---------- replay ----------
$('replayBtn').onclick = () => {
  if (!K()) return;
  const { v } = simValues(), k = K(), T = v[k.t], D = Math.min(7000, Math.max(800, T * 1000)), rate = T * 1000 / D;
  $('dgNote').textContent = rate > 1.01 ? `Playing ${fmt(rate)}× faster than real time.` : rate < 0.99 ? `Slow motion (${fmt(rate)}×).` : 'Playing in real time.';
  const t0 = performance.now(); beep(300, 0.3, 'triangle'); S.anim = true;
  const frame = (now) => { const tau = Math.min(T, ((now - t0) / D) * T); draw(tau); if (tau < T) requestAnimationFrame(frame); else { S.anim = false; draw(); } };
  requestAnimationFrame(frame);
};

// ---------- celebrate ----------
function celebrate(){
  fanfare(); setTimeout(() => COURSE.event('solved'), 600);
  say(`<b>Solved.</b> ${S.targets.map((t, i) => `${letter(i)} ${symOf(t)} = ${showVal(t)}`).join(', ')}.${K() ? ' Press <b>Replay motion</b> to watch it.' : ''}${S.bank ? ' Then try another from the practice bank.' : ''}`);
  if (calm()) return;
  const b = $('solved'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 1700);
  field.pulse(innerWidth / 2, innerHeight / 2, 260);
}
// a solved step sends a pulse through the background field, from the work panel
function stepPulse(){ if (calm()) return; const r = $('workWin').getBoundingClientRect(); field.pulse(r.left + 40, Math.min(innerHeight - 40, Math.max(40, r.top + 60)), 70); }

// ---------- toggles ----------
$('calmBtn').onclick = () => { const on = !calm(); document.body.classList.toggle('calm', on); $('calmBtn').setAttribute('aria-pressed', String(on)); field.setCalm(on); try { localStorage.setItem('rl-calm', on ? '1' : '0'); } catch {} draw(); };
$('soundBtn').onclick = () => { S.sound = !S.sound; $('soundBtn').setAttribute('aria-pressed', String(S.sound)); beep(660, 0.08); };
$('clearBtn').onclick = async () => { if (S.busy || !await beforeClearing('Clear all')) return; beep(120, 0.3, 'sine'); S.cond = defaultsFor(S.ch); resetAll(true); S.build.clear(); WS.clear(); S.fbd = { body: null, forces: {} }; S.board = null; NB.forget(); renderAll(); say('Cleared: the drawing and every known, target and equation are gone. The conditions are back to their defaults.'); };

// ---------- systems: equations that must be solved together (js/systems.js finds them; combine eliminates) ----------
// Any equation can be written as Z = 0: generated ones carry Z; for library ones it comes from a solver's template.
function zeroForm(e){
  const eq = EQS[e];
  if (eq.Z) return eq.Z;
  // prefer a form with no sum under a fraction bar: Mg sin θ − f_s − Ma, not M − f_s / (g sin θ − a),
  // which would put an unknown in a denominator and stop the elimination from isolating it
  let first = null;
  for (const x of eq.vars){
    const sol = eq.solve[x];
    if (!sol || sol.alt || X.hasPM(sol.tree) || /sin⁻¹|cos⁻¹/.test(sol.sub)) continue;
    const Z = X.zeroOf(X.symbol(x), X.toRat(sol.tree, symEnv(eq.vars), 1));
    if (!Z.d.length) return (eq.Z = Z);
    first ||= Z;
  }
  return (eq.Z = first);
}
// Systems: equations that must be solved together, found by matching equations to unknowns and taking strongly
// connected components (js/systems.js). Only blocks that can be solved now and that exact elimination can reduce
// are offered, each with the unknowns it can be solved for (keeps).
function systems(eqList, ks){
  const unk = (e) => unknownsOf(e, ks);
  const eqs = eqList.filter(e => unk(e).length && zeroForm(e));
  return readyBlocks(eqs, unk).filter(b => b.eqs.length > 1)
    .map(b => ({ eqs: b.eqs, a: b.eqs[0], b: b.eqs[1], pair: b.unknowns, keeps: b.unknowns.filter(x => solvesFor(b.eqs, b.unknowns, x)) }))
    .filter(b => b.keeps.length);
}
const SYS_OK = new Map();
function solvesFor(eqs, us, x){
  const key = `${eqs.join('+')}|${[...us].sort().join(',')}|${x}`;
  if (!SYS_OK.has(key)){
    let ok = false;
    try { ok = !!eliminate(eqs.map(e => ({ Z: zeroForm(e), label: EQS[e].label })), us, x, plain); } catch (e){ if (!(e instanceof X.MathError)) throw e; }
    SYS_OK.set(key, ok);
  }
  return SYS_OK.get(key);
}
const sysLabel = (sys, sep = '+') => (sys.eqs || [sys.a, sys.b]).map(e => EQS[e].label).join(sep);
// the first system on the sheet that hasn't been combined yet
function findSystem(ks){
  const done = (list) => Object.values(S.gen).some(g => g.key === list.join('+'));
  return systems(S.sheet.filter(e => applies(e)), ks).find(b => !done(b.eqs)) || null;
}
function combine(sys, keep = null){
  if (solveLocked()) return null;
  const eqs = sys.eqs || [sys.a, sys.b], key = eqs.join('+');
  const existing = Object.keys(S.gen).find(id => S.gen[id].key === key && (!keep || S.gen[id].vars.includes(keep)));
  if (existing) return existing;
  const list = eqs.map(e => ({ Z: zeroForm(e), label: EQS[e].label }));
  for (const k of keep ? [keep] : [...sys.pair].reverse()){
    let res;
    try { res = eliminate(list, sys.pair, k, plain); } catch (e){ if (!(e instanceof X.MathError)) throw e; res = null; }
    if (!res) continue;
    const vars = [...new Set(eqs.flatMap(e => EQS[e].vars))].filter(v => X.symbolsOf(res.Z).has(v));
    const label = sysLabel(sys);
    const id = addGenerated({ label, vars, Z: res.Z, key, condition: `${sysLabel(sys, ', ')} together`, meaning: res.steps.map(st => `${st.from} solved for ${plain(st.x)}`).join(', then ') + ', and put into the others' });
    beep(990, 0.05); renderAll(false);
    say(`Combined! ${res.steps.map(st => `${st.from} gives ${VARS[st.x].sym} = ${X.toHTML(st.iso, S.printOpts)}`).join('; ')}. Put in, ${res.steps.map(st => VARS[st.x].sym).join(' and ')} drop${res.steps.length > 1 ? '' : 's'} out: <b>${EQS[id].label}</b> has one unknown left, so it glows.`);
    return id;
  }
  dialog('Math says no', '<b>CAN’T COMBINE</b>None of the unknowns can be isolated in a single linear step here.');
}

// Show me: a system move combines the two equations (eliminating the other unknown), then solves for this one
async function sysOp(m){
  const id = combine(m, m.v); if (!id) return;
  renderAll(false); await sleep(350);
  await solve(id, m.v);
}

// ---------- diagram tabs ----------
S.dtab = 'build';
// Motion: the replay on the canvas, the inspector beside it. Build: the setup on the canvas.
// Forces: the setup stays on the canvas (click a body) and its free-body diagram opens beside it.
function showTab(t){
  S.dtab = t;
  document.querySelectorAll('[data-dtab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dtab === t)));
  $('paneMotion').hidden = t !== 'motion'; $('paneBuild').hidden = t === 'motion';
  $('replayBtn').hidden = t !== 'motion';
  S.build.setMode(t === 'forces' ? 'forces' : 'setup');
  if (t === 'motion') draw(); if (t === 'forces') renderFBD(); if (t !== 'motion') renderBuildUI();
}
document.querySelectorAll('[data-dtab]').forEach(b => b.onclick = () => { const t = b.dataset.dtab; if (t === 'motion') showTab(t); else openStage(t === 'forces' ? 1 : 0); });

// ---------- build canvas ----------
let DF = null, TOOLS = null, CN = null, TK = null; // the drawing-first setup (part dots, cards, summary), its tools and toolkit, created just after the canvas
S.build = createBuild($('bd'), {
  afterRender: (svg) => { if (S.mode === 'draw'){ CN?.render(svg); TK?.render(svg); } DF?.decorate(svg); },
  onChange: () => {
    DF?.changed();
    const sel = S.build && S.build.selected();
    if (sel && S.dtab === 'forces' && fbdBodies().some(b => b.id === sel.id)) S.fbd.body = sel.id; // click a body: its free-body diagram opens
    const conds = syncDrawnConds();
    if (syncDrawingGivens() || conds.length) renderAll(false); else { renderBuildUI(); renderStage(); if (S.dtab === 'forces') renderFBD(); }
    if (conds.length) say(`Your drawing settles ${conds.map(x => `<b>${x}</b>`).join(' and ')}. Conditions only asks what the picture can’t show.`);
  },
  // labels on the drawing: the symbol, and its value once it has one
  nameOf: (id) => { if (!VARS[id]) return id; const g = S.givens[id]; return g && g.kind !== 'symbol' ? `${VARS[id].plain} = ${fmt(g.mag)}${g.unit && g.unit !== 'no unit' ? (g.unit === '°' ? '°' : ' ' + g.unit) : ''}` : VARS[id].plain; },
  dirsFor: (b) => dirVectors(b),
  forcesFor: (b) => forcesOf(b).map(f => ({ dir: f.dir, vec: f.dir === 'custom' ? customVec(b, f.ang) : null, label: fLabel(b, f), color: FCOL[f.kind], ...(isExt(b) ? extDraw(b, f) : {}) })),
  // a new arrow: with a force tool armed it becomes that force at once; otherwise the picker asks which force it is
  // (on a beam it acts where the drag started; directions there are always named ones)
  onArrow: (bodyId, dir, xy, kind, vec, u) => {
    const b = fbdBodies().find(x => x.id === bodyId); if (!b) return;
    if (isExt(b)){
      const where = { dir: dir || nearestDir(b, vec), u };
      if (kind && TQ.KINDS[kind]){ addExtForce(b, kind, where); S.fbd.body = b.id; afterForces(); return; }
      forcePicker(bodyId, where, xy); return;
    }
    const where = dir ? { dir } : { dir: 'custom', ang: angleOf(b, vec) };
    if (kind){ forcesOf(b).push({ kind, var: defaultVar(FKINDS[kind], b), ...where }); S.fbd.body = b.id; afterForces(); return; }
    forcePicker(bodyId, where, xy);
  },
  onArrowClick: (bodyId, i, xy) => forcePicker(bodyId, null, xy, i),
  onArrowTurn: (bodyId, i, dir, vec) => {
    const b = fbdBodies().find(x => x.id === bodyId), f = b && forcesOf(b)[i]; if (!f) return;
    if (isExt(b)){ f.dir = dir || nearestDir(b, vec); S.fbd.body = b.id; afterForces(); return; }
    if (dir){ f.dir = dir; delete f.ang; } else { f.dir = 'custom'; f.ang = angleOf(b, vec); }
    S.fbd.body = b.id; afterForces();
  },
  onArrowErase: (bodyId, i) => { const b = fbdBodies().find(x => x.id === bodyId); if (b){ forcesOf(b).splice(i, 1); afterForces(); } },
  // the velocity arrow says which way it moves: on a slope it sets the "Moving" condition
  onVector: (bodyId, k, dir) => {
    const b = fbdBodies().find(x => x.id === bodyId); if (!b || k !== 'v' || b.frame !== 'slope') return; // the "Moving" condition follows in onChange
    if (dir && dir !== 'up-slope' && dir !== 'down-slope') say('A sliding block’s velocity points along the slope. Drag the tip of <b>v</b> until it clicks onto the slope.');
  },
  snapshot: () => JSON.parse(JSON.stringify(S.fbd.forces)),
  restore: (x) => { if (x) S.fbd.forces = x; if (S.dtab === 'forces'){ renderFBD(); renderForceChips(); } },
  onPropClick: (shapeId, prop) => { const sh = S.build.shapes.find(x => x.id === shapeId), id = sh && sh.props[prop]; if (id && VARS[id]) openEditor(id); },
  unit: () => S.ch,
  // torque: the axis marker and its lever arms on a beam or disc, and clicks with the axis tool
  axisFor: (b) => S.dtab === 'forces' && isExt(b) && (b.frame === 'disc' || b.id === fbdBody()?.id) ? (b.frame === 'disc' ? { centre: true } : { u: pointU(b, axisKey(b)) }) : null,
  onAxisClick: (bodyId, u) => setAxisAt(bodyId, u),
  // a pen stroke was read: snap it, or ask which component it is when the stroke could be either
  onStroke: (res, xy, place) => {
    if (!res.options.length){ say(res.why); return; }
    const done = (o) => { place(o); const c = COMPONENTS[compOf(o)]; say(`Read as <b>${esc(o.label)}</b>: it snapped to the standard drawing. ${c ? `<i>What to check:</i> ${c.check}` : ''}`); };
    if (res.options.length === 1) done(res.options[0]);
    else choosePop(res.ask, res.options.map(o => o.label), xy, (i) => done(res.options[i]));
  },
  wheelButton: (s) => hook('points') && s.kind === 'wheel' && spinState(s) ? (S.pointView === s.id ? '× hide the point' : '◎ a point') : null,
  pointVectors: (s) => S.pointView === s.id && hook('points') ? pointMath(s)?.vecs || null : null,
  onWheelButton: (id) => {
    S.pointView = S.pointView === id ? null : id; S.build.render(); renderBuildUI();
    if (S.pointView) say('A point P on the rim: <b>v</b> along its path, <b>aₜ = rα</b> along its path too, <b>a꜀ = ω²r</b> toward the centre. Their equations are under the drawing.');
  },
});
const KN = S.kn = createKnowns({ panel: $('dfKnowns'), setup: () => DF, build: S.build, say });
DF = S.df = createSetup({ build: S.build, svg: $('bd'), panel: $('dfCard'), count: $('dfCount'), doneBtn: $('doneDraw'), sumBtn: $('dfSumBtn'), say, active: () => S.mode === 'draw',
  ext: { cardHTML: KN.cardHTML, click: KN.click, refresh: KN.render } });
TOOLS = S.tools = createTools({ svg: $('bd'), wrap: $('bd').parentElement, bar: $('dfTools'), build: S.build });
CN = createConnect({ build: S.build, tools: TOOLS, say });
TK = S.tk = createToolkit({ build: S.build, tools: TOOLS, hit: CN.hit, say, setup: () => DF, bar: $('dfTools') });
KN.addSource(TK.knowns);
const WS = S.ws = createWorkspace({ panel: $('dfWork'), knowns: () => KN, masses: () => S.build.shapes.filter(s => s.kind === 'block' || s.kind === 'particle').length, say });
WS.render();

// ---------- modes: drawing-first (the default) or guided (today's stages, sheet, Hint and Show me) ----------
// Guided is remembered as pl-mode on this device; choosing drawing-first again forgets it.
const savedMode = () => { try { return localStorage.getItem('pl-mode') === 'guided' ? 'guided' : 'draw'; } catch { return 'draw'; } };
function setMode(m, remember = true){
  S.mode = m;
  document.body.classList.toggle('mode-draw', m === 'draw');
  $('modeBtn').querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  if (remember) try { if (m === 'guided') localStorage.setItem('pl-mode', 'guided'); else localStorage.removeItem('pl-mode'); } catch {}
  // drawing-first covers the torque unit for now (a rod and point masses)
  if (m === 'draw'){ if (S.ch !== DRAW_UNIT){ switchChapter(DRAW_UNIT); renderAll(); } showTab('build'); }
  if (m !== 'draw') TOOLS.use('select');
  DF.render(); KN.render(); S.build.render();
}
$('modeBtn').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
  if (b.dataset.mode === S.mode) return;
  setMode(b.dataset.mode);
  say(S.mode === 'draw' ? 'Drawing first: draw the problem, press <b>Done drawing</b>, then set each part from its dot.' : 'Guided mode: the four stages, the sheet, <b>Hint</b> and <b>Show me</b>.');
});

// which library card a recognised stroke or a shape belongs to
const compOf = (o) => o.kind === 'vec' ? o.vec : o.kind === 'floor' || o.kind === 'table' ? 'surface' : o.kind;
// ask which component a stroke was meant to be
function choosePop(title, labels, xy, pick){
  let pop = $('choosePick'); if (!pop){ pop = document.createElement('div'); pop.id = 'choosePick'; pop.className = 'pop'; document.body.appendChild(pop); }
  pop.innerHTML = `<div class="small">${esc(title)}</div><div class="row">${labels.map((l, i) => `<button data-pick="${i}">${esc(l)}</button>`).join('')}<button data-pick="-1">Neither</button></div>`;
  pop.style.left = Math.min(innerWidth - 340, xy.x + 10) + 'px'; pop.style.top = Math.min(innerHeight - 140, xy.y + 10) + 'px'; pop.hidden = false;
  pop.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { pop.hidden = true; if (+b.dataset.pick >= 0) pick(+b.dataset.pick); else say('Nothing added. Try the stroke again, or pick the shape from the toolbar.'); });
}

// ---------- a point on a spinning wheel (Phase 4) ----------
// The wheel shows its button once ω or α is known or drawn on it. The point P sits at the top of the rim (counterclockwise
// is +, so there "along its path" is to the left). Every number comes from the library equations' templates.
function spinState(s){
  const part = (ids, arrow, sampleId) => {
    const id = ids.find(known);
    if (id) return { id, val: val(id), num: !isSymbolic(id) };
    return arrow ? { id: null, val: (arrow.ccw ? 1 : -1) * sampleOf(sampleId), num: false } : null;
  };
  const w = part(['w', 'w0'], s.omega, 'w'), al = part(['alpha'], s.alpha, 'alpha');
  if (!w && !al) return null;
  return { w, al, r: known('r') ? { id: 'r', val: val('r'), num: !isSymbolic('r') } : { id: null, val: sampleOf('r'), num: false } };
}
const POINT_EQS = [
  { x: 'v', e: 'E7', needs: ['w'], color: '#9be15d', label: 'v' },
  { x: 'at', e: 'E8', needs: ['al'], color: '#ff8f70', label: 'aₜ' },
  { x: 'ac', e: 'E9', needs: ['w'], color: '#ffd166', label: 'a꜀' },
  { x: 'atot', e: 'E11', needs: ['w', 'al'], color: '#ff6bd6', label: 'a' },
];
function pointMath(s){
  const st = spinState(s); if (!st) return null;
  const v = { r: st.r.val, w: st.w ? st.w.val : 0, alpha: st.al ? st.al.val : 0 };
  const rows = POINT_EQS.filter(q => q.needs.every(k => st[k])).map(q => {
    const res = EQS[q.e].solve[q.x].f(v); v[q.x] = res.value;
    return { ...q, value: res.value, num: q.needs.every(k => st[k].num) && st.r.num };
  });
  // directions on the drawing (y down): along the path at the top is (−1, 0) for counterclockwise; the centre is straight down
  // the accelerations share one scale (the longest reaches 70% of the way to the centre), so their sizes compare truly
  const by = Object.fromEntries(rows.map(q => [q.x, q])), aMax = Math.max(Math.abs(by.at?.value || 0), Math.abs(by.ac?.value || 0)) || 1, L = Math.min(110, 0.7 * s.r);
  const vecs = [];
  if (by.v && by.v.value) vecs.push({ key: 'v', x: -Math.sign(by.v.value), y: 0, len: 95, color: by.v.color, label: 'v' });
  if (by.at && by.at.value) vecs.push({ key: 'at', x: -Math.sign(by.at.value), y: 0, len: Math.max(24, L * Math.abs(by.at.value) / aMax), color: by.at.color, label: 'aₜ' });
  if (by.ac && by.ac.value) vecs.push({ key: 'ac', x: 0, y: 1, len: Math.max(24, L * by.ac.value / aMax), color: by.ac.color, label: 'a꜀' });
  if (by.atot && by.at.value && by.ac.value){
    const ax = -by.at.value, ay = by.ac.value, n = Math.hypot(ax, ay);
    vecs.push({ key: 'atot', x: ax / n, y: ay / n, len: L * n / aMax, color: by.atot.color, label: 'a' });
  }
  return { st, rows, vecs };
}
function pointPanelHTML(s){
  const pm = pointMath(s); if (!pm) return '';
  const { st, rows } = pm, wName = st.w && st.w.id ? VARS[st.w.id].sym : 'ω';
  const vals = { r: st.r.val, w: st.w?.val, alpha: st.al?.val, ...Object.fromEntries(rows.map(q => [q.x, q.value])) };
  const lines = rows.map(q => {
    const eq = EQS[q.e], sub = eq.solve[q.x].sub;
    return `<div class="pteq"><span class="tag">${eq.label}</span> ${eq.form}${q.num ? ` = ${plug(sub, vals)} = <b>${fmt(q.value)} ${unitOf(q.x)}</b>` : ''}</div>`;
  }).join('');
  const missing = !st.r.num || rows.some(q => !q.num) ? `<div class="small muted">Give ${[!st.r.num && 'r', st.w && !st.w.num && 'ω', st.al && !st.al.num && 'α'].filter(Boolean).join(', ')} a number to see the sizes; the arrows use typical values.</div>` : '';
  const note = st.w && st.w.id === 'w0' ? `<div class="small muted">ω here is ${wName}, at t = 0.</div>` : '';
  return `<div class="ptpanel"><b>A point P at radius r</b>${lines}${note}${missing}<div class="row"><button class="go" id="ptAdd">+ Add these to my sheet</button></div></div>`;
}
function addPointEqs(s){
  const pm = pointMath(s); if (!pm || S.busy) return;
  S.cond.rim = true; syncDrawingGivens();
  const add = pm.rows.map(q => q.e).filter(e => !S.sheet.includes(e));
  S.sheet.push(...add); beep(990, 0.05); renderAll(false);
  say(`${add.length ? `Added ${add.map(e => EQS[e].label).join(', ')} to your sheet` : 'They are already on your sheet'}, and <b>Track a point</b> is on.`);
}
// ---------- variables from the drawing ----------
// Each shape property names a quantity (the ramp's angle θ, a block's mass m). Drawing the shape adds it as a given,
// a symbol until you give it a number (click its label or chip). Removing the shape removes it.
const PROP_VARS = { angle: true, mass: true, radius: true, length: true };
function syncDrawingGivens(){
  const want = new Set();
  for (const sh of S.build.shapes) for (const [prop, id] of Object.entries(sh.props)) if (PROP_VARS[prop] && typeof id === 'string' && chVars().includes(id)) want.add(id);
  let changed = false;
  for (const id of want) if (!S.givens[id]){ S.givens[id] = { from: 'drawing', kind: 'symbol', mag: null, unit: VARS[id].unit, dir: 0, val: SAMPLE[id] }; changed = true; }
  for (const [id, g] of Object.entries(S.givens)) if (g.from === 'drawing' && !want.has(id)){ delete S.givens[id]; changed = true; }
  if (want.has('inc') && isSymGiven('inc') && S.samples.inc !== S.build.theta){ S.samples.inc = S.build.theta; }
  if (changed) clearDerived();
  return changed;
}
// the directions an arrow can snap to on this body, as unit vectors on the drawing (y down)
function dirVectors(b){
  if (isExt(b)){
    const sg = b.frame === 'beam' ? TQ.TILT[extOpts(b).tilt] : 0, be = numAngle('beta') * Math.PI / 180, ph = numAngle('phi') * Math.PI / 180;
    return Object.entries(TQ.DIRS[b.frame]).map(([key, d]) => {
      let x, y;
      if (d.w){ [x, y] = d.w.map(c => Number(c.replace('−', '-'))); }
      else { const A = d.s[0] * Math.cos(ph), P = d.s[1] * Math.sin(ph); x = A * Math.cos(be) - P * sg * Math.sin(be); y = A * sg * Math.sin(be) + P * Math.cos(be); }
      return { key, x, y: -y };
    });
  }
  const th = (b.frame === 'slope' ? S.build.theta : 0) * Math.PI / 180;
  const sAx = b.frame === 'hanging' ? [0, 1] : [Math.cos(th), -Math.sin(th)], nAx = b.frame === 'hanging' ? [1, 0] : [-Math.sin(th), -Math.cos(th)];
  const num = (u) => u === '0' ? 0 : X.evalNum(X.parse(u), { inc: S.build.theta });
  return Object.entries(DIRS[b.frame] || DIRS.free).map(([key, d]) => { const us = num(d[0]), un = b.frame === 'hanging' ? 0 : num(d[1]); return { key, x: us * sAx[0] + un * nAx[0], y: us * sAx[1] + un * nAx[1] }; });
}
// a force at a custom angle: ang is measured from the body's ∥ axis toward its ⊥ axis, in degrees
function frameAxes(b){
  const th = (b.frame === 'slope' ? S.build.theta : 0) * Math.PI / 180;
  return { s: b.frame === 'hanging' ? [0, 1] : [Math.cos(th), -Math.sin(th)], n: b.frame === 'hanging' ? [1, 0] : [-Math.sin(th), -Math.cos(th)] };
}
const nearestDir = (b, v) => dirVectors(b).map(d => ({ k: d.key, dot: d.x * v.x + d.y * v.y })).sort((p, q) => q.dot - p.dot)[0].k;
function angleOf(b, v){ const ax = frameAxes(b), cs = v.x * ax.s[0] + v.y * ax.s[1], sn = v.x * ax.n[0] + v.y * ax.n[1]; return Math.round(Math.atan2(sn, cs) * 180 / Math.PI); }
function customVec(b, ang){ const ax = frameAxes(b), a = (ang || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return { x: c * ax.s[0] + s * ax.n[0], y: c * ax.s[1] + s * ax.n[1] }; }
const numTxt = (x) => Math.abs(x) < 1e-9 ? '0' : (x < 0 ? '−' : '') + String(+Math.abs(x).toFixed(4));
// a force's direction as [∥ part, ⊥ part, words], named or custom
function dirOf(b, f){
  if (isExt(b)){ const d = TQ.DIRS[b.frame][f.dir]; return ['', '', d ? d.name : f.dir]; }
  if (f.dir === 'custom'){ const a = (f.ang || 0) * Math.PI / 180; return [numTxt(Math.cos(a)), numTxt(Math.sin(a)), `${f.ang}° from the ∥ axis`]; }
  return (DIRS[b.frame] || DIRS.free)[f.dir];
}
// the same direction on screen (for tests and the popover)
S.fbdScreenDir = (b, key) => { const d = dirVectors(b).find(q => q.key === key), m = $('bd').getScreenCTM(); const x = m.a * d.x + m.c * d.y, y = m.b * d.x + m.d * d.y, n = Math.hypot(x, y); return { x: x / n, y: y / n }; };
const FCOL = { gravity: '#ffd166', hung: '#ffd166', normal: '#4fd1ff', friction: '#ff9f43', push: '#3ddc97', tension: '#ffffff', contact: '#c39bff', hinge: '#9be1c9' };
// after drawing an arrow: which force is it? (or, for an existing arrow: change it or remove it)
function forcePicker(bodyId, dir, xy, index = null){
  const b = fbdBodies().find(x => x.id === bodyId); if (!b) return;
  let pop = $('forcePick'); if (!pop){ pop = document.createElement('div'); pop.id = 'forcePick'; pop.className = 'pop'; document.body.appendChild(pop); }
  const where = typeof dir === 'string' ? { dir } : dir;
  const name = dirOf(b, where || forcesOf(b)[index])[2];
  const kinds = isExt(b) ? extKinds(b) : FKINDS;
  pop.innerHTML = `<div class="small muted">${index === null ? 'Which force is this?' : 'Change this force'} <span>(${name})</span></div>
    <div class="row">${Object.entries(kinds).map(([k, d]) => `<button data-fkind="${k}" style="border-color:${FCOL[k]}">${d.label}</button>`).join('')}</div>
    <div class="row">${index === null ? '' : '<button data-fdel="1">Remove it</button>'}<button data-fcancel="1">Cancel</button></div>`;
  pop.style.left = Math.min(innerWidth - 340, xy.x + 10) + 'px'; pop.style.top = Math.min(innerHeight - 140, xy.y + 10) + 'px'; pop.hidden = false;
  const close = () => { pop.hidden = true; };
  pop.querySelectorAll('[data-fkind]').forEach(btn => btn.onclick = () => {
    const k = btn.dataset.fkind, d = FKINDS[k];
    if (isExt(b)){ if (index !== null) forcesOf(b).splice(index, 1); addExtForce(b, k, where || {}); close(); S.fbd.body = b.id; afterForces(); return; }
    if (index === null) forcesOf(b).push({ kind: k, var: defaultVar(d, b), ...where });
    else Object.assign(forcesOf(b)[index], { kind: k, var: defaultVar(d, b) });
    close(); S.fbd.body = b.id; afterForces();
  });
  pop.querySelector('[data-fdel]')?.addEventListener('click', () => { S.build.checkpoint(); forcesOf(b).splice(index, 1); close(); afterForces(); });
  pop.querySelector('[data-fcancel]').onclick = close;
}
function afterForces(){ S.build.render(); renderFBD(); renderForceChips(); }
// forces join the collection of quantities, next to the givens
function renderForceChips(){
  const box = $('forceChips'); if (!box) return;
  const seen = new Map();
  for (const b of fbdBodies()) for (const f of forcesOf(b)){ const key = isWeight(f) ? 'W:' + weightMass(b, f) : f.var; if (!seen.has(key)) seen.set(key, { b, f }); }
  if (!seen.size){ box.innerHTML = ''; return; }
  box.innerHTML = `<span class="lbl">Forces</span>` + [...seen.values()].map(({ b, f }) => {
    const id = isWeight(f) ? null : f.var, st = id ? stateOf(id) : 'given';
    const txt = isWeight(f) ? fLabelHTML(b, f) : `${VARS[id].sym}${known(id) ? ' = ' + showVal(id) : ''}`;
    return `<button class="fchip s-${st}" style="border-color:${FCOL[f.kind]}" ${id && !known(id) && !S.targets.includes(id) ? `data-ftarget="${id}" title="Make it a target"` : 'disabled'}>${txt}</button>`;
  }).join('');
  box.querySelectorAll('[data-ftarget]').forEach(btn => btn.onclick = () => addTarget(btn.dataset.ftarget));
}
// ---------- library drawer, add-a-given panel ----------
// two drawers share the right edge: the equation library and the diagram library; opening one closes the other
const DRAWERS = { libDrawer: 'libBtn', diagDrawer: 'diagBtn', nbDrawer: 'nbBtn', courseDrawer: 'courseBtn' };
function setDrawer(open, id = 'libDrawer'){
  for (const [d, b] of Object.entries(DRAWERS)){ const on = open && d === id; $(d).classList.toggle('open', on); $(b).setAttribute('aria-expanded', String(on)); }
}
for (const [d, b] of Object.entries(DRAWERS)) $(b).onclick = () => setDrawer(!$(d).classList.contains('open'), d);
$('libClose').onclick = () => setDrawer(false);
$('diagClose').onclick = () => setDrawer(false);
$('nbClose').onclick = () => setDrawer(false);
$('courseClose').onclick = () => setDrawer(false);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });
// a component's card: its standard drawing, what it means, its properties, connections, arrows, equations and what to check
function compHTML(k, tip = ''){
  const c = COMPONENTS[k], eqs = c.eqs.map(e => `<span class="ceq"><span class="tag">${EQS[e].label}</span> ${EQS[e].form}</span>`).join('');
  return `<div class="comp" data-comp="${k}"><svg class="cdraw" viewBox="0 0 80 50" aria-hidden="true">${c.draw}</svg><div class="cbody"><b>${c.label}</b><p>${c.means}</p>
    <dl><dt>Properties</dt><dd>${c.props.map(([n, v]) => `${n}: ${v}`).join(' · ')}</dd><dt>Connects</dt><dd>${c.connects}</dd>${c.arrows.length ? `<dt>Arrows</dt><dd>${c.arrows.join(' · ')}</dd>` : ''}
    <dt>Equations</dt><dd>${eqs}${c.more ? `<span class="cmore">${c.more}</span>` : ''}</dd></dl>
    <p class="cchk">✓ <b>What to check:</b> ${c.check}</p>${tip ? `<p class="ctip">${tip}</p>` : ''}</div></div>`;
}
$('diagLib').innerHTML = Object.keys(COMPONENTS).map(k => compHTML(k)).join('');
// hovering (or focusing) a toolbar tool shows the same card beside it
const TOOL_COMP = Object.fromEntries(Object.entries(COMPONENTS).flatMap(([k, c]) => c.tools.map(t => [t, k])));
function showCard(btn){
  const card = $('compCard'), key = btn.dataset.tipkey;
  card.innerHTML = compHTML(TOOL_COMP[key], TIPS[key]); card.hidden = false;
  const r = btn.getBoundingClientRect(), right = $('bpal').getBoundingClientRect().right;
  card.style.left = Math.min(innerWidth - card.offsetWidth - 8, right + 8) + 'px';
  card.style.top = Math.max(8, Math.min(innerHeight - card.offsetHeight - 8, r.top - 10)) + 'px';
}
const hideCard = () => { $('compCard').hidden = true; };
$('addGivenBtn').onclick = () => { const p = $('addPanel'); p.hidden = !p.hidden; $('addGivenBtn').setAttribute('aria-expanded', String(!p.hidden)); };
// ---------- the drawing toolbar: two columns of pixel icons, like a classic Draw palette ----------
const ico = (body) => `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" shape-rendering="crispEdges">${body}</svg>`;
const iArrow = (x1, y1, x2, y2, c, letter = '', lx = 3, ly = 18) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 5; return `<line x1="${x1}" y1="${y1}" x2="${x2 - Math.cos(a) * 2}" y2="${y2 - Math.sin(a) * 2}" stroke="${c}" stroke-width="2.4"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.5)},${y2 - h * Math.sin(a - 0.5)} ${x2 - h * Math.cos(a + 0.5)},${y2 - h * Math.sin(a + 0.5)}" fill="${c}"/>${letter ? `<text x="${lx}" y="${ly}" font-family="ui-monospace,Menlo,monospace" font-size="9" font-weight="800" fill="${c}">${letter}</text>` : ''}`; };
const ICONS = {
  select: ico('<polygon points="5,2 5,16 8.5,12.5 11,18 13.5,17 11,11.5 16,11.5" fill="#e8edff" stroke="#090d2a" stroke-width="1"/>'),
  erase: ico('<polygon points="2,12 9,5 17,13 12,18 8,18" fill="#ff8fa3"/><polygon points="2,12 5.5,8.5 13.5,16.5 12,18 8,18" fill="#e8edff"/>'),
  undo: ico('<path d="M7 3 L3 7 L7 11 M3 7 H12 A5 5 0 0 1 12 17 H8" fill="none" stroke="#8796ff" stroke-width="2.4"/>'),
  clear: ico('<path d="M4 4 L16 16 M16 4 L4 16" stroke="#ff8f50" stroke-width="3"/>'),
  ramp: ico('<polygon points="2,17 18,17 18,5" fill="rgba(135,150,255,.35)" stroke="#8796ff" stroke-width="2"/>'),
  block: ico('<rect x="4" y="6" width="12" height="10" fill="rgba(255,107,214,.35)" stroke="#ff6bd6" stroke-width="2"/>'),
  ball: ico('<circle cx="10" cy="10" r="6.5" fill="rgba(255,107,214,.35)" stroke="#ff6bd6" stroke-width="2"/>'),
  wheel: ico('<circle cx="10" cy="10" r="7.5" fill="none" stroke="#ff6bd6" stroke-width="2"/><path d="M10 3 V17 M3 10 H17" stroke="#ff6bd6" stroke-width="1.5"/>'),
  table: ico('<rect x="2" y="6" width="16" height="3" fill="#8796ff"/><path d="M4.5 9 V18 M15.5 9 V18" stroke="#8796ff" stroke-width="2"/>'),
  floor: ico('<path d="M1 11 H19" stroke="#8796ff" stroke-width="2.4"/><path d="M3 17 L6 12 M8 17 L11 12 M13 17 L16 12" stroke="#4a5bc4" stroke-width="1.5"/>'),
  pulley: ico('<path d="M10 1 V5" stroke="#ffd98a" stroke-width="2"/><circle cx="10" cy="10" r="5" fill="#151d56" stroke="#ffd98a" stroke-width="2"/><path d="M5 10 V19 M15 10 V19" stroke="#e8edff" stroke-width="1.2"/>'),
  string: ico('<path d="M3 17 L10 4 L17 17" fill="none" stroke="#e8edff" stroke-width="1.6"/><circle cx="10" cy="4" r="2" fill="#ffd98a"/>'),
  vel: ico(iArrow(4, 15, 17, 4, '#9be15d', 'v', 11, 19)),
  acc: ico(iArrow(4, 15, 17, 4, '#ff8f70', 'a', 11, 19)),
  force: ico(iArrow(5, 15, 17, 3, '#ffffff', '?', 2, 9)),
  com: ico('<circle cx="10" cy="10" r="7" fill="#e8edff" stroke="#090d2a" stroke-width="1.5"/><path d="M10 10 H17 A7 7 0 0 0 10 3 Z M10 10 H3 A7 7 0 0 0 10 17 Z" fill="#090d2a"/>'),
  pen: ico('<polygon points="3,17 4,13 14,3 17,6 7,16" fill="#ffd98a" stroke="#090d2a" stroke-width="1"/><polygon points="3,17 4,13 7,16" fill="#e8edff"/>'),
  particle: ico('<circle cx="10" cy="10" r="3.5" fill="#ff6bd6"/>'),
  rod: ico('<rect x="2" y="8" width="16" height="4" fill="rgba(255,107,214,.35)" stroke="#ff6bd6" stroke-width="1.5"/>'),
  spring: ico('<path d="M1 10 H4 L6 5 L9 15 L12 5 L15 15 L16 10 H19" fill="none" stroke="#9be15d" stroke-width="1.8"/>'),
  pivot: ico('<polygon points="10,5 4,16 16,16" fill="none" stroke="#ffd98a" stroke-width="2"/><circle cx="10" cy="5" r="2.5" fill="#ffd98a"/>'),
  omega: ico('<path d="M10 17 A7 7 0 1 0 3 10" fill="none" stroke="#9be15d" stroke-width="2.2"/><polygon points="3,14 0,9 6,9" fill="#9be15d"/><text x="7" y="13" font-family="ui-monospace,Menlo,monospace" font-size="8" font-weight="800" fill="#9be15d">ω</text>'),
  alpha: ico('<path d="M10 17 A7 7 0 1 0 3 10" fill="none" stroke="#ff8f70" stroke-width="2.2"/><polygon points="3,14 0,9 6,9" fill="#ff8f70"/><text x="7" y="13" font-family="ui-monospace,Menlo,monospace" font-size="8" font-weight="800" fill="#ff8f70">α</text>'),
  'f:gravity': ico(iArrow(12, 2, 12, 18, '#ffd166', 'W', 1, 10)),
  'f:normal': ico(iArrow(12, 18, 12, 2, '#4fd1ff', 'N', 1, 12)),
  'f:friction': ico(iArrow(18, 7, 3, 7, '#ff9f43', 'f', 8, 18)),
  'f:tension': ico(iArrow(4, 17, 16, 3, '#ffffff', 'T', 12, 18)),
  'f:push': ico(iArrow(2, 7, 17, 7, '#3ddc97', 'F', 6, 18)),
  'f:contact': ico(iArrow(17, 7, 3, 7, '#c39bff', 'P', 8, 18) + '<rect x="16" y="3" width="3" height="9" fill="#c39bff"/>'),
  incline: ico('<polygon points="1,18 19,18 19,6" fill="rgba(135,150,255,.35)" stroke="#8796ff" stroke-width="1.5"/><rect x="8" y="7" width="6" height="5" fill="#ff6bd6" transform="rotate(-34 11 10)"/>'),
  tpulley: ico('<rect x="1" y="9" width="12" height="2" fill="#8796ff"/><rect x="5" y="5" width="5" height="4" fill="#ff6bd6"/><circle cx="15" cy="9" r="3" fill="none" stroke="#ffd98a" stroke-width="1.5"/><path d="M10 7 H15 M18 9 V14" stroke="#e8edff" stroke-width="1"/><rect x="16" y="14" width="4" height="4" fill="#ff6bd6"/>'),
  blocks: ico('<path d="M1 17 H19" stroke="#8796ff" stroke-width="2"/><rect x="3" y="8" width="7" height="8" fill="#ff6bd6"/><rect x="10" y="10" width="6" height="6" fill="#c39bff"/>'),
  twheel: ico('<circle cx="10" cy="10" r="8" fill="none" stroke="#ffd98a" stroke-width="2"/><circle cx="10" cy="10" r="2" fill="#ffd98a"/><path d="M10 2 V18 M2 10 H18" stroke="#ffd98a" stroke-width="1"/>'),
  tbeam: ico('<rect x="1" y="5" width="18" height="3" fill="#ff6bd6"/><polygon points="5,8 2,13 8,13" fill="none" stroke="#ffd98a" stroke-width="1.5"/><path d="M16 8 V12" stroke="#e8edff" stroke-width="1"/><rect x="14" y="12" width="4" height="4" fill="#ff6bd6"/>'),
  tdisc: ico('<circle cx="11" cy="7" r="5.5" fill="none" stroke="#ff6bd6" stroke-width="2"/><circle cx="11" cy="7" r="1.5" fill="#ffd98a"/><path d="M5.5 7 V13" stroke="#e8edff" stroke-width="1"/><rect x="3.5" y="13" width="4" height="5" fill="#ff6bd6"/>'),
  axis: ico('<rect x="1" y="9" width="18" height="3" fill="rgba(255,107,214,.5)"/><circle cx="7" cy="10.5" r="5" fill="none" stroke="#9be15d" stroke-width="2"/><path d="M7 5 V16 M2 10.5 H12" stroke="#9be15d" stroke-width="1.5"/>'),
};
const TIPS = {
  select: 'Select / move: drag shapes, drag the gold squares to resize, drag an arrow tip to turn it',
  pen: 'Pen: sketch freehand. A line becomes a ramp or surface, a closed loop a ball or wheel, a box a block, an arrow from a body a vector',
  particle: 'Particle: a point mass; lands on the newest surface', rod: 'Rod: drag the gold square to change its length; drop it on a pivot to pin it at that point',
  spring: 'Spring: drag the gold square to stretch it', pivot: 'Pivot: drop a wheel’s centre, or any point of a rod, on it to pin it there',
  omega: 'Angular velocity ω: click a wheel or ball; click again to turn it the other way', alpha: 'Angular acceleration α: click a wheel or ball; click again to turn it the other way',
  erase: 'Eraser: click a shape or an arrow to remove it', undo: 'Undo the last change', clear: 'Clear the whole drawing',
  ramp: 'Ramp: drag the round handle for the angle, the square one for the length', block: 'Block: lands on the newest surface; drag its gold corner to resize', ball: 'Ball (mass m, radius r)', wheel: 'Wheel (radius r)',
  table: 'Table (flat surface)', floor: 'Floor', pulley: 'Pulley: snaps to the top corner of a table or ramp', string: 'String: joins the last bodies over a pulley',
  vel: 'Velocity v: drag out from a body; on a slope it sets which way it moves', acc: 'Acceleration a: drag out from a body to show which way it speeds up',
  force: 'Force: drag out from a body, then say which force it is', com: 'Centre of mass: click or drag inside a body to set where the forces act (⊕)',
  'f:gravity': 'Gravity W = mg: drag out from a body', 'f:normal': 'Normal force N: drag out from a body', 'f:friction': 'Friction f: drag out from a body',
  'f:tension': 'Tension T: drag out from a body', 'f:push': 'Push / pull F: drag out from a body', 'f:contact': 'Contact force P (from the other block): drag out from a body',
  incline: 'Preset: block on an incline', tpulley: 'Preset: table, pulley and hanging block', blocks: 'Preset: two blocks side by side', twheel: 'Preset: a wheel',
  tbeam: 'Preset: a beam on a pivot with a hung mass', tdisc: 'Preset: a disc on an axle, a string to a hanging mass', axis: 'Axis for torques: click a point on the beam',
};
// tools with a diagram-library card show it on hover instead of a plain tooltip
const tbBtn = (attrs, key, on = false) => `<button class="tb" ${attrs} ${TOOL_COMP[key] ? `data-tipkey="${key}"` : `title="${TIPS[key]}"`} aria-label="${TIPS[key].split(':')[0]}" aria-pressed="${on}">${ICONS[key]}</button>`;
function renderBuildUI(){
  const forces = S.dtab === 'forces', tool = S.build.tool;
  const T = (k) => tbBtn(`data-tool="${k}"`, k, tool === k);
  const sep = '<i class="tsep" aria-hidden="true"></i>';
  const act = (k) => tbBtn(`data-act="${k}"`, k);
  $('bpal').hidden = false;
  $('bpal').innerHTML = forces
    ? `${T('force')}${T('erase')}${act('undo')}${hook('extended') ? T('axis') : T('com')}${sep}${Object.keys(FKINDS).filter(k => !hook('extended') || TQ.KINDS[k]).map(k => T('f:' + k)).join('')}`
    : `${T('select')}${T('pen')}${T('erase')}${act('undo')}${act('clear')}${sep}${PALETTE.map(k => tbBtn(`data-bshape="${k}"`, k)).join('')}${sep}${T('vel')}${T('acc')}${T('omega')}${T('alpha')}${sep}`
      + hook('presets').map(([t, k]) => tbBtn(`data-template="${t}"`, k)).join('');
  $('bpal').querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { S.build.tool = b.dataset.tool; renderBuildUI(); });
  $('bpal').querySelectorAll('[data-bshape]').forEach(b => b.onclick = () => { S.build.tool = 'select'; S.build.add(b.dataset.bshape); });
  $('bpal').querySelectorAll('[data-template]').forEach(b => b.onclick = () => { S.build.tool = 'select'; S.build.template(b.dataset.template); });
  $('bpal').querySelector('[data-act="undo"]').onclick = () => { if (!S.build.undo()) say('Nothing to undo.'); };
  $('bpal').querySelector('[data-act="clear"]')?.addEventListener('click', () => S.build.clear());
  hideCard();
  $('bpal').querySelectorAll('[data-tipkey]').forEach(b => { b.onpointerenter = b.onfocus = () => showCard(b); b.onpointerleave = b.onblur = hideCard; });
  const box = $('bprops');
  if (forces){
    const b = fbdBody();
    box.innerHTML = `<span class="small muted">${tool.startsWith('f:') ? `<b>${FKINDS[tool.slice(2)].label}</b>: drag out from a body.` : tool === 'com' ? '<b>Centre of mass</b>: click inside a body.' : tool === 'axis' ? '<b>Axis</b>: click a point on the beam; torques are measured about it.' : tool === 'erase' ? '<b>Eraser</b>: click an arrow.' : isExt(b) ? 'Drag out from the point where a force acts.' : 'Drag out from a body to draw a force.'} Drag an arrow’s <b>tip</b> to turn it: it clicks onto the named directions. Click an arrow to change it.${b && !isExt(b) ? ` Forces act at ⊕ on <b>${bodyName(b) === b.kind ? S.build.KINDS[b.kind].label.toLowerCase() : bodyName(b)}</b>.` : ''}</span>`;
    return;
  }
  const wheel = S.pointView && S.build.shapes.find(x => x.id === S.pointView), panel = wheel && hook('points') ? pointPanelHTML(wheel) : '';
  if (panel){ box.innerHTML = panel; $('ptAdd').onclick = () => addPointEqs(wheel); return; }
  const s = S.build.selected();
  const idle = { vel: 'Drag out from a body to draw its <b>velocity</b>.', acc: 'Drag out from a body to draw its <b>acceleration</b>.', pen: '<b>Pen</b>: sketch a line (ramp or surface), a closed loop (ball or wheel), a box (block), or an arrow out of a body. It snaps to the standard drawing; the <b>Diagrams</b> drawer shows them all.',
    omega: 'Click a wheel or ball to show which way it <b>spins</b> (ω); click again to turn it.', alpha: 'Click a wheel or ball to show which way its spin <b>changes</b> (α); click again to turn it.' };
  if (!s){ box.innerHTML = `<span class="small muted">${idle[tool] || 'Pick a shape from the toolbar, or sketch it with the pen. Bodies land on the newest surface. Click a shape for its handles; click a label to name it.'}</span>`; return; }
  const massOpts = ['m', 'm1', 'm2', 'mA', 'mB'].map(id => `<option value="${id}" ${s.props.mass === id ? 'selected' : ''}>${VARS[id].plain}</option>`).join('');
  let html = `<b>${S.build.KINDS[s.kind].label}</b>`;
  if ('mass' in s.props) html += `<label>mass <select data-bprop="mass">${massOpts}</select></label>`;
  if ('angle' in s.props) html += `<span>angle ${VARS.inc.plain}: ${Math.round(S.build.theta)}° in the picture · drag ● to tilt, ■ to stretch</span>`;
  if ('friction' in s.props) html += `<label><input type="checkbox" data-bprop="friction" ${s.props.friction ? 'checked' : ''}> rough surface (friction)</label>`;
  const c = S.build.contacts().find(x => x.bodyId === s.id);
  if (c) html += `<span class="small muted">touches the ${c.surface}</span>`;
  html += `<button id="bRemove">Remove</button>`;
  box.innerHTML = html;
  box.querySelectorAll('[data-bprop]').forEach(i => i.onchange = () => S.build.setProp(i.dataset.bprop, i.type === 'checkbox' ? i.checked : i.value));
  $('bRemove').onclick = () => S.build.remove();
}

// ---------- free-body diagram builder ----------
// Directions are named, so every component stays symbolic. Unit vectors are written in the body's frame:
// slope: (along the slope, + up; perpendicular, + out of the surface) · flat: (+ toward the pulley, + up) · hanging: (+ down)
const DIRS = {
  slope: { down: ['−sin {inc}', '−cos {inc}', 'straight down'], up: ['sin {inc}', 'cos {inc}', 'straight up'],
    'perp-out': ['0', '1', 'perpendicular, out of the surface'], 'perp-in': ['0', '−1', 'perpendicular, into the surface'],
    'up-slope': ['1', '0', 'along the slope, up'], 'down-slope': ['−1', '0', 'along the slope, down'],
    'horiz-in': ['cos {inc}', '−sin {inc}', 'horizontal, toward the slope'], 'horiz-out': ['−cos {inc}', 'sin {inc}', 'horizontal, away from the slope'] },
  flat: { down: ['0', '−1', 'straight down'], up: ['0', '1', 'straight up'], 'perp-out': ['0', '1', 'perpendicular, out of the surface'], 'perp-in': ['0', '−1', 'perpendicular, into the surface'],
    forward: ['1', '0', 'horizontal, forward (+)'], backward: ['−1', '0', 'horizontal, backward'] },
  hanging: { down: ['1', '0', 'straight down'], up: ['−1', '0', 'straight up'] },
  free: { down: ['0', '−1', 'straight down'], up: ['0', '1', 'straight up'] },
};
const FKINDS = {
  gravity: { label: 'Gravity', dir: () => 'down' },
  normal: { label: 'Normal', vars: ['N', 'N1', 'NA', 'NB'], dir: () => 'perp-out' },
  contact: { label: 'Contact (other block)', vars: ['P'], dir: (fr, b) => S.build.touching().some(t => t.left === b.id) ? 'backward' : 'forward' },
  friction: { label: 'Friction', vars: ['f', 'fA', 'fB'], dir: (fr) => fr === 'slope' ? ((S.cond.up ? 'down-slope' : 'up-slope')) : 'backward' },
  push: { label: 'Push / pull', vars: ['Fp'], dir: (fr) => fr === 'slope' ? 'horiz-in' : fr === 'flat' ? 'forward' : 'up' },
  tension: { label: 'Tension', vars: ['Tn'], dir: (fr) => fr === 'slope' ? 'up-slope' : fr === 'flat' ? 'forward' : 'up' },
};
S.fbd = { body: null, forces: {} };
// in torque equilibrium a hung block is a load on the beam (its weight acts at the hook), not a body of its own
const fbdBodies = () => S.build.bodies().filter(b => !(hook('extended') && !S.cond.dyn && b.kind === 'block'));
const fbdBody = () => { const bs = fbdBodies(); return bs.find(b => b.id === S.fbd.body) || bs[0] || null; };
const forcesOf = (b) => (S.fbd.forces[b.id] = S.fbd.forces[b.id] || []);
const massOf = (b) => b.mass || 'm';
const bodyName = (b) => b.mass === 'mA' ? 'block A' : b.mass === 'mB' ? 'block B' : b.frame === 'beam' ? 'beam' : b.frame === 'disc' ? 'disc' : b.kind;
// a weight: gravity on the body (its own mass) or a mass hung from a beam (m), both mg straight down
const isWeight = (f) => f.kind === 'gravity' || f.kind === 'hung';
const weightMass = (b, f) => f.kind === 'hung' ? 'm' : massOf(b);
// the symbol a new force gets: the one named for this body (N_A on block A), else the unit's first
const defaultVar = (d, b) => { if (!d.vars) return null; const sfx = (massOf(b).match(/[AB12]$/) || [''])[0]; const own = d.vars.find(id => sfx && id.endsWith(sfx) && chVars().includes(id)); return own || d.vars.find(id => chVars().includes(id)) || d.vars[0]; };
function fMag(b, f){ return isWeight(f) ? `{${weightMass(b, f)}}{g}` : `{${f.var}}`; }
// a force's components (s, n) as rationals in symbols, in the body's frame and with the student's axis choice
function components(b, f){
  const d = dirOf(b, f); if (!d) return null;
  const flip = b.frame === 'slope' && !S.cond.upAxis ? -1 : 1;
  const comp = (u, sg) => u === '0' ? null : `${sg < 0 ? '−' : ''}(${fMag(b, f)})(${u})`;
  const ids = (str) => [...str.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const s = comp(d[0], flip), n = b.frame === 'hanging' ? null : comp(d[1], 1);
  const rat = (t) => t ? X.toRat(X.parse(t), symEnv(ids(t))) : X.number(0);
  return { s, n, sR: rat(s), nR: rat(n), name: d[2] };
}
const ratTxt = (r) => X.toText(r, S.printOpts), ratHTML = (r) => X.toHTML(r, S.printOpts);
// labels: HTML (with subscripts) for the page, and SVG tspans for the drawing
const weightRat = (b, f) => X.toRat(X.parse(`{${weightMass(b, f)}}{g}`), symEnv([weightMass(b, f), 'g']));
const fLabelHTML = (b, f) => isWeight(f) ? `${f.kind === 'hung' ? '' : 'W = '}${ratHTML(weightRat(b, f))}` : VARS[f.var].sym;
const fLabel = (b, f) => isWeight(f) ? `${f.kind === 'hung' ? '' : 'W = '}${ratTxt(weightRat(b, f))}` : VARS[f.var].plain;
function fbdCheck(b){
  const fs = forcesOf(b), bad = [], what = bodyName(b);
  const grav = fs.filter(f => f.kind === 'gravity');
  if (!grav.length) bad.push(`Every body needs gravity: W = ${VARS[massOf(b)].plain}g, straight down.`);
  else if (grav.some(f => f.dir !== 'down')) bad.push('Gravity always points straight down.');
  const touches = S.build.contacts().filter(c => c.bodyId === b.id);
  const normals = fs.filter(f => f.kind === 'normal');
  for (const c of touches) if (!normals.length) bad.push(`The ${what} touches the ${c.surface}, so the ${c.surface} pushes on it: add a normal force, perpendicular to the surface and out of it.`);
  if (normals.some(f => f.dir !== 'perp-out')) bad.push('A normal force points perpendicular to the surface, out of it: surfaces push, they never pull.');
  if (normals.length && !touches.length) bad.push(`Nothing touches the ${what} here, so there’s no normal force.`);
  const fr = fs.filter(f => f.kind === 'friction');
  if (fr.length && !S.cond.friction) bad.push('There’s friction on the diagram, but your conditions say the surface is frictionless.');
  if (!fr.length && S.cond.friction && touches.length) bad.push(`The surface has friction and the ${what} slides: add kinetic friction along the surface, against the motion.`);
  if (fr.some(f => !/slope|forward|backward/.test(f.dir))) bad.push('Kinetic friction acts along the surface, against the motion.');
  // touching blocks push on each other: a contact force on each, a Newton's third-law pair
  for (const t of S.build.touching().filter(t => t.left === b.id || t.right === b.id)){
    const other = fbdBodies().find(o => o.id === (t.left === b.id ? t.right : t.left)), mine = fs.filter(f => f.kind === 'contact');
    if (!mine.length){ bad.push(`${what[0].toUpperCase() + what.slice(1)} touches ${bodyName(other)}, so they push on each other: add the contact force from ${bodyName(other)}.`); continue; }
    const want = t.left === b.id ? 'backward' : 'forward';
    if (mine[0].dir !== want) bad.push(`${bodyName(other)} is ${t.left === b.id ? 'in front of' : 'behind'} ${what}, so its push on ${what} points ${want}.`);
    const theirs = forcesOf(other).filter(f => f.kind === 'contact');
    if (theirs.length && (theirs[0].var !== mine[0].var || theirs[0].dir === mine[0].dir)) bad.push(`Newton’s third law: the contact forces on ${bodyName(b)} and ${bodyName(other)} are one pair, so they need the same symbol and opposite directions.`);
  }
  if (fs.some(f => f.kind === 'contact') && !S.build.touching().some(t => t.left === b.id || t.right === b.id)) bad.push(`Nothing presses against ${what}, so there’s no contact force on it.`);
  // third-law pairs along a string: the same string pulls both ends with the same T
  for (const st of S.build.strings()){
    if (!st.ends.includes(b.id)) continue;
    const ts = fs.filter(f => f.kind === 'tension');
    if (!ts.length) bad.push(`A string is tied to the ${what}: add the tension it pulls with.`);
    for (const other of fbdBodies().filter(o => o.id !== b.id && st.ends.includes(o.id))){
      const to = forcesOf(other).filter(f => f.kind === 'tension');
      if (ts.length && to.length && ts[0].var !== to[0].var) bad.push('One string pulls both blocks with the same tension: use the same symbol on both ends.');
    }
  }
  return bad;
}
function fbdEquations(b){
  const fs = forcesOf(b).map(f => ({ f, c: components(b, f) })).filter(x => x.c);
  const side = (key, rkey) => {
    const parts = fs.filter(x => x.c[key]).map(x => x.c[rkey]);
    const sgn = (r) => (r.n.length === 1 && !r.d.length ? r.n[0].c < 0 : false);
    const ordered = [...parts.filter(r => !sgn(r)), ...parts.filter(sgn)];
    const txt = (fmtr) => ordered.map((r, i) => { const neg = sgn(r), m = neg ? X.scale(r, -1) : r; return (i ? (neg ? ' − ' : ' + ') : (neg ? '−' : '')) + fmtr(m); }).join('') || '0';
    return { text: txt(ratTxt), html: txt(ratHTML), terms: fs.filter(x => x.c[key]).map(x => x.c[key]) };
  };
  const out = [], mass = massOf(b), multi = fbdBodies().length > 1, tag = multi ? ` (${bodyName(b) === b.kind ? VARS[mass].plain.replace('_', '') : bodyName(b)})` : '';
  const along = side('s', 'sR');
  const axis = b.frame === 'slope' ? (S.cond.upAxis ? 'along the slope, + up' : 'along the slope, + down') : b.frame === 'flat' ? `horizontal, + ${hook('flatPlus')}` : b.frame === 'hanging' ? 'vertical, + down' : 'vertical, + up';
  if (b.frame !== 'free'){
    const z = `${along.terms.map(t => `(${t})`).join(' + ') || '0'} − {${mass}}{a}`;
    const ma = X.toRat(X.parse(`{${mass}}{a}`), symEnv([mass, 'a']));
    out.push({ label: `ΣF∥${tag}`, zsub: z, lhs: along, rhs: { text: ratTxt(ma), html: ratHTML(ma) }, condition: `Newton’s second law ${axis}` });
  }
  if (b.frame === 'slope' || b.frame === 'flat'){
    const perp = side('n', 'nR');
    out.push({ label: `ΣF⊥${tag}`, zsub: `${perp.terms.map(t => `(${t})`).join(' + ') || '0'}`, lhs: perp, rhs: { text: '0', html: '0' }, condition: 'perpendicular to the surface: it stays on it, so no acceleration that way' });
  }
  return out;
}
function renderFBD(){
  const box = $('fbd'), b = fbdBody();
  if (isExt(b)) return renderExtFBD(b, box);
  if (!b){ box.innerHTML = `<p class="small">Build the setup first in the <b>Build</b> tab (or load a template there). Then draw the forces on each body here.</p>`; return; }
  const bs = fbdBodies(), fs = forcesOf(b), fr = DIRS[b.frame] || DIRS.free;
  const varOpts = (f) => FKINDS[f.kind].vars ? FKINDS[f.kind].vars.filter(id => chVars().includes(id) || id === f.var).map(id => `<option value="${id}" ${f.var === id ? 'selected' : ''}>${VARS[id].plain}: ${nm(id)}</option>`).join('') : '';
  const rows = fs.map((f, i) => `<div class="frow"><b>${FKINDS[f.kind].label}</b>
      ${f.kind === 'gravity' ? `<span>${fLabelHTML(b, f)}</span>` : `<select data-fvar="${i}">${varOpts(f)}</select>`}
      <select data-fdir="${i}">${Object.entries(fr).map(([k, d]) => `<option value="${k}" ${f.dir === k ? 'selected' : ''}>${d[2]}</option>`).join('')}${f.dir === 'custom' ? `<option value="custom" selected>${dirOf(b, f)[2]}</option>` : ''}</select>
      <button data-fdel="${i}" title="Remove">×</button></div>`).join('');
  let table = '';
  const comps = fs.map(f => ({ f, c: components(b, f) })).filter(x => x.c);
  if (comps.length) table = `<table class="ftable" id="fbdTable"><tr><th>force</th><th>size</th><th>∥ component</th><th>⊥ component</th></tr>${comps.map(({ f, c }) =>
    `<tr><td>${fLabelHTML(b, f)}</td><td>${ratHTML(X.toRat(X.parse(fMag(b, f)), symEnv([...fMag(b, f).matchAll(/\{(\w+)\}/g)].map(m => m[1]))))}</td><td>${c.s ? ratHTML(c.sR) : '0'}</td><td>${b.frame === 'hanging' ? '–' : c.n ? ratHTML(c.nR) : '0'}</td></tr>`).join('')}</table>`;
  const axis = b.frame === 'slope' ? `Axes: ∥ along the slope, + ${S.cond.upAxis ? 'up' : 'down'} the slope (your choice in Conditions); ⊥ perpendicular, + out of the surface.` : b.frame === 'flat' ? `Axes: ∥ horizontal, + ${hook('flatPlus')}; ⊥ vertical, + up.` : b.frame === 'hanging' ? 'Axis: vertical, + down (the way it moves when m₂ falls).' : 'Axis: vertical, + up.';
  box.innerHTML = `${bs.length > 1 ? `<div class="frow"><b>Body:</b> <select id="fbdBody">${bs.map(x => `<option value="${x.id}" ${x.id === b.id ? 'selected' : ''}>${bodyName(x) === x.kind ? S.build.KINDS[x.kind].label : bodyName(x)} (${VARS[massOf(x)].plain})${x.hanging ? ', hanging' : ''}</option>`).join('')}</select></div>` : ''}
    <div class="small">${axis} Draw forces with the toolbar beside the canvas (drag a tip to turn one), or add them here.</div>
    <div class="fadd"><span class="small"><b>Add a force:</b></span>${Object.entries(FKINDS).map(([k, d]) => `<button data-addforce="${k}">${d.label}</button>`).join('')}</div>
    ${rows || '<div class="small muted">No forces yet. Which things touch or pull on this body?</div>'}
    ${table}
    <div class="frow"><button id="fbdCheck">Check my diagram</button><button class="go" id="fbdWrite">Write ΣF = ma onto my sheet</button></div>
    <div id="fbdMsg"></div>`;
  $('fbdBody')?.addEventListener('change', (e) => { S.fbd.body = e.target.value; renderFBD(); });
  box.querySelectorAll('[data-addforce]').forEach(btn => btn.onclick = () => {
    const k = btn.dataset.addforce, d = FKINDS[k];
    const v = defaultVar(d, b), dir = d.dir(b.frame, b);
    S.build.checkpoint(); forcesOf(b).push({ kind: k, var: v, dir: dir in fr ? dir : Object.keys(fr)[0] }); afterForces();
  });
  box.querySelectorAll('[data-fvar]').forEach(sel => sel.onchange = () => { fs[+sel.dataset.fvar].var = sel.value; afterForces(); });
  box.querySelectorAll('[data-fdir]').forEach(sel => sel.onchange = () => { S.build.checkpoint(); const f = fs[+sel.dataset.fdir]; f.dir = sel.value; if (sel.value !== 'custom') delete f.ang; afterForces(); });
  box.querySelectorAll('[data-fdel]').forEach(btn => btn.onclick = () => { S.build.checkpoint(); fs.splice(+btn.dataset.fdel, 1); afterForces(); });
  const msg = (html, ok) => { $('fbdMsg').className = 'fmsg ' + (ok ? 'ok' : 'bad'); $('fbdMsg').innerHTML = html; };
  $('fbdCheck').onclick = () => { const bad = problems(b); msg(bad.length ? bad.map(x => '✗ ' + x).join('<br>') : '✓ This free-body diagram looks right: every force has a source, and each one points the way it must.', !bad.length); };
  $('fbdWrite').onclick = async () => {
    const bad = problems(b);
    if (bad.length){ msg('Fix the diagram first:<br>' + bad.map(x => '✗ ' + x).join('<br>'), false); return; }
    const eqs = diagramOf(b).equations({ body: b });
    try { for (const q of eqs){ const d = X.dimOf(X.parse(q.zsub), DIMS); q.unitText = X.dimStr(d); } }
    catch (e){ if (!(e instanceof X.MathError)) throw e; msg(`✗ The units don’t add up: ${e.message}. Is every arrow a force?`, false); return; }
    if (!await beforeClearing('Rewriting ΣF = ma')) return;
    dropGenerated(g => g.key === 'fbd:' + b.id);
    const ids = eqs.map(q => addGenerated({ ...q, vars: [...new Set([...q.zsub.matchAll(/\{(\w+)\}/g)].map(m => m[1]))], key: 'fbd:' + b.id, meaning: 'Written from your free-body diagram.' }));
    clearDerived(); renderAll(false);
    msg(`✓ Wrote ${ids.map(id => `<b>${EQS[id].label}</b>`).join(' and ')} onto your sheet.`, true);
    say(`Your free-body diagram gave ${ids.length} equation${ids.length > 1 ? 's' : ''}: ${ids.map(id => EQS[id].form).join(' and ')}. They’re on your sheet. ${fbdBodies().length > 1 ? 'Draw the next body, or go' : 'Go'} on to <b>3 · Conditions</b>.`);
  };
}

// ---------- extended free-body diagrams: a beam or a disc (Phase 5, torque.js has the math) ----------
// Forces start where they act. A beam's points are distances from the end the student picks (S.fbd.from); each beam
// has a tilt and an axis for Στ (S.fbd.opts). The axis starts at the pivot, with a question about why that is a good choice.
const isExt = (b) => !!b && (b.frame === 'beam' || b.frame === 'disc');
const fromMap = () => (S.fbd.from = S.fbd.from || {});
const extOpts = (b) => { S.fbd.opts = S.fbd.opts || {}; return (S.fbd.opts[b.id] = S.fbd.opts[b.id] || { tilt: 'level', axis: null, why: null }); };
const axisKey = (b) => b.frame === 'disc' ? 'centre' : extOpts(b).axis || (b.pivot ? 'pivot' : 'left');
const numAngle = (id) => known(id) ? Math.abs(val(id)) : sampleOf(id);
const shapeOf = (b) => S.build.shapes.find(x => x.id === b.id);
const extKinds = (b) => Object.fromEntries(Object.entries(TQ.KINDS).filter(([, d]) => !d.beamOnly || b.frame === 'beam'));
const pinnedEnd = (b) => b.pinAt === 'left' || b.pinAt === 'right' ? b.pinAt : null;
// the string tied to this body, and where its other end is (a hung block below, to the left or right)
function stringOn(b){
  const sh = shapeOf(b);
  for (const st of S.build.strings()){
    const i = st.ends.indexOf(b.id); if (i < 0) continue;
    const other = S.build.shapes.find(x => x.id === st.ends[i ? i - 1 : i + 1]); if (!other) continue;
    return { other, left: other.x < sh.x, below: other.y > sh.y };
  }
  return null;
}
const extSetting = (b) => { const st = stringOn(b); return { pinned: !!b.pivot, hungBlock: !!(st && st.other.kind === 'block' && st.other.hanging), stringTo: st }; };
function addExtForce(b, k, where = {}){
  const d = TQ.KINDS[k], fs = forcesOf(b), fr = fromMap();
  if (k === 'hinge'){
    const at = b.frame === 'disc' ? 'centre' : 'pivot';
    if (at === 'pivot' && b.pinAt === 'point' && !fr.dP) fr.dP = (shapeOf(b).pinU ?? 0) > 0.5 ? 'right' : 'left';
    fs.push({ kind: 'hinge', var: 'Hx', dir: 'right', at }, { kind: 'hinge', var: 'Hy', dir: 'up', at });
    return;
  }
  let at = d.at, dir = where.dir && TQ.DIRS[b.frame][where.dir] ? where.dir : d.dir;
  if (b.frame === 'disc'){
    const st = stringOn(b);
    at = k === 'tension' || k === 'push' ? (st && !st.left ? 'rim-right' : 'rim-left') : 'centre';
    if (k === 'tension' && !where.dir && st) dir = st.below ? 'down' : 'up';
  }
  const f = { kind: k, var: d.vars ? d.vars[0] : null, dir, at };
  if (b.frame === 'beam' && TQ.POINT_VARS.includes(at)){
    if (where.u !== undefined && where.u !== null) f.u = where.u;
    if (!fr[at]) fr[at] = f.u !== undefined ? (f.u > 0.5 ? 'right' : 'left') : pinnedEnd(b) || 'left';
  }
  fs.push(f);
}
// where a point is along the beam (0 = left end, 1 = right end): to scale once L and its distance are numbers
function pointU(b, at, f = null){
  const sh = shapeOf(b), fr = fromMap();
  if (at === 'centre') return 0.5;
  if (at === 'left') return 0;
  if (at === 'right') return 1;
  if (at === 'pivot') return sh.pinU ?? 0;
  const num = (id) => known(id) && !isSymbolic(id) ? Math.abs(val(id)) : null, L = num('L'), d = num(at);
  if (L && d !== null) return Math.min(1, Math.max(0, fr[at] === 'right' ? 1 - d / L : d / L));
  if (f && f.u !== undefined) return f.u;
  const st = stringOn(b);
  if (at === 'dm' && st && st.other.kind === 'block') return Math.min(1, Math.max(0, (st.other.x - (sh.x - sh.w / 2)) / sh.w));
  return { dm: 0.85, dT: 0.75, dF: 0.6 }[at] ?? 0.5;
}
// what the canvas needs to draw a beam's or disc's force where it acts
function extDraw(b, f){
  const at = TQ.atOf(f);
  if (b.frame === 'disc'){ const r = TQ.RIM[at]; return r ? { off: { x: r[0], y: -r[1] } } : {}; }
  const named = TQ.POINT_VARS.includes(at) ? at : at === 'pivot' && b.pinAt === 'point' ? 'dP' : null;
  return { u: pointU(b, at, f), ptLabel: named ? plain(named) : '' };
}
// the points an axis can sit at: the pivot, the ends, the centre and every named point a force acts at
function axisOptions(b){
  const keys = [...(b.pivot ? ['pivot'] : []), 'left', 'right', 'centre'];
  for (const f of forcesOf(b)){ const at = TQ.atOf(f); if (TQ.POINT_VARS.includes(at) && !keys.includes(at)) keys.push(at); }
  return keys;
}
const axisName = (b, k) => k === 'pivot' ? 'the pivot' : TQ.placeName(k, b, fromMap(), plain);
const radiusOf = (b) => shapeOf(b)?.props.radius || 'R';
const extCtx = (b) => ({ tilt: extOpts(b).tilt, axis: axisKey(b), axisName: axisName(b, axisKey(b)), from: fromMap(), dyn: !!S.cond.dyn, radius: radiusOf(b) });
// Diagrams (plan section 5): each kind of drawing writes its equations and checks itself, given state = { body }.
// equations → [{ label, zsub, lhs, rhs, condition }] (generated equations); check → [{ ok, text }] for what is wrong.
// Later diagrams (energy bars, PV diagram, circuit loop) plug in here.
const DIAGRAMS = [
  { kind: 'extended', pack: 'mech', fits: isExt, // a beam or disc: forces where they act, and torques
    equations: ({ body }) => TQ.equations(body, forcesOf(body), extCtx(body)),
    check: ({ body }) => TQ.check(body, forcesOf(body), extSetting(body), plain).map(text => ({ ok: false, text })) },
  { kind: 'fbd', pack: 'mech', fits: () => true,
    equations: ({ body }) => fbdEquations(body),
    check: ({ body }) => fbdCheck(body).map(text => ({ ok: false, text })) },
];
const diagramOf = (b) => DIAGRAMS.find(d => d.fits(b));
const problems = (b) => diagramOf(b).check({ body: b }).filter(r => !r.ok).map(r => r.text);
const tplRat = (t) => X.toRat(X.parse(t), symEnv([...new Set([...t.matchAll(/\{(\w+)\}/g)].map(m => m[1]))]));
function setAxisAt(bodyId, u){
  const b = fbdBodies().find(x => x.id === bodyId); if (!isExt(b)) return;
  if (b.frame === 'disc'){ say('A disc on an axle turns about the axle, so its torques are taken about the centre.'); return; }
  const best = axisOptions(b).map(k => ({ k, d: Math.abs(pointU(b, k) - u) })).sort((p, q) => p.d - q.d)[0];
  extOpts(b).axis = best.k; extOpts(b).why = null; S.fbd.body = b.id; afterForces();
  say(`The axis for Στ is now at <b>${axisName(b, best.k)}</b>. In equilibrium Στ = 0 about every point, so any axis works; one where unknown forces act makes the algebra shortest.`);
}
const WHY = [
  ['The hinge force acts there, so it has no lever arm: H_x and H_y drop out of Στ = 0.', true, 'Right: about the pivot the hinge’s lever arm is zero, so Στ = 0 has fewer unknowns and you can solve it first.'],
  ['Στ = 0 only holds about the pivot.', false, 'Not quite: in equilibrium Στ = 0 about every point. The pivot is just the most convenient one, because the unknown hinge force acts there.'],
  ['The torques are biggest about the pivot.', false, 'No: the torques change with the axis, but that doesn’t make one axis better. The pivot is good because the unknown hinge force has no lever arm there.'],
];
function renderExtFBD(b, box){
  const bs = fbdBodies(), fs = forcesOf(b), o = extOpts(b), fr = fromMap(), beam = b.frame === 'beam', ctx = extCtx(b), dirs = TQ.DIRS[b.frame];
  if (beam) S.build.setTilt(b.id, TQ.TILT[o.tilt] * numAngle('beta'));
  const fromBtns = (id) => `<span class="seg">from the <button data-ffrom="${id}" data-side="left" aria-pressed="${(fr[id] || 'left') === 'left'}">left end</button><button data-ffrom="${id}" data-side="right" aria-pressed="${fr[id] === 'right'}">right end</button></span>`;
  const rows = fs.map((f, i) => {
    const at = TQ.atOf(f), pt = beam && TQ.POINT_VARS.includes(at);
    return `<div class="frow"><b>${TQ.KINDS[f.kind].label.replace(/ \(.*/, '')}</b><span>${fLabelHTML(b, f)}</span>
      <select data-fdir="${i}">${Object.entries(dirs).map(([k, d]) => `<option value="${k}" ${f.dir === k ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
      <span class="small">at ${pt ? VARS[at].sym : esc(TQ.placeName(at, b, fr, plain))}</span>${pt ? fromBtns(at) : ''}<button data-fdel="${i}" title="Remove">×</button></div>`;
  }).join('');
  const pivotRow = beam && b.pinAt === 'point' ? `<div class="frow small">Pivot at ${VARS.dP.sym} ${fromBtns('dP')}</div>` : '';
  const hasHinge = fs.some(f => f.kind === 'hinge'), ak = axisKey(b);
  const axisRow = beam
    ? `<div class="frow"><b>Axis for Στ:</b> <select id="fbdAxis">${axisOptions(b).map(k => `<option value="${k}" ${k === ak ? 'selected' : ''}>${esc(axisName(b, k))}</option>`).join('')}</select><span class="small muted">or click the beam with the axis tool</span></div>
      ${ak === 'pivot' && hasHinge ? `<div class="why"><b>Why is the pivot a good axis?</b>${WHY.map(([w], i) => `<button data-why="${i}" aria-pressed="${o.why === i}">${w}</button>`).join('')}<div id="whyMsg" class="fmsg ${o.why === null ? '' : WHY[o.why][1] ? 'ok' : 'bad'}">${o.why === null ? '' : WHY[o.why][2]}</div></div>` : ''}`
    : `<div class="small">Axis for Στ: <b>the axle</b> (the disc’s centre). The weight and the axle force act there, so they have no lever arm.</div>`;
  // torque cards: which force, where it acts, its lever arm, sin φ, its torque and its sign
  const nv = { ...samplesNow(), ...vals() };
  const trows = fs.map(f => ({ f, p: TQ.parts(b, f, ctx) })).filter(x => x.p).map(({ f, p }) => {
    const tau = p.tau === null ? null : tplRat(p.tau), t = tau ? X.evalRat(tau, nv) : 0;
    const sign = !tau || Math.abs(t) < 1e-12 ? '<span title="no lever arm or no perpendicular part">— 0</span>' : t > 0 ? '<span title="counterclockwise">↺ +</span>' : '<span title="clockwise">↻ −</span>';
    return `<tr><td>${fLabelHTML(b, f)}</td><td>${p.r === '0' ? '0' : ratHTML(tplRat(p.r))}</td><td>${p.sin === '0' ? '0' : ratHTML(tplRat(p.sin))}</td><td>${tau ? ratHTML(tau) : '0'}</td><td>${sign}</td></tr>`;
  }).join('');
  const table = trows ? `<div class="small muted">Torque cards: r runs from the axis to where each force acts${beam ? ' (along the beam, + toward the right end)' : ''}; φ is the angle between r and F.</div><table class="ftable" id="torqueTable"><tr><th>force</th><th>r</th><th>sin φ</th><th>τ = rF sin φ</th><th>sign</th></tr>${trows}</table>` : '';
  box.innerHTML = `${bs.length > 1 ? `<div class="frow"><b>Body:</b> <select id="fbdBody">${bs.map(x => `<option value="${x.id}" ${x.id === b.id ? 'selected' : ''}>${bodyName(x)} (${VARS[massOf(x)].plain})${x.hanging ? ', hanging' : ''}</option>`).join('')}</select></div>` : ''}
    <div class="small">Forces: x toward the ${beam ? 'beam’s right end' : 'right'}, y up. Torques: + counterclockwise. Each force starts where it acts${beam ? ': drag out from that point on the beam' : ''}.</div>
    ${beam ? `<div class="frow"><b>The beam is</b>${[['level', 'level'], ['down', 'tilted: right end lower by β'], ['up', 'tilted: right end higher by β']].map(([k, w]) => `<button data-tilt="${k}" aria-pressed="${o.tilt === k}">${w}</button>`).join('')}</div>` : ''}
    <div class="fadd"><span class="small"><b>Add a force:</b></span>${Object.entries(extKinds(b)).map(([k, d]) => `<button data-addforce="${k}">${d.label}</button>`).join('')}</div>
    ${rows || '<div class="small muted">No forces yet. What pulls or pushes on it, and where?</div>'}${pivotRow}
    ${axisRow}${table}
    <div class="frow"><button id="fbdCheck">Check my diagram</button><button class="go" id="fbdWrite">${S.cond.dyn ? 'Write Στ = Iα onto my sheet' : 'Write ΣF = 0 and Στ = 0 onto my sheet'}</button></div>
    <div id="fbdMsg"></div>`;
  $('fbdBody')?.addEventListener('change', (e) => { S.fbd.body = e.target.value; renderFBD(); renderBuildUI(); });
  box.querySelectorAll('[data-addforce]').forEach(btn => btn.onclick = () => { S.build.checkpoint(); addExtForce(b, btn.dataset.addforce); afterForces(); });
  box.querySelectorAll('[data-fdir]').forEach(sel => sel.onchange = () => { S.build.checkpoint(); fs[+sel.dataset.fdir].dir = sel.value; afterForces(); });
  box.querySelectorAll('[data-fdel]').forEach(btn => btn.onclick = () => { S.build.checkpoint(); const f = fs[+btn.dataset.fdel]; S.fbd.forces[b.id] = fs.filter(x => x !== f && !(f.kind === 'hinge' && x.kind === 'hinge')); afterForces(); });
  box.querySelectorAll('[data-ffrom]').forEach(btn => btn.onclick = () => { fr[btn.dataset.ffrom] = btn.dataset.side; afterForces(); });
  box.querySelectorAll('[data-tilt]').forEach(btn => btn.onclick = () => { o.tilt = btn.dataset.tilt; afterForces(); });
  box.querySelectorAll('[data-why]').forEach(btn => btn.onclick = () => { o.why = +btn.dataset.why; renderFBD(); });
  $('fbdAxis')?.addEventListener('change', (e) => { o.axis = e.target.value; o.why = null; afterForces(); });
  const msg = (html, ok) => { $('fbdMsg').className = 'fmsg ' + (ok ? 'ok' : 'bad'); $('fbdMsg').innerHTML = html; };
  $('fbdCheck').onclick = () => { const bad = problems(b); msg(bad.length ? bad.map(x => '✗ ' + x).join('<br>') : `✓ This diagram looks right: every force has a source and starts where it acts.`, !bad.length); };
  $('fbdWrite').onclick = async () => {
    const bad = problems(b);
    if (bad.length){ msg('Fix the diagram first:<br>' + bad.map(x => '✗ ' + x).join('<br>'), false); return; }
    const eqs = diagramOf(b).equations({ body: b });
    try { for (const q of eqs) q.unitText = q.torque ? 'N·m' : X.dimStr(X.dimOf(X.parse(q.zsub), DIMS)); }
    catch (e){ if (!(e instanceof X.MathError)) throw e; msg(`✗ The units don’t add up: ${e.message}.`, false); return; }
    if (!await beforeClearing('Rewriting the diagram’s equations')) return;
    dropGenerated(g => g.key === 'fbd:' + b.id);
    const side = (t) => { const r = tplRat(t); return { text: ratTxt(r), html: ratHTML(r) }; };
    const ids = eqs.map(q => addGenerated({ label: q.label, zsub: q.zsub, lhs: side(q.lhs), rhs: side(q.rhs), condition: q.condition, unitText: q.unitText,
      vars: [...new Set([...q.zsub.matchAll(/\{(\w+)\}/g)].map(m => m[1]))], key: 'fbd:' + b.id, meaning: 'Written from your diagram: every force where it acts.' }));
    clearDerived(); renderAll(false);
    msg(`✓ Wrote ${ids.map(id => `<b>${EQS[id].label}</b>`).join(', ')} onto your sheet.`, true);
    say(`Your diagram gave ${ids.map(id => EQS[id].form).join(' · ')}. ${fbdBodies().length > 1 ? 'Draw the next body, or go' : 'Go'} on to <b>3 · Conditions</b>.`);
  };
}

// ---------- sample-value sliders (symbols only; they move the replay, not the answer) ----------
function renderSliders(){
  const box = $('sliders'), syms = Object.keys(S.givens).filter(isSymGiven);
  if (!syms.length){ box.innerHTML = ''; return; }
  const range = (id) => id === 'inc' ? [5, 80] : [0.2 * SAMPLE[id], 3 * SAMPLE[id]];
  box.innerHTML = `<span class="small"><b>Try values for the symbols</b> (replay only):</span>` + syms.map(id => { const [lo, hi] = range(id); return `<label>${VARS[id].sym} <input type="range" data-slider="${id}" min="${lo}" max="${hi}" step="any" value="${sampleOf(id)}"><span data-sval="${id}">${fmt(sampleOf(id))} ${id === 'inc' ? '°' : unitOf(id)}</span></label>`; }).join('');
  box.querySelectorAll('[data-slider]').forEach(i => i.addEventListener('input', () => {
    const id = i.dataset.slider; S.samples[id] = +i.value;
    box.querySelector(`[data-sval="${id}"]`).textContent = `${fmt(+i.value)} ${id === 'inc' ? '°' : unitOf(id)}`;
    if (id === 'inc') S.build.theta = +i.value;
    if (!S.anim) draw();
  }));
}

// ---------- scenario table: givens that change from case to case ----------
// Each column is a given entered as a symbol; each row is one case. The problem is solved once with symbols,
// then the answer is evaluated row by row, so every case comes from the same derivation.
S.scen = { cols: [], rows: [] };
S.span = newSpan();
function scenValues(r){ // id → SI value for one row (symbols are sizes, so positive)
  const o = {};
  S.scen.cols.forEach((id, c) => { const x = Number(String(S.scen.rows[r][c]).replace(',', '.').replace('−', '-')); if (isFinite(x) && String(S.scen.rows[r][c]).trim() !== '') o[id] = Math.abs(x); });
  return o;
}
const scenReady = () => S.scen.cols.length && S.scen.rows.length && S.scen.rows.every((_, r) => Object.keys(scenValues(r)).length === S.scen.cols.length);
function renderScen(){
  const box = $('scenBox'); if (!box) return;
  if (!S.scen.cols.length){ box.innerHTML = ''; return; }
  const head = S.scen.cols.map(id => `<th>${VARS[id].sym}<small>${VARS[id].unit || 'no unit'}</small></th>`).join('');
  const rows = S.scen.rows.map((row, r) => `<tr><td class="n">${r + 1}</td>${S.scen.cols.map((id, c) => `<td><input data-cell="${r},${c}" inputmode="decimal" value="${esc(row[c])}"></td>`).join('')}<td><button data-scendel="${r}" title="Remove this case">×</button></td></tr>`).join('');
  box.innerHTML = `<div class="subhead">Scenario table</div><table id="scen" class="scen"><tr><th>#</th>${head}<th></th></tr>${rows}</table>
    <div class="row"><button id="scenAdd">+ Add a case</button><span class="small muted">The problem is solved once with symbols, then every row is filled in from that one answer.</span></div>`;
  box.querySelectorAll('[data-cell]').forEach(i => i.addEventListener('change', () => {
    const [r, c] = i.dataset.cell.split(',').map(Number); S.scen.rows[r][c] = i.value.trim();
    if (r === 0){ const v = scenValues(0)[S.scen.cols[c]]; if (v !== undefined) S.samples[S.scen.cols[c]] = v; } // the first case sets the typical values
    renderMatters(); renderTargets();
  }));
  box.querySelectorAll('[data-scendel]').forEach(b => b.onclick = () => { S.scen.rows.splice(+b.dataset.scendel, 1); renderAll(false); });
  $('scenAdd').onclick = () => { S.scen.rows.push(S.scen.cols.map(() => '')); renderScen(); renderTargets(); };
}

// ---------- what matters: which givens the answer depends on, limits, and the scenario results ----------
// Replay the whole path with every nonzero given as a symbol (numbers too), so the answer shows exactly what it depends on.
function replayAll(){
  const env = {};
  for (const [id, g] of Object.entries(S.givens)) env[id] = g.kind === 'symbol' ? X.scale(X.symbol(id), g.dir ? -1 : 1) : g.val === 0 ? X.number(0) : X.scale(X.symbol(id), g.val < 0 ? -1 : 1);
  for (const p of S.path){
    if (p.kind !== 'eq' || p.fn || isFn(p.v)) return null; // functions of time aren't analysed here yet
    const eq = EQS[p.eq], x = p.v, e2 = {};
    for (const w of eq.vars) if (w !== x && w in env) e2[w] = env[w];
    env[x] = eq.generated ? X.solveLinear(X.substRat(eq.Z, e2), x) : X.toRat(p.tree, e2, p.branch);
  }
  return env;
}
const givenIds = () => Object.entries(S.givens).filter(([, g]) => g.kind === 'symbol' || g.val !== 0).map(([id]) => id);
function rankText(id){
  const vals = S.scen.rows.map((_, r) => ({ r: r + 1, x: X.evalRat(S.found[id].expr || X.number(S.found[id].val), scenValues(r)) })).sort((a, b) => b.x - a.x);
  const order = vals.map((v, i) => (i ? (Math.abs(v.x - vals[i - 1].x) < 1e-9 * Math.max(1, Math.abs(v.x)) ? ' = ' : ' > ') : '') + v.r).join('');
  return { order, values: vals.map(v => `${fmt(v.x)} ${unitOf(id)}`).join(', ') };
}
// "Does it move?" At rest, static friction must supply f; it can give at most μs N.
function staticsHTML(){
  const q = chapter().statics; if (!q || !q.when(S.cond) || !known(q.need)) return '';
  const [mu, Nn] = q.most, need = q.need;
  if (!known(Nn)) return `<div class="mt statics"><div class="mhead">Does it move?</div><p>To decide, compare ${VARS[need].sym} with the most static friction can give, ${VARS[mu].sym}${VARS[Nn].sym}: find ${VARS[Nn].sym} too (add it as a target).</p></div>`;
  const numeric = !isSymbolic(need) && !isSymbolic(Nn) && known(mu) && !isSymbolic(mu);
  let out = '<div class="mt statics"><div class="mhead">Does it move?</div>';
  if (numeric){
    const most = val(mu) * val(Nn), f = Math.abs(val(need));
    out += most >= f
      ? `<p class="ok"><b>It stays put.</b> Static friction can give up to ${VARS[mu].sym}${VARS[Nn].sym} = ${fmt(most)} N; holding it needs only ${VARS[need].sym} = ${fmt(f)} N.</p>`
      : `<p class="bad"><b>It moves.</b> Static friction can give at most ${VARS[mu].sym}${VARS[Nn].sym} = ${fmt(most)} N, but holding it would need ${VARS[need].sym} = ${fmt(f)} N.</p>`;
  } else {
    try {
      const R = X.R.add(X.R.mul(X.symbol(mu), exprOf(Nn)), X.R.neg(exprOf(need)));
      const T = X.solveLinear(R, mu), p = X.ratToPolyIn(R, mu), up = X.evalRat(p[1], SAMPLE) > 0;
      out += `<p>It stays put while ${VARS[mu].sym}${VARS[Nn].sym} ≥ ${VARS[need].sym}, that is while <b>${VARS[mu].sym} ${up ? '≥' : '≤'} ${X.toHTML(T, S.printOpts)}</b>.${known(mu) ? '' : ` Give ${VARS[mu].sym} to decide.`}</p>`;
    } catch (e){ if (!(e instanceof X.MathError)) throw e; }
  }
  return out + '</div>';
}
function renderMatters(){
  const box = $('matters'); if (!box) return;
  const st = staticsHTML();
  const done = S.targets.map(t => t.startsWith('rank:') ? t.slice(5) : t).filter((t, i, a) => a.indexOf(t) === i && !isFn(t) && known(t) && S.found[t]);
  if (!done.length){ box.innerHTML = st || '<div class="empty">Once a target is found, this shows which givens it depends on, what happens in the limits, and every scenario.</div>'; return; }
  let env = null; try { env = replayAll(); } catch (e){ if (!(e instanceof X.MathError)) throw e; }
  let html = st;
  for (const id of done){
    html += `<div class="mt"><div class="mhead">${VARS[id].sym} = ${S.found[id].expr && !X.isNumeric(S.found[id].expr) ? X.toHTML(S.found[id].expr, S.printOpts) : `${fmt(val(id))} ${unitOf(id)}`}</div>`;
    const R = env && env[id];
    if (R){
      const uses = X.symbolsOf(R), all = givenIds(), yes = all.filter(g => uses.has(g)), no = all.filter(g => !uses.has(g));
      html += `<p><b>${VARS[id].plain} depends on:</b> ${yes.map(g => VARS[g].sym).join(', ') || 'none of the givens'}</p>`;
      if (no.length) html += `<p class="nomatter"><b>${VARS[id].plain} doesn’t depend on:</b> ${no.map(g => VARS[g].sym).join(', ')} <span class="small muted">(they cancel along the way, or never enter)</span></p>`;
      const lims = [];
      for (const g of yes) for (const to of [0, Infinity]){
        const l = X.limit(R, g, to); if (!l) continue;
        const out = l.value ? X.toHTML(l.value, S.printOpts) : (l.inf > 0 ? '∞' : '−∞');
        lims.push(`<li>${VARS[g].sym} → ${to === 0 ? '0' : '∞'}: ${VARS[id].sym} → ${out}</li>`);
      }
      if (lims.length) html += `<div class="small"><b>Limiting cases</b> (check them against your intuition):</div><ul class="lims">${lims.join('')}</ul>`;
    } else html += '<p class="small muted">The dependence check covers equation steps; this path uses the motion ladder.</p>';
    html += '</div>';
  }
  // scenarios: every row from the one symbolic answer, plus the assumption checks
  if (scenReady()){
    const checks = (chapter().checks || []).filter(c => c.when(S.cond));
    const head = S.scen.cols.map(c => `<th>${VARS[c].sym}</th>`).join('') + done.map(id => `<th>${VARS[id].sym}</th>`).join('') + (checks.length ? '<th>check</th>' : '');
    const rows = S.scen.rows.map((row, r) => {
      const sv = scenValues(r), vAll = { ...Object.fromEntries(Object.keys(S.givens).filter(g => !isSymGiven(g)).map(g => [g, Math.abs(S.givens[g].val)])), ...sv };
      const outs = done.map(id => `<td>${fmt(X.evalRat(S.found[id].expr || X.number(S.found[id].val), sv))} ${unitOf(id)}</td>`).join('');
      let flag = '';
      for (const c of checks){ try { const x = X.evalNum(X.parse(c.sub), vAll); const [k, why] = c.judge(x, vAll); flag = `<td data-flag="${k}" class="flag ${k}" title="${c.what} = ${fmt(x)} N">${k === 'ok' ? '✓ ' + why : '⚠ ' + why}</td>`; } catch (e){ if (!(e instanceof X.MathError)) throw e; } }
      return `<tr><td class="n">${r + 1}</td>${row.map(x => `<td>${x}</td>`).join('')}${outs}${flag}</tr>`;
    }).join('');
    html += `<div class="subhead">Scenarios</div><table class="scen out"><tr><th>#</th>${head}</tr>${rows}</table>`;
    for (const t of S.targets.filter(t => t.startsWith('rank:') && known(t))){ const rk = rankText(t.slice(5)); html += `<p class="rank"><b>Ranking by ${VARS[t.slice(5)].sym}:</b> ${rk.order} (${rk.values})</p>`; }
  }
  box.innerHTML = html;
  paintSyms();
}

// ---------- notebook and board (js/notebook.js, js/board.js) ----------
// the current problem as a notebook record (notebook.js validates it); meta: title, objectives, notes from the save form
const textOf = (html) => { const t = document.createElement('template'); t.innerHTML = html; return t.content.textContent.trim(); };
const qtyOf = (id) => typeof id === 'string' ? id.replace(/^(fn|rank):/, '') : '';
function capture(meta){
  const used = [...S.path.filter(p => p.kind === 'eq').map(p => p.eq), ...S.sheet];
  return {
    v: 1, title: meta.title, objectives: meta.objectives || [], notes: meta.notes || '', chapter: S.ch, text: $('problem').value,
    parts: S.targets.map((t, i) => ({ label: 'abcdefgh'[i], target: t })),
    givens: Object.fromEntries(Object.entries(S.givens).filter(([, g]) => g.from === 'you' || g.from === 'drawing')),
    conds: { ...S.cond }, condOk: S.condOk,
    drawing: S.build.shapes.length ? { ...S.build.save(), setup: DF.save() } : null,
    board: S.board && S.board.cards.length ? S.board : null,
    steps: S.path.map(p => ({ title: p.title, eq: p.kind === 'eq' ? p.eq : null, v: p.v })),
    laws: [...new Set(used)].filter(e => EQS[e] && !EQS[e].generated),
  };
}
// a saved problem back into the workspace: unit, text, drawing, givens, conditions, targets and board (the path is solved again)
async function openRecord(r){
  if (S.busy) return false;
  if (S.path.length && !await ask('Open a saved problem?', `<b>THIS REPLACES YOUR WORKSPACE</b>Your ${S.path.length} solved step${S.path.length > 1 ? 's' : ''} will be cleared. Save the problem first if you want to keep them.`, 'Open it')) return false;
  r = structuredClone(r); // the workspace changes its drawing and board; the saved record stays as it was
  switchChapter(r.chapter);
  S.fbd = { body: null, forces: {} }; WS.clear();
  if (r.drawing) S.build.load(r.drawing); else if (S.build.shapes.length) S.build.clear();
  DF.load(r.drawing && r.drawing.setup);
  $('problem').value = r.text;
  const defs = defaultsFor(S.ch), keys = new Set([...Object.keys(defs), ...chapter().conditions.map(c => c.key)]);
  S.cond = { ...defs, ...Object.fromEntries(Object.entries(r.conds).filter(([k]) => keys.has(k))) };
  const vars = chVars();
  for (const [id, g] of Object.entries(r.givens)) if (vars.includes(id)) S.givens[id] = { ...g };
  applyHidden(); S.condOk = r.condOk;
  S.targets = r.parts.map(p => p.target).filter(t => vars.includes(qtyOf(t)) && !known(t));
  S.board = r.board; S.lastStep = -1; S.stage = 0;
  setDrawer(false); renderAll(); BV.render();
  say(`Opened “${esc(r.title)}”. ${r.steps.length ? 'Its setup is back; solve it again to see the work.' : 'Carry on where you left off.'}`);
  return true;
}
const NB = S.nb = createNotebook({ panel: $('nbBody'), ctx: { chapters: CHAPTERS, vars: VARS, eqs: EQS }, capture, open: openRecord, ask, say, esc,
  lawLabel: (e) => EQS[e] ? `${EQS[e].label} ${textOf(EQS[e].form)}` : e });

// the board: a solved path laid out given → equation → found → target
function pathSteps(){
  return S.path.map(p => {
    const out = qtyOf(p.v); if (!VARS[out]) return null;
    if (p.kind === 'eq'){
      const e = EQS[p.eq]; if (!e) return null;
      return { ref: p.eq, kind: e.kind || 'law', label: e.label || '', text: textOf(e.form || ''), ins: e.vars.filter(x => x !== out && VARS[x]), out };
    }
    return { ref: p.kind, kind: 'calc', label: p.title || p.kind, ins: [p.from].flat().map(qtyOf).filter(x => VARS[x] && x !== out), out };
  }).filter(Boolean);
}
const boardState = (id) => S.targets.includes(id) || S.targets.includes('fn:' + id) ? 'target' : S.givens[id] ? 'given' : S.found[id] ? 'found' : 'unknown';
function boardValue(id){
  const g = S.givens[id], f = S.found[id];
  if (g) return g.kind === 'symbol' ? '' : withUnit(id, g.val);
  return f && (!f.expr || X.isNumeric(f.expr)) && Number.isFinite(f.val) ? withUnit(id, f.val) : '';
}
S.board = null;
const BV = createBoardView({
  host: $('boardHost'), get: () => S.board, set: (b) => { S.board = b; },
  label: (c) => c.type === 'quantity' ? (VARS[c.ref] ? { html: V(c.ref) } : { text: c.ref || '?' })
    : EQS[c.ref] && !EQS[c.ref].generated ? { html: `<span class="tag">${EQS[c.ref].label}</span> ${EQS[c.ref].form}` } : { text: [c.label, c.text].filter(Boolean).join('  ') },
  quantities: () => chVars().filter(id => VARS[id]).map(id => [id, `${VARS[id].plain}: ${nm(id)}`]),
  equations: () => chapter().sections.flatMap(sc => sc.eqs).map(e => [e, `${EQS[e].label}: ${textOf(EQS[e].form)}`, EQS[e].kind || '']),
  fromPath: () => {
    if (!S.path.length){ say('Solve at least one step first: the board lays out the path you solved. You can also build one by hand with the card buttons.'); return null; }
    S.board = fromPath(pathSteps(), { state: boardState, value: boardValue }, S.board); return S.board;
  },
  say,
});
$('nbBtn').addEventListener('click', () => { if ($('nbDrawer').classList.contains('open')) NB.prefill(); });
$('boardBtn').onclick = () => { setDrawer(false); BV.render(); $('boardWrap').classList.add('show'); };
$('boardX').onclick = () => $('boardWrap').classList.remove('show');
const MC = createMC({ host: $('mcHost'), eqs: EQS });
$('mcBtn').onclick = () => { setDrawer(false); $('mcWrap').classList.add('show'); };
$('mcX').onclick = () => $('mcWrap').classList.remove('show');

// ---------- course (js/course.js): lessons, help switches, "What's wrong?" ----------
S.help = { glow: true, showMe: true, hints: true };
function setHelp(h){
  S.help = { ...h };
  document.body.classList.toggle('noglow', !h.glow);
  $('showBtn').disabled = !h.showMe; $('hintBtn').disabled = !h.hints;
}
// a lesson stop's problem into the workspace, like a practice problem: text only, the student sets it up
async function loadLesson(p, ch){
  if (S.busy) return false;
  if (S.path.length && curTarget() && !await ask('Start this stop?', `<b>THIS REPLACES UNFINISHED WORK</b>Your ${S.path.length} solved step${S.path.length > 1 ? 's' : ''} will be cleared, and a target is still open.`, 'Start it')) return false;
  if (S.mode !== 'guided') setMode('guided');
  switchChapter(ch); S.fbd = { body: null, forces: {} }; if (S.build.shapes.length) S.build.clear(); WS.clear(); S.board = null; NB.forget();
  S.bank = { ...p, ch }; $('problem').value = p.text; S.lastStep = -1; S.stage = 0;
  setDrawer(false); renderAll();
  return true;
}
// "What's wrong?": run the solved path again with one small edit at a time (pack error handlers, SLIPS);
// the first edit that turns the app's answer into yours names your slip
function replay(edit = {}){
  const v = {}, fns = {};
  for (const [id, g] of Object.entries(S.givens)) v[id] = g.val;
  for (const [id, f] of Object.entries(S.funcs)) if (f.from === 'given') fns[id] = X.ratToPoly(X.polyToRat(f.poly)).map(c => X.numValue(c));
  if (edit.given) v[edit.given] = -v[edit.given];
  S.path.forEach((p, i) => routeStep(i === edit.step ? { ...p, tree: edit.tree } : p, v, fns));
  return v;
}
const swapTrig = (n) => !n || typeof n !== 'object' ? n : Array.isArray(n) ? n.map(swapTrig)
  : Object.fromEntries(Object.entries(n).map(([k, x]) => [k, k === 'f' && (x === 'sin' || x === 'cos') ? (x === 'sin' ? 'cos' : 'sin') : swapTrig(x)]));
const hasTrig = (n) => !!n && typeof n === 'object' && (n.f === 'sin' || n.f === 'cos' || Object.values(n).some(hasTrig));
const SLIP_EDITS = {
  // sin and cos swapped in one step
  swapTrig: () => S.path.map((p, i) => p.kind === 'eq' && !p.gen && !p.fn && hasTrig(p.tree) ? { edit: { step: i, tree: swapTrig(p.tree) }, eq: EQS[p.eq].label } : null).filter(Boolean),
  // one given, or the answer itself, the other way round
  flipSign: (t) => [...Object.entries(S.givens).filter(([, g]) => g.val).map(([id]) => ({ edit: { given: id }, q: VARS[id].sym })), { edit: {}, flipAnswer: true, q: VARS[t].sym }],
};
function whatsWrong(t, typed){
  if (!S.path.length || !known(t)) return null;
  for (const slip of SLIPS) for (const c of SLIP_EDITS[slip.edit](t)){
    let x; try { x = replay(c.edit)[t]; } catch { continue; }
    if (c.flipAnswer) x = -x;
    if (Number.isFinite(x) && sigMatch(x, typed)) return slip.says.replace('{eq}', c.eq || '').replace('{q}', c.q || '');
  }
  return null;
}
function checkAnswer(t, typed){
  const n = Number(String(typed).replace('−', '-'));
  if (!typed || !Number.isFinite(n)) return 'Type the number you got (in the unit shown).';
  if (!known(t)) return `Solve for ${symOf(t)} here first; then I can compare it with yours.`;
  const v = S.found[t] ? S.found[t].val : val(t);
  if (sigMatch(v, typed)) return `✓ ${symOf(t)} = ${fmt(v)} ${unitOf(t)}: yours matches to the figures you wrote.`;
  return `✗ The app gets ${symOf(t)} = ${fmt(v)} ${unitOf(t)}. Press <b>What’s wrong?</b> to test the usual slips.`;
}
const COURSE = S.course = createCourse({
  lessons: LESSONS, vars: VARS, drawer: $('courseBody'), bar: $('lessonBar'), routeWrap: $('routeWrap'), kindWrap: $('kindWrap'),
  app: { load: loadLesson, setHelp, say, ask, dialog, esc, openMap: () => setDrawer(true, 'courseDrawer'),
    eqLabel: (e) => `${EQS[e].label} (${textOf(EQS[e].form)})`, eqKind: (e) => EQS[e].kind || 'law',
    targets: () => S.targets.filter(t => VARS[t]).map(t => [t, `${letter(S.targets.indexOf(t))} ${VARS[t].plain}`, unitOf(t)]),
    check: checkAnswer, wrong: (t, typed) => whatsWrong(t, typed) || 'None of the usual slips (sin and cos swapped, a sign flipped) gives your number. Compare your steps with the app’s, one line at a time.' },
});

// ---------- assemble ----------
// θ → ω = dθ/dt → α = dω/dt (or x → v → a), with what you know on each rung; ∫dt back up needs a start value
function calcHTML(){
  const L = chapter().ladder; if (!L || !(S.cond.varA || Object.keys(S.funcs).length)) return '';
  const sy = (id) => VARS[id].sym, [p, v, a] = L.rungs;
  const tag = (st, txt) => `<small class="s-${st}">${txt}</small>`;
  const rung = (id, head) => {
    const f = S.funcs[id], st = L.start[id], tags = [];
    if (f) tags.push(tag(f.from === 'given' ? 'given' : 'found', `${sy(id)}(t) ${f.from === 'given' ? 'given' : 'found'}`));
    if (known(id)) tags.push(tag(stateOf(id), `${sy(id)} = ${showVal(id)}${isMoment(id) ? ' at one moment' : ''}`));
    if (st && known(st)) tags.push(tag(stateOf(st), `start: ${sy(st)} = ${showVal(st)}`));
    if (S.targets.includes(id) || S.targets.includes('fn:' + id)) tags.push(tag('target', '🎯 target'));
    return `<div class="rung"><b>${head}</b>${tags.join('') || '<small>nothing known yet</small>'}</div>`;
  };
  const starts = L.rungs.slice(0, 2).map(id => L.start[id] ? `${sy(id)}(0) = ${sy(L.start[id])}${known(L.start[id]) ? '' : ' (not known yet)'}` : `${sy(id)}(0) = 0, measured from the start`).join('; ');
  return `<div class="ch">Varies with time: how these are linked</div>
    <div class="rungs">${rung(p, sy(p))}<span class="link">d/dt →</span>${rung(v, `${sy(v)} = d${sy(p)}/dt`)}<span class="link">d/dt →</span>${rung(a, `${sy(a)} = d${sy(v)}/dt`)}</div>
    <div class="back">← Going back up with ∫dt needs a start value: ${starts}.</div>`;
}
function renderAll(full = true){
  if (full) renderUnit();
  $('checkRow').style.display = S.bank ? 'flex' : 'none';
  if (S.givens.inc && S.givens.inc.kind !== 'symbol' && S.givens.inc.val >= 5 && S.givens.inc.val <= 75 && Math.abs(S.build.theta - S.givens.inc.val) > 1e-9) S.build.theta = S.givens.inc.val;
  renderKind(); renderKnowns(); renderForceChips(); renderScen(); renderConds(); renderLibrary(); renderTargets(); renderSpan(); renderSheet(); renderPath(); renderMatters(); renderStage(); paintSyms(); renderSliders();
  $('calcCond').innerHTML = $('calcSolve').innerHTML = calcHTML();
  S.course?.syncTargets();
  $('axisNote').innerHTML = hook('slopeAxis') && S.cond.upAxis ? '+ is <b>up the slope</b> (your choice). Pick the direction for each vector; the app sets the sign.' : chapter().axis;
  if (S.dtab !== 'motion') S.build.render(); // labels show given values; a wheel shows its button once ω or α is known
  if (S.dtab === 'forces') renderFBD(); if (S.dtab === 'build') renderBuildUI();
  draw();
}
async function boot(){
  try { if (localStorage.getItem('rl-calm') === '1') document.body.classList.add('calm'); } catch {}
  $('calmBtn').setAttribute('aria-pressed', String(calm()));
  field.setCalm(calm());
  const mode = savedMode();
  if (mode === 'draw') S.ch = DRAW_UNIT;
  S.cond = defaultsFor(S.ch); applyHidden(); clearWork(); resetInspector();
  S.lastStep = -1; renderAll();
  showTab('build');
  setMode(mode, false);
  if (mode === 'draw') say('Draw the problem with the tools beside the canvas, or sketch it with the pen. Press <b>Done drawing</b> when it’s all there; each part then gets a dot to set it. (Guided mode, top right, has the step-by-step stages.)');
  else say('Work through four stages: <b>1 Setup</b> (draw it, add the givens), <b>2 Forces</b> (the free-body or motion diagram), <b>3 Conditions</b>, <b>4 Solve</b>. Each passed check earns a ⭐. Or open the <b>Practice bank</b>. (The background is a live electric field: your cursor is a small test charge.)');
  if ('serviceWorker' in navigator && location.protocol === 'https:'){ try { navigator.serviceWorker.register('./sw.js').catch(() => {}); } catch {} }
}
boot();
