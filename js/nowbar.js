// The pinned note under the header: what you are doing, why it matters, and the one next thing to do, always in view
// beside the place you work. It writes no physics of its own: the words come from the stage table, the hint for the
// next step at its first (pointing) level, the pick plan's principle and the lesson's walk list, all handed in by the
// app as plain state. Like a hint, it names what is missing and never gives an answer or a number.
// The assistant line (#bubble) sits inside the same block, so there is one place on the page that speaks.
import { esc } from './concepts.js';

// where "Take me there" goes for each kind of next step: { stage?: open this stage first, sel: first usable of these }
const REPLAY = '#replayBtn, [data-dtab="motion"]';
const GO = {
  givens: { stage: 0, sel: '#addGivenBtn' }, conds: { stage: 2, sel: '#condOk' }, target: { sel: '#targets' }, done: { sel: REPLAY },
  miss: { sel: '#toolsMenu' }, eq: { sel: '#sheet' }, sys: { sel: '#sheet' }, lad: { sel: '#sheet' },
};
const MORE = { miss: ' Find it in the <b>Equation library</b> (Tools menu).', eq: ' Find it on your sheet and solve it.', sys: ' Combine them on your sheet.' };
const DRAW_WHY = {
  draw: 'The drawing is the model: every force, lever arm and equation that follows is read from it.',
  parts: 'A picture can’t show everything: what a part is made of, whether it is fixed, what is known about it. Those choices decide which forces and equations apply.',
  close: 'The summary shows your choices next to what the app assumed, so a wrong assumption is caught before any equation is written.',
  work: 'Each line should follow from the one before it, in symbols, so you can see what the answer depends on before any number goes in.',
};

// s: the app's state (see `state` in createNowBar) → { doing, why, next, go }, each a short HTML string (go: an entry like GO's, or null)
export function tell(s){
  if (s.mode === 'draw'){
    const d = s.df;
    if (!d.done) return { doing: '<b>Drawing the problem</b>: the parts and how they touch.', why: DRAW_WHY.draw,
      next: d.shapes ? 'When every part is drawn, press <b>Done drawing</b>.' : 'Pick a shape from the tools beside the canvas, or sketch it with the pen.', go: { sel: d.shapes ? '#doneDraw' : '#bpal' } };
    if (d.closed) return { doing: '<b>Writing the equations</b> for your setup.', why: DRAW_WHY.work,
      next: d.lines ? 'Work the next line: tap a term to move it, or check your work.' : 'Pick a relationship from the <b>Formula sheet</b>, or type the first line.', go: { sel: '#dfWork' } };
    if (d.summary) return { doing: '<b>Checking the summary</b> of your setup.', why: DRAW_WHY.close, next: 'Read your choices and what is assumed, fix any conflict, then press <b>Close the setup</b>.', go: { sel: '#dfClose' } };
    return { doing: `<b>Setting each part</b>${d.count ? ` (${esc(d.count)})` : ''}.`, why: DRAW_WHY.parts, next: 'Press a dot on the drawing and answer what the picture can’t show.', go: { sel: '#bd' } };
  }
  const i = s.stage, st = s.stages[i], last = i === s.stages.length - 1, of = `<span class="nowof"> (step ${i + 1} of ${s.stages.length})</span>`;
  const onward = (lead) => ({ next: `${lead} Go on to <b>${s.stages[i + 1].name}</b>.`, go: { stage: i + 1, sel: `#steps [data-stage="${i + 1}"]` } });
  if (last){
    const doing = `<b>${st.name}</b>${of}: ${s.cur ? `finding ${s.cur}` : s.targets ? 'every target is found' : st.doing}.`;
    const why = s.cur && s.principle ? `The principle to look for: <i>${s.principle}</i>. ${st.why}` : st.why;
    if (s.locked) return { doing, why, next: s.lockText, go: { stage: s.first, sel: `#steps [data-stage="${s.first}"]` } };
    const kind = !s.hasGivens ? 'givens' : !s.condOk ? 'conds' : !s.targets ? 'target' : !s.cur ? 'done' : (s.hintKey.match(/^(miss|eq|sys|lad)/) || [])[0];
    return { doing, why, next: s.hint + (MORE[kind] || ''), go: GO[kind] || null };
  }
  const doing = `<b>${st.name}</b>${of}: ${st.doing}.`, why = i === 1 && s.forcesOptional ? st.whyMotion : st.why, c = s.checks[i];
  if (i <= 1 && s.walk) return { doing, why, next: esc(s.walk), go: { sel: '#bd' } };
  if (c) return { doing, why, ...onward(`${st.name} has its star.`) };
  if (c === null) return { doing, why, ...onward(s.drawn ? 'Motion arrows are optional in this unit.' : 'Nothing is drawn, so there is no diagram to check.') };
  return { doing, why, next: st.next, go: { sel: st.go } };
}

// el: the block (#nowBar); state(): the app's state for tell(); open(i): open stage i (false if it is locked)
export function createNowBar({ el, state, open }){
  const part = (k) => el.querySelector(`[data-now="${k}"]`), goBtn = el.querySelector('#nowGo'), more = el.querySelector('#nowMore'), header = el.closest('header');
  const usable = (x) => !!x && x.getClientRects().length > 0;
  const pick = (sel) => { const els = sel.split(', ').map(q => document.querySelector(q)); return els.find(usable) ?? null; };
  let sig = '', go = null, pulse = 0;

  function render(){
    const t = tell(state()), s = JSON.stringify(t);
    if (s === sig) return;
    sig = s; go = t.go;
    for (const k of ['doing', 'why', 'next']) part(k).innerHTML = t[k]; // the app's own text; typed text is escaped where it enters
    goBtn.hidden = !go;
  }
  goBtn.addEventListener('click', () => {
    if (!go) return;
    if (go.stage != null && go.stage !== state().stage) open(go.stage);
    const t = pick(go.sel); if (!t) return;
    t.scrollIntoView({ block: 'center' });
    if (t.getBoundingClientRect().bottom <= 0) window.scrollTo(0, 0); // a control in the header, which has scrolled away on a phone
    document.querySelectorAll('.guide-pulse').forEach(x => x.classList.remove('guide-pulse'));
    t.classList.add('guide-pulse'); clearTimeout(pulse); pulse = setTimeout(() => t.classList.remove('guide-pulse'), 3000);
  });
  more.addEventListener('click', () => { const on = el.classList.toggle('open'); more.setAttribute('aria-expanded', String(on)); more.textContent = on ? 'Less' : 'More'; });
  // anything the student does can move the next step on: look again once the app has reacted
  for (const ev of ['click', 'change', 'pointerup', 'keyup']) document.addEventListener(ev, () => setTimeout(render, 0));
  // on a phone the header scrolls away but this block stays: the CSS needs to know how far down the header it sits
  const measure = () => { const r = el.getBoundingClientRect(), h = header.getBoundingClientRect(); const root = document.documentElement.style;
    root.setProperty('--nowoff', Math.max(0, Math.round(r.top - h.top)) + 'px'); root.setProperty('--nowh', Math.round(h.bottom - r.top) + 'px'); };
  new ResizeObserver(measure).observe(header); measure();
  return { render };
}
