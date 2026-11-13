// Physics Lens — the subject packs and how they merge (phase C2). A pack is one file in js/packs/:
//   { id, name, license: { code, content }, quantities, equations, chapters, components, practice, printOrder, bare? }
// Every practice (later lesson) problem carries source: { work, edition, license, url, problem } or original: true.
// A new subject is a new pack listed here: app.js needs no change. Ids from different packs must not collide;
// every pack except mechanics (bare: true) prefixes its ids with its own id and an underscore (fl_P, th_T), because
// ids appear in templates ({id}), HTML attributes and CSS selectors. Design: docs/core-plan.md, section 4.
import mech from './mech.js';

export const PACKS = [mech];

const PARTS = { quantities: 'quantity', equations: 'equation', chapters: 'unit', components: 'component' };

// every problem a student sees names where it comes from, or says it is the app's own
export function checkSource(p, x){
  if (!x.original && !(x.source && x.source.work && x.source.license)) throw new Error(`Pack ${p.id}: problem “${x.title}” needs a source (work, edition, license, url, problem) or original: true.`);
}

// Merge packs into one set of tables. Throws, naming both packs, on a collision or a missing prefix.
export function mergePacks(packs){
  const out = { packs: {}, quantities: {}, equations: {}, chapters: {}, components: {}, practice: [], lessons: [], slips: [], samples: {}, printOrder: [], notes: { chapters: {}, equations: {}, quantities: {} } };
  for (const p of packs){
    if (out.packs[p.id]) throw new Error(`Pack ${p.id} is loaded twice.`);
    out.packs[p.id] = p;
    for (const [part, word] of Object.entries(PARTS)) for (const [id, x] of Object.entries(p[part] || {})){
      if (id in out[part]) throw new Error(`Pack ${p.id}: the ${word} id ${id} is already used by pack ${out[part][id].pack}.`);
      if (!p.bare && !id.startsWith(p.id + '_')) throw new Error(`Pack ${p.id}: the ${word} id ${id} needs the prefix ${p.id}_.`);
      out[part][id] = Object.assign(x, { pack: p.id });
    }
    for (const [id, q] of Object.entries(p.quantities || {})){
      q.py ||= id; // the name typed in the algebra workspace
      if (q.sample !== undefined) out.samples[id] = q.sample;
    }
    for (const x of p.practice || []){
      checkSource(p, x);
      x.pack = p.id; out.practice.push(x);
    }
    for (const l of p.lessons || []){
      if (!p.bare && !l.id.startsWith(p.id + '_')) throw new Error(`Pack ${p.id}: the lesson id ${l.id} needs the prefix ${p.id}_.`);
      for (const st of l.stops) checkSource(p, st.problem);
      l.pack = p.id; out.lessons.push(l);
    }
    for (const part of ['chapters', 'equations', 'quantities']) Object.assign(out.notes[part], (p.notes || {})[part]);
    out.slips.push(...(p.slips || []));
    out.printOrder.push(...(p.printOrder || []));
  }
  return out;
}

// Who to credit: per pack its licences, then every outside work its problems come from (with the problems used),
// and how many problems are the app's own.
export function attribution(packs){
  return packs.map(p => {
    const works = new Map();
    for (const x of p.practice || []) if (!x.original){
      const s = x.source, key = `${s.work}|${s.edition || ''}`;
      if (!works.has(key)) works.set(key, { work: s.work, edition: s.edition, license: s.license, url: s.url, problems: [] });
      works.get(key).problems.push(s.problem || x.title);
    }
    return { pack: p.id, name: p.name, license: p.license, works: [...works.values()], original: (p.practice || []).filter(x => x.original).length };
  });
}
