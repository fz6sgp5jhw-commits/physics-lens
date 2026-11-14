// The thumb bar: on a phone the open stage's few tools sit in a fixed bar at the bottom of the screen, within reach
// of a thumb, with the one that matters now highlighted. Each bar button presses a control that already exists on the
// page (`sel`; of two, the first that can be pressed; `show` is what it opens), so the bar holds no logic of its own; a control that is hidden or
// disabled greys its bar button out.
// What the app says stays in view in the pinned note under the header (js/nowbar.js). CSS shows the bar only on narrow screens.
const UNDO = { t: 'Undo', icon: '↶', sel: '#bpal [data-act="undo"]' };
const GUIDED = [
  [{ t: 'Given', icon: '+', sel: '#addGivenBtn', show: '#addPanel' }, UNDO],
  [UNDO, { t: 'Motion', icon: '▶', sel: '[data-dtab="motion"]' }],
  [{ t: 'Confirm', icon: '✓', sel: '#condOk' }],
  [{ t: 'Looking for', icon: '?', sel: '#lookBtn' }, { t: 'Hint', icon: '✦', sel: '#hintBtn' }, { t: 'Show me', icon: '✎', sel: '#showBtn' }, { t: 'Replay', icon: '▶', sel: '#replayBtn, [data-dtab="motion"]' }],
];
const DRAW = [
  { t: 'Select', icon: '⌖', sel: '[data-dftool="select"]' }, { t: 'Connect', icon: '⌇', sel: '[data-dftool="connect"]' },
  { t: 'Force', icon: '↗', sel: '[data-dftool="force"]' }, UNDO, { t: 'Done', icon: '✓', sel: '#doneDraw', now: true },
];

// bar: the element;
// state() → { mode: 'draw' | 'guided', stage, passed, solved, names: [stage names] }; go(i) opens stage i.
export function createThumbBar({ bar, state, go }){
  let sig = '', items = [], timer = 0;
  const usable = (el) => !!el && !el.disabled && el.getClientRects().length > 0;
  const pick = (sel) => { const els = sel.split(', ').map(q => document.querySelector(q)); return els.find(usable) ?? els[0]; };

  function list(){
    const s = state();
    if (s.mode === 'draw') return DRAW;
    const tools = GUIDED[s.stage] ?? [], last = s.stage >= s.names.length - 1;
    // the stage's own tool matters until its check passes; then the way on does. When solving, Hint until every target is found.
    const main = last ? (s.solved ? 'Replay' : 'Hint') : s.passed ? null : tools[0].t;
    const out = tools.map(t => ({ ...t, now: t.t === main }));
    if (!last) out.push({ t: s.names[s.stage + 1], icon: `${s.stage + 2} →`, stage: s.stage + 1, now: s.passed });
    return out;
  }

  function render(){
    const next = list().map(it => { const el = it.sel ? pick(it.sel) : null; return { ...it, el, off: it.sel ? !usable(el) : false, on: el?.getAttribute('aria-pressed') === 'true' }; });
    const s = next.map(it => [it.t, it.icon, it.off, it.on, !!it.now].join()).join('|');
    if (s === sig){ items = next; return; }
    sig = s; items = next;
    bar.replaceChildren(...items.map((it, i) => {
      const b = document.createElement('button'), ic = document.createElement('b');
      ic.textContent = it.icon; ic.setAttribute('aria-hidden', 'true');
      b.append(ic, it.t); b.dataset.i = i; b.disabled = it.off;
      b.className = 'tbtn' + (it.now && !it.off ? ' now' : '');
      if (it.sel && it.el?.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(it.on));
      if (it.stage != null) b.title = `Go on to ${it.t}`; else if (it.el?.title) b.title = it.el.title;
      return b;
    }));
  }

  bar.addEventListener('click', (e) => {
    const it = items[e.target.closest('.tbtn')?.dataset.i]; if (!it) return;
    if (it.stage != null){ if (go(it.stage)) window.scrollTo(0, 0); return; }
    if (!usable(it.el)) return;
    it.el.click();
    // a tool that opens something on the page (`show`) brings it into view
    const opened = it.show && document.querySelector(it.show), r = opened?.getBoundingClientRect();
    if (r && (r.top < 0 || r.bottom > innerHeight - bar.offsetHeight)) opened.scrollIntoView({ block: 'center' });
  });
  // any press can change which tools are usable or pressed: look again once the app has reacted
  document.addEventListener('click', () => setTimeout(render, 0));

  return { render };
}
