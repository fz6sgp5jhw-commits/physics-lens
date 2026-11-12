// Physics Lens — the notebook: saved problems, with or without a drawing, kept on this device only.
// One record per problem (plan section 6). `v` is the format version; `migrate[v]` upgrades an older record on load.
// Everything read back (localStorage or an imported file) is untrusted: records are validated field by field,
// and typed text only ever reaches the page through textContent.

export const KEY = 'pl-notebook', VERSION = 1;
const LETTERS = 'abcdefgh';

// ---- validation helpers: keep only what has the right type and size
const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x, max = 4000) => typeof x === 'string' ? x.slice(0, max) : '';
const num = (x) => typeof x === 'number' && Number.isFinite(x);
const word = (x) => typeof x === 'string' && /^\w{1,40}$/.test(x);
const date = (x) => typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : new Date().toISOString();
// a quantity id, or a target built on one (fn:x, rank:x)
const baseId = (id) => typeof id === 'string' ? id.replace(/^(fn|rank):/, '') : '';

// drawing data goes back into the canvas, so it may hold only numbers, yes/no and short strings
// with no markup characters, at most 8 levels deep
function plainData(x, depth = 0){
  if (depth > 8) return false;
  if (x === null || typeof x === 'boolean' || num(x)) return true;
  if (typeof x === 'string') return x.length <= 80 && !/[<>&"'`]/.test(x);
  if (Array.isArray(x)) return x.length <= 400 && x.every(y => plainData(y, depth + 1));
  if (obj(x)) return Object.keys(x).length <= 60 && Object.entries(x).every(([k, y]) => plainData(k, depth + 1) && plainData(y, depth + 1));
  return false;
}

// older formats, each upgraded to the next
export const migrate = {
  // v0, before records had a version: `unit`, `problem`, `cond`, `targets`, `saved`
  0: (r) => ({
    v: 1, id: r.id, title: r.title, chapter: r.unit, objectives: [], text: r.problem,
    parts: (Array.isArray(r.targets) ? r.targets : []).map((t, i) => ({ label: LETTERS[i] || String(i + 1), target: t })),
    givens: r.givens, conds: r.cond, condOk: !!r.condOk, drawing: r.drawing ?? null, board: null, steps: [], laws: [],
    notes: r.notes ?? '', created: r.saved, updated: r.saved,
  }),
};
export function upgrade(r){
  if (!obj(r)) return null;
  let v = Number.isInteger(r.v) ? r.v : 0;
  while (v < VERSION){ if (!migrate[v]) return null; r = migrate[v](r); v = r.v; }
  return v === VERSION ? r : null;
}

const GIVEN_FROM = ['you', 'drawing'];
function cleanGivens(g, vars){
  const out = {};
  if (!obj(g)) return out;
  for (const [id, x] of Object.entries(g)){
    const q = vars[id];
    if (!q || !obj(x) || !GIVEN_FROM.includes(x.from) || !num(x.val)) continue;
    const unit = typeof x.unit === 'string' && (x.unit === q.unit || (q.units && x.unit in q.units)) ? x.unit : q.unit;
    const y = { from: x.from, mag: num(x.mag) ? x.mag : null, unit, dir: x.dir === 1 ? 1 : 0, val: x.val };
    if (x.kind === 'symbol') y.kind = 'symbol';
    if (typeof x.moment === 'string' && word(x.moment) || typeof x.moment === 'boolean') y.moment = x.moment;
    if (y.kind !== 'symbol' && y.mag === null) continue;
    out[id] = y;
  }
  return out;
}

export const CARD_TYPES = ['quantity', 'equation', 'note', 'state'];
export const CARD_STATES = ['given', 'found', 'target', 'unknown'];
export function cleanBoard(b){
  if (!obj(b) || !Array.isArray(b.cards)) return null;
  const cards = [];
  for (const c of b.cards.slice(0, 200)){
    if (!obj(c) || typeof c.id !== 'string' || !/^[\w:.-]{1,60}$/.test(c.id) || !CARD_TYPES.includes(c.type) || cards.some(d => d.id === c.id)) continue;
    const d = { id: c.id, type: c.type, x: num(c.x) ? c.x : 0, y: num(c.y) ? c.y : 0 };
    if (word(c.ref)) d.ref = c.ref;
    if (CARD_STATES.includes(c.state)) d.state = c.state;
    if (word(c.kind)) d.kind = c.kind;
    if (c.pinned === true) d.pinned = true;
    for (const k of ['text', 'value', 'label']) if (typeof c[k] === 'string') d[k] = text(c[k], 500);
    if (c.type === 'state'){ d.w = num(c.w) ? Math.max(120, Math.min(800, c.w)) : 220; d.h = num(c.h) ? Math.max(80, Math.min(600, c.h)) : 160; }
    cards.push(d);
  }
  const ids = new Set(cards.map(c => c.id));
  const arrows = (Array.isArray(b.arrows) ? b.arrows : []).slice(0, 400)
    .filter(a => obj(a) && ids.has(a.from) && ids.has(a.to) && a.from !== a.to)
    .map(a => ({ from: a.from, to: a.to, ...(typeof a.label === 'string' && a.label ? { label: text(a.label, 60) } : {}) }));
  return { cards, arrows };
}

// one record, upgraded and checked against this app's units, quantities and equations; null if it can't be used
// ctx: { chapters, vars, eqs }
export function validate(raw, ctx){
  const r = upgrade(raw);
  if (!r || typeof r.id !== 'string' || !/^[\w-]{1,60}$/.test(r.id) || !ctx.chapters[r.chapter]) return null;
  const conds = {};
  if (obj(r.conds)) for (const [k, v] of Object.entries(r.conds)) if (word(k) && (typeof v === 'boolean' || word(v))) conds[k] = v;
  const parts = (Array.isArray(r.parts) ? r.parts : []).filter(p => obj(p) && ctx.vars[baseId(p.target)]).slice(0, 8)
    .map((p, i) => ({ label: LETTERS[i], target: p.target }));
  let drawing = r.drawing ?? null;
  if (drawing !== null && !(obj(drawing) && Array.isArray(drawing.shapes) && plainData(drawing))) drawing = null;
  return {
    v: VERSION, id: r.id, title: text(r.title, 120).trim() || 'Untitled problem', chapter: r.chapter,
    objectives: (Array.isArray(r.objectives) ? r.objectives : []).map(o => text(o, 80).trim()).filter(Boolean).slice(0, 12),
    text: text(r.text, 8000), parts, givens: cleanGivens(r.givens, ctx.vars), conds, condOk: r.condOk === true,
    drawing, board: cleanBoard(r.board),
    steps: (Array.isArray(r.steps) ? r.steps : []).filter(obj).slice(0, 60).map(s => ({ title: text(s.title, 200), eq: word(s.eq) ? s.eq : null, v: baseId(s.v) && ctx.vars[baseId(s.v)] ? s.v : null })),
    laws: (Array.isArray(r.laws) ? r.laws : []).filter(e => word(e) && ctx.eqs[e] && !ctx.eqs[e].generated).slice(0, 60),
    notes: text(r.notes, 8000), created: date(r.created), updated: date(r.updated),
  };
}

// the stored notebook: { v, problems: [...] } (a bare array is read as version 0 storage)
export function readAll(ctx, store = globalThis.localStorage){
  let raw = null;
  try { raw = JSON.parse(store.getItem(KEY) || 'null'); } catch { return { problems: [], changed: false }; }
  const list = Array.isArray(raw) ? raw : obj(raw) && Array.isArray(raw.problems) ? raw.problems : [];
  const problems = list.map(r => validate(r, ctx)).filter(Boolean);
  const changed = list.some(r => !obj(r) || r.v !== VERSION) || problems.length !== list.length;
  return { problems, changed };
}
export function writeAll(problems, store = globalThis.localStorage){
  try { store.setItem(KEY, JSON.stringify({ v: VERSION, problems })); return true; } catch { return false; }
}

// search by unit (chapter), law used, objective and words in the title, text or notes
export function search(problems, { chapter = '', law = '', words = '' } = {}){
  const w = words.trim().toLowerCase();
  return problems.filter(p => (!chapter || p.chapter === chapter) && (!law || p.laws.includes(law))
    && (!w || [p.title, p.text, p.notes, ...p.objectives].some(s => s.toLowerCase().includes(w))));
}

// an exported file holds the same records; import validates each and keeps the newer of two with the same id
export const exportText = (problems) => JSON.stringify({ app: 'physics-lens', kind: 'notebook', v: VERSION, problems }, null, 1);
export function importText(json, ctx){
  let raw;
  try { raw = JSON.parse(json); } catch { return { problems: [], skipped: 0, error: 'That file isn’t a notebook: it isn’t readable JSON.' }; }
  const list = Array.isArray(raw) ? raw : obj(raw) && Array.isArray(raw.problems) ? raw.problems : null;
  if (!list) return { problems: [], skipped: 0, error: 'That file isn’t a notebook: it has no list of problems.' };
  const problems = list.slice(0, 1000).map(r => validate(r, ctx)).filter(Boolean);
  return { problems, skipped: list.length - problems.length };
}
export function merge(mine, incoming){
  const out = [...mine];
  for (const p of incoming){
    const i = out.findIndex(q => q.id === p.id);
    if (i < 0) out.push(p); else if (Date.parse(p.updated) >= Date.parse(out[i].updated)) out[i] = p;
  }
  return out;
}

export const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---- the drawer: save form, search, list, export / import / clear
// capture(meta) → a record of the current problem; open(record) → loads it; ask(title, html, yes) → Promise<boolean>
// esc: app.js's escaper for the dialog; lawLabel(id) → plain text
export function createNotebook({ panel, ctx, capture, open, ask, say, esc, lawLabel }){
  let { problems, changed } = readAll(ctx);
  if (changed) writeAll(problems);
  let current = null; // the id of the record the workspace came from
  const q = { chapter: '', law: '', words: '' };
  const el = (tag, props = {}, kids = []) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };

  function persist(){
    if (writeAll(problems)) return true;
    say('Your notebook couldn’t be saved: this browser’s storage for the app is full. Export it as a file, then delete some problems.');
    return false;
  }
  function save(asNew){
    const f = panel.querySelector('.nbform');
    const meta = { title: f.querySelector('[name=title]').value, objectives: f.querySelector('[name=objectives]').value.split(',').map(s => s.trim()).filter(Boolean), notes: f.querySelector('[name=notes]').value };
    const old = !asNew && current && problems.find(p => p.id === current);
    const rec = validate({ ...capture(meta), id: old ? old.id : newId(), created: old ? old.created : new Date().toISOString(), updated: new Date().toISOString() }, ctx);
    if (!rec){ say('This problem can’t be saved yet: pick a unit first.'); return; }
    problems = old ? problems.map(p => p.id === rec.id ? rec : p) : [...problems, rec];
    if (!persist()) return;
    current = rec.id; render();
    say(`Saved “${rec.title}” in your notebook${rec.drawing ? ', with its drawing' : ''}${rec.board ? ' and board' : ''}. It stays on this device; use <b>Export</b> to keep a copy.`);
  }
  function download(){
    const url = URL.createObjectURL(new Blob([exportText(problems)], { type: 'application/json' }));
    const a = el('a', { href: url, download: `physics-lens-notebook-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    say(`Exported ${problems.length} problem${problems.length === 1 ? '' : 's'} as a file. Import it on any device to bring them back.`);
  }
  async function load(file){
    const res = importText(await file.text(), ctx);
    if (res.error){ say(res.error); return; }
    problems = merge(problems, res.problems); persist(); render();
    say(`Imported ${res.problems.length} problem${res.problems.length === 1 ? '' : 's'}${res.skipped ? `; ${res.skipped} couldn’t be read and ${res.skipped === 1 ? 'was' : 'were'} skipped` : ''}.`);
  }
  async function clearAll(){
    if (!problems.length) return;
    if (!await ask('Clear notebook?', `<b>THIS DELETES ${problems.length} SAVED PROBLEM${problems.length > 1 ? 'S' : ''}</b>They are stored only on this device, so they can’t be brought back unless you exported them. Export first if you want a copy.`, 'Delete them all')) return;
    problems = []; current = null;
    try { globalThis.localStorage.removeItem(KEY); } catch {}
    render(); say('Your notebook is empty. Nothing about it is left on this device.');
  }
  async function remove(id){
    const p = problems.find(x => x.id === id); if (!p) return;
    if (!await ask('Delete this problem?', `<b>DELETE ONE SAVED PROBLEM</b>“${esc(p.title)}” will be gone from this device.`, 'Delete')) return;
    problems = problems.filter(x => x.id !== id); if (current === id) current = null;
    persist(); render();
  }

  function itemNode(p){
    const ch = ctx.chapters[p.chapter];
    const meta = [ch ? ch.title : p.chapter, p.drawing ? 'drawing' : 'no drawing', p.board ? 'board' : '', p.steps.length ? `${p.steps.length} step${p.steps.length > 1 ? 's' : ''}` : '', new Date(p.updated).toLocaleDateString()].filter(Boolean).join(' · ');
    const kids = [el('b', { textContent: p.title }), el('div', { className: 'small muted', textContent: meta })];
    if (p.laws.length) kids.push(el('div', { className: 'nblaws', textContent: 'Laws: ' + p.laws.map(lawLabel).join(', ') }));
    if (p.objectives.length) kids.push(el('div', { className: 'small', textContent: 'Objectives: ' + p.objectives.join(', ') }));
    if (p.text) kids.push(el('div', { className: 'btxt', textContent: p.text.length > 160 ? p.text.slice(0, 160) + '…' : p.text }));
    if (p.notes) kids.push(el('div', { className: 'small nbnotes', textContent: 'Notes: ' + p.notes }));
    const go = el('button', { className: 'go', textContent: 'Open', title: 'Open this problem in the workspace' });
    go.dataset.nbopen = p.id;
    go.onclick = async () => { if (await open(p)){ current = p.id; render(); } };
    const del = el('button', { textContent: 'Delete', title: 'Delete this saved problem' });
    del.dataset.nbdel = p.id;
    del.onclick = () => remove(p.id);
    const item = el('div', { className: 'bitem nbitem' + (p.id === current ? ' cur' : '') }, [el('div', {}, kids), el('div', { className: 'nbbtns' }, [go, del])]);
    item.dataset.nbid = p.id;
    return item;
  }
  function renderList(){
    const list = panel.querySelector('.nblist'), hits = search(problems, q);
    list.replaceChildren(...hits.map(itemNode));
    if (!hits.length) list.append(el('p', { className: 'small muted', textContent: problems.length ? 'No saved problem matches.' : 'No saved problems yet. Set up a problem, then press Save.' }));
    panel.querySelector('.nbcount').textContent = `${hits.length} of ${problems.length}`;
  }
  function render(){
    const laws = [...new Set(problems.flatMap(p => p.laws))].sort();
    const chSel = panel.querySelector('[name=chapter]'), lawSel = panel.querySelector('[name=law]');
    chSel.replaceChildren(el('option', { value: '', textContent: 'All units' }), ...Object.entries(ctx.chapters).map(([k, c]) => el('option', { value: k, textContent: c.title })));
    lawSel.replaceChildren(el('option', { value: '', textContent: 'Any law' }), ...laws.map(e => el('option', { value: e, textContent: lawLabel(e) })));
    if (!laws.includes(q.law)) q.law = '';
    chSel.value = q.chapter; lawSel.value = q.law;
    panel.querySelector('#nbUpdate').hidden = !(current && problems.some(p => p.id === current));
    renderList();
  }
  // fill the save form from the current problem (the title from its first line)
  function prefill(){
    const f = panel.querySelector('.nbform'), p = current && problems.find(x => x.id === current);
    const c = capture({});
    f.querySelector('[name=title]').value = p ? p.title : (c.text || '').split('\n')[0].slice(0, 80);
    f.querySelector('[name=objectives]').value = p ? p.objectives.join(', ') : '';
    f.querySelector('[name=notes]').value = p ? p.notes : '';
  }

  panel.innerHTML = `
    <form class="nbform" autocomplete="off">
      <label>Title <input name="title" maxlength="120" placeholder="e.g. Disc and hanging mass"></label>
      <label>Objectives <input name="objectives" maxlength="400" placeholder="comma separated, e.g. rolling, energy"></label>
      <label>Notes <textarea name="notes" rows="2" maxlength="8000" placeholder="Reminders, formulas, what tripped you up"></textarea></label>
      <div class="row"><button type="button" class="go" id="nbSave">Save as new</button><button type="button" id="nbUpdate" hidden>Update the open one</button></div>
    </form>
    <div class="nbsearch"><select name="chapter" aria-label="Unit"></select><select name="law" aria-label="Law used"></select><input name="words" type="search" placeholder="Search words" aria-label="Search words"><span class="small muted nbcount"></span></div>
    <div class="nblist"></div>
    <div class="row nbfoot"><button type="button" id="nbExport" title="Save every problem as a file you keep">Export</button><button type="button" id="nbImport" title="Bring problems back from an exported file">Import</button><input type="file" id="nbFile" accept=".json,application/json" hidden><button type="button" id="nbClear" class="warnbtn" title="Delete every saved problem from this device">Clear notebook</button></div>
    <p class="small muted">Saved only on this device (no account, nothing sent anywhere). Export a file to back it up or move it.</p>`;
  panel.querySelector('#nbSave').onclick = () => save(true);
  panel.querySelector('#nbUpdate').onclick = () => save(false);
  panel.querySelector('#nbExport').onclick = download;
  panel.querySelector('#nbImport').onclick = () => panel.querySelector('#nbFile').click();
  panel.querySelector('#nbFile').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) load(f); };
  panel.querySelector('#nbClear').onclick = clearAll;
  panel.querySelector('[name=chapter]').onchange = (e) => { q.chapter = e.target.value; renderList(); };
  panel.querySelector('[name=law]').onchange = (e) => { q.law = e.target.value; renderList(); };
  panel.querySelector('[name=words]').oninput = (e) => { q.words = e.target.value; renderList(); };
  panel.querySelector('.nbform').onsubmit = (e) => e.preventDefault();
  render();

  return {
    render, prefill,
    get problems(){ return problems; },
    get current(){ return current; },
    // a new problem in the workspace (Clear all): saving makes a new record
    forget(){ current = null; render(); },
  };
}
