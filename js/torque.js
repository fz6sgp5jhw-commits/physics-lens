// Physics Lens — extended free-body diagrams (Phase 5): forces on a beam or a disc start where they act.
// Everything here builds template strings ({id} slots) that expr.js turns into exact rationals, so the
// equations stay symbolic and the signs come from the drawn directions, never from typed minus signs.
//
// Beam (frame 'beam'): x toward the beam's right end, y up, torques + counterclockwise. A point on the beam is
// a distance from its left end: the centre ½L, an end (0 or L), the pivot, or a named distance (d_m, d_T, d_F, d_P)
// measured from whichever end the student picks (from the right end it is L − d). The beam may tilt by β:
// 'up' = right end higher, 'down' = right end lower. Its unit vector is u = (cos β, σ sin β), and n = (−σ sin β, cos β).
// A force's torque about a point on the beam is τ = r F (u × F̂) = r F sin φ, with r = position − axis (signed).
// Disc (frame 'disc'): forces at the centre or on the rim; the axis is the axle (its centre); τ = R F (ρ̂ × F̂).

// the forces a beam or disc can carry: label, symbol choices, the default direction and where it acts
export const KINDS = {
  gravity: { label: 'Gravity (its weight)', at: 'centre', dir: 'down' },
  hung: { label: 'Hung mass (mg at its hook)', at: 'dm', dir: 'down', beamOnly: true },
  tension: { label: 'Cord / string', vars: ['Tn'], at: 'dT', dir: 'up' },
  hinge: { label: 'Hinge or axle (H_x and H_y)', at: 'pivot' },
  push: { label: 'Push / pull', vars: ['Fp'], at: 'dF', dir: 'down' },
};
export const POINT_VARS = ['dP', 'dm', 'dT', 'dF'];

// directions: world ones as [x, y] (y up), slants as [along the beam, perpendicular to it] in units of cos φ, sin φ
export const DIRS = {
  beam: { down: { w: ['0', '−1'], name: 'straight down' }, up: { w: ['0', '1'], name: 'straight up' },
    right: { w: ['1', '0'], name: 'horizontal, toward the right end' }, left: { w: ['−1', '0'], name: 'horizontal, toward the left end' },
    'slant-ul': { s: [-1, 1], name: 'at φ above the beam, toward the left end' }, 'slant-ur': { s: [1, 1], name: 'at φ above the beam, toward the right end' },
    'slant-dl': { s: [-1, -1], name: 'at φ below the beam, toward the left end' }, 'slant-dr': { s: [1, -1], name: 'at φ below the beam, toward the right end' } },
  disc: { down: { w: ['0', '−1'], name: 'straight down' }, up: { w: ['0', '1'], name: 'straight up' },
    right: { w: ['1', '0'], name: 'horizontal, to the right' }, left: { w: ['−1', '0'], name: 'horizontal, to the left' } },
};
export const RIM = { 'rim-left': [-1, 0, 'the left of the rim'], 'rim-right': [1, 0, 'the right of the rim'], 'rim-top': [0, 1, 'the top of the rim'], 'rim-bottom': [0, -1, 'the bottom of the rim'] };
export const TILT = { level: 0, up: 1, down: -1 };

// tiny template algebra: a product skips factors of 1 and vanishes with a 0; a sum skips vanished terms
const neg = (a) => a === '0' ? '0' : a.startsWith('−') ? a.slice(1) : '−' + a;
export const mul = (...fs) => { if (fs.some(f => f === '0' || f === null)) return null; const k = fs.filter(f => f !== '1'); return k.length ? k.map(f => `(${f})`).join('') : '1'; };
export const add = (...ts) => { const k = ts.filter(t => t !== null && t !== '0'); return k.length ? k.join(' + ') : '0'; };

// the unit vector of a direction on this body: { x, y, perp } as template strings; perp = u × F̂ (beam only)
export function unit(frame, dir, sigma){
  const d = DIRS[frame][dir]; if (!d) return null;
  const sb = sigma > 0 ? 'sin {beta}' : '−sin {beta}', cb = 'cos {beta}';
  if (d.w){
    const [x, y] = d.w;
    const perp = !sigma ? y : add(mul(neg(x), sb), mul(y, cb)); // −wₓ σ sin β + w_y cos β
    return { x, y, perp };
  }
  const A = d.s[0] > 0 ? 'cos {phi}' : '−cos {phi}', P = d.s[1] > 0 ? 'sin {phi}' : '−sin {phi}';
  if (!sigma) return { x: A, y: P, perp: P };
  return { x: add(mul(A, cb), mul(neg(P), sb)), y: add(mul(A, sb), mul(P, cb)), perp: P };
}

// where a point on the beam is, from its left end (a template), and how it is described
export function position(at, b, from){
  if (at === 'centre') return '½{L}';
  if (at === 'left') return '0';
  if (at === 'right') return '{L}';
  if (at === 'pivot') return b.pinAt === 'left' ? '0' : b.pinAt === 'right' ? '{L}' : b.pinAt === 'centre' ? '½{L}' : position('dP', b, from);
  return from[at] === 'right' ? `({L} − {${at}})` : `{${at}}`;
}
export function placeName(at, b, from, plain){
  if (at === 'centre') return b.frame === 'disc' ? 'the centre (axle)' : 'the centre (½L)';
  if (at === 'left' || at === 'right') return `the ${at} end`;
  if (RIM[at]) return RIM[at][2];
  if (at === 'pivot'){ if (b.frame === 'disc') return 'the axle'; if (b.pinAt && b.pinAt !== 'point') return `the pivot (${b.pinAt === 'centre' ? 'the centre' : `the ${b.pinAt} end`})`; return `the pivot, ${plain('dP')} from the ${from.dP || 'left'} end`; }
  return `${plain(at)} from the ${from[at] || 'left'} end`;
}
// the point a force acts at (a key) and the size of the force (a template)
export const atOf = (f) => f.at || KINDS[f.kind].at;
export const sizeOf = (b, f) => f.kind === 'gravity' ? `{${b.mass || 'M'}}{g}` : f.kind === 'hung' ? '{m}{g}' : `{${f.var}}`;

// one force's parts: world components (templates), the lever arm r and sin φ, and its torque about the axis
export function parts(b, f, o){
  const sigma = b.frame === 'beam' ? TILT[o.tilt] || 0 : 0, F = sizeOf(b, f), at = atOf(f);
  const u = unit(b.frame, f.dir, sigma); if (!u) return null;
  let r, sin;
  if (b.frame === 'disc'){
    const rho = RIM[at];
    r = rho ? `{${o.radius}}` : '0';
    sin = rho ? add(mul(String(rho[0]).replace('-', '−'), u.y), mul(String(-rho[1]).replace('-', '−'), u.x)) : '0'; // ρₓ F̂_y − ρ_y F̂ₓ
  } else {
    const p = position(at, b, o.from), a = position(o.axis, b, o.from);
    r = p === a ? '0' : a === '0' ? p : `${p} − ${a.startsWith('(') ? a : `(${a})`}`;
    sin = u.perp;
  }
  return { F, fx: mul(F, u.x), fy: mul(F, u.y), r, sin, tau: mul(r, F, sin) };
}

// the equations a checked diagram writes: equilibrium → ΣFx = 0, ΣFy = 0, Στ = 0; spinning up → Στ = Iα
export function equations(b, forces, o){
  const ps = forces.map(f => parts(b, f, o)).filter(Boolean);
  const about = b.frame === 'disc' ? 'the axle' : o.axisName;
  const zsum = (key) => add(...ps.map(p => p[key] === null ? null : `(${p[key]})`));
  const out = [];
  // lhs = rhs; the app solves lhs − rhs = 0
  if (!o.dyn){
    out.push({ label: 'ΣFx', lhs: zsum('fx'), rhs: '0', condition: 'equilibrium: no acceleration sideways (x toward the right end)' });
    out.push({ label: 'ΣFy', lhs: zsum('fy'), rhs: '0', condition: 'equilibrium: no acceleration up or down' });
    out.push({ label: `Στ (about ${about})`, lhs: zsum('tau'), rhs: '0', condition: `equilibrium: no angular acceleration (+ counterclockwise, about ${about})`, torque: true });
  } else {
    out.push({ label: `Στ = Iα (about ${about})`, lhs: zsum('tau'), rhs: '{I}{alpha}', condition: `Newton’s second law for turning (+ counterclockwise, about ${about})`, torque: true });
  }
  return out.map(q => ({ ...q, zsub: q.rhs === '0' ? q.lhs : `${q.lhs} − ${q.rhs}` }));
}

// the free-body checker for a beam or disc: every message names the physics that's missing
// s = { pinned, hungBlock, stringTo: { below, left } | null }
export function check(b, forces, s, plain){
  const bad = [], what = b.frame === 'disc' ? 'disc' : 'beam', has = (k) => forces.filter(f => f.kind === k);
  const grav = has('gravity');
  if (!grav.length) bad.push(`The ${what} has weight: add gravity, ${plain(b.mass || 'M')}g at its centre, straight down.`);
  else if (grav.some(f => f.dir !== 'down')) bad.push('Gravity always points straight down.');
  if (s.pinned && !has('hinge').length) bad.push(`The ${b.frame === 'disc' ? 'axle' : 'pivot'} holds the ${what}: add the hinge force as two parts, H_x and H_y. Don’t guess their directions: their signs come out of the algebra.`);
  if (!s.pinned && has('hinge').length) bad.push(`Nothing pins the ${what} here, so there’s no hinge force. Drop the ${what} on a pivot first.`);
  if (s.hungBlock && b.frame === 'beam' && !has('hung').length) bad.push('A mass hangs from the beam: add its weight, mg at the hook, straight down.');
  if (has('hung').some(f => f.dir !== 'down')) bad.push('A hung mass pulls straight down on its hook (its string is vertical).');
  if (s.stringTo && b.frame === 'disc'){
    const t = has('tension');
    if (!t.length) bad.push('A string is wound on the disc: add its pull at the rim, along the string.');
    else if (t.some(f => !RIM[atOf(f)])) bad.push('The string pulls at the rim, where it leaves the disc, not at the centre: that is what gives it a lever arm.');
    else if (s.stringTo.below && t.some(f => f.dir !== 'down')) bad.push('A string pulls along itself: this one runs down to the hanging mass, so its pull on the disc points down.');
  }
  return bad;
}
