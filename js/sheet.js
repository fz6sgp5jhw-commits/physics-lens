// Physics Lens — exam sheet, find the mistake, my mistakes (phase M4, docs/mistake-plan.md sections 3 and 4).
// The exam sheet lists a lesson's problems in exam layout: the question, room to work on paper, an answer box, nothing
// revealed. Afterwards each solution opens one line at a time, symbols first (the app's own worked steps). A wrong typed
// answer is run through the slip handlers. "Find the mistake" shows a worked solution with exactly one slip planted (one
// slip edit on the solved path): the student points at the line, names the pattern and fixes it. "My mistakes" keeps a
// tally by pattern (P1–P7) in pl-mistakes, with a Clear button; the top pattern picks the first hint and gate shown.
// The app does every solve and every number; this file only lays them out. Problem text goes in through textContent.

export const MISTAKE_KEY = 'pl-mistakes';
// [id, name, what to watch for (the first hint), the setup gate that guards it]
export const PATTERNS = [
  ['P1', 'Law chosen without its condition', 'Before you write a law, say why it holds here: energy needs only conservative work (or W_nc counted), ΣF = 0 needs no acceleration.', 'why'],
  ['P2', 'Target not named', 'Name the target first and keep it in sight: if you find yourself solving for something else, stop and look again.', 'target'],
  ['P3', 'A given in the wrong term', 'Check the units of every term before any number goes in: a term in N inside an energy equation means a length or a square is missing.', 'owner'],
  ['P4', 'Vectors handled as scalars', 'Give every vector a direction and its owner: momentum is m·v per piece, per axis, and an impulse comes from the force on this body.', 'owner'],
  ['P5', 'Own equation not read back', 'Read your relation back in words before you choose: what does it say about the options?', 'readback'],
  ['P6', 'Numbers before symbols', 'Write the equation in symbols and solve it for the target before any number goes in.', 'target'],
  ['P7', 'Graph interval or shape', 'Mark where the stretch of the graph starts and ends first; under a slope the area is a trapezoid, not just the triangle.', 'target'],
];
const PAT = Object.fromEntries(PATTERNS.map(([id, name, watch, gate]) => [id, { id, name, watch, gate }]));

// ---- the tally: { v: 1, n: { P1: count, … } }, validated on read; nothing that identifies the student
export function loadMistakes(){
  const n = Object.fromEntries(PATTERNS.map(([id]) => [id, 0]));
  try {
    const o = JSON.parse(localStorage.getItem(MISTAKE_KEY));
    if (o && o.v === 1 && o.n && typeof o.n === 'object') for (const id in n) if (Number.isInteger(o.n[id]) && o.n[id] > 0) n[id] = Math.min(o.n[id], 9999);
  } catch {}
  return n;
}
export function addMistake(id, k = 1){
  if (!PAT[id]) return loadMistakes();
  const n = loadMistakes(); n[id] = Math.max(0, n[id] + k);
  try { localStorage.setItem(MISTAKE_KEY, JSON.stringify({ v: 1, n })); } catch {}
  return n;
}
export function clearMistakes(){ try { localStorage.removeItem(MISTAKE_KEY); } catch {} }
// the most frequent pattern (first in P order on a tie), or null with an empty tally
export function topPattern(n = loadMistakes()){
  let best = null;
  for (const [id] of PATTERNS) if (n[id] > 0 && (!best || n[id] > n[best])) best = id;
  return best ? PAT[best] : null;
}

// ---- find the mistake (pure): which lines differ from the right solution, and the three checks
export const faultyLines = (ex) => ex.lines.map((l, i) => l.formula !== l.good ? i : -1).filter(i => i >= 0);
export function checkFind(ex, { line, pattern, fix }, sigMatch){
  const okLine = line === ex.bad, okPat = pattern === ex.pattern, typed = String(fix ?? '').trim();
  const okFix = okLine && typed !== '' && Number.isFinite(Number(typed.replace('−', '-'))) && sigMatch(ex.fixVal, typed);
  return { line: okLine, pattern: okPat, fix: okFix, all: okLine && okPat && okFix };
}

const el = (tag, props = {}, kids = []) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };

// ---- My mistakes, in the Course drawer: the tally, the exam wrapper, Clear
export function renderMistakes(host, { onWrapper, onChange }){
  const n = loadMistakes(), total = Object.values(n).reduce((a, b) => a + b, 0), top = topPattern(n);
  const rows = PATTERNS.map(([id, name]) => el('div', { className: 'mrow' }, [el('b', { textContent: id }), el('span', { textContent: name }),
    el('span', { className: 'mbar', style: `width:${total ? Math.round(100 * n[id] / total) : 0}%` }), el('span', { className: 'mn', textContent: String(n[id]) })]));
  const wrap = el('button', { id: 'mistakesWrapper', textContent: 'Sort a past test (1 min)' }); wrap.onclick = onWrapper;
  const clear = el('button', { id: 'mistakesClear', className: 'warnbtn', textContent: 'Clear my mistakes' });
  clear.onclick = () => { clearMistakes(); renderMistakes(host, { onWrapper, onChange }); onChange?.(); };
  host.replaceChildren(el('details', {}, [el('summary', { textContent: `My mistakes${total ? ` (${total})` : ''}` }),
    el('p', { className: 'small muted', textContent: 'Each slip the app names is counted by its pattern. Your most frequent one sets the first hint and the first setup gate. Kept only on this device.' }),
    el('p', { className: 'small mtop', textContent: top ? `Most frequent: ${top.id}, ${top.name.toLowerCase()}. ${top.watch}` : 'Nothing counted yet.' }),
    ...rows, el('div', { className: 'row' }, [wrap, clear])]));
}

// ---- the sheet page. app: { lessons, solve(l, kind) → { steps } | null, check(t, typed) → html,
//      wrong(t, typed) → { says, pattern } | null, example(l, prefer) → example | null, sigMatch, onMistake(id), onClose() }
export function createSheet({ host, app }){
  let lesson = null;
  const say = (box, html) => { box.innerHTML = html; };   // app-made text only (checks, slip sentences)

  function close(){ host.hidden = true; document.body.classList.remove('sheet-on'); app.onClose?.(); }
  function bar(extra = []){
    const p = el('button', { id: 'sheetPrint', textContent: 'Print' }); p.onclick = () => window.print();
    const x = el('button', { id: 'sheetClose', className: 'x', textContent: '×', title: 'Close the sheet' }); x.onclick = close;
    return el('div', { className: 'sbar' }, [...extra, p, x]);
  }
  const checklist = () => el('section', { className: 'scard skey' }, [el('h3', { textContent: 'Before any algebra' }), el('ol', {}, [
    'Sketch the two moments (before and after, top and bottom).', 'List the givens in symbols, each with its owner.',
    'Name the target with a “?”.', 'Choose the law and say why it holds here.', 'Solve in symbols, check the units, then put in numbers.',
  ].map(t => el('li', { textContent: t })))]);

  function open(lessonId){
    lesson = app.lessons.find(l => l.id === lessonId); if (!lesson) return;
    host.hidden = false; document.body.classList.add('sheet-on');
    const find = el('button', { id: 'sheetFind', textContent: 'Find the mistake' }); find.onclick = () => findMistake();
    const wr = el('button', { id: 'sheetWrapper', textContent: 'Sort a past test' }); wr.onclick = wrapper;
    host.replaceChildren(bar([find, wr]), el('main', {}, [
      el('h1', { textContent: `Exam sheet: ${lesson.title}` }),
      el('p', { className: 'small', textContent: 'Work each problem on paper first. Nothing is shown until you ask: type your answers to check them, then open the solution one line at a time.' }),
      checklist(), ...lesson.stops.map((s, i) => problemCard(s, i)), el('section', { id: 'sheetFindBox', className: 'scard', hidden: true })]));
    host.scrollTop = 0;
  }

  function problemCard(stop, i){
    const card = el('section', { className: 'scard sprob' }); card.dataset.stop = stop.kind;
    const ans = el('div', { className: 'sans' }), sol = el('div', { className: 'ssol' });
    const rows = stop.problem.key.targets.map(id => [id, app.sym(id), app.unit(id)]).map(([id, sym, unit]) => {
      const inp = el('input', { type: 'text', inputMode: 'decimal', className: 'sval', placeholder: 'your number' }); inp.dataset.t = id;
      const out = el('div', { className: 'sout small' }), go = el('button', { className: 'scheck', textContent: 'Check' });
      go.onclick = async () => {
        if (!await ready()) { say(out, 'The app couldn’t solve this one here: open it from the Course map to work it in the workspace.'); return; }
        const r = app.check(id, inp.value); say(out, r);
        if (r.startsWith('✗')){ const w = app.wrong(id, inp.value); if (w){ say(out, `${r.replace(/ Press.*$/, '')} ${w.says}`); app.onMistake(w.pattern); } }
      };
      return el('div', { className: 'srow' }, [el('span', { className: 'ssym', textContent: `${sym} =` }), inp, el('span', { textContent: unit }), go, out]);
    });
    ans.append(...rows);
    let solved = null;
    async function ready(){ if (!solved) solved = await app.solve(lesson.id, stop.kind); return !!solved; }
    const next = el('button', { className: 'snext', textContent: 'Show the next line' }), all = el('button', { className: 'sall', textContent: 'Show it all' });
    let blocks = null, at = 0;
    async function build(){
      if (blocks) return true;
      if (!await ready()){ sol.textContent = 'The app couldn’t solve this one here: open it from the Course map.'; return false; }
      blocks = [];
      for (const [k, s] of solved.steps.entries()){
        const w = el('div', { className: 'sstep' }); w.append(el('div', { className: 'stitle', textContent: `Step ${k + 1}: ${s.title.replace(/^Work · step \d+: /, '')}` }));
        const tmp = el('div'); tmp.innerHTML = s.html;   // the app's own worked step (made by app.js, not typed by anyone)
        for (const b of [...tmp.children]){ b.classList.add('show'); w.append(b); }
        sol.append(w); blocks.push(...w.children);
      }
      blocks.forEach(b => b.classList.add('shide'));
      return true;
    }
    next.onclick = async () => { if (!await build()) return; if (at < blocks.length) blocks[at++].classList.remove('shide'); next.disabled = at >= blocks.length; };
    all.onclick = async () => { if (!await build()) return; blocks.forEach(b => b.classList.remove('shide')); at = blocks.length; next.disabled = true; };
    card.append(el('div', { className: 'snum', textContent: `Problem ${i + 1}` }), el('h2', { textContent: stop.problem.title }), el('p', { className: 'stext', textContent: stop.problem.text }),
      el('div', { className: 'swork', 'aria-hidden': 'true' }), ans, el('div', { className: 'row snav' }, [next, all]), sol);
    return card;
  }

  // ---- find the mistake: one planted slip; point at the line, name the pattern, fix the number
  async function findMistake(){
    const box = host.querySelector('#sheetFindBox'); box.hidden = false;
    box.replaceChildren(el('h2', { textContent: 'Find the mistake' }), el('p', { className: 'small', textContent: 'Working it out…' }));
    box.scrollIntoView({ block: 'start' });
    const ex = await app.example(lesson.id, topPattern()?.id);
    if (!ex){ box.replaceChildren(el('h2', { textContent: 'Find the mistake' }), el('p', { textContent: 'None of the usual slips changes this lesson’s answers. Try another lesson.' })); return; }
    let line = -1;
    const lines = ex.lines.map((l, i) => {
      const b = el('button', { className: 'fline' }, [el('span', { className: 'fnum', textContent: `${i + 1}.` }), el('span', { className: 'fsay', textContent: l.label }),
        el('code', { textContent: `${l.formula}${l.value ? `  →  ${l.value}` : ''}` })]);
      b.dataset.i = i; b.onclick = () => { line = i; lines.forEach(x => x.setAttribute('aria-pressed', String(x === b))); };
      return b;
    });
    const pick = el('select', { id: 'fmPattern' }, [el('option', { value: '', textContent: 'Which pattern is it?' }), ...PATTERNS.map(([id, name]) => el('option', { value: id, textContent: `${id}: ${name}` }))]);
    const fix = el('input', { id: 'fmFix', type: 'text', inputMode: 'decimal', placeholder: 'the right number for that line' });
    const res = el('div', { id: 'fmResult', className: 'small' }), go = el('button', { id: 'fmCheck', className: 'go', textContent: 'Check all three' });
    go.onclick = () => {
      const r = checkFind(ex, { line, pattern: pick.value, fix: fix.value }, app.sigMatch), l = ex.lines[ex.bad];
      const out = [
        r.line ? `✓ Line ${ex.bad + 1} is the faulty one.` : line < 0 ? '✗ Point at a line first: click the one you think is wrong.' : `✗ Line ${line + 1} is right for the numbers it was given; look for a line whose formula itself is off. Check each term’s units.`,
        r.pattern ? `✓ ${PAT[ex.pattern].id}: ${PAT[ex.pattern].name.toLowerCase()}.` : `✗ ${pick.value ? `Not ${pick.value}.` : 'Pick a pattern.'} ${r.line ? 'Ask what kind of slip turns the right formula into this one.' : ''}`,
        r.fix ? `✓ Fixed: ${l.sym} = ${ex.fixText}.` : r.line ? `✗ Not yet: redo line ${ex.bad + 1} with the right formula and give ${l.sym} in ${ex.fixUnit}.` : '',
      ].filter(Boolean);
      res.replaceChildren(...out.map(s => el('div', { textContent: s })));
      if (r.all){ const why = el('div', { className: 'fwhy' }); why.innerHTML = `Why: ${ex.says}`; res.append(why); }   // the slip's sentence is app-made HTML
    };
    box.replaceChildren(el('h2', { textContent: 'Find the mistake' }),
      el('p', { className: 'small', textContent: `${ex.title}. This worked solution has exactly one faulty line; the lines after it carry its wrong number forward correctly. Click the faulty line, say which pattern it is, then type the right number for that line.` }),
      el('p', { className: 'stext', textContent: ex.text }), el('div', { className: 'flines' }, lines), el('div', { className: 'row' }, [pick, fix, go]), res);
  }

  // ---- the exam wrapper: sort a past test's lost points into the patterns, in a minute; added to the tally
  function wrapper(){
    host.hidden = false; document.body.classList.add('sheet-on');
    const counts = Object.fromEntries(PATTERNS.map(([id]) => [id, 0]));
    const rows = PATTERNS.map(([id, name, watch]) => {
      const n = el('span', { className: 'wn', textContent: '0' }); n.dataset.p = id;
      const step = (k) => { counts[id] = Math.max(0, counts[id] + k); n.textContent = String(counts[id]); };
      const minus = el('button', { textContent: '−', title: 'One fewer' }), plus = el('button', { className: 'wplus', textContent: '+', title: 'One more' });
      minus.onclick = () => step(-1); plus.onclick = () => step(1); plus.dataset.p = id;
      return el('div', { className: 'wrow' }, [el('b', { textContent: id }), el('div', {}, [el('div', { textContent: name }), el('div', { className: 'small muted', textContent: watch })]), minus, n, plus]);
    });
    const out = el('p', { id: 'wrapOut', className: 'small' }), save = el('button', { id: 'wrapSave', className: 'go', textContent: 'Add to my mistakes' });
    save.onclick = () => {
      let n = loadMistakes(); for (const [id, k] of Object.entries(counts)) if (k) n = addMistake(id, k);
      const top = topPattern(n);
      out.textContent = top ? `Saved. Your most frequent pattern is ${top.id}, ${top.name.toLowerCase()}: its hint and its setup gate now come first. Plan for next time: ${top.watch}` : 'Nothing to add: count at least one lost point.';
      app.onMistake(null);
    };
    host.replaceChildren(bar(), el('main', {}, [el('h1', { textContent: 'Sort a past test' }),
      el('p', { className: 'small', textContent: 'Go through your marked test. For each place you lost points, press + on the pattern it fits. It takes about a minute; the app then uses the result.' }),
      ...rows, el('div', { className: 'row' }, [save]), out]));
  }

  return { open, close, wrapper };
}
