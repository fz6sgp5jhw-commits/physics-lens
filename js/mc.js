// Physics Lens — the multiple-choice screen (phase Q4): one dialog with five tabs that put the Q1–Q3 engines in front of
// the student. Each tab asks first, then checks: the app never picks the answer. All maths is in choice.js, principle.js,
// vectors.js and options.js; this file only reads inputs, calls them and shows what comes back. Everything the student types
// is shown through textContent (never innerHTML).
import { scaling, rank, SHAPES } from './choice.js';
import { chooser, judgePrediction, spinResponse, energyGain, workSign, torqueSense, mostEffective, supportDirection, CHECKLIST } from './principle.js';
import { dot, cross } from './vectors.js';
import { checkOptions, factsCard, reasoning } from './options.js';

const h = (tag, props = {}, kids = []) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of [].concat(kids)) e.append(k); return e; };
const field = (label, input) => h('label', { className: 'mcf' }, [h('span', { textContent: label }), input]);
const sel = (opts, value) => { const s = h('select'); for (const [v, t] of opts) s.append(h('option', { value: v, textContent: t })); if (value) s.value = value; return s; };
const num = (s) => { const v = String(s).split(/[,\s]+/).filter(Boolean).map(x => Number(x.replace('−', '-'))); if (!v.length || v.some(x => !Number.isFinite(x))) throw new Error('Type numbers separated by commas, like 3, −4.'); return v; };
const pairs = (s) => Object.fromEntries(String(s).split(',').map(x => x.trim()).filter(Boolean).map(x => { const [k, v] = x.split('='); const n = Number(String(v).replace('−', '-')); if (!k || !Number.isFinite(n)) throw new Error(`“${x}” should look like g=9.81.`); return [k.trim(), n]; }));
const steps = (list) => h('div', { className: 'mcsteps' }, list.map(s => h('div', {}, [h('code', { textContent: s.text }), s.why ? h('small', { textContent: '  ' + s.why }) : ''])));
const say = (cls, text) => h('p', { className: 'mcmsg ' + cls, textContent: text });

const SKID = 'd | {f}{d} = ½{m}{v}²\nf | {f} = {mu}{N}\nN | {N} = {m}{g}';
const NAMES = { mu: 'μ', w: 'ω', th: 'θ', alpha: 'α', at: 'a_t', ac: 'a_c' };

export function createMC({ host, eqs = {} }){
  const tabs = {};
  const bar = h('div', { className: 'mctabs', role: 'tablist' }), body = h('div', { className: 'mcbody' });
  host.replaceChildren(bar, body);
  const add = (id, title, build) => {
    const panel = h('div', { className: 'mcpanel', hidden: true, id: 'mc-' + id }), out = h('div', { className: 'mcout', 'aria-live': 'polite' });
    const b = h('button', { textContent: title, role: 'tab', onclick: () => show(id) });
    build(panel, out); panel.append(out); bar.append(b); body.append(panel); tabs[id] = { b, panel };
  };
  const show = (id) => { for (const [k, t] of Object.entries(tabs)){ t.panel.hidden = k !== id; t.b.setAttribute('aria-pressed', String(k === id)); } };
  // run a tool: errors become a plain sentence, never a crash
  const run = (out, fn) => { try { out.replaceChildren(...[].concat(fn())); } catch (e) { out.replaceChildren(say('bad', e.message || String(e))); } };

  // ---- 1 · which principle?
  add('principle', 'Which principle?', (p, out) => {
    const yn = CHECKLIST.map(c => ({ c, s: sel([['', 'choose…'], ['zero', 'yes, it is zero'], ['nonzero', 'no, it is not']]) }));
    const guess = { p: h('input', { type: 'checkbox' }), L: h('input', { type: 'checkbox' }), E: h('input', { type: 'checkbox' }) };
    p.append(h('p', { className: 'small', textContent: 'Answer the checklist about your system, then predict what is conserved. The app checks your prediction; it never chooses the option.' }),
      ...yn.map(({ c, s }) => field(c.ask, s)),
      h('div', { className: 'mcrow' }, [h('b', { textContent: 'I predict conserved: ' }), ...[['p', 'momentum p'], ['L', 'angular momentum L'], ['E', 'mechanical energy K + U']].map(([k, t]) => h('label', {}, [guess[k], ' ' + t]))]),
      h('button', { className: 'go', textContent: 'Check my prediction', onclick: () => run(out, () => {
        const a = Object.fromEntries(yn.map(({ c, s }) => [c.id, s.value])), pred = Object.keys(guess).filter(k => guess[k].checked), j = judgePrediction(a, pred), c = chooser(a);
        return [say(j.ok ? 'good' : 'bad', j.lines.join(' ')), ...(c.complete ? c.lines.map(l => say('', l)) : [])];
      }) }));
    const I = sel([['falls', 'I falls (arms pulled in)'], ['rises', 'I rises (arms out)']]), W = sel([['negative', 'W_nc negative (drag, friction)'], ['zero', 'W_nc zero'], ['positive', 'W_nc positive']]), U = h('input', { value: '30 J' });
    p.append(h('hr'), h('b', { textContent: 'Two follow-ups' }),
      h('div', { className: 'mcrow' }, [I, h('button', { textContent: 'If L is conserved…', onclick: () => run(out, () => say('', spinResponse(I.value).line)) })]),
      h('div', { className: 'mcrow' }, [field('U lost', U), W, h('button', { textContent: 'How much K is gained?', onclick: () => run(out, () => say('', energyGain(U.value, W.value).line)) })]));
  });

  // ---- 2 · scaling and ranking
  add('scale', 'Scaling & ranking', (p, out) => {
    const chain = h('textarea', { rows: 4, value: '' }), hold = h('input', { placeholder: 'held fixed, e.g. mu, g' }), cid = h('input', { size: 4, placeholder: 'v' }), ck = h('input', { size: 4, placeholder: '2' });
    p.append(h('p', { className: 'small', textContent: 'If X becomes k·X, what happens? One equation per line as “solve-for | equation”, the first line solves for the quantity asked about. Say what is held fixed.' }),
      field('Equation chain', chain), field('Held fixed', hold), h('div', { className: 'mcrow' }, [field('Change this symbol', cid), field('by this factor k', ck)]),
      h('div', { className: 'mcrow' }, [
        h('button', { textContent: 'Example: skid', onclick: () => { chain.value = SKID; hold.value = 'mu, g'; cid.value = 'v'; ck.value = '2'; } }),
        h('button', { className: 'go', textContent: 'Scale it', onclick: () => run(out, () => {
          const c = chain.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [s, ...e] = l.split('|'); if (!e.length) throw new Error('Each line needs “solve-for | equation”.'); return { solve: s.trim(), eq: e.join('|').trim() }; });
          const k = Number(ck.value.replace('−', '-'));
          if (!c.length || !cid.value.trim() || !Number.isFinite(k)) throw new Error('Give the equations, the symbol to change and the factor k.');
          const r = scaling({ chain: c, hold: hold.value.split(/[,\s]+/).filter(Boolean), change: { id: cid.value.trim(), k }, names: NAMES });
          return [steps(r.steps), ...r.problems.map(t => say('bad', t)), ...r.notes.map(t => say('', t)), r.ok ? say('good', `Ratio: ${r.ratioText}`) : ''];
        }) })]));
    const eq = h('input', { value: '', placeholder: '{a} = {g}sin{th}/(1 + {I}/({M}{R}²))' }), solve = h('input', { size: 4, placeholder: 'a' }), common = h('input', { placeholder: 'g=9.81, th=30' }),
      cases = h('textarea', { rows: 4, placeholder: 'sphere | sphere | M=1, R=1' }), order = sel([['high', 'largest first'], ['low', 'smallest first']]);
    p.append(h('hr'), h('b', { textContent: 'Ranking cases' }), field('Deciding formula (use {I} for inertia)', eq), h('div', { className: 'mcrow' }, [field('Solve for', solve), field('Common values', common), order]),
      field(`Cases: “label | shape | values” (shapes: ${Object.keys(SHAPES).join(', ')})`, cases),
      h('div', { className: 'mcrow' }, [
        h('button', { textContent: 'Example: rolling race', onclick: () => { eq.value = '{a} = {g}sin{th}/(1 + {I}/({M}{R}²))'; solve.value = 'a'; common.value = 'g=9.81, th=30'; cases.value = 'hoop | ring | M=1, R=1\ndisc | disc | M=1, R=1\nsphere | sphere | M=1, R=1'; } }),
        h('button', { className: 'go', textContent: 'Rank them', onclick: () => run(out, () => {
          const cs = cases.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [label, shape, vals = ''] = l.split('|').map(x => x.trim()); return { label, shape, values: pairs(vals) }; });
          const r = rank({ eq: eq.value, solve: solve.value.trim(), common: pairs(common.value), cases: cs, order: order.value, names: NAMES });
          return [steps(r.steps), ...r.problems.map(t => say('bad', t)), ...r.ties.map(t => say('', `${t[0]} and ${t[1]} tie.`)), r.ok ? say('good', `Order: ${r.order.join(order.value === 'high' ? ' > ' : ' < ')}`) : ''];
        }) })]));
  });

  // ---- 3 · sign and direction
  add('sign', 'Sign & direction', (p, out) => {
    const d = h('input', { placeholder: '0, −2' }), F = h('input', { placeholder: '0, −9.8' });
    p.append(h('p', { className: 'small', textContent: 'Type components (x, y; y is up). Predict the sign first, then check it.' }), h('b', { textContent: 'Work of a force' }),
      h('div', { className: 'mcrow' }, [field('Displacement d', d), field('Force F', F), h('button', { className: 'go', textContent: 'Sign of the work', onclick: () => run(out, () => { const w = workSign(num(d.value), num(F.value)); return [say(w.sign === 'positive' ? 'good' : '', `W is ${w.sign}. ${w.line}`), steps(w.steps)]; }) })]));
    const r = h('input', { placeholder: '2, 0' }), Fr = h('input', { placeholder: '0, −100' });
    p.append(h('hr'), h('b', { textContent: 'Torque about an axis' }),
      h('div', { className: 'mcrow' }, [field('r (axis to where F acts)', r), field('Force F', Fr), h('button', { className: 'go', textContent: 'Torque sense', onclick: () => run(out, () => { const t = torqueSense(num(r.value), num(Fr.value)); return [say('', t.line), steps(t.steps)]; }) })]));
    const piv = h('input', { value: '0, 0' }), sup = h('input', { placeholder: '4, 0' }), lat = h('input', { placeholder: '2, 0' }), lF = h('input', { placeholder: '0, −100' });
    p.append(h('hr'), h('b', { textContent: 'Which way must the support push?' }),
      h('div', { className: 'mcrow' }, [field('Pivot', piv), field('Support at', sup), field('Load at', lat), field('Load force', lF), h('button', { className: 'go', textContent: 'Direction', onclick: () => run(out, () => { const s = supportDirection({ pivot: num(piv.value), support: num(sup.value), loads: [{ at: num(lat.value), F: num(lF.value) }] }); return say(s.dir ? 'good' : 'bad', s.line); }) })]));
    const mr = h('input', { placeholder: '2, 0' }), mf = h('textarea', { rows: 3, placeholder: 'a | 10, 0\nb | 0, 10\nc | 7, 7' });
    p.append(h('hr'), h('b', { textContent: 'Which force is most effective? (equal strengths: type them as components)' }),
      h('div', { className: 'mcrow' }, [field('r', mr), field('Forces: label | components', mf), h('button', { className: 'go', textContent: 'Compare', onclick: () => run(out, () => {
        const fs = mf.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [id, v] = l.split('|'); return { id: id.trim(), F: num(v) }; }), m = mostEffective(num(mr.value), fs);
        return [say('good', `Most effective: ${m.best.join(', ')}. ${m.line}`), ...m.rows.map(x => say('', `${x.id}: |τ| = ${x.tau} (${x.sense})`))];
      }) })]));
  });

  // ---- 4 · vectors
  add('vectors', 'Vectors', (p, out) => {
    const a = h('input', { placeholder: '10, 9, 12' }), ua = h('input', { size: 5, placeholder: 'kN' }), b = h('input', { placeholder: '5, 4, 0' }), ub = h('input', { size: 5, placeholder: 'm' });
    p.append(h('p', { className: 'small', textContent: 'Two or three components each. The units multiply along with the numbers.' }),
      h('div', { className: 'mcrow' }, [field('a', a), field('unit', ua)]), h('div', { className: 'mcrow' }, [field('b', b), field('unit', ub)]),
      h('div', { className: 'mcrow' }, ['dot', 'cross'].map(k => h('button', { className: 'go', textContent: k === 'dot' ? 'a · b' : 'a × b', onclick: () => run(out, () => {
        const r = (k === 'dot' ? dot : cross)(num(a.value), num(b.value), { ua: ua.value.trim(), ub: ub.value.trim() }); return [steps(r.steps), say('good', r.text)];
      }) }))));
  });

  // ---- 5 · options, facts, reasoning
  add('options', 'Check the options', (p, out) => {
    const opts = h('textarea', { rows: 4, placeholder: 'one option per line, e.g.\n2×\n4×\n8×' }), pred = sel([['', 'type the options first']]), derived = h('input', { placeholder: 'your result, e.g. 4  or  86 kJ  or a sentence' });
    opts.oninput = () => { const lines = opts.value.split('\n').map(l => l.trim()).filter(Boolean); pred.replaceChildren(h('option', { value: '', textContent: 'which do you expect?' }), ...lines.map((l, i) => h('option', { value: String(i), textContent: `${String.fromCharCode(65 + i)} · ${l}` }))); };
    p.append(h('p', { className: 'small', textContent: 'Type the choices, commit to a prediction, then enter what you derived. Nothing is marked until you have predicted.' }),
      field('Options', opts), field('My prediction', pred), field('My derived result', derived),
      h('button', { className: 'go', textContent: 'Check', onclick: () => run(out, () => {
        const lines = opts.value.split('\n').map(l => l.trim()).filter(Boolean), v = derived.value.trim();
        const m = v.match(/^([−+-]?[\d.]+(?:e[−+-]?\d+)?)\s*([A-Za-zμΩ°][^\s]*)?$/);
        const r = checkOptions({ options: lines, prediction: pred.value === '' ? null : Number(pred.value), derived: !v ? null : m ? { value: Number(m[1].replace('−', '-')), unit: m[2] || '' } : v });
        return [say(r.committed && r.match !== null ? 'good' : '', r.message), ...r.verdicts.map(x => say(x.ok ? 'good' : 'bad', `${String.fromCharCode(65 + x.index)}: ${x.ok ? '✓' : '✗'} ${x.why}`))];
      }) }));
    const fcard = h('div', { className: 'mcfacts' });
    p.append(h('hr'), h('b', { textContent: 'Facts about a rotating rigid body' }), h('button', { textContent: 'Show the facts card', onclick: () => run(fcard, () => {
      const pick = Object.fromEntries(['E7', 'E8', 'E9'].filter(k => eqs[k]).map(k => [k, eqs[k]]));
      if (!Object.keys(pick).length) throw new Error('The rotation equations are not loaded.');
      const c = factsCard(pick); return [say('good', c.line), ...c.rows.map(r => h('p', {}, [h('code', { textContent: r.eq.replace(/[{}]/g, '') }), h('small', { textContent: `  ${r.meaning} (${r.condition})` })]))];
    }) }), fcard);
    const said = h('input', { placeholder: 'e.g. momentum is conserved' }), because = h('input', { placeholder: 'because… e.g. no external force acts' }), list = [], text = h('textarea', { rows: 4 }), shown = h('small', { className: 'muted' });
    const rebuild = () => { text.value = reasoning(list, pred.value === '' ? null : `${String.fromCharCode(65 + Number(pred.value))}`).text; shown.textContent = `${list.length} step${list.length === 1 ? '' : 's'} so far`; };
    p.append(h('hr'), h('b', { textContent: 'Reasoning line (for “circle the answer and explain”)' }), h('div', { className: 'mcrow' }, [field('A step I took', said), field('Because', because),
      h('button', { textContent: 'Add step', onclick: () => { if (!said.value.trim()) return; list.push({ said: said.value, because: because.value }); said.value = because.value = ''; rebuild(); } }),
      h('button', { textContent: 'Clear', onclick: () => { list.length = 0; text.value = ''; shown.textContent = ''; } })]), shown, field('Edit it as you like', text));
  });

  show('principle');
  return { show };
}
