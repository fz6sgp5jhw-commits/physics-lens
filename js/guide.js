// Physics Lens — the fading guide (phase G2). Four levels of help for guided mode: Demo (the app solves a short example first),
// Walk me through (it asks about the drawing and the forces), Prompt me (questions before equations), On my own.
// A correct step drops the level one notch (less help); a wrong step raises it, never above Walk me through. The level is kept
// in localStorage under pl-guide, validated on read, with a visible "Forget my level" button. No physics is computed here:
// the app's own solver does the demo; this file only keeps the level and draws the card.
// Design: ROADMAP.md, phase G2.

export const KEY = 'pl-guide';
export const LEVELS = ['demo', 'walk', 'prompt', 'own'];
export const NAMES = { demo: 'Demo first', walk: 'Walk me through', prompt: 'Prompt me', own: 'On my own' };
const SHOWN = ['walk', 'prompt', 'own'];   // the three buttons; the demo is offered on its own

const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- stored level
export function readGuide(){
  const fresh = { level: 'demo', demo: false };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object' || raw.v !== 1 || !LEVELS.includes(raw.level)) return fresh;
    return { level: raw.level, demo: raw.demo === true };
  } catch { return fresh; }
}
const writeGuide = (s) => { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, level: s.level, demo: s.demo })); } catch {} };

// one notch less help after a correct step, one more after a wrong one (never back up to the demo)
export const easier = (l) => LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(l) + 1)];
export const harder = (l) => l === 'demo' ? 'demo' : LEVELS[Math.max(1, LEVELS.indexOf(l) - 1)];

// ---------------------------------------------------------------- walk me through: is each thing drawn?
// item.needs: { shape: 'wheel' } | { string: ['wheel', 'block'] } | { force: { on: 'wheel', kind: 'tension' } }
// snap: { shapes: [{ id, kind }], strings: [[kind, kind]], forces: { shapeId: [kind] } }
export function drawn(needs, snap){
  if (needs.shape) return snap.shapes.some(s => s.kind === needs.shape);
  if (needs.string) return snap.strings.some(ends => needs.string.every(k => ends.includes(k)));
  if (needs.force){
    const on = snap.shapes.filter(s => s.kind === needs.force.on);
    return on.some(s => (snap.forces[s.id] || []).includes(needs.force.kind));
  }
  return false;
}
export const walkStatus = (items, snap) => items.map(it => ({ ...it, done: drawn(it.needs, snap) }));

// ---------------------------------------------------------------- prompt me: a question is judged against what was chosen
export function askJudge(q, i){
  const o = q.options[i]; if (!o) return null;
  const right = q.options.find(x => x.right);
  return { ok: !!o.right, text: o.right ? `You chose “${o.t}”: yes. ${q.why}` : `You chose “${o.t}”. ${o.why || ''} ${q.why} The one that fits is “${right.t}”.`.replace(/\s+/g, ' ').trim() };
}

// ---------------------------------------------------------------- the card
// app: { snapshot(), stopGuide() → { walk, ask } | null, say(html), demo: { script() → steps, stage(n), run(name) → Promise<info>, end() }, highlight(sel) }
export function createGuide({ card, app }){
  const st = { ...readGuide(), q: {}, demo: null, demoSeen: false, note: null };
  st.demoSeen = readGuide().demo;
  const save = () => writeGuide({ level: st.level, demo: st.demoSeen });
  const $$ = (s) => document.querySelector(s);

  function setLevel(l, why){
    if (l === st.level) return;
    st.level = l; save(); render();
    app.say(`<b>Guide:</b> ${NAMES[l]}${why ? ` (${why})` : ''}.`);
  }
  const correct = () => { if (st.level !== 'own') setLevel(easier(st.level), 'that step was right, so you get a little less help'); };
  const wrong = () => { const h = harder(st.level); if (h !== st.level) setLevel(h, 'that step was wrong, so you get a little more help'); };

  function levelBar(){
    return `<div class="row guidebar"><b>Guide</b>${SHOWN.map(l => `<button class="dfmini" data-glevel="${l}" aria-pressed="${st.level === l}">${NAMES[l]}</button>`).join('')}
      <button class="dfmini" id="guideDemo" title="The app solves a short example and names each control it uses">${st.demoSeen ? 'Demo again' : 'Watch a demo'}</button>
      <button class="dfmini" id="guideClear" title="Forget the level and the demo on this device">Forget my level</button></div>`;
  }
  function walkHTML(g){
    const rows = walkStatus(g.walk, app.snapshot()), next = rows.find(r => !r.done);
    return `<ol class="guidewalk">${rows.map(r => `<li class="${r.done ? 'done' : r === next ? 'next' : ''}">${r.done ? '✓' : r === next ? '➜' : '○'} ${esc(r.say)}${r.done ? ` <span class="small muted">${esc(r.why)}</span>` : ''}</li>`).join('')}</ol>
      ${next ? '' : '<p class="small">Everything is drawn. Set the conditions, then gather what the forces say.</p>'}`;
  }
  function askHTML(g, key){
    const done = st.q[key] || {};
    const i = g.ask.findIndex((_, j) => !(j in done && done[j].ok));
    return g.ask.map((q, j) => {
      const a = done[j];
      if (j > i && i >= 0) return '';
      return `<div class="guideq" data-q="${j}"><p class="small"><b>${esc(q.q)}</b></p>
        <div class="row">${q.options.map((o, k) => `<button class="dfmini" data-gq="${j}:${k}" aria-pressed="${!!a && a.k === k}">${esc(o.t)}</button>`).join('')}</div>
        ${a ? `<p class="small ${a.ok ? 'guideok' : 'guidebad'}" role="status">${a.ok ? '✓' : '✗'} ${esc(a.text)}</p>` : ''}</div>`;
    }).join('') + (i < 0 ? '<p class="small">Both answered. Now gather the equations that say it.</p>' : '');
  }
  function demoHTML(){
    const d = st.demo, s = d.steps[d.i];
    return `<div class="row"><b>Demo</b><span class="small muted">step ${d.i + 1} of ${d.steps.length}</span><button class="dfmini" id="demoStop">Stop the demo</button></div>
      <p class="small" id="demoText">${s.text}</p>
      <div class="row">${d.i < d.steps.length - 1 ? '<button id="demoNext" class="go">Next ▶</button>' : '<button id="demoDone" class="go">Now do it on my problem</button>'}</div>`;
  }
  function render(){
    card.hidden = false;
    if (st.demo){ card.innerHTML = demoHTML(); return; }
    const g = app.stopGuide();
    let body = '';
    if (st.level === 'demo') body = `<p class="small">New here? Watch the app solve a short example first, naming each control and why. Or pick a level above.</p>`;
    else if (st.level === 'walk' && g) body = walkHTML(g);
    else if (st.level === 'prompt' && g) body = askHTML(g, app.stopKey());
    else if (st.level !== 'own') body = '<p class="small muted">This problem has no guide questions yet; Hint and the “What am I looking for?” sheet still help.</p>';
    card.innerHTML = levelBar() + (st.note ? `<p class="small ${st.note.ok ? 'guideok' : 'guidebad'}" id="guideNote" role="status">${st.note.ok ? '✓' : '✗'} ${esc(st.note.text)}</p>` : '') + body;
  }

  // ---- the demo: a scripted example, one Next at a time; each step does what it says with the app's own controls
  async function startDemo(){
    const steps = await app.demo.begin();
    if (!steps) return;
    st.demo = { steps, i: 0 }; render(); await enter();
  }
  async function enter(){
    const d = st.demo, s = d.steps[d.i];
    app.highlight(s.target);
    if (s.run){ const r = await app.demo.run(s); if (r && r.more) d.steps.splice(d.i + 1, 0, ...r.more); }
    app.highlight(s.target);
    render();
  }
  async function endDemo(handBack){
    st.demo = null; app.highlight(null);
    st.demoSeen = true; if (st.level === 'demo') st.level = 'walk'; save();
    if (handBack) await app.demo.end();
    render();
  }
  card.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.glevel){ st.level = b.dataset.glevel; st.note = null; save(); render(); return; }
    if (b.id === 'guideDemo') return startDemo();
    if (b.id === 'guideClear'){ try { localStorage.removeItem(KEY); } catch {} Object.assign(st, { level: 'demo', demoSeen: false, q: {} }); render(); app.say('Guide forgotten on this device: back to the start.'); return; }
    if (b.id === 'demoNext'){ if (st.demo.busy) return; st.demo.busy = true; st.demo.i++; await enter(); st.demo.busy = false; render(); return; }
    if (b.id === 'demoDone') return endDemo(true);
    if (b.id === 'demoStop') return endDemo(false);
    if (b.dataset.gq){
      const [j, k] = b.dataset.gq.split(':').map(Number), g = app.stopGuide(), key = app.stopKey();
      const r = askJudge(g.ask[j], k); if (!r) return;
      st.q[key] = { ...(st.q[key] || {}), [j]: { ...r, k } }; st.note = r;
      r.ok ? correct() : wrong(); render();
    }
  });

  return { render, correct, wrong, setLevel, state: () => ({ level: st.level, demoSeen: st.demoSeen, demo: !!st.demo, answered: st.q }), get level(){ return st.level; } };
}
