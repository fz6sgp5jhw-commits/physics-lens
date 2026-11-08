// Physics Lens — drawing-first canvas tools: one place for "which tool is active", the pointer plumbing, and the small
// question box ("ask") the tools use for names, labels and coordinates. Tools register a handler { down, move, up };
// while one is active the canvas's own select/drag stays out of the way. Text is never put in innerHTML.
// Design: docs/drawing-first-plan.md, sections 3 to 5.

export function createTools({ svg, wrap, bar, build: B }){
  const tools = {};
  let cur = 'select', drag = null, pop = null;

  // screen → drawing coordinates
  const pt = (e) => { const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return { x: p.x, y: p.y }; };
  const toScreen = (x, y) => new DOMPoint(x, y).matrixTransform(svg.getScreenCTM());

  function use(name){
    cur = tools[name] || name === 'select' ? name : 'select';
    svg.dataset.dftool = cur;
    bar.querySelectorAll('[data-dftool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dftool === cur)));
    closeAsk(); B.render();
  }

  svg.addEventListener('pointerdown', (e) => {
    const h = tools[cur];
    if (!h || e.button || e.target.closest('[data-dot]')) return;
    e.stopPropagation(); e.preventDefault();
    const p = pt(e), state = h.down ? h.down(p, e) : null;
    if (!state) return;                 // a handler that returns nothing has handled the press by itself
    drag = { h, state, start: p };
    try { svg.setPointerCapture(e.pointerId); } catch {}
  }, true);
  svg.addEventListener('pointermove', (e) => { if (drag && drag.h.move) drag.h.move(pt(e), e, drag.state, drag.start); });
  svg.addEventListener('pointerup', (e) => { if (!drag) return; const d = drag; drag = null; if (d.h.up) d.h.up(pt(e), e, d.state, d.start); });

  // ---- the question box: a label, one text field, OK / Cancel. check(text) → an error sentence or ''; done(text)
  function closeAsk(){ if (pop){ pop.remove(); pop = null; } }
  function ask({ q, value = '', at, check = () => '', done, hint = '' }){
    closeAsk();
    pop = document.createElement('form'); pop.id = 'dfPop'; pop.className = 'dfpop';
    const lab = document.createElement('label'); lab.textContent = q;
    const inp = document.createElement('input'); inp.id = 'dfPopIn'; inp.type = 'text'; inp.value = value; inp.autocomplete = 'off'; inp.setAttribute('aria-label', q);
    const ok = document.createElement('button'); ok.textContent = 'OK'; ok.className = 'go';
    const no = document.createElement('button'); no.type = 'button'; no.textContent = 'Cancel'; no.onclick = closeAsk;
    const err = document.createElement('p'); err.className = 'small warn dferr'; err.id = 'dfPopErr';
    pop.append(lab, inp, ok, no, err);
    if (hint){ const h = document.createElement('p'); h.className = 'small muted'; h.textContent = hint; pop.append(h); }
    pop.onsubmit = (e) => {
      e.preventDefault();
      const text = inp.value.trim(), bad = check(text);
      if (bad){ err.textContent = bad; return; }
      closeAsk(); done(text);
    };
    wrap.appendChild(pop);
    const s = at ? toScreen(at.x, at.y) : null, r = wrap.getBoundingClientRect();
    if (s){ pop.style.left = Math.max(4, Math.min(r.width - 250, s.x - r.left + 12)) + 'px'; pop.style.top = Math.max(4, Math.min(r.height - 120, s.y - r.top + 12)) + 'px'; }
    inp.focus(); inp.select();
  }

  bar.addEventListener('click', (e) => { const b = e.target.closest('[data-dftool]'); if (b) use(b.dataset.dftool); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cur !== 'select' && !e.target.closest('input')) use('select'); });

  return { register: (name, h) => { tools[name] = h; }, use, ask, closeAsk, pt, toScreen, get tool(){ return cur; } };
}
