// Physics Lens — the code's own values for a setup, for the checks (phase G3). Pure code, no DOM.
// A route (the equations pick.js chose) is a square system: as many equations as unknowns. It is solved numerically with the
// equations' own templates (parseEq / evalNum from expr.js) by Newton's method with a numeric Jacobian. This is the "solved
// values" that a line of the student's algebra is held against at several points (Andes's color by numbers). It is never shown.
import { parseEq, evalNum } from './expr.js';

// known: { quantityId: number }, unknowns: [ids], eqs: [equation templates as text]. Returns { id: value } or null.
export function solveSystem({ eqs, known, unknowns, start = {} }){
  const trees = eqs.map(parseEq);
  if (trees.length !== unknowns.length) return null;
  const res = (x) => { const v = { ...known }; unknowns.forEach((u, i) => { v[u] = x[i]; }); return trees.map(t => evalNum(t.lhs, v) - evalNum(t.rhs, v)); };
  const norm = (r) => Math.sqrt(r.reduce((a, b) => a + b * b, 0));
  let x = unknowns.map(u => start[u] ?? 1), r = res(x);
  for (let it = 0; it < 60; it++){
    if (!r.every(Number.isFinite)) return null;
    if (norm(r) < 1e-12 * Math.max(1, ...Object.values(known).map(Math.abs))) break;
    // numeric Jacobian
    const J = unknowns.map((_, j) => { const h = 1e-6 * Math.max(1, Math.abs(x[j])), y = [...x]; y[j] += h; return res(y).map((q, i) => (q - r[i]) / h); });
    const d = gauss(unknowns.map((_, i) => unknowns.map((__, j) => J[j][i])), r.map(q => -q));
    if (!d) return null;
    let t = 1, nx, nr;
    for (; t > 1e-4; t /= 2){ nx = x.map((q, i) => q + t * d[i]); nr = res(nx); if (nr.every(Number.isFinite) && norm(nr) < norm(r)) break; }
    if (t <= 1e-4) break;
    x = nx; r = nr;
  }
  if (!(norm(r) < 1e-6 * Math.max(1, ...Object.values(known).map(Math.abs)))) return null;
  return Object.fromEntries(unknowns.map((u, i) => [u, x[i]]));
}
// A d = b by Gaussian elimination with pivoting; null when singular
function gauss(A, b){
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++){
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++){ const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--){ x[r] = (M[r][n] - M[r].slice(r + 1, n).reduce((s, v, k) => s + v * x[r + 1 + k], 0)) / M[r][r]; }
  return x;
}
