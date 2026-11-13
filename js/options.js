// Physics Lens — multiple-choice aid, phase Q3: checking the options. Pure logic (no DOM) on expr.js.
//   parseOption(text)          "86 kJ" → number with unit, "1/√2" or "4×" → number or ratio, anything else → a statement
//   checkOptions({...})        the student types the options, commits to a prediction, derives a result; only then is anything
//                              marked. The matching option is named, and every other one is explained by the slip that makes it.
//   factsCard(eqs)             "which must be true of a rotating rigid body": built from each equation's meaning and condition
//   reasoning(steps)           the exam's "Reasoning:" line, assembled from the student's own steps; empty until they act
import * as X from './expr.js';

const same = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1e-12, Math.abs(a), Math.abs(b));
const clean = (s) => String(s).replace(/−/g, '-').trim();

// ---------------------------------------------------------------------------------------------- reading an option
export function parseOption(text){
  const t = clean(text);
  const m = t.match(/^([+-]?[\d.√()/^ ]+?)\s*(×|x)?\s*([A-Za-zμΩ°][A-Za-zμΩ°·/²³⁻\d]*)?$/);
  if (m){
    try {
      const v = X.evalNum(X.parse(m[1].trim()), {});
      if (Number.isFinite(v)){
        const unit = m[3] || '';
        try { X.unitFactor(unit); } catch { return { text, type: 'statement' }; }
        return { text, type: m[2] ? 'ratio' : 'number', value: v, unit };
      }
    } catch { /* not a number: a statement */ }
  }
  return { text, type: 'statement' };
}
const inSI = (o) => o.value * X.unitFactor(o.unit);

// ---------------------------------------------------------------------------------------------- slips (data, each with a test)
// each makes the value a student would get after one slip, from the correct value d
export const SLIPS = [
  { id: 'root', make: (d) => d > 0 ? Math.sqrt(d) : NaN, says: 'This is the square root of your result: a quantity that is squared in the equation (v², ω²) was not squared, or a root was taken that the equation does not have.' },
  { id: 'square', make: (d) => d * d, says: 'This is your result squared: a power in the equation was applied twice, or an extra one was added.' },
  { id: 'inverse', make: (d) => d ? 1 / d : NaN, says: 'This is your result upside down: the ratio was taken new/old the wrong way round, or the quantity sits in the denominator.' },
  { id: 'sign', make: (d) => -d, says: 'This is your result with the sign flipped: check which way you took as + and the direction of the vector.' },
  { id: 'half', make: (d) => d / 2, says: 'This is half your result: a factor of 2 was dropped (the ½ in ½mv² or ½Iω² was applied twice).' },
  { id: 'double', make: (d) => d * 2, says: 'This is double your result: a factor of 2 was added or the ½ was left out.' },
  { id: 'prefix', make: (d) => d * 1000, says: 'This is 1000 times your result: a unit prefix (k, m) was missed.' },
  { id: 'prefix-down', make: (d) => d / 1000, says: 'This is 1/1000 of your result: a unit prefix (k, m) was missed.' },
];
const norm = (s) => clean(s).toLowerCase().replace(/[^a-z0-9α-ωº°+\-√ ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------------------------- checking
// options: ['86 kJ', '8.6 kJ', …] (typed text), prediction: the index of the option the student expects (or null),
// derived: { value, unit? } or a statement string. Nothing is marked before the student has committed to a prediction.
export function checkOptions({ options, prediction = null, derived = null }){
  const opts = options.map(parseOption);
  if (!Number.isInteger(prediction) || prediction < 0 || prediction >= opts.length)
    return { committed: false, options: opts, verdicts: [], match: null, message: 'Pick the option you expect first. Then your derived result is checked against all of them.' };
  if (derived === null || derived === undefined || derived === '')
    return { committed: true, options: opts, verdicts: [], match: null, message: 'Your prediction is saved. Derive the result, then check it against the options.' };

  const isNum = typeof derived === 'object';
  const dv = isNum ? derived.value * X.unitFactor(derived.unit || '') : null;
  const verdicts = opts.map((o, i) => {
    if (isNum){
      if (o.type === 'statement') return { index: i, ok: false, why: 'This option is a statement, but your result is a number.' };
      if (same(inSI(o), dv)) return { index: i, ok: true, why: 'Matches your derived result.' };
      const slips = SLIPS.filter(s => same(s.make(dv), inSI(o)));
      return { index: i, ok: false, slips: slips.map(s => s.id), why: slips.length ? slips.map(s => s.says).join(' ') : 'Your result does not produce this number, and no common slip does either.' };
    }
    if (o.type !== 'statement') return { index: i, ok: false, why: 'This option is a number, but your result is a statement.' };
    const a = norm(o.text), b = norm(derived);
    return a === b || a.includes(b) || b.includes(a) ? { index: i, ok: true, why: 'Says the same as your derived result.' } : { index: i, ok: false, why: `This disagrees with what you derived: “${derived}”.` };
  });
  const hits = verdicts.filter(v => v.ok);
  const match = hits.length === 1 ? hits[0].index : null;
  const message = hits.length === 1 ? (match === prediction ? 'Your derived result matches your prediction.' : 'Your derived result matches a different option than you predicted: recheck which of the two is the slip.')
    : hits.length > 1 ? 'More than one option matches: two of the options are the same quantity written differently.' : 'None of the options matches your result: recheck a step before choosing.';
  return { committed: true, options: opts, verdicts, match, matchedPrediction: match === prediction, message };
}

// ---------------------------------------------------------------------------------------------- facts card
// eqs: { id: { eq: '{v} = {r}{w}', meaning, condition, label } } for the equations that link a point to the whole body.
// In "x = r·(stuff)" the left side depends on r; the quantities multiplying r are the same for every point of the body.
export function factsCard(eqs){
  const ids = (s) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const depends = new Set(), same_ = new Set(), rows = [];
  for (const [id, e] of Object.entries(eqs)){
    const [lhs, rhs] = e.eq.split('=').map(s => s.trim());
    const r = ids(rhs).includes('r') || ids(lhs).includes('r');
    if (r){ ids(lhs).filter(x => x !== 'r').forEach(x => depends.add(x)); ids(rhs).filter(x => x !== 'r').forEach(x => same_.add(x)); }
    rows.push({ id, label: e.label, eq: e.eq, meaning: e.meaning, condition: e.condition });
  }
  for (const x of depends) same_.delete(x);
  return { rows, sameEverywhere: [...same_], dependOnR: [...depends], line: `Every point of a rigid body shares ${[...same_].join(', ')}; ${[...depends].join(', ')} depend${depends.size === 1 ? 's' : ''} on the distance r from the axis.` };
}

// ---------------------------------------------------------------------------------------------- the reasoning box
// steps: [{ said: 'Momentum is conserved', because: 'no external force acts on the canoes' }, …]; chosen: the option label
export function reasoning(steps, chosen = null){
  const done = (steps || []).filter(s => s && String(s.said || '').trim());
  if (!done.length) return { text: '', editable: true };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const body = done.map(s => `${cap(String(s.said).trim().replace(/[.]$/, ''))}${s.because ? ` because ${String(s.because).trim().replace(/[.]$/, '')}` : ''}.`);
  if (chosen) body.push(`So the answer is ${chosen}.`);
  return { text: body.join(' '), editable: true };
}
