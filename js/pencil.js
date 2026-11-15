// Physics Lens — the pencil notes beside the drawing in drawing-first mode (phase 10; it replaces the guide card there).
// A checklist that ticks as the drawing grows and says why a mark is wrong. The rows come from the app (the lesson's walk
// list, or the drawing-first steps and their conflict checks); nothing here judges physics. How much help is a menu
// setting kept in localStorage under pl-help, validated on read, with a visible "Forget my help level" button.
//   Walk me through: the whole list, the next row marked, what is wrong in red
//   Prompt me:       one pencil note at a time, no list
//   On my own:       nothing until the drawing checks out
export const KEY = 'pl-help';
export const LEVELS = ['walk', 'prompt', 'own'];
export const NAMES = { walk: 'Walk me through', prompt: 'Prompt me', own: 'On my own' };
const ABOUT = { walk: 'a checklist beside the drawing, ticked as you go', prompt: 'one pencil note at a time, no list', own: 'quiet until the drawing checks out' };

export function readHelp(){
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw && typeof raw === 'object' && raw.v === 1 && LEVELS.includes(raw.level) ? raw.level : 'walk';
  } catch { return 'walk'; }
}

// el: the notes' box; menu: where the level buttons go; rows() → { title, rows: [{ say, how, st: 'ok' | 'no' | '', wrong }], done }
export function createPencil({ el, menu, rows, say }){
  let level = readHelp(), last = '';
  const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderMenu(){
    menu.innerHTML = `<b>How much help</b>${LEVELS.map(l => `<button data-help="${l}" aria-pressed="${l === level}" title="${ABOUT[l]}">${NAMES[l]}</button>`).join('')}
      <button id="helpClear" title="Forget the help level on this device">Forget my help level</button>`;
  }
  function render(){
    const g = rows(), R = g.rows;
    const next = R.find(r => r.st === 'no') || R.find(r => r.st !== 'ok');
    let html;
    if (level === 'own') html = g.done ? `<h5>${esc(g.doneText)}</h5>` : '';
    else if (level === 'prompt') html = `<h5>pencil note</h5><p class="pnote${next?.st === 'no' ? ' no' : ''}">${esc(!next ? g.doneText : next.st === 'no' ? next.wrong : `Next: ${next.say.replace(/\.$/, '')}. ${next.how}`)}</p>`;
    else html = `<h5>${esc(g.title)}</h5><ol class="walk">${R.map(r => {
      const cls = r.st === 'ok' ? 'ok' : r.st === 'no' ? 'no' : r === next ? 'next' : '';
      return `<li class="${cls}">${esc(r.say)}<small>${esc(r.st === 'no' ? r.wrong : r.how)}</small></li>`;
    }).join('')}</ol>${g.done ? `<p class="pnote">✓ ${esc(g.doneText)}</p>` : ''}`;
    el.dataset.level = level;
    if (html !== last){ el.innerHTML = html; last = html; }
    el.hidden = !html;
  }
  function set(l){ level = l; try { localStorage.setItem(KEY, JSON.stringify({ v: 1, level })); } catch {} renderMenu(); render(); }
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.help){ set(b.dataset.help); say(`<b>Help:</b> ${NAMES[level]}, ${ABOUT[level]}.`); }
    if (b.id === 'helpClear'){ try { localStorage.removeItem(KEY); } catch {} level = 'walk'; renderMenu(); render(); say('Help level forgotten on this device: back to Walk me through.'); }
  });
  renderMenu(); render();
  return { render, set, get level(){ return level; } };
}
