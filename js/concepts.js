// Physics Lens — concept cards and the notes (phase 11). Pure code: builds text and HTML strings from the pack's data.
// Every equation has a card from its own meaning, condition, kind and "where it comes from"; the pack's notes add the idea
// (`concept`) and the usual mix-up (`confusion`) for the equations that carry one. Every quantity has its name and unit, and
// a definition where the pack gives one. All pack text goes through esc(); only the pack's own symbol and formula HTML
// (sym, form) is inserted as written. Nothing here is forced on the student: cards are read when they choose to.
import { EQS, VARS, CHAPTERS, NOTES } from './data.js';

export const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const KIND = { law: 'a law', rel: 'a relationship', def: 'a definition' };
const KIND_HELP = {
  law: 'A law is a statement about nature that holds on its own (Newton’s laws, conservation).',
  rel: 'A relationship follows from the geometry or the situation (and the laws); it holds only under its condition.',
  def: 'A definition is what we choose a quantity to mean; it is true by agreement.',
};
const sectionOf = (id) => { for (const [cid, ch] of Object.entries(CHAPTERS)) for (const s of ch.sections) if (s.eqs.includes(id)) return { chapter: cid, section: s.title }; return null; };

export function eqCard(id){
  const e = EQS[id]; if (!e) return null;
  const n = NOTES.equations[id] || {}, at = sectionOf(id) || {};
  return { id, label: e.label, form: e.form, kind: e.kind || 'law', kindName: KIND[e.kind || 'law'], kindHelp: KIND_HELP[e.kind || 'law'], meaning: e.meaning || '', condition: e.condition || '', calc: e.calc || '',
    concept: n.concept || '', confusion: n.confusion || '', chapter: at.chapter || null, section: at.section || '' };
}
export function quantityCard(id){
  const v = VARS[id]; if (!v) return null;
  const n = NOTES.quantities[id] || {};
  return { id, sym: v.sym, plain: v.plain, name: v.name, unit: v.unit === 'no unit' || !v.unit ? 'no unit' : v.unit, define: n.define || '', confuse: n.confuse || '' };
}
export function chapterNotes(cid){
  const ch = CHAPTERS[cid]; if (!ch) return null;
  const n = NOTES.chapters[cid] || {};
  return { id: cid, title: ch.title, intro: ch.intro || '', overview: n.overview || '', ideas: n.ideas || [], watch: n.watch || [],
    quantities: ch.vars.map(quantityCard).filter(Boolean),
    sections: ch.sections.map(s => ({ title: s.title, note: s.note || '', eqs: s.eqs.map(eqCard).filter(Boolean) })) };
}

// the quick card under a solved step (one equation): short, never forced
export function stepCardHTML(id){
  const c = eqCard(id); if (!c) return '';
  const row = (h, t) => t ? `<p><b>${h}</b> ${esc(t)}</p>` : '';
  return `${row('What it says:', c.meaning)}${row('The idea:', c.concept)}${row('When it applies:', c.condition ? 'only if ' + c.condition : '')}${row('Watch out:', c.confusion)}
    <p class="small muted">${esc(c.kindName.replace(/^an? /, '')[0].toUpperCase() + c.kindName.replace(/^an? /, '').slice(1))}: ${esc(c.kindHelp)} <a href="concepts.html#eq-${esc(id)}" target="_blank" rel="noopener">Full notes ↗</a></p>`;
}
export const stepSummary = (id) => { const c = eqCard(id); return c ? c.meaning : ''; };

// the whole notes page body for one chapter (a string of HTML)
export function chapterHTML(cid){
  const c = chapterNotes(cid); if (!c) return '';
  const list = (xs) => xs.length ? `<ul>${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const defs = c.quantities.map(q => `<tr id="q-${esc(q.id)}"><th scope="row">${q.sym}</th><td>${esc(q.name)}${q.define ? `<div class="n-def">${esc(q.define)}</div>` : ''}${q.confuse ? `<div class="n-watch">Watch out: ${esc(q.confuse)}</div>` : ''}</td><td>${esc(q.unit)}</td></tr>`).join('');
  const eqs = (s) => s.eqs.map(e => `<article class="n-eq" id="eq-${esc(e.id)}"><h4><span class="n-tag">${esc(e.label)}</span> <span class="n-form">${e.form}</span> <span class="n-kind">${esc(e.kindName)}</span></h4>
      ${e.concept ? `<p>${esc(e.concept)}</p>` : ''}<p>${esc(e.meaning)}</p>${e.condition ? `<p class="n-cond"><b>Applies when:</b> ${esc(e.condition)}</p>` : ''}
      ${e.calc ? `<p class="n-calc"><b>Where it comes from:</b> ${esc(e.calc)}</p>` : ''}${e.confusion ? `<p class="n-watch"><b>Watch out:</b> ${esc(e.confusion)}</p>` : ''}</article>`).join('');
  return `<section class="n-chapter" id="${esc(cid)}"><h2>${esc(c.title)}</h2>
    ${c.overview ? `<p class="n-lead">${esc(c.overview)}</p>` : `<p class="n-lead">${esc(c.intro)}</p>`}
    ${c.ideas.length ? `<h3>Ideas to keep</h3>${list(c.ideas)}` : ''}${c.watch.length ? `<h3>Common mix-ups</h3>${list(c.watch)}` : ''}
    <h3>Quantities</h3><table class="n-defs"><thead><tr><th>Symbol</th><th>What it is</th><th>Unit</th></tr></thead><tbody>${defs}</tbody></table>
    <h3>Equations</h3>${c.sections.map(s => `<div class="n-sec"><h4 class="n-sech">${esc(s.title)}</h4>${s.note ? `<p class="small muted">${esc(s.note)}</p>` : ''}${eqs(s)}</div>`).join('')}</section>`;
}
