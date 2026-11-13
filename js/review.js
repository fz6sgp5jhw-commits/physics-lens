// Physics Lens — the review strip of the algebra workspace (phase 8b): two checks whenever, a final check, stars, SOLVED,
// "put in my values" and the unit check. The judging is in checks.js; this file only keeps the counts and draws the strip.
// Rewards (a star, SOLVED) come only from a passed check. Asking for a correction never takes a star away, and it never
// writes the fixed line: it names the first line that doesn't follow and why.
// Design: docs/drawing-first-plan.md, sections 9 and 10.
import { print, display, eqText } from './algebra.js';
import { runCheck, isolated, unitCheck, putValues } from './checks.js';

const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LIMIT = 2;

// api: { lines() → active lines, ctx() → { knowns, targets, names }, tk() → toolkit data, add(eq, how, opts), redraw(), look(ids) }
export function createReview(api){
  const st = { used: 0, stars: 0, final: false, solved: false, last: null, corr: false, num: null };

  function html(){
    const left = LIMIT - st.used;
    const stars = '★'.repeat(st.stars + (st.final ? 1 : 0)) + '☆'.repeat(LIMIT + 1 - st.stars - (st.final ? 1 : 0));
    let res = '';
    if (st.last){
      const l = st.last;
      if (l.status === 'pass') res = `<p class="small algpass" role="status">${l.final ? 'The final check passed: your answer agrees with the code’s own result for this setup.' : 'This check passed: every line holds with numbers from your setup, and your labels are right.'}</p>`;
      else {
        const first = l.issues[0];
        res = `<p class="small algwarn" role="status">Something to look at${l.final ? ' before this is the answer' : ''}. Revise on your own, or ask for a correction.</p>
          <div class="row"><button class="dfmini" data-rev="revise">I’ll revise</button><button class="dfmini" data-rev="correct">Ask for a correction</button></div>
          ${st.corr ? `<p class="small" id="algCorr">${first.line ? `<b>Line ${first.line}</b> (<span class="algmono">${esc(first.text || '')}</span>): ` : ''}${esc(first.why)}</p>` : ''}`;
      }
    }
    const lines = api.lines(), last = lines.at(-1), iso = last && isolated(last, api.ctx());
    const unit = iso && !last.fixed ? unitCheck(iso.rhs, iso.id, api.ctx()) : null;
    return `<div class="algrev" id="algRev"><div class="row"><b>Checks</b> <span class="algstars" id="algStars" aria-label="${st.stars + (st.final ? 1 : 0)} of ${LIMIT + 1} stars">${stars}</span>
      <button id="algCheck" ${left > 0 ? '' : 'disabled'} title="Look at everything so far: every line, and the labels on your split forces">Check my work (${left} left)</button>
      <button id="algFinal" ${st.solved ? 'disabled' : ''} title="Say you are done: the answer is compared with the code’s own result">I’m done: final check</button>${st.solved ? ' <b class="algsolved" id="algSolved">SOLVED</b>' : ''}</div>
      ${res}
      <div class="row small"><button class="dfmini" id="algNums" ${iso ? '' : 'disabled'} title="Numbers come last: needs the target alone on one side, and a number with a unit for each symbol">Put in my values</button>
      ${unit ? `<span id="algUnit" class="${unit.ok === false ? 'warn' : 'muted'}">${esc(unit.text)}</span>` : '<span class="muted">Numbers last: get the target alone in symbols first.</span>'}</div>
      ${st.num ? `<p class="small ${st.num.err ? 'warn' : ''}" id="algNumMsg">${esc(st.num.err || st.num.text)}</p>` : ''}</div>`;
  }

  function check(final){
    const lines = api.lines();
    const r = runCheck(lines, api.ctx(), { final, tk: api.tk() });
    if (r.issues[0]?.line) r.issues[0].text = eqText(lines[r.issues[0].line - 1]);
    if (!lines.length){ st.last = r; st.corr = false; return; }
    if (!final) st.used++;
    r.final = final; st.last = r; st.corr = false;
    api.onCheck?.(r.status === 'pass');
    if (r.status === 'pass'){ if (final){ st.final = true; st.solved = true; } else st.stars++; api.look([]); }
    else api.look(r.look);
  }
  function values(){
    const lines = api.lines(), last = lines.at(-1);
    if (!last){ st.num = { err: 'There are no lines yet.' }; return; }
    const r = putValues(last, api.ctx());
    if (r.err){ st.num = { err: r.err }; return; }
    const name = { t: 'sym', id: r.id };
    api.add({ l: name, r: r.withValues }, 'values put in, with their units', { fixed: true });
    api.add({ l: name, r: { t: 'q', v: r.si, s: `${r.value}${r.unit ? ' ' + r.unit : ''}` } }, 'worked out', { fixed: true });
    st.num = { text: `${display(r.id).text} = ${r.value}${r.unit ? ' ' + r.unit : ''}` };
  }
  // returns true when the click was ours
  function click(b){
    if (b.id === 'algCheck'){ if (st.used < LIMIT) check(false); }
    else if (b.id === 'algFinal') check(true);
    else if (b.id === 'algNums') values();
    else if (b.dataset.rev === 'revise'){ st.last = null; st.corr = false; api.look([]); }
    else if (b.dataset.rev === 'correct') st.corr = true;
    else return false;
    api.redraw(); return true;
  }
  const clear = () => { Object.assign(st, { used: 0, stars: 0, final: false, solved: false, last: null, corr: false, num: null }); };
  return { html, click, clear, state: () => ({ used: st.used, stars: st.stars + (st.final ? 1 : 0), solved: st.solved, status: st.last?.status || null, corr: st.corr, issue: st.last?.issues?.[0] ? { line: st.last.issues[0].line, kind: st.last.issues[0].kind, why: st.last.issues[0].why } : null, num: st.num }) };
}
