// Physics Lens — the course: lessons as data (plan section 8). A lesson is long → twin → transfer; the map is always open.
// The app does the physics; this file runs the lesson around it: prompts on the hint line at each stage, help switches,
// the route card ("What's the route?") after Setup, the kind tap before an equation goes on the sheet, stars and the recap.
// Progress is kept in pl-course (validated on read, cleared by its button). Exam or homework problems that must stay
// private come from a .json file the student imports once (Course → Add my problems): kept in pl-lessons on this device
// only, validated like the notebook, and shown only through textContent; each replaces one stop's problem.

export const KEY = 'pl-course', LOCAL_KEY = 'pl-lessons';
const WHEN = ['start', 'forces', 'conditions', 'solve'];
export const LAWS = {
  forces: 'Newton’s second law: ΣF = ma and Στ = Iα',
  energy: 'Conservation of energy: K₀ + U₀ + W_nc = K + U',
  momentum: 'Conservation of angular momentum: L₁ = L₂',
  pmomentum: 'Conservation of momentum: m₁v₁ + m₂v₂ before = after',
  work: 'Work and power: W = F Δx cos φ, P = W / t',
  kinematics: 'Kinematics alone (constant acceleration)',
};
export const KIND_NAMES = { law: 'a law', rel: 'a relationship', def: 'a definition' };
// the kind tap's reasons: each belongs to one kind
const REASONS = [
  ['law', 'It holds for any body or system: a principle of physics'],
  ['rel', 'It holds because of this setup: a shape, rolling, a string, a geometry'],
  ['def', 'It says what a quantity is: it defines it'],
];
const STARS = 3;

// sig-fig comparison: the source's answer as written ("0.402") against the app's number
export function sigMatch(got, written){
  const s = String(written).replace(/^[−-]/, '-'), want = Number(s);
  const digits = s.split(/e/i)[0].replace(/^-?0*\.?0*/, '').replace('.', '').length; // 1.5e4 has two figures
  const place = 10 ** (Math.floor(Math.log10(Math.abs(want))) - Math.max(1, digits) + 1);
  return Math.abs(got - want) <= 1.01 * place; // one in the last written place: g = 9.8 vs 9.81, rounding along the way
}

function readProgress(){
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!o || o.v !== 1 || typeof o.stops !== 'object' || Array.isArray(o.stops)) return {};
    const out = {};
    for (const [k, x] of Object.entries(o.stops)) if (/^[\w-]{1,40}\/(long|twin|transfer)$/.test(k) && x && typeof x === 'object')
      out[k] = { done: x.done === true, stars: Number.isInteger(x.stars) ? Math.max(0, Math.min(STARS, x.stars)) : STARS };
    return out;
  } catch { return {}; }
}
const writeProgress = (stops) => { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, stops })); } catch {} };

// app: { load(problem, chapter) → Promise<bool>, setHelp(help), say, ask, dialog, esc, openMap(), eqLabel(id), eqKind(id),
//        targets() → [[id, label, unit]], check(id, typed) → html, wrong(id, typed) → html }
export function createCourse({ lessons, vars, drawer, bar, routeWrap, kindWrap, app }){
  let progress = readProgress();
  let cur = null; // { lesson, stop, key, routeDone, stars, prompted: Set }
  const el = (tag, props = {}, kids = []) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };
  const stopKey = (l, s) => `${l.id}/${s.kind}`;

  // ---- private problems (pl-lessons): each replaces one stop's problem, prompts and route; removing them restores the pack's
  const original = new Map(lessons.flatMap(l => l.stops.map(st => [stopKey(l, st), { problem: st.problem, prompts: st.prompts, route: st.route }])));
  let localCount = 0;
  function applyLocal(stops){
    localCount = 0;
    for (const l of lessons) for (const st of l.stops){
      const k = stopKey(l, st), r = stops[k];
      Object.assign(st, original.get(k), { local: false });
      if (r){ Object.assign(st, r, { local: true }); localCount++; }
    }
  }
  function readLocal(){ try { return cleanStops(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')); } catch { return {}; } }
  // a private file or stored copy: { stops: { 'lesson/kind': { problem, prompts?, route? } } }, each part checked
  function cleanStops(raw){
    const out = {};
    if (!raw || typeof raw !== 'object' || !raw.stops || typeof raw.stops !== 'object') return out;
    for (const [k, r] of Object.entries(raw.stops)){
      if (!original.has(k) || !r || typeof r !== 'object') continue;
      const p = cleanProblem(r.problem); if (!p) continue;
      const o = { problem: p };
      if (Array.isArray(r.prompts)) o.prompts = r.prompts.filter(x => x && WHEN.includes(x.when) && typeof x.text === 'string').slice(0, 8).map(x => ({ when: x.when, text: x.text.slice(0, 400) }));
      const rt = r.route;
      if (rt && Array.isArray(rt.laws) && rt.laws.every(x => x in LAWS) && Array.isArray(rt.cues) && Array.isArray(rt.decoys)){
        const strs = (a) => a.filter(x => typeof x === 'string').slice(0, 12).map(x => x.slice(0, 200));
        o.route = { laws: rt.laws, why: typeof rt.why === 'string' ? rt.why.slice(0, 600) : '', cues: strs(rt.cues), decoys: strs(rt.decoys) };
      }
      out[k] = o;
    }
    return out;
  }
  function cleanProblem(p){
    const str = (x, n) => typeof x === 'string' ? x.slice(0, n) : '';
    if (!p || typeof p !== 'object' || !p.key || typeof p.key !== 'object') return null;
    const src = p.source && typeof p.source === 'object' ? Object.fromEntries(['work', 'edition', 'license', 'url', 'problem'].map(k => [k, str(p.source[k], 200)])) : null;
    if (!p.original && !(src && src.work && src.license)) return null;
    const givens = {};
    for (const [id, g] of Object.entries(p.key.givens || {})){
      const q = vars[id];
      if (!q || !Array.isArray(g) || !(g[0] === null || Number.isFinite(g[0])) || !(g[1] === q.unit || (q.units && g[1] in q.units))) continue;
      givens[id] = [g[0], g[1], g[2] === 1 ? 1 : 0];
    }
    // givens that are functions of time: numbers and t only, as typed in the function box
    const fns = Object.fromEntries(Object.entries(p.key.fns || {}).filter(([id, f]) => vars[id] && typeof f === 'string' && /^[0-9t\s.+\-−^²³⁴⁵/()]{1,80}$/.test(f)));
    const cond = Object.fromEntries(Object.entries(p.key.cond || {}).filter(([k, v]) => /^\w{1,40}$/.test(k) && (typeof v === 'boolean' || (typeof v === 'string' && /^\w{1,40}$/.test(v)))));
    const targets = (Array.isArray(p.key.targets) ? p.key.targets : []).filter(t => vars[t]).slice(0, 6);
    const answers = Object.fromEntries(Object.entries(p.answers || {}).filter(([id, a]) => targets.includes(id) && typeof a === 'string' && /^[−-]?\d*\.?\d+(e[−-]?\d+)?$/i.test(a)));
    if (!targets.length) return null;
    return { ...(p.original ? { original: true } : { source: src }), title: str(p.title, 120) || 'Untitled', text: str(p.text, 4000), key: { givens, ...(Object.keys(fns).length ? { fns } : {}), cond, targets }, answers };
  }
  async function importLocal(file){
    let raw; try { raw = JSON.parse(await file.text()); } catch { app.say('That file isn’t readable JSON.'); return; }
    const stops = cleanStops(raw), n = Object.keys(stops).length;
    if (!n){ app.say('No lesson stop in that file could be used. Each needs a stop name like disc/twin, a problem with a source (or original), givens and targets.'); return; }
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ v: 1, stops: { ...readLocal(), ...stops } })); } catch { app.say('This browser’s storage is full: your problems couldn’t be kept.'); return; }
    applyLocal(readLocal()); renderMap();
    app.say(`Added ${n} of your own problem${n > 1 ? 's' : ''} to the course. ${raw.stops && Object.keys(raw.stops).length > n ? 'Some stops in the file couldn’t be read and were skipped.' : ''} They stay on this device only.`);
  }
  async function removeLocal(){
    if (!await app.ask('Remove your problems?', `<b>REMOVE ${localCount} PROBLEM${localCount > 1 ? 'S' : ''} YOU ADDED</b>The lessons go back to their own problems. Your file is untouched; import it again any time.`, 'Remove')) return;
    try { localStorage.removeItem(LOCAL_KEY); } catch {}
    applyLocal({}); renderMap();
  }
  applyLocal(readLocal());

  // ---- the map (drawer)
  function renderMap(){
    const kids = lessons.map(l => {
      const stops = l.stops.map((s, i) => {
        const k = stopKey(l, s), p = progress[k], b = el('button', { className: 'cstop' + (p && p.done ? ' done' : '') + (cur && cur.key === k ? ' cur' : ''), title: s.problem.text });
        b.dataset.stop = k;
        b.append(el('span', { className: 'ckind', textContent: `${i + 1} · ${s.kind}` }), el('span', { textContent: s.problem.title + (s.local ? ' (yours)' : '') }),
          el('span', { className: 'cstars', textContent: p && p.done ? '★'.repeat(p.stars) + '☆'.repeat(STARS - p.stars) : '' }));
        b.onclick = () => open(l.id, s.kind);
        return b;
      });
      return el('div', { className: 'clesson' }, [el('b', { textContent: l.title }), el('div', { className: 'small muted', textContent: l.objectives.join(' · ') }), el('div', { className: 'cstops' }, stops)]);
    });
    const clear = el('button', { id: 'courseClear', className: 'warnbtn', textContent: 'Clear progress', title: 'Forget which stops are done and their stars' });
    clear.onclick = async () => {
      if (!await app.ask('Clear course progress?', '<b>FORGET EVERY DONE STOP AND ITS STARS</b>Your lessons stay; only the ticks and stars on this device go.', 'Clear')) return;
      progress = {}; try { localStorage.removeItem(KEY); } catch {} renderMap();
    };
    const file = el('input', { type: 'file', id: 'courseFile', accept: '.json,application/json', hidden: true });
    file.onchange = () => { const f = file.files[0]; file.value = ''; if (f) importLocal(f); };
    const add = el('button', { id: 'courseImport', textContent: 'Add my problems', title: 'A .json file of your own (homework, exams): kept on this device only' }); add.onclick = () => file.click();
    const del = el('button', { id: 'courseRemove', textContent: `Remove my problems (${localCount})`, hidden: !localCount }); del.onclick = removeLocal;
    drawer.replaceChildren(el('p', { className: 'small', textContent: 'Each lesson runs long (full help) → twin (same pathway, Show me off) → transfer (looks different, no help). Open any stop, in any order.' }),
      ...kids, el('div', { className: 'row' }, [add, del, file, clear]), el('p', { className: 'small muted', textContent: 'Progress and your own problems are kept only on this device.' }));
  }

  // ---- a stop
  async function open(lessonId, kind){
    const lesson = lessons.find(l => l.id === lessonId), stop = lesson && lesson.stops.find(s => s.kind === kind);
    if (!stop || !await app.load(stop.problem, lesson.chapter)) return false;
    cur = { lesson, stop, key: stopKey(lesson, stop), routeDone: false, stars: STARS, prompted: new Set() };
    app.setHelp(stop.help);
    renderBar(); renderMap();
    event('start');
    return true;
  }
  // the targets changed (the student added one): the answer box offers them
  let lastTargets = '';
  function syncTargets(){ if (!cur) return; const k = app.targets().map(t => t[0]).join(); if (k !== lastTargets){ lastTargets = k; renderBar(); } }
  function leave(){ cur = null; app.setHelp({ glow: true, showMe: true, hints: true }); renderBar(); renderMap(); }
  function renderBar(){
    bar.hidden = !cur;
    if (!cur) { bar.replaceChildren(); return; }
    const i = cur.lesson.stops.indexOf(cur.stop), off = Object.entries(cur.stop.help).filter(([, on]) => !on).map(([k]) => ({ glow: 'glow', showMe: 'Show me', hints: 'hints' })[k]);
    const map = el('button', { textContent: 'Map', title: 'All lessons and stops' }); map.onclick = () => app.openMap();
    const route = el('button', { textContent: 'Route', title: 'Choose the law(s) and the picture cues' }); route.onclick = () => routeCard();
    const out = el('button', { textContent: 'Leave lesson', title: 'Back to the open workspace with full help' }); out.onclick = leave;
    // your answer from paper: checked against the app's, and "What's wrong?" tests the usual slips
    const ts = app.targets(), pick = el('select', { id: 'ansFor', ariaLabel: 'Which answer' }, ts.map(([id, n]) => el('option', { value: id, textContent: n })));
    const unit = el('span', { className: 'small muted' }), num = el('input', { id: 'ansVal', type: 'text', inputMode: 'decimal', placeholder: 'your answer', size: 9, ariaLabel: 'Your answer' });
    const showUnit = () => { const t = ts.find(x => x[0] === pick.value); unit.textContent = t ? t[2] : ''; };
    pick.onchange = showUnit; showUnit();
    const chk = el('button', { id: 'ansCheck', textContent: 'Check my answer' }), why = el('button', { id: 'ansWhy', textContent: 'What’s wrong?' });
    chk.onclick = () => app.say(app.check(pick.value, num.value.trim()));
    why.onclick = () => app.say(app.wrong(pick.value, num.value.trim()));
    bar.replaceChildren(
      el('div', { className: 'lrow' }, [
        el('span', { className: 'ltitle', textContent: `${cur.lesson.title} · stop ${i + 1} of ${cur.lesson.stops.length}: ${cur.stop.kind}` }),
        el('span', { className: 'cstars', textContent: '★'.repeat(cur.stars) + '☆'.repeat(STARS - cur.stars), title: 'Only a bottom-out hint costs a star' }),
        el('span', { className: 'small muted', textContent: off.length ? `off: ${off.join(', ')}` : 'full help' }), route, map, out]),
      ...(ts.length ? [el('div', { className: 'lrow' }, [el('span', { className: 'small', textContent: 'Worked it on paper?' }), pick, num, unit, chk, why])] : []));
  }

  // ---- prompts on the hint line, once each per stop; the route card the first time Setup is left
  function event(name){
    if (!cur) return;
    if (name === 'leftSetup' && !cur.routeDone){ routeCard(); return; }
    if (name === 'solved'){ finish(); return; }
    const p = cur.stop.prompts.find(x => x.when === name);
    if (p && !cur.prompted.has(name)){ cur.prompted.add(name); app.say(`<b>Lesson:</b> ${app.esc(p.text)}`); }
  }

  // ---- "What's the route?" — the laws and the picture cues; a wrong choice is explained, never blocked
  function routeCard(){
    if (!cur) return;
    const r = cur.stop.route;
    const cues = [...r.cues, ...r.decoys].sort((a, b) => a.length - b.length);
    const box = routeWrap.querySelector('.rbody');
    const lawBoxes = Object.entries(LAWS).map(([k, t]) => el('label', { className: 'rchoice' }, [Object.assign(el('input', { type: 'checkbox', value: k }), { name: 'law' }), ' ' + t]));
    const cueBoxes = cues.map(t => el('label', { className: 'rchoice' }, [Object.assign(el('input', { type: 'checkbox', value: t }), { name: 'cue' }), ' ' + t]));
    const out = el('div', { className: 'rout', ariaLive: 'polite' });
    const check = el('button', { className: 'go', id: 'routeCheck', textContent: 'Check my route' });
    const done = el('button', { id: 'routeDone', textContent: 'Carry on' });
    check.onclick = () => { const g = grade([...box.querySelectorAll('[name=law]:checked')].map(x => x.value), [...box.querySelectorAll('[name=cue]:checked')].map(x => x.value)); app.step?.(g[0].startsWith('✓')); out.replaceChildren(...g.map(t => el('p', { textContent: t }))); };
    done.onclick = () => { cur.routeDone = true; routeWrap.classList.remove('show'); };
    box.replaceChildren(el('p', { className: 'small', textContent: 'Before you solve: which law(s) will you use, and what in the picture brings in the relationships you need?' }),
      el('div', { className: 'rhead', textContent: 'Law(s)' }), ...lawBoxes, el('div', { className: 'rhead', textContent: 'Cues in the picture' }), ...cueBoxes,
      el('div', { className: 'row' }, [check, done]), out);
    routeWrap.classList.add('show');
  }
  // feedback lines, plain text: every law and cue judged, with the reason
  function grade(laws, cues){
    const r = cur.stop.route, lines = [];
    for (const k of laws) if (!r.laws.includes(k)) lines.push(`✗ ${LAWS[k]} isn’t the route here. ${r.why}`);
    for (const k of r.laws) if (!laws.includes(k)) lines.push(`✗ You also need: ${LAWS[k]}.`);
    for (const c of cues) if (r.decoys.includes(c)) lines.push(`✗ “${c}”: that isn’t in this picture. Read the problem again for what is.`);
    for (const c of r.cues) if (!cues.includes(c)) lines.push(`✗ Missed: “${c}”.`);
    if (!lines.length) lines.push(`✓ That’s the route. ${r.why}`);
    else lines.push('You can carry on either way: the sheet will show whether the route works.');
    return lines;
  }

  // ---- the kind tap: before an equation goes on the sheet, say what kind it is and why
  function kindTap(eqId){
    if (!cur) return Promise.resolve(true);
    return new Promise(resolve => {
      const box = kindWrap.querySelector('.kbody'), want = app.eqKind(eqId);
      let kind = null;
      const kinds = el('div', { className: 'row' }, Object.entries(KIND_NAMES).map(([k, t]) => {
        const b = el('button', { textContent: t.replace(/^an? /, ''), ariaPressed: 'false' }); b.dataset.kind = k;
        b.onclick = () => { kind = k; kinds.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); };
        return b;
      }));
      const why = el('select', { ariaLabel: 'Why' }, [el('option', { value: '', textContent: 'Why? Pick a reason…' }), ...REASONS.map(([k, t]) => el('option', { value: k, textContent: t }))]);
      const out = el('div', { className: 'rout' });
      const go = el('button', { className: 'go', id: 'kindCheck', textContent: 'Check' });
      const put = el('button', { id: 'kindDone', textContent: 'Put it on the sheet', hidden: true });
      go.onclick = () => {
        if (!kind){ out.replaceChildren(el('p', { textContent: 'Pick law, relationship or definition first.' })); return; }
        const ok = kind === want, reasonOk = why.value === want;
        app.step?.(ok);
        out.replaceChildren(el('p', { textContent: ok ? `✓ Yes: it’s ${KIND_NAMES[want]}.` : `✗ It’s ${KIND_NAMES[want]}, not ${KIND_NAMES[kind]}. ${REASONS.find(x => x[0] === want)[1]}.` }),
          ...(why.value && !reasonOk ? [el('p', { textContent: `✗ That reason fits ${KIND_NAMES[why.value]}.` })] : []));
        put.hidden = false; put.focus();
      };
      put.onclick = () => { kindWrap.classList.remove('show'); resolve(true); };
      kindWrap.querySelector('.kx').onclick = () => { kindWrap.classList.remove('show'); resolve(false); };
      box.replaceChildren(el('p', { textContent: `What kind of equation is ${app.eqLabel(eqId)}?` }), kinds, why, el('div', { className: 'row' }, [go, put]), out);
      kindWrap.classList.add('show');
    });
  }

  // ---- stars and the recap
  function bottomOut(){ if (!cur) return; cur.stars = Math.max(0, cur.stars - 1); renderBar(); }
  async function finish(){
    if (!cur) return;
    const { lesson, stop, key } = cur, i = lesson.stops.indexOf(stop), next = lesson.stops[i + 1];
    const was = progress[key];
    progress[key] = { done: true, stars: Math.max(cur.stars, was && was.done ? was.stars : 0) };
    writeProgress(progress); renderMap(); renderBar();
    const msg = `<b>STOP DONE: ${'★'.repeat(cur.stars)}${'☆'.repeat(STARS - cur.stars)}</b>${next ? 'Next: the ' + next.kind + ' stop.' : app.esc(lesson.recap)}`;
    if (next){ if (await app.ask('Stop done', msg, `Next: ${next.kind}`)) open(lesson.id, next.kind); }
    else app.dialog('Lesson done', msg, true);
  }

  renderMap();
  return {
    open, leave, event, kindTap, bottomOut, renderMap, renderBar, syncTargets,
    get active(){ return !!cur; }, get stop(){ return cur && cur.stop; }, get lesson(){ return cur && cur.lesson; }, get lessons(){ return lessons; }, get progress(){ return progress; },
    get stars(){ return cur ? cur.stars : null; },
  };
}
