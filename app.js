import { VARS, EQS, CHAPTERS, PRACTICE, V, fmt } from './data.js';
import * as SP from './sprites.js';

const $ = (id) => document.getElementById(id);
const S = window.__rl = {
  ch: 'incline', cond: {}, condOk: false, givens: {}, found: {}, targets: [], sheet: [], path: [],
  bank: null, editing: null, focus: [], hot: [], hover: null, busy: false, sound: false, anim: false, inspectName: null, lastStep: 0,
};

// ---------- state helpers ----------
const chapter = () => CHAPTERS[S.ch];
const K = () => chapter().kin;
const chVars = () => [...chapter().vars, ...(S.cond.rim ? chapter().rimVars || [] : [])];
const sectionOk = (sec) => !sec.applies || sec.applies(S.cond);
const chEqs = () => chapter().sections.flatMap(sec => sec.eqs.map(e => ({ e, sec })));
const applies = (e) => { const sec = chapter().sections.find(s => s.eqs.includes(e)); return (!sec || sectionOk(sec)) && (!EQS[e].applies || EQS[e].applies(S.cond)); };
const naReason = (e) => { const sec = chapter().sections.find(s => s.eqs.includes(e)); if (sec && !sectionOk(sec)) return sec.needs; return EQS[e].needs || ''; };
const appEqs = () => chEqs().map(x => x.e).filter(applies);
const known = (id) => id in S.givens || id in S.found;
const val = (id) => id in S.givens ? S.givens[id].val : id in S.found ? S.found[id].val : undefined;
const vals = () => { const o = {}; for (const id of chVars()) if (known(id)) o[id] = val(id); if (S.ch === 'incline') o.__u0sign = S.cond.up ? -1 : 1; return o; };
const curTarget = () => S.targets.find(t => !known(t)) || null;
const stateOf = (id) => id in S.givens ? 'given' : id in S.found ? 'found' : S.targets.includes(id) ? 'target' : 'unknown';
const knownSet = () => new Set(chVars().filter(known));
const unknownsOf = (e, ks) => EQS[e].vars.filter(v => !ks.has(v));
const solvable = (e, ks) => { const u = unknownsOf(e, ks); return u.length === 1 && EQS[e].solve[u[0]] ? u[0] : null; };
const plain = (id) => VARS[id].plain;
const nm = (id) => (chapter().names && chapter().names[id]) || VARS[id].name;
const dr = (id) => (chapter().dirs && chapter().dirs[id]) || VARS[id].dir;
const unitOf = (id) => VARS[id].unit;
const calm = () => document.body.classList.contains('calm');
const userGivens = () => Object.values(S.givens).filter(g => g.from === 'you').length;
const letter = (i) => '(' + 'abcdefgh'[i] + ')';

function shortest(eqList, from, target){
  if (!target) return null;
  if (from.has(target)) return [];
  const key = (s) => [...s].sort().join(',');
  const seen = new Set([key(from)]);
  let frontier = [{ k: from, path: [] }];
  for (let depth = 0; depth < 14 && frontier.length; depth++){
    const next = [];
    for (const { k, path } of frontier){
      for (const e of eqList){
        const u = solvable(e, k); if (!u) continue;
        const k2 = new Set(k); k2.add(u);
        const p2 = [...path, { eq: e, v: u }];
        if (u === target) return p2;
        const kk = key(k2); if (seen.has(kk)) continue; seen.add(kk);
        next.push({ k: k2, path: p2 });
      }
    }
    frontier = next;
  }
  return null;
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

// ---------- mascot ----------
let sayTimer = 0;
function say(html){
  clearTimeout(sayTimer); sayTimer = setTimeout(() => $('bubble').classList.add('hide'), 15000);
  const b = $('bubble'); b.classList.remove('hide'); b.innerHTML = html + '<span class="x" title="Hide">×</span>';
  b.querySelector('.x').onclick = () => b.classList.add('hide');
}
function setSpin(rate){
  const w = Math.abs(rate || 0), cow = $('cowSlot');
  if (w < 0.05) cow.style.animationPlayState = 'paused';
  else { cow.style.animationPlayState = 'running'; cow.style.setProperty('--cow-period', Math.min(20, Math.max(0.25, 2 * Math.PI / w)) + 's'); cow.style.animationDirection = rate < 0 ? 'reverse' : 'normal'; }
  document.querySelector('.wheel-gag svg.wheel').style.setProperty('--wheel-period', w < 0.05 ? '9999s' : Math.min(12, Math.max(0.2, 2 * Math.PI / w)) + 's');
}

// ---------- dialog ----------
function dialog(title, msg, good = false){
  $('dlgTitle').textContent = title;
  $('dlgMsg').innerHTML = msg;
  $('dlg').querySelector('.titlebar').style.background = good ? 'linear-gradient(90deg,#0a6b2a,#2bd14a)' : '';
  $('bonk').innerHTML = good ? `<span class="head">${SP.cow(2)}</span>` : `<span class="apple">${SP.apple(3)}</span><span class="head">${SP.bonkHead(3)}</span><span class="stars">✶✶</span>`;
  $('dlg').classList.add('show'); $('dlgOk').focus();
  good ? fanfare() : beep(180, 0.25, 'sawtooth');
}
$('dlgOk').onclick = () => $('dlg').classList.remove('show');
document.addEventListener('keydown', (e) => { if (e.key === 'Escape'){ $('dlg').classList.remove('show'); $('bank').classList.remove('show'); } });

// ---------- chapter / reset ----------
function defaultsFor(ch){ return ch === 'incline' ? { friction: false, up: false, earth: true } : ch === 'pulley' ? { friction: false, earth: true } : { rim: false }; }
function switchChapter(ch){ S.ch = ch; S.cond = defaultsFor(ch); resetAll(false); }
function resetAll(keepText = true){
  S.givens = {}; S.found = {}; S.targets = []; S.sheet = []; S.path = []; S.focus = []; S.condOk = false; S.editing = null; S.inspectName = null;
  if (!keepText){ $('problem').value = ''; S.bank = null; }
  S.cond = { ...defaultsFor(S.ch), ...Object.fromEntries(Object.entries(S.cond).filter(([k]) => k in defaultsFor(S.ch))) };
  applyHidden(); clearWork(); resetInspector();
}
function clearDerived(){ S.found = {}; S.path = []; clearWork(); }
function clearWork(){ $('work').innerHTML = '<div class="empty">Gather equations onto your sheet, pick a target, then solve a glowing equation. Its algebra appears here, one step at a time.</div>'; $('workTitle').textContent = '6. Work'; }

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
  $('axisNote').innerHTML = chapter().axis;
  $('checkRow').style.display = S.bank ? 'flex' : 'none';
  $('bankTitle').textContent = S.bank ? `Practice: ${S.bank.title}` : '';
}
function describe(id, g){
  const d = VARS[id];
  const dirTxt = dr(id) ? ` ${dr(id)[g.dir]} <span class="small muted">(${g.dir ? '−' : '+'})</span>` : '';
  return `${fmt(g.mag)} ${g.unit === 'no unit' ? '' : g.unit}${dirTxt}`;
}
function renderKnowns(){
  const box = $('knowns'); box.innerHTML = '';
  const ids = chVars().filter(known);
  if (!ids.length){ box.innerHTML = '<div class="small muted">Nothing yet. Read the problem and add each quantity it gives you.</div>'; }
  for (const id of ids){
    const g = S.givens[id], f = S.found[id];
    const row = document.createElement('div'); row.className = 'known ' + (f ? 'found' : g.from === 'condition' ? 'cond' : ''); row.dataset.v = id;
    let txt, sub, act = '';
    if (f){ txt = `${fmt(f.val)} ${unitOf(id)}`; sub = `found in step ${f.step}`; }
    else { txt = describe(id, g); sub = g.from === 'condition' ? `from condition: ${g.why}` : nm(id); act = g.from === 'you' ? `<button data-edit="${id}" title="Edit">✎</button><button data-del="${id}" title="Remove">×</button>` : ''; }
    row.innerHTML = `<div class="vsym">${VARS[id].sym}</div><div><div class="kv">${VARS[id].sym} = ${txt}</div><div class="kd">${sub}</div></div><div class="kact">${act}</div>`;
    row.addEventListener('mouseenter', () => setHover(id)); row.addEventListener('mouseleave', () => setHover(null));
    box.appendChild(row);
  }
  box.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openEditor(b.dataset.edit));
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { delete S.givens[b.dataset.del]; clearDerived(); renderAll(false); });
  const pal = $('palette'); pal.innerHTML = '';
  for (const id of chVars()){
    if (known(id)) continue;
    const b = document.createElement('button'); b.innerHTML = `+ ${VARS[id].sym}<small>${nm(id)}</small>`; b.title = `Add ${nm(id)}`;
    b.onclick = () => openEditor(id); pal.appendChild(b);
  }
  renderEditor();
}
function openEditor(id){ if (S.busy) return; const g = S.givens[id]; S.editing = { id, mag: g ? g.mag : '', unit: g ? g.unit : (Object.keys(VARS[id].units)[0]), dir: g ? g.dir : 0 }; renderEditor(); setTimeout(() => $('edVal')?.focus(), 0); }
function renderEditor(){
  const slot = $('editorSlot');
  if (!S.editing){ slot.innerHTML = ''; return; }
  const { id, mag, unit, dir } = S.editing, d = VARS[id];
  slot.innerHTML = `<div class="editor"><div><b>${d.sym}</b>: ${nm(id)}</div>
    <div class="erow"><input id="edVal" type="text" inputmode="decimal" value="${mag}" placeholder="size"><select id="edUnit">${Object.keys(d.units).map(u => `<option ${u === unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    ${dr(id) ? `<div class="erow dirs">Direction: ${dr(id).map((w, i) => `<button data-dir="${i}" aria-pressed="${i === dir}">${w} (${i ? '−' : '+'})</button>`).join('')}</div>` : ''}
    <div class="erow"><button class="go" id="edSave">Add known</button><button id="edCancel">Cancel</button>${S.targets.includes(id) ? '<span class="small" style="color:#a00">This is one of your targets: adding it as a known removes it.</span>' : ''}</div></div>`;
  slot.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { S.editing.mag = $('edVal').value; S.editing.unit = $('edUnit').value; S.editing.dir = +b.dataset.dir; renderEditor(); });
  $('edCancel').onclick = () => { S.editing = null; renderEditor(); };
  const save = () => {
    const txt = $('edVal').value.trim().replace(',', '.'), x = Number(txt);
    if (txt === '' || !isFinite(x)){ dialog('Not a number', `<b>SYNTAX ERROR</b>Type the size as a number, like <b>12</b> or <b>2.5e3</b>. Use the direction buttons for which way it points.`); return; }
    let dirI = S.editing.dir;
    if (x < 0 && dr(id)){ dirI = 1 - dirI; say(`I flipped the direction for you: sizes are always positive, and the direction buttons carry the sign.`); }
    const u = $('edUnit').value, mag = Math.abs(x);
    if (!dr(id) && x < 0 && !['inc'].includes(id)){ dialog('Negative size?', `<b>THAT CAN’T BE NEGATIVE</b>${nm(id)} is a size with no direction, so it can’t be negative.`); return; }
    S.givens[id] = { from: 'you', mag, unit: u, dir: dirI, val: (dirI ? -1 : 1) * mag * d.units[u] };
    S.targets = S.targets.filter(t => t !== id);
    S.editing = null; clearDerived(); renderAll(false); beep(880, 0.05);
  };
  $('edSave').onclick = save;
  $('edVal').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}

// ---------- 2. conditions ----------
function renderConds(){
  const box = $('conds'); box.innerHTML = '';
  for (const c of chapter().conditions){
    const el = document.createElement('div'); el.className = 'cgroup';
    if (c.type === 'choice'){
      el.innerHTML = `<div class="clabel">${c.label}</div><div class="opts">${c.options.map(([v, w], i) => `<button data-i="${i}" aria-pressed="${!!S.cond[c.key] === v}">${w}</button>`).join('')}</div>`;
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
function setCond(key, v){
  if (S.busy) return;
  S.cond[key] = v; S.condOk = true; applyHidden(); clearDerived();
  S.sheet = S.sheet.filter(e => applies(e) || true);
  renderAll(false);
}
$('condOk').onclick = () => { S.condOk = true; renderAll(false); say('Conditions locked in. Equations that don’t fit them are now greyed out in the library, and ones you can use right now <b>glow</b>.'); };

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
      if (!ready) html += `<div class="sheet-status">${!Object.keys(S.givens).length ? 'Add your knowns (step 1) and' : ''} ${!S.condOk ? 'confirm the conditions (step 2)' : ''} to see which equations apply and which glow.</div>`;
    }
    for (const sec of ch.sections){
      html += `<div class="section-h">${sec.title}</div><div class="section-n">${sec.note}</div>`;
      for (const e of sec.eqs){
        const eq = EQS[e];
        let cls = 'lib-eq', status;
        if (!active){ status = ''; cls += ' na'; }
        else if (!S.condOk){ status = `<span>only if ${eq.condition}</span>`; }
        else if (!applies(e)){ cls += ' na'; status = `<span style="color:#a00">doesn’t apply here: needs ${naReason(e)}</span>`; }
        else {
          const u = unknownsOf(e, ks), s = solvable(e, ks);
          if (ready && s){ cls += ' lit'; status = `<span style="color:var(--hot)">★ 1 unknown: ${VARS[s].sym}</span>`; }
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
  lib.querySelectorAll('[data-gather]').forEach(b => b.onclick = () => gather(b.dataset.gather));
  const fb = $('focusbar');
  if (S.focus.length){ fb.classList.add('show'); fb.innerHTML = `Equations with ${S.focus.map(V).join(', ')}<button id="unfocus">Show all ×</button>`; $('unfocus').onclick = () => { S.focus = []; renderLibrary(); paintSyms(); }; }
  else fb.classList.remove('show');
}
function gather(e){
  if (S.busy) return;
  if (S.sheet.includes(e)){ S.sheet = S.sheet.filter(x => x !== e); renderAll(false); return; }
  if (S.condOk && !applies(e)){ dialog('Illegal operation', `<b>DOESN’T APPLY HERE</b>${EQS[e].label} only holds when: <b>${EQS[e].condition}</b>. Your conditions say otherwise, so using it would give a wrong answer. Check step 2 if you think the conditions are wrong.`); return; }
  S.sheet.push(e); beep(990, 0.05); renderAll(false);
}

// ---------- 4–5. sheet + targets ----------
function renderTargets(){
  const box = $('targets');
  const opts = chVars().filter(id => !known(id) && !S.targets.includes(id));
  box.innerHTML = `<span class="small"><b>🎯 The question asks for:</b></span>` + S.targets.map((t, i) => `<span class="tchip ${known(t) ? 'done' : t === curTarget() ? 'current' : ''}">${letter(i)} ${VARS[t].sym}${known(t) ? ` = ${fmt(val(t))} ${unitOf(t)}` : ''}<button data-rmt="${t}" title="Remove target">×</button></span>`).join('')
    + `<select id="addTarget"><option value="">+ add a target…</option>${opts.map(id => `<option value="${id}">${VARS[id].plain}: ${nm(id)}</option>`).join('')}</select>`;
  box.querySelectorAll('[data-rmt]').forEach(b => b.onclick = () => { S.targets = S.targets.filter(t => t !== b.dataset.rmt); renderAll(false); });
  $('addTarget').onchange = (e) => { const id = e.target.value; if (!id) return; addTarget(id); };
}
function addTarget(id){
  if (S.targets.includes(id) || known(id)) return;
  S.targets.push(id); renderAll(false);
  say(`🎯 Target ${letter(S.targets.length - 1)}: <b>${VARS[id].sym}</b>, the ${nm(id)}. ${S.sheet.length ? 'Look for a glowing equation on your sheet.' : 'Now gather equations that contain it.'}`);
}
function renderSheet(){
  const box = $('sheet'); box.innerHTML = '';
  const ks = knownSet();
  if (!S.sheet.length) box.innerHTML = '<div class="sheet-empty">Your sheet is empty. In the library, press <b>+ Gather</b> on the equations you think this problem needs.</div>';
  for (const e of S.sheet){
    const eq = EQS[e], ok = applies(e), u = unknownsOf(e, ks), s = solvable(e, ks);
    const card = document.createElement('div');
    const rel = S.focus.length && eq.vars.some(v => S.focus.includes(v));
    card.className = 'eq ' + (!ok ? 'dim' : s ? 'lit' : u.length === 0 ? 'done' : 'dim') + (S.focus.length ? (rel ? ' rel' : ' faded') : '');
    card.dataset.eq = e;
    let act;
    if (!ok) act = `<span class="small" style="color:#a00">Doesn’t apply now (needs ${naReason(e)})</span>`;
    else if (s) act = `<button class="go" data-solve="${s}">Solve for ${VARS[s].sym} ▶</button>${s === curTarget() ? '<span class="small" style="color:var(--hot)">← target!</span>' : ''}`;
    else if (u.length === 0) act = `<button data-check="1">Check ✓</button><span class="small muted">All known.</span>`;
    else act = `<span class="small muted">Still missing: ${u.map(x => VARS[x].sym).join(', ')}</span>`;
    card.innerHTML = `<button class="rm" data-rm="1" title="Remove from sheet">×</button><div class="eqhead"><span class="eqlabel">${eq.label}</span><span class="cond">only if ${eq.condition}</span></div>
      <div class="form">${eq.form}</div><div class="act">${act}</div>`;
    card.addEventListener('click', (ev) => {
      if (S.busy) return;
      if (ev.target.closest('[data-rm]')){ S.sheet = S.sheet.filter(x => x !== e); renderAll(false); return; }
      const sb = ev.target.closest('[data-solve]'); if (sb){ solve(e, sb.dataset.solve); return; }
      if (ev.target.closest('[data-check]')){ check(e); return; }
      if (ev.target.closest('.sym')) return;
      if (ok && u.length > 1) dialog('Illegal operation', `<b>TOO MANY UNKNOWNS</b>${eq.label} still has <b>${u.length}</b> unknowns: ${u.map(x => VARS[x].sym).join(' and ')}. One equation can only pin down one unknown. Find one of them first and this one will light up.`);
    });
    box.appendChild(card);
  }
  // status line
  const st = $('sheetStatus'), cur = curTarget();
  if (!S.targets.length) st.innerHTML = 'Pick what the question asks for with <b>🎯 add a target</b>.';
  else if (!cur) st.innerHTML = '🎉 Every target is found. Press <b>Replay motion</b> to watch it.';
  else {
    const sp = shortest(S.sheet.filter(applies), ks, cur), lp = shortest(appEqs(), ks, cur);
    const tl = `${letter(S.targets.indexOf(cur))} ${VARS[cur].sym}`;
    if (sp) st.innerHTML = `Your sheet can reach ${tl} in <b>${sp.length}</b> step${sp.length > 1 ? 's' : ''}.`;
    else if (lp) st.innerHTML = `Your sheet can’t reach ${tl} yet. Gather more from the library (or ask the 🐄 for a hint).`;
    else st.innerHTML = `Even the whole library can’t reach ${tl} yet. Is there a hidden given or a condition to set?`;
    const sys = (chapter().systems || []).find(x => x.eqs.every(e => S.sheet.includes(e) && applies(e)) && x.pair.every(id => !known(id)) && x.eqs.every(e => unknownsOf(e, ks).every(u => x.pair.includes(u))));
    if (sys){
      st.innerHTML += `<div style="margin-top:6px;color:#fff;background:#3a0ca3;padding:6px 8px">🧩 ${sys.text}${S.sheet.includes(sys.gives) ? '' : ` <button class="go" id="sysBtn" style="margin-left:4px">Combine them → gather ${EQS[sys.gives].label}</button>`}</div>`;
      const b = $('sysBtn'); if (b) b.onclick = () => { S.sheet.push(sys.gives); beep(990, 0.05); renderAll(false); say(`Combined! <b>${EQS[sys.gives].label}</b> has only one unknown now, so it glows. Solve it, then go back to T5 or T6 for the other unknown.`); };
    }
  }
}

// ---------- steps tracker ----------
function steps(){
  const s = [
    ['Unit', true], ['Givens', userGivens() > 0], ['Conditions', S.condOk], ['Gather', S.sheet.length > 0], ['Target', S.targets.length > 0], ['Path', S.targets.length > 0 && !curTarget()],
  ];
  const now = s.findIndex(x => !x[1]);
  $('steps').innerHTML = s.map(([n, d], i) => `<span class="${d ? 'done' : i === now ? 'now' : ''}"><b>${i + 1}</b>${n}${d ? ' ✓' : ''}</span>`).join('<span style="background:none;box-shadow:none">→</span>');
  if (now !== S.lastStep){
    const tips = { 1: 'Read your problem and add each quantity it gives you with the <b>+</b> buttons. Pick a direction for vectors.', 2: 'Now the <b>conditions</b>: friction or not, which way it moves, and any hidden givens like “starts from rest”.', 3: 'Look through the <b>library</b>. Equations that glow have one unknown left. <b>Gather</b> the ones you think you need.', 4: 'What does the question ask for? Add it as a <b>🎯 target</b> on your sheet.', 5: 'Build the path: solve a glowing equation on your sheet. Each answer can light up the next.' };
    if (tips[now] && S.lastStep !== -1) say(tips[now]);
    S.lastStep = now;
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
async function solve(eqId, target){
  const eq = EQS[eqId], sol = eq.solve[target], v = vals();
  let res = sol.f(v); if (typeof res === 'number') res = { value: res };
  if (res.error){ dialog('Math says no', `<b>CAN’T SOLVE THAT</b>${res.error}`); return; }
  if (target === 't' && res.value < 0){ dialog('Time travel detected', `<b>NEGATIVE TIME!</b>That gives t = ${fmt(res.value)} s: it would have had to happen before the clock started. Check the directions of your givens.`); return; }
  if (['m', 'W', 'N', 'mu', 'f', 'g'].includes(target) && res.value < 0){ dialog('Impossible value', `<b>NEGATIVE ${plain(target).toUpperCase()}?!</b>That gives ${plain(target)} = ${fmt(res.value)}, but it’s a size and can’t be negative. Check the directions and the conditions (is friction really slowing it this way?).`); return; }
  S.busy = true;
  const cur = curTarget(), before = shortest(appEqs(), knownSet(), cur), step = S.path.length + 1;
  $('workTitle').textContent = `6. Work · step ${step}: ${eq.label} → ${plain(target)}`;
  const lines = [{ html: eq.form, why: `start from ${eq.label} (only if ${eq.condition})` }];
  sol.steps.forEach(s => lines.push({ html: s.eq, why: s.why }));
  if (!sol.steps.length) lines[0].why += `; it’s already solved for ${plain(target)}`;
  const work = $('work'); work.innerHTML = '<div class="section">ISOLATE (SYMBOLS FIRST)</div>';
  $('workWin').scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'nearest' });
  for (const l of lines){ const d = document.createElement('div'); d.className = 'line'; d.innerHTML = `${l.html}<span class="why">${l.why}</span>`; work.appendChild(d); paintSyms(); await sleep(30); d.classList.add('show'); beep(880, 0.04); await sleep(420); }
  const sh = document.createElement('div'); sh.className = 'section'; sh.textContent = 'PLUG IN NUMBERS (SI UNITS, SIGNS FROM DIRECTIONS)'; work.appendChild(sh);
  const d2 = document.createElement('div'); d2.className = 'line'; d2.innerHTML = `${V(target)} = ${plug(sol.sub, v)}`; work.appendChild(d2); paintSyms(); await sleep(30); d2.classList.add('show'); await sleep(420);
  const r = document.createElement('div'); r.className = 'result'; r.innerHTML = `${VARS[target].sym} = ${fmt(res.value)} ${unitOf(target)}`; work.appendChild(r);
  const ex = extras(target, res.value); if (ex){ const e2 = document.createElement('div'); e2.innerHTML = ex; work.appendChild(e2); }
  if (res.note){ const n = document.createElement('div'); n.className = 'note'; n.textContent = res.note; work.appendChild(n); }
  S.found[target] = { val: res.value, step };
  const after = shortest(appEqs(), knownSet(), curTarget());
  let fb;
  if (target === cur) fb = `🎯 That’s target ${letter(S.targets.indexOf(target))}. ${curTarget() ? `Next up: ${VARS[curTarget()].sym}.` : 'Solved!'}`;
  else if (!cur) fb = `Found ${VARS[target].sym}. Add a 🎯 target to get feedback on your route.`;
  else if (before && after && after.length < before.length) fb = `✔ Good move: one step closer. ${after.length} step${after.length > 1 ? 's' : ''} to go.`;
  else if (after) fb = `Valid algebra, but ${VARS[target].sym} doesn’t bring ${VARS[cur].sym} closer. The shortest route is still ${after.length} step${after.length > 1 ? 's' : ''}. More knowns never hurt, though.`;
  else fb = `Found ${VARS[target].sym}. The target still isn’t reachable: look for a hidden given or a condition.`;
  const f = document.createElement('div'); f.className = 'feedback'; f.innerHTML = fb; work.appendChild(f);
  S.path.push({ eq: eqId, v: target, val: res.value, html: work.innerHTML, title: $('workTitle').textContent });
  beep(1200, 0.06); S.busy = false; renderAll(false);
  if (target === cur && !curTarget()) celebrate();
}
function check(eqId){
  const eq = EQS[eqId], v = vals(), id = eq.vars.find(x => eq.solve[x]);
  let res = eq.solve[id].f(v); if (typeof res === 'number') res = { value: res };
  if (res.error){ dialog('Check failed', `<b>CAN’T CHECK</b>${res.error}`); return; }
  const actual = v[id], diff = Math.abs(res.value - actual) / Math.max(1e-9, Math.abs(actual), Math.abs(res.value));
  if (diff < 0.01) say(`✔ ${eq.label} checks out: both sides agree.`);
  else dialog('Inconsistent data', `<b>THE NUMBERS DISAGREE</b>${eq.label} predicts ${VARS[id].sym} = ${fmt(res.value)} ${unitOf(id)}, but you have ${fmt(actual)} ${unitOf(id)}. Check the directions, units and conditions.`);
}

$('hintBtn').onclick = () => {
  const cur = curTarget();
  if (!userGivens()){ say('Start with step 1: add the quantities your problem gives you.'); return; }
  if (!S.condOk){ say('Set the conditions in step 2 first. They decide which equations even apply.'); return; }
  if (!S.targets.length){ say('Add a 🎯 target on your sheet: what does the question ask for?'); return; }
  if (!cur){ say('All targets found! Press <b>Replay motion</b>.'); return; }
  const ks = knownSet(), lp = shortest(appEqs(), ks, cur);
  if (!lp){ say(chapter().stuck ? 'No route yet. ' + chapter().stuck : S.ch === 'incline' ? 'No route yet. Hidden givens? “Starts from rest” means v₀ = 0, “stops” means v = 0. Is “On Earth” ticked so g is known?' : 'No route yet. “Starts from rest” means ω₀ = 0 and “stops” means ω = 0. For a point on the rim, tick “Track a point”.'); return; }
  const sp = shortest(S.sheet.filter(applies), ks, cur);
  if (sp){ const n = sp[0]; say(`Psst… on your sheet, <b>${EQS[n.eq].label}</b> has just one unknown, <b>${VARS[n.v].sym}</b>. ${n.v === cur ? 'And it’s your target!' : 'Finding it gets you closer.'}`); return; }
  const miss = lp.find(s => !S.sheet.includes(s.eq));
  const sec = chapter().sections.find(x => x.eqs.includes(miss.eq));
  say(`Your sheet is missing a link. Look for an equation that connects <b>${EQS[miss.eq].vars.map(x => VARS[x].sym).join(', ')}</b>, in the library section “${sec.title}”.`);
};
$('cowWrap').onclick = () => $('hintBtn').click();
$('showBtn').onclick = async () => {
  if (S.busy) return;
  if (!S.condOk || !S.targets.length){ say('Set the conditions and add a 🎯 target first, then I’ll walk the shortest path.'); return; }
  while (curTarget()){
    const lp = shortest(appEqs(), knownSet(), curTarget());
    if (!lp){ dialog('No route', '<b>TARGET UNREACHABLE</b>No chain of equations gets from your knowns to the target. Look for a hidden given or a condition you haven’t set.'); return; }
    for (const s of lp) if (!S.sheet.includes(s.eq)){ S.sheet.push(s.eq); renderAll(false); await sleep(350); }
    say(`Path to ${VARS[curTarget()].sym}: ${lp.map(s => `${EQS[s.eq].label}→${VARS[s.v].sym}`).join(', then ')}.`);
    for (const s of lp){ await solve(s.eq, s.v); await sleep(450); }
  }
};

function renderPath(){
  const box = $('pathList');
  if (!S.path.length){ box.innerHTML = '<div class="empty">Your steps will stack up here: which equation, what it found.</div>'; return; }
  box.innerHTML = '<ol>' + S.path.map((p, i) => `<li data-i="${i}">${EQS[p.eq].label} → ${VARS[p.v].sym} = ${fmt(p.val)} ${unitOf(p.v)}</li>`).join('') + '</ol>';
  box.querySelectorAll('li').forEach(li => li.onclick = () => { const p = S.path[+li.dataset.i]; $('work').innerHTML = p.html; $('work').querySelectorAll('.line').forEach(l => l.classList.add('show')); $('workTitle').textContent = p.title; paintSyms(); });
}

// ---------- practice bank + setup check ----------
$('bankBtn').onclick = () => {
  const list = $('bankList');
  list.innerHTML = Object.entries(CHAPTERS).map(([cid, ch]) => `<div class="subhead">${ch.title}</div>` + PRACTICE.map((p, i) => p.ch !== cid ? '' : `<div class="bitem"><div><b>${p.title}</b><div class="btxt">${p.text}</div></div><button class="go" data-load="${i}">Load</button></div>`).join('')).join('');
  list.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
    const p = PRACTICE[+b.dataset.load];
    switchChapter(p.ch); S.bank = p; $('problem').value = p.text; $('bank').classList.remove('show'); S.lastStep = -1; renderAll(); S.lastStep = 1;
    say(`Loaded “${p.title}”. Read it, add each given with the <b>+</b> buttons, set the conditions, then press <b>✔ Check my setup</b>.`);
  });
  $('bank').classList.add('show');
};
$('bankX').onclick = () => $('bank').classList.remove('show');
$('checkSetup').onclick = () => {
  const p = S.bank; if (!p) return;
  const lines = []; let bad = 0;
  for (const [id, [mag, unit, dir]] of Object.entries(p.key.givens)){
    const want = (dir ? -1 : 1) * mag * VARS[id].units[unit], g = S.givens[id];
    if (!g){ lines.push(`✗ Missing a known: <b>${VARS[id].sym}</b> (${nm(id)}). ${want === 0 ? 'It’s hidden in the wording.' : ''}`); bad++; continue; }
    const close = (a, b) => Math.abs(a - b) <= 0.01 * Math.max(1e-9, Math.abs(b)) || (Math.abs(b) < 1e-9 && Math.abs(a) < 1e-9);
    if (close(g.val, want)) lines.push(`✓ ${VARS[id].sym} = ${describe(id, g)}`);
    else if (close(-g.val, want)){ lines.push(`✗ ${VARS[id].sym}: right size, but the <b>direction is backwards</b>.`); bad++; }
    else { lines.push(`✗ ${VARS[id].sym}: the value doesn’t match the problem. Check the number and the unit.`); bad++; }
  }
  for (const id of Object.keys(S.givens)) if (!(id in p.key.givens)){ lines.push(`? ${VARS[id].sym} isn’t stated in the problem. If you worked it out, it belongs in the path, not the givens.`); bad++; }
  for (const [k, want] of Object.entries(p.key.cond)){
    if (!!S.cond[k] !== want){ const c = chapter().conditions.find(x => x.key === k); const w = c.type === 'choice' ? c.options.find(o => o[0] === want)[1] : (want ? 'on' : 'off'); lines.push(`✗ Condition “${c.label}” should be: <b>${w}</b>.`); bad++; }
  }
  if (!S.condOk){ lines.push('✗ You haven’t confirmed the conditions in step 2 yet.'); bad++; }
  for (const t of p.key.targets) if (!S.targets.includes(t)){ lines.push(`✗ The question asks for <b>${VARS[t].sym}</b> (${nm(t)}): add it as a 🎯 target.`); bad++; }
  dialog(bad ? 'Setup check' : 'Setup check: perfect!', `<b>${bad ? `${bad} THING${bad > 1 ? 'S' : ''} TO FIX` : 'ALL SET UP CORRECTLY'}</b>${lines.join('<br>')}`, !bad);
};

// ---------- simulation values for the diagram ----------
function simValues(){
  const k = K(), v = vals(); let illus = false;
  const eqs = appEqs();
  const close = () => { let changed = true; while (changed){ changed = false; for (const e of eqs){ const u = EQS[e].vars.filter(x => !(x in v)); if (u.length !== 1 || !EQS[e].solve[u[0]]) continue; let r = EQS[e].solve[u[0]].f(v); if (typeof r === 'number') r = { value: r }; if (r && !r.error && isFinite(r.value)){ v[u[0]] = r.value; changed = true; } } } };
  close();
  const defs = { ...chapter().defaults };
  if (S.ch === 'incline'){ defs.g = 9.81; if (S.cond.up) defs.v0 = -5; if (!S.cond.friction) delete defs.mu; }
  if (S.ch === 'pulley'){ defs.g = 9.81; if (!S.cond.friction) delete defs.mu; }
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
const posAt = (v, k, tau) => v[k.u0] * tau + 0.5 * v[k.a] * tau * tau;
const velAt = (v, k, tau) => v[k.u0] + v[k.a] * tau;

// ---------- drawing helpers ----------
const COL = { given: '#19f0ff', found: '#ffe600', target: '#ff2bd6', unknown: '#9a9aaa' };
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
  ctx.font = `${h ? size + 8 : size}px VT323, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (h){ ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 16; }
  ctx.fillStyle = '#000'; ctx.fillText(txt, x + 2, y + 2); ctx.fillStyle = color; ctx.fillText(txt, x, y); ctx.shadowBlur = 0;
  if (id) hot({ kind: 'var', id, x, y, r: Math.max(24, ctx.measureText(txt).width / 2 + 6) });
}
function pointMark(ctx, x, y, name, color = '#fff'){
  const sel = S.inspectName === name;
  ctx.fillStyle = sel ? '#ffe600' : color; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, sel ? 14 : 11, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = sel ? '#ffe600' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.stroke();
  hot({ kind: 'point', name, x, y, r: 26 });
}
function grid(ctx, Wd, Hd){
  ctx.fillStyle = '#0a0018'; ctx.fillRect(0, 0, Wd, Hd);
  ctx.strokeStyle = 'rgba(25,240,255,.08)'; ctx.lineWidth = 1;
  for (let x = 0; x < Wd; x += 40){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, Hd); ctx.stroke(); }
  for (let y = 0; y < Hd; y += 40){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(Wd, y); ctx.stroke(); }
}
const IMG = {};
function loadImg(name, svgStr){ const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); IMG[name] = i; }
function fbdBox(ctx, x, y, w, h, title){
  ctx.fillStyle = 'rgba(20,10,40,.92)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.font = '28px VT323, monospace'; ctx.fillStyle = '#ffe600'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, x + 10, y + 6); ctx.textBaseline = 'middle';
}
function caption(ctx, txt, Hd){ ctx.font = '28px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(txt, 20, Hd - 20); }

// ---------- diagrams ----------
function draw(tau = null){
  const cv = $('dg'), ctx = cv.getContext('2d'); S.hot = [];
  const { v, illus } = simValues(), k = K(), T = v[k.t], now = tau === null ? T : tau;
  grid(ctx, cv.width, cv.height);
  ({ incline: drawIncline, pulley: drawPulley, rotation: drawWheel })[S.ch](ctx, v, k, T, now, tau, cv.width, cv.height);
  $('dgNote').textContent = illus ? 'Some values are made up for the picture until you give or find them.' : 'Drawn to scale with your numbers.';
  drawGraphs(v, k, tau);
  if (tau === null) setSpin(velAt(v, k, T) * (S.ch === 'rotation' ? 1 : 0.6));
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
  const cow = IMG.cow, N = 7; let last = null;
  for (let i = 0; i < N; i++){
    const t = i * T / (N - 1); if (t > now + 1e-9) break;
    const c = at(posAt(v, k, t), 26);
    ctx.save(); ctx.globalAlpha = 0.15 + 0.4 * i / (N - 1); ctx.translate(c.x, c.y); ctx.rotate(th); if (cow?.complete) ctx.drawImage(cow, -24, -24, 48, 48); ctx.restore();
    const lp = at(posAt(v, k, t), 64);
    if (!last || Math.hypot(lp.x - last.x, lp.y - last.y) > 56){ ctx.font = '22px VT323, monospace'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.textAlign = 'center'; ctx.fillText(`${fmt(t)}s`, lp.x, lp.y); last = lp; }
  }
  const c = at(posAt(v, k, now), 30);
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(th); if (cow?.complete) ctx.drawImage(cow, -32, -32, 64, 64); ctx.restore();
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
  const p0 = P(0); pointMark(ctx, p0.x, p0.y, 'start', '#19f0ff');
  const tStop = v.v0 * v.a < 0 ? -v.v0 / v.a : null;
  if (tStop !== null && tStop < T - 1e-6){ const ps = P(posAt(v, k, tStop)); pointMark(ctx, ps.x, ps.y, 'stop', '#ff2bd6'); }
  const pe = P(posAt(v, k, T)); pointMark(ctx, pe.x, pe.y, 'end', '#ffe600');
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
  ctx.fillStyle = '#ff2bd6'; ctx.beginPath(); ctx.arc(PX, PY, 6, 0, 7); ctx.fill();
  // positions: both blocks move the same distance
  const ss = Array.from({ length: 61 }, (_, i) => posAt(v, k, i * T / 60));
  let lo = Math.min(0, ...ss), hi = Math.max(0, ...ss); if (hi - lo < 0.05){ hi += 0.05; }
  const sc = Math.min(340, 210) / (hi - lo);
  const X1 = (s) => 100 + (s - lo) * sc, Y2 = (s) => PY + 50 + (s - lo) * sc;
  const cow = IMG.cow, N = 6;
  for (let i = 0; i < N; i++){
    const t = i * T / (N - 1); if (t > now + 1e-9) break; const s = posAt(v, k, t);
    ctx.globalAlpha = 0.12 + 0.35 * i / (N - 1);
    ctx.fillStyle = '#ff2bd6'; ctx.fillRect(X1(s) - 40, TY - 56, 80, 56);
    if (cow?.complete) ctx.drawImage(cow, sx - 34, Y2(s), 68, 68);
    ctx.globalAlpha = 1;
  }
  const s = posAt(v, k, now), x1 = X1(s), y2 = Y2(s);
  // string
  ctx.strokeStyle = '#ffe600'; ctx.lineWidth = hl('Tn', 3);
  ctx.beginPath(); ctx.moveTo(x1 + 40, ys); ctx.lineTo(PX, ys); ctx.arc(PX, PY, R, -Math.PI / 2, 0); ctx.lineTo(sx, y2 + 6); ctx.stroke();
  label(ctx, 'T', (x1 + 40 + PX) / 2, ys - 22, colOf('Tn'), 'Tn', 36);
  label(ctx, 'T', sx + 28, (PY + y2) / 2, colOf('Tn'), 'Tn', 36);
  // block 1 + hanging mass
  ctx.fillStyle = '#ff2bd6'; ctx.fillRect(x1 - 40, TY - 56, 80, 56); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(x1 - 40, TY - 56, 80, 56);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(x1 - 40, TY - 56); ctx.lineTo(x1 + 40, TY); ctx.moveTo(x1 + 40, TY - 56); ctx.lineTo(x1 - 40, TY); ctx.stroke();
  label(ctx, 'm₁', x1, TY - 28, '#000', null, 34); hot({ kind: 'var', id: 'm1', x: x1, y: TY - 28, r: 34 });
  if (cow?.complete) ctx.drawImage(cow, sx - 40, y2, 80, 80);
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
  pointMark(ctx, xa, dy0, 'start', '#19f0ff');
  const tStop = v.v0 * v.a < 0 ? -v.v0 / v.a : null;
  if (tStop !== null && tStop < T - 1e-6) pointMark(ctx, X1(posAt(v, k, tStop)), dy0, 'stop', '#ff2bd6');
  pointMark(ctx, xb, dy0, 'end', '#ffe600');
  label(ctx, `t = ${fmt(now)} s`, 110, 34, colOf('t'), 't', 36);
  // free-body diagrams, one per block
  const f1 = { x: 20, y: 316, w: 290, h: 270 }, f2 = { x: 326, y: 316, w: 200, h: 270 };
  fbdBox(ctx, f1.x, f1.y, f1.w, f1.h, 'FBD: block m₁');
  let ox = f1.x + 145, oy = f1.y + 150;
  ctx.fillStyle = '#ff2bd6'; ctx.fillRect(ox - 16, oy - 16, 32, 32);
  arrow(ctx, ox, oy - 16, ox, oy - 92, colOf('N1'), hl('N1', 4), 'N1'); label(ctx, 'N₁', ox + 26, oy - 82, colOf('N1'), 'N1', 30);
  arrow(ctx, ox, oy + 16, ox, oy + 92, colOf('W1'), hl('W1', 4), 'W1'); label(ctx, 'W₁', ox + 28, oy + 82, colOf('W1'), 'W1', 30);
  arrow(ctx, ox + 16, oy, ox + 110, oy, colOf('Tn'), hl('Tn', 4), 'Tn'); label(ctx, 'T', ox + 100, oy - 20, colOf('Tn'), 'Tn', 30);
  if (S.cond.friction){ arrow(ctx, ox - 16, oy, ox - 100, oy, colOf('f'), hl('f', 4), 'f'); label(ctx, 'f', ox - 92, oy - 20, colOf('f'), 'f', 30); label(ctx, 'μk', f1.x + f1.w - 34, f1.y + f1.h - 22, colOf('mu'), 'mu', 26); }
  else { ctx.font = '22px VT323, monospace'; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.textAlign = 'left'; ctx.fillText('no friction', f1.x + 12, f1.y + f1.h - 20); }
  fbdBox(ctx, f2.x, f2.y, f2.w, f2.h, 'FBD: m₂');
  ox = f2.x + 100; oy = f2.y + 150;
  ctx.fillStyle = '#f7f4ff'; ctx.beginPath(); ctx.arc(ox, oy, 16, 0, 7); ctx.fill();
  arrow(ctx, ox, oy - 16, ox, oy - 92, colOf('Tn'), hl('Tn', 4), 'Tn'); label(ctx, 'T', ox + 24, oy - 82, colOf('Tn'), 'Tn', 30);
  arrow(ctx, ox, oy + 16, ox, oy + 98, colOf('W2'), hl('W2', 4), 'W2'); label(ctx, 'W₂', ox + 30, oy + 86, colOf('W2'), 'W2', 30);
  label(ctx, 'Fnet?', f2.x + 50, f2.y + f2.h - 20, colOf('a'), 'a', 22);
  ctx.font = '24px VT323, monospace'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.textAlign = 'left'; ctx.fillText('+ = forward: m₁ toward the pulley, m₂ down.', 200, 36);
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
  ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(-ang), cy + R * Math.sin(-ang)); ctx.stroke();
  ctx.fillStyle = '#ff2bd6'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.fill();
  const sweep = Math.min(Math.abs(ang), 2 * Math.PI - 0.1) * Math.sign(ang);
  arcArrow(ctx, cx, cy, R - 34, 0, sweep, colOf('theta'), hl('theta', 4));
  label(ctx, `θ${Math.abs(ang) > 2 * Math.PI ? ` (${fmt(ang / (2 * Math.PI))} rev)` : ''}`, cx + (R - 70) * Math.cos(-sweep / 2), cy + (R - 70) * Math.sin(-sweep / 2), colOf('theta'), 'theta');
  const wm = Math.max(Math.abs(v.w0), Math.abs(om), 0.01);
  arcArrow(ctx, cx, cy, 58, Math.PI * 0.75, Math.PI * 0.75 + 1.6 * v.w0 / wm, colOf('w0'), hl('w0', 4)); label(ctx, 'ω₀', cx - 92, cy - 80, colOf('w0'), 'w0');
  arcArrow(ctx, cx, cy, 96, Math.PI * 1.25, Math.PI * 1.25 + 2.4 * om / wm, colOf('w'), hl('w', 5)); label(ctx, tau === null ? 'ω' : `ω=${fmt(om)}`, cx - 70, cy + 140, colOf('w'), 'w');
  if (Math.abs(v.alpha) > 1e-9) arcArrow(ctx, cx, cy, R + 50, Math.PI * 0.18, Math.PI * 0.18 + 0.55 * Math.sign(v.alpha), colOf('alpha'), hl('alpha', 4));
  label(ctx, 'α', cx + R + 60, cy - R * 0.55, colOf('alpha'), 'alpha');
  label(ctx, `t = ${fmt(now)} s`, Wd - 150, 40, colOf('t'), 't', 38);
  pointMark(ctx, cx + R, cy, 'start', '#19f0ff');
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
  pointMark(ctx, cx + R * Math.cos(-ang), cy + R * Math.sin(-ang), 'end', '#ffe600');
  caption(ctx, '+ is counterclockwise. Ghost spokes = equal time steps.', Hd);
}

// ---------- graphs ----------
function drawGraph(id, fn, T, labelTxt, color, tau, sub, shade){
  const cv = $(id), ctx = cv.getContext('2d'), Wd = cv.width, Hd = cv.height, L = 90, Rm = 24, Tp = 30, B = 42;
  ctx.fillStyle = '#0a0018'; ctx.fillRect(0, 0, Wd, Hd);
  const N = 120, xs = Array.from({ length: N + 1 }, (_, i) => i * T / N), ys = xs.map(fn);
  let lo = Math.min(0, ...ys), hi = Math.max(0, ...ys); if (hi - lo < 1e-9){ hi += 1; lo -= 1; }
  const X = t => L + (t / T) * (Wd - L - Rm), Y = y => Tp + (1 - (y - lo) / (hi - lo)) * (Hd - Tp - B);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(L, Tp); ctx.lineTo(L, Hd - B); ctx.lineTo(Wd - Rm, Hd - B); ctx.stroke(); ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(Wd - Rm, Y(0)); ctx.stroke();
  if (shade){ ctx.fillStyle = 'rgba(255,230,0,.15)'; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); xs.forEach((t, i) => { if (tau === null || t <= tau) ctx.lineTo(X(t), Y(ys[i])); }); ctx.lineTo(X(tau === null ? T : tau), Y(0)); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); xs.forEach((t, i) => i ? ctx.lineTo(X(t), Y(ys[i])) : ctx.moveTo(X(t), Y(ys[i]))); ctx.stroke();
  ctx.font = '38px VT323, monospace'; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(labelTxt, L + 12, Tp + 24);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '30px VT323, monospace'; ctx.textAlign = 'right'; ctx.fillText(fmt(hi), L - 8, Tp + 8); ctx.fillText(fmt(lo), L - 8, Hd - B);
  ctx.textAlign = 'center'; ctx.fillText('0', X(0), Hd - 10); ctx.fillText(`${fmt(T)} s`, X(T) - 30, Hd - 10);
  if (sub){ ctx.textAlign = 'right'; ctx.fillText(sub, Wd - Rm - 6, Tp + 24); }
  if (tau !== null){ ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(tau), Tp); ctx.lineTo(X(tau), Hd - B); ctx.stroke(); ctx.fillStyle = '#ff2bd6'; ctx.beginPath(); ctx.arc(X(tau), Y(fn(tau)), 7, 0, 7); ctx.fill(); }
}
function drawGraphs(v, k, tau){
  const T = v[k.t], rot = S.ch === 'rotation';
  drawGraph('gTheta', t => posAt(v, k, t), T, rot ? 'θ(t)  rad' : S.ch === 'pulley' ? 'x(t) distance moved  m' : 'x(t) along ramp  m', '#ff2bd6', tau, 'slope = velocity');
  drawGraph('gOmega', t => velAt(v, k, t), T, rot ? 'ω(t)  rad/s' : 'v(t)  m/s', '#19f0ff', tau, `shaded area = ${rot ? 'θ' : 'Δx'}`, true);
  drawGraph('gAlpha', () => v[k.a], T, rot ? 'α(t)  rad/s²' : 'a(t)  m/s²', '#ffe600', tau, 'flat: constant');
}

// ---------- diagram clicks ----------
function canvasPos(e){ const cv = $('dg'), r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
function hitAt(p){ let best = null, bd = 1e9; for (const h of S.hot){ const d = Math.hypot(p.x - h.x, p.y - h.y); if (d <= h.r && d < bd){ best = h; bd = d; } } return best; }
$('dg').addEventListener('mousemove', (e) => { const h = hitAt(canvasPos(e)); $('dg').classList.toggle('pointer', !!h); if (h && h.kind === 'var') setHover(h.id); else if (!h) setHover(null); });
$('dg').addEventListener('mouseleave', () => setHover(null));
$('dg').addEventListener('click', (e) => { const h = hitAt(canvasPos(e)); if (!h) return; beep(740, 0.04); if (h.kind === 'var') inspectVar(h.id); else if (h.kind === 'point') inspectPoint(h.name); });

function chip(id){
  const st = stateOf(id), x = known(id) ? `= ${fmt(val(id))} ${unitOf(id)}` : st === 'target' ? '🎯' : '?';
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
  const { v } = simValues(), k = K(), T = v[k.t], D = Math.min(7000, Math.max(800, T * 1000)), rate = T * 1000 / D;
  $('dgNote').textContent = rate > 1.01 ? `Playing ${fmt(rate)}× faster than real time.` : rate < 0.99 ? `Slow motion (${fmt(rate)}×).` : 'Playing in real time.';
  const t0 = performance.now(); beep(300, 0.3, 'triangle'); S.anim = true;
  const frame = (now) => { const tau = Math.min(T, ((now - t0) / D) * T); draw(tau); setSpin(velAt(v, k, tau) * (S.ch === 'rotation' ? 1 : 0.6)); if (tau < T) requestAnimationFrame(frame); else { S.anim = false; draw(); } };
  requestAnimationFrame(frame);
};

// ---------- celebrate ----------
function celebrate(){
  fanfare();
  say(`🎉 <b>SOLVED!</b> ${S.targets.map((t, i) => `${letter(i)} ${VARS[t].sym} = ${fmt(val(t))} ${unitOf(t)}`).join(', ')}. Press <b>Replay motion</b> to watch it.${S.bank ? ' Then try another from the 📚 practice bank.' : ''}`);
  const b = $('solved'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 1800);
  if (calm()) return;
  const cv = $('sparks'), ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ['#ff2bd6', '#19f0ff', '#ffe600', '#2bff6a', '#fff'];
  const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight / 2, vx: (Math.random() - .5) * 18, vy: (Math.random() - .8) * 18, c: cols[(Math.random() * cols.length) | 0], s: 4 + (Math.random() * 5 | 0) }));
  const t0 = performance.now();
  const step = (now) => { ctx.clearRect(0, 0, cv.width, cv.height); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.45; ctx.fillStyle = p.c; ctx.fillRect(p.x | 0, p.y | 0, p.s, p.s); }); if (now - t0 < 1600) requestAnimationFrame(step); else ctx.clearRect(0, 0, cv.width, cv.height); };
  requestAnimationFrame(step);
}

// ---------- toggles ----------
$('calmBtn').onclick = () => { const on = !calm(); document.body.classList.toggle('calm', on); $('calmBtn').setAttribute('aria-pressed', String(on)); try { localStorage.setItem('rl-calm', on ? '1' : '0'); } catch {} draw(); };
$('soundBtn').onclick = () => { S.sound = !S.sound; $('soundBtn').setAttribute('aria-pressed', String(S.sound)); beep(660, 0.08); };
$('clearBtn').onclick = () => { if (S.busy) return; const bh = $('bhSlot').firstElementChild; if (bh && !calm()) bh.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-720deg) scale(1.6)' }, { transform: 'rotate(-1080deg) scale(1)' }], { duration: 700 }); beep(120, 0.4, 'sawtooth'); S.cond = defaultsFor(S.ch); resetAll(true); renderAll(); say('Gulp. The black hole ate every known, target and equation. Fresh start!'); };

// ---------- assemble ----------
function renderAll(full = true){
  if (full) renderUnit(); else { $('checkRow').style.display = S.bank ? 'flex' : 'none'; }
  renderKnowns(); renderConds(); renderLibrary(); renderTargets(); renderSheet(); renderPath(); steps(); paintSyms(); draw();
}
function placeDeco(){
  $('cowSlot').innerHTML = SP.cow(4); $('catSlot').innerHTML = SP.catToast(2); $('hamsterSlot').innerHTML = SP.hamster(3); $('bhSlot').innerHTML = SP.blackHole(1);
  $('deco').innerHTML = `<div class="deco gag" style="left:1%;top:30%;animation:float 4s ease-in-out infinite">${SP.piano(3)}<div style="font:10px var(--chunky);color:#ffe600;text-align:center">g = 9.81</div></div>
    <div class="deco gag" style="right:1.2%;top:24%;transform:rotate(8deg)">${SP.cow(2)}</div>
    <div class="deco gag" style="left:1.5%;bottom:10%;animation:spin 9s linear infinite">${SP.catToast(2)}</div>`;
  loadImg('cow', SP.cow(4)); IMG.cow.onload = () => { if (!S.anim) draw(); };
}
async function boot(){
  $('bootBox').innerHTML = SP.box(6); placeDeco();
  try { if (localStorage.getItem('rl-calm') === '1') document.body.classList.add('calm'); } catch {}
  $('calmBtn').setAttribute('aria-pressed', String(calm()));
  try { await document.fonts.load('30px VT323'); } catch {}
  S.cond = defaultsFor(S.ch); applyHidden(); clearWork(); resetInspector();
  S.lastStep = -1; renderAll(); S.lastStep = 1;
  say('Hi! I’m a <b>spherical cow</b>. Set up your own problem: <b>1</b> add the givens, <b>2</b> set the conditions, <b>3</b> gather equations, <b>4</b> pick the target, <b>5</b> build the path. Or grab one from the 📚 <b>Practice bank</b>.');
  setTimeout(() => $('boot').remove(), calm() ? 0 : 700);
  if ('serviceWorker' in navigator && location.protocol === 'https:'){ try { navigator.serviceWorker.register('./sw.js').catch(() => {}); } catch {} }
}
boot();
