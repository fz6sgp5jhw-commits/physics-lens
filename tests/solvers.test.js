// Test 1: solver round-trips.
// Build physically consistent states for each unit, then for every equation that applies under the
// state's conditions, hide each variable in turn and check the hand-written solver recovers it.
// A mismatch is accepted only when the solver's `note` flags the ambiguity (two roots / sign choice).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EQS, CHAPTERS } from '../js/data.js';

const rad = (d) => d * Math.PI / 180;
const REL = 1e-6;

// ---------- consistent states ----------
function inclineState({ m, g = 9.81, inc, mu = 0, friction, up, v0, t }){
  const W = m * g, Wpar = W * Math.sin(rad(inc)), Wperp = W * Math.cos(rad(inc)), N = Wperp, f = mu * N;
  const F = !friction ? Wpar : up ? Wpar + f : Wpar - f, a = F / m;
  const s = { m, g, inc, W, Wpar, Wperp, N, F, a, v0, t, vf: v0 + a * t, dx: v0 * t + 0.5 * a * t * t };
  if (friction) Object.assign(s, { mu, f });
  return { ch: 'incline', cond: { friction, up, earth: true }, s };
}
function pulleyState({ m1, m2, g = 9.81, mu = 0, friction, v0, t }){
  const W1 = m1 * g, W2 = m2 * g, N1 = W1, f = friction ? mu * N1 : 0;
  const a = (W2 - f) / (m1 + m2), Tn = m1 * a + f;
  const s = { m1, m2, g, W1, W2, N1, a, Tn, v0, t, vf: v0 + a * t, dx: v0 * t + 0.5 * a * t * t };
  if (friction) Object.assign(s, { mu, f });
  return { ch: 'pulley', cond: { friction, earth: true }, s };
}
function rotationState({ w0, alpha, t, r }){
  const w = w0 + alpha * t, theta = w0 * t + 0.5 * alpha * t * t;
  return { ch: 'rotation', cond: { rim: true }, s: { w0, alpha, t, w, theta, r, s: r * theta, v: r * w, at: r * alpha, ac: w * w * r, atot: Math.hypot(r * alpha, w * w * r) } };
}

// phase C3: a ball rolling down a ramp, a disc turned by a hanging mass, a body spinning on its own (with and without L conserved)
const I_CM = { sphere: 2 / 5, shell: 2 / 3, disc: 1 / 2, ring: 1 };
function rollState({ shape, M, R, g = 9.81, inc, h, K0 = 0, Wnc = 0 }){
  const Icm = I_CM[shape] * M * R * R, k = 1 + Icm / (M * R * R), a = g * Math.sin(rad(inc)) / k, alpha = a / R, U0 = M * g * h, K = K0 + U0 + Wnc;
  const v = Math.sqrt(2 * K / (M * k)), w = v / R, Krot = 0.5 * Icm * w * w;
  return { ch: 'rolling', cond: { body: 'roll', shape, axis: 'centre' }, s: { M, R, D: 2 * R, g, inc, h, Icm, I: Icm, a, alpha, fs: Icm * alpha / R, tnet: Icm * alpha,
    K0, U0, U: 0, Wnc, K, Wnet: K - K0, v, w, Krot, Ktr: K - Krot } };
}
function hangState({ m, M, R, g = 9.81, h }){
  const I = 0.5 * M * R * R, a = m * g / (m + I / (R * R)), Tn = m * (g - a), v = Math.sqrt(2 * a * h), K = m * g * h;
  return { ch: 'rolling', cond: { body: 'hang', shape: 'disc', axis: 'centre' }, s: { m, M, R, g, h, Icm: I, I, a, alpha: a / R, Tn, tnet: Tn * R,
    K0: 0, U0: K, U: 0, Wnc: 0, K, Wnet: K, v, w: v / R, Krot: 0.5 * I * (v / R) ** 2 } };
}
function spinState({ M, R, w, rt, m, vp, phi, Ii, If, t, noTorque }){
  const I = 0.5 * M * R * R, Li = rt * m * vp * Math.sin(rad(phi)), wi = Li / Ii, Lf = noTorque ? Li : 1.5 * Li, wf = Lf / If;
  return { ch: 'rolling', cond: { body: 'spin', shape: 'disc', axis: 'centre', noTorque }, s: { M, R, D: 2 * R, Icm: I, I, w, K: 0.5 * I * w * w, Krot: 0.5 * I * w * w,
    rt, m, v: vp, phi, Li, Lf, Ii, If, wi, wf, ...(noTorque ? {} : { t, tnet: (Lf - Li) / t }) } };
}

// work, energy and momentum: a block on a rough slope with a spring at the start (climbing) or at the end (sliding down onto it),
// pulled by a force F at an angle; and two bodies colliding along a line, body 2 then swinging up to h
function energyState({ m, inc, mu, ks, xs, v0, dx, Fp, phi, t, up, g = 9.81 }){
  const W = m * g, Wperp = W * Math.cos(rad(inc)), f = mu * Wperp, h = dx * Math.sin(rad(inc)), Usp = 0.5 * ks * xs * xs, K0 = 0.5 * m * v0 * v0, Wnc = -f * dx;
  const U0 = up ? 0 : m * g * h, U = up ? m * g * h : 0, Us0 = up ? Usp : 0, Us = up ? 0 : Usp, K = K0 + U0 + Us0 + Wnc - U - Us, WF = Fp * dx * Math.cos(rad(phi));
  return { ch: 'energy', cond: { collide: 'free', rough: true, ground: !up, ground0: up, relax0: !up, relax1: up },
    s: { m, g, inc, mu, ks, xs, v0, dx, W, Wperp, N: Wperp, f, h, K0, U0, Us0, Wnc, K, U, Us, v: Math.sqrt(2 * K / m), Wnet: K - K0, Fp, phi, t, WF, Pavg: WF / t } };
}
function collideState({ m1, m2, v1i, v2i, collide, v1f, g = 9.81 }){
  const p = m1 * v1i + m2 * v2i;
  if (collide === 'stick') v1f = p / (m1 + m2);
  if (collide === 'elastic') v1f = ((m1 - m2) * v1i + 2 * m2 * v2i) / (m1 + m2);
  const v2f = (p - m1 * v1f) / m2;
  return { ch: 'energy', cond: { collide }, s: { m1, m2, v1i, v2i, v1f, v2f, g, h: v2f * v2f / (2 * g) } };
}

export const STATES = {
  incline: [
    inclineState({ m: 3, inc: 35, friction: false, up: false, v0: 0, t: 1.5 }),
    inclineState({ m: 2, inc: 20, friction: false, up: false, v0: 1.2, t: 2 }),
    inclineState({ m: 4, inc: 30, mu: 0.2, friction: true, up: false, v0: 0, t: 1.1 }),
    inclineState({ m: 5, inc: 40, mu: 0.35, friction: true, up: false, v0: 2.5, t: 0.8 }),
    inclineState({ m: 1.5, inc: 15, friction: false, up: true, v0: -6, t: 1.2 }),       // shoved up, still rising
    inclineState({ m: 2.5, inc: 25, mu: 0.15, friction: true, up: true, v0: -5, t: 0.6 }), // up with friction, still rising
  ],
  pulley: [
    pulleyState({ m1: 4, m2: 2, friction: false, v0: 0, t: 1.2 }),
    pulleyState({ m1: 3, m2: 1, friction: false, v0: 0.8, t: 2 }),
    pulleyState({ m1: 5, m2: 3, mu: 0.25, friction: true, v0: 0, t: 1.5 }),
    pulleyState({ m1: 2, m2: 1, mu: 0.2706, friction: true, v0: 1.1, t: 0.9 }),
    pulleyState({ m1: 6, m2: 1, mu: 0.4, friction: true, v0: 3, t: 0.7 }),              // friction wins: slowing down (a < 0)
  ],
  rotation: [
    rotationState({ w0: 1.5, alpha: 1.2, t: 2, r: 0.5 }),
    rotationState({ w0: 0, alpha: 4, t: 3, r: 0.5 }),
    rotationState({ w0: -2, alpha: -0.5, t: 3, r: 0.3 }),                                // clockwise, speeding up
    rotationState({ w0: 125.66, alpha: -25.13, t: 2, r: 0.2 }),                          // winding down
    rotationState({ w0: 5, alpha: -2, t: 4, r: 0.4 }),                                   // turns back through the same angle: ambiguous
  ],
  rolling: [
    rollState({ shape: 'sphere', M: 2, R: 0.1, inc: 30, h: 1.5 }),
    rollState({ shape: 'shell', M: 0.8, R: 0.15, inc: 20, h: 0.9, K0: 1.2, Wnc: -0.3 }),
    rollState({ shape: 'disc', M: 5, R: 0.3, inc: 12, h: 2.2 }),
    hangState({ m: 1.2, M: 3, R: 0.2, h: 1.5 }),
    spinState({ M: 4, R: 0.25, w: 12, rt: 0.4, m: 0.05, vp: 30, phi: 70, Ii: 0.6, If: 0.2, noTorque: true }),
    spinState({ M: 4, R: 0.25, w: 12, rt: 0.4, m: 0.05, vp: 30, phi: 70, Ii: 0.6, If: 0.2, t: 2.5, noTorque: false }),
  ],
  energy: [
    energyState({ m: 0.4, inc: 25, mu: 0.15, ks: 180, xs: 0.12, v0: 1.5, dx: 0.3, Fp: 12, phi: 35, t: 2.5, up: true }),
    energyState({ m: 2, inc: 30, mu: 0.2, ks: 400, xs: 0.05, v0: 0.8, dx: 1.5, Fp: 20, phi: 120, t: 4, up: false }),
    collideState({ m1: 1.5, m2: 6, v1i: 9, v2i: 0, v1f: -5.4, collide: 'free' }),
    collideState({ m1: 0.5, m2: 2.5, v1i: 6, v2i: 0, collide: 'stick' }),
    collideState({ m1: 2, m2: 3, v1i: 4, v2i: -1, collide: 'elastic' }),
  ],
};

// ---------- the round trip ----------
const applies = (ch, e, cond) => {
  const sec = CHAPTERS[ch].sections.find(s => s.eqs.includes(e));
  return (!sec || !sec.applies || sec.applies(cond)) && (!EQS[e].applies || EQS[e].applies(cond));
};
const close = (got, want) => Math.abs(got - want) <= REL * Math.max(Math.abs(want), 1e-9) || Math.abs(got - want) < 1e-9;
// the solver noticed and explained the ambiguity
const flagged = (note) => /twice|two positive roots|negative of this|pick the one/i.test(note || '');

export function roundTrip(ch){
  const out = { pass: 0, flagged: [], fail: [] };
  for (const [si, { cond, s }] of STATES[ch].entries()){
    const eqs = [...new Set(CHAPTERS[ch].sections.flatMap(x => x.eqs))].filter(e => applies(ch, e, cond));
    for (const e of eqs){
      for (const [x, sol] of Object.entries(EQS[e].solve)){
        if (!EQS[e].vars.every(id => id in s)) continue;
        const v = { ...s }; delete v[x];
        if (ch === 'incline') v.__u0sign = cond.up ? -1 : 1; // the app sets this from the conditions
        let res = sol.f(v); if (typeof res === 'number') res = { value: res };
        const tag = `${ch}#${si} ${e}(${EQS[e].label}) → ${x}`;
        if (res.error){ out.fail.push(`${tag}: error "${res.error}" (want ${s[x]})`); continue; }
        if (close(res.value, s[x])) out.pass++;
        else if (flagged(res.note)) out.flagged.push(`${tag}: got ${res.value}, state has ${s[x]} (note: ${res.note})`);
        else out.fail.push(`${tag}: got ${res.value}, want ${s[x]}${res.note ? ` (note: ${res.note})` : ''}`);
      }
    }
  }
  return out;
}

for (const ch of Object.keys(STATES)){
  test(`solver round-trips: ${ch}`, (t) => {
    const r = roundTrip(ch);
    t.diagnostic(`${ch}: ${r.pass} recovered, ${r.flagged.length} ambiguous but flagged, ${r.fail.length} failed`);
    for (const f of r.flagged) t.diagnostic('flagged: ' + f);
    assert.ok(r.pass > 0, 'no solvers ran');
    assert.deepEqual(r.fail, [], `unflagged mismatches:\n${r.fail.join('\n')}`);
  });
}
