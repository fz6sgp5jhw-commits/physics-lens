// Physics Lens — the drawing language around the pen (phase 10): the stroke key printed from recognize.js's STROKES
// table, the words of the live preview, and the quick fix after a stroke snaps. No rule for reading a stroke lives here:
// every reading, preview and alternative comes from recognize().
import { STROKES } from './recognize.js';

const NS = 'http://www.w3.org/2000/svg';

// the stroke key: one row per kind of stroke, a small drawing of it and what it draws; btn folds it
export function renderKey(box, btn){
  box.replaceChildren(...STROKES.map(k => {
    const row = document.createElement('div'), svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 38 30'); svg.setAttribute('aria-hidden', 'true');
    const m = document.createElementNS(NS, k.icon === 'dot' ? 'circle' : 'path');
    if (k.icon === 'dot'){ m.setAttribute('cx', 19); m.setAttribute('cy', 15); m.setAttribute('r', 4); m.setAttribute('class', 'dot'); }
    else m.setAttribute('d', k.icon);
    svg.appendChild(m);
    const t = document.createElement('span'), b = document.createElement('b'), how = document.createElement('small');
    b.textContent = k.draws; how.textContent = k.how;
    t.append(b, `: ${k.stroke}`, how);
    row.append(svg, t); return row;
  }));
  btn.onclick = () => { const open = box.hidden; box.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
}

// what a stroke would become if the pen lifted now: the words of recognize()'s own result
export function previewText(r){
  if (!r.options.length) return 'keep going…';
  const names = r.options.map(o => o.label.toLowerCase());
  return `→ ${names.join(' or ')}${names.length > 1 ? '?' : ''}`;
}

// the quick fix: after a single reading snaps, a chip for 6 s with the other readings recognize() allowed and "rub out".
// offer({ label, alts, xy, other(o), rubOut() }); hide() on the next stroke
export function createFix(){
  let chip = null, timer = 0;
  const hide = () => { clearTimeout(timer); if (chip) chip.hidden = true; };
  function offer({ label, alts = [], xy, other, rubOut }){
    if (!chip){ chip = document.createElement('div'); chip.id = 'fixChip'; chip.className = 'fixchip'; chip.setAttribute('role', 'status'); document.body.appendChild(chip); }
    const btn = (text, act) => { const b = document.createElement('button'); b.textContent = text; b.onclick = () => { hide(); act(); }; return b; };
    chip.replaceChildren(`Read as ${label.toLowerCase()}.`, ...alts.map(o => btn(`no, ${o.label.toLowerCase()}`, () => other(o))), btn('rub out', rubOut));
    chip.hidden = false;
    chip.style.left = Math.max(8, Math.min(innerWidth - chip.offsetWidth - 8, xy.x + 10)) + 'px';
    chip.style.top = Math.max(8, Math.min(innerHeight - chip.offsetHeight - 8, xy.y + 16)) + 'px';
    clearTimeout(timer); timer = setTimeout(hide, 6000);
  }
  return { offer, hide, get open(){ return !!chip && !chip.hidden; } };
}
