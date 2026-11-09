// Phase C1 gate: one-line equations rearranged by code.
// For every library equation and every variable that still has a hand solver, isolate(eq, x) gives the same
// number at random sample values (relative error < 1e-9) and the same root where the solver picks one.
// SymPy (run once per file with python3, dev only, never loaded by the app) checks every rearrangement from
// outside the app: the result put back into the original equation makes both sides equal at random points.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as X from '../js/expr.js';
import { EQS, SAMPLE, DIMS } from '../js/data.js';
import { rand, seedNote } from './rand.js';

const library = Object.entries(EQS).filter(([, e]) => !e.generated);
const sample = (y) => y === 'inc' || y === 'phi' || y === 'beta' ? 10 + 60 * rand() : SAMPLE[y] * (0.5 + rand());
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

test('every library equation is one line (eq) with a kind and a cue', { todo: 'C1 box 4 converts the rest' }, () => {
  const missing = library.filter(([, e]) => !e.eq || !['law', 'rel', 'def'].includes(e.kind) || !e.cue).map(([id]) => id);
  assert.deepEqual(missing, []);
});

// rearrangements of every one-line equation, made once
const cases = [];
for (const [id, e] of library){
  if (!e.eq) continue;
  for (const x of e.vars) cases.push({ id, x, e, iso: X.isolate(X.parseEq(e.eq), x) });
}

test('isolate agrees with every hand solver it replaces (numbers and the chosen root)', () => {
  const bad = [];
  let n = 0;
  for (const { id, x, e, iso } of cases){
    const sol = e.solve[x];
    if (!sol || !sol.sub) continue; // no hand solver left: tests/solver-snapshot.test.js holds the old answers
    for (let k = 0; k < 10; k++){
      const v = {};
      for (const y of e.vars) if (y !== x) v[y] = sample(y);
      const hand = sol.f(v);
      if (hand.error) continue;
      const cands = [1, -1].map(sg => { try { return X.evalNum(iso.tree, v, sg); } catch { return NaN; } });
      let got = cands[0];
      if (X.hasPM(iso.tree) && sol.pick){ const p = sol.pick(v, cands); got = p.error ? NaN : cands[p.branch > 0 ? 0 : 1]; }
      n++;
      if (!close(got, hand.value)) bad.push(`${id} → ${x} at ${JSON.stringify(v)}: isolate gives ${got} (candidates ${cands}), hand solver ${hand.value}`);
    }
  }
  assert.ok(n > 0, 'no cases ran');
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} disagree ${seedNote}`);
});

test('every rearrangement has the unit of what it solves for, and explains each step', () => {
  for (const { id, x, iso } of cases){
    assert.ok(X.dimEq(X.dimOf(iso.tree, DIMS), DIMS[x]), `${id} → ${x}: unit ${X.dimStr(X.dimOf(iso.tree, DIMS))}, want ${X.dimStr(DIMS[x])}`);
    for (const s of iso.steps) assert.ok(s.why && typeof s.why === 'string', `${id} → ${x}: a step without a why`);
  }
});

test('an equation that can’t be rearranged is refused, naming the variable', () => {
  assert.throws(() => X.isolate(X.parseEq('{a} = sin {a} + {t}'), 'a'), (err) => /a/.test(err.message));
  assert.throws(() => X.isolate(X.parseEq('{a}³ + {a} = {t}'), 'a'), (err) => /a/.test(err.message));
});

// ---------------------------------------------------------------- outside check with SymPy
// tree → SymPy text; symbols are v_<id>, angles in degrees like the app.
function sy(n){
  const p = (x) => `(${sy(x)})`;
  switch (n.t){
    case 'num': return `Rational(${JSON.stringify(String(n.v))})`;
    case 'var': return `v_${n.id}`;
    case 'neg': return `-${p(n.a)}`;
    case 'add': return n.a.map(p).join(' + ');
    case 'mul': return n.a.map(p).join('*');
    case 'div': return `${p(n.n)}/${p(n.d)}`;
    case 'pow': return `${p(n.b)}**${n.e}`;
    case 'sqrt': return `sqrt(${sy(n.a)})`;
    case 'pm': return `${p(n.a)} + PM*${p(n.b)}`;
    case 'fn': {
      const a = sy(n.a);
      if (['sin', 'cos', 'tan'].includes(n.f)) return `${n.f}(pi/180*(${a}))`;
      if (['asin', 'acos', 'atan'].includes(n.f)) return `(180/pi*${n.f}(${a}))`;
      if (n.f === 'exp') return `exp(${a})`;
      if (n.f === 'ln') return `log(${a})`;
    }
  }
  throw new Error('sympy: bad node ' + n.t);
}
const ORACLE = String.raw`
import json, sys
from sympy import *
cases = json.load(sys.stdin)
out = []
PM = Symbol('PM')
for c in cases:
    names = set(c['points'][0].keys()) | {c['x']}
    loc = {('v_' + k): Symbol('v_' + k) for k in names}
    loc['PM'] = PM
    lhs, rhs, sol = (sympify(s, locals=loc) for s in (c['lhs'], c['rhs'], c['sol']))
    worst = 0
    for branch in ([1, -1] if sol.has(PM) else [1]):
        for pt in c['points']:
            env = {loc['v_' + k]: Rational(repr(v)) for k, v in pt.items()}
            env[PM] = branch
            xv = sol.subs(env).evalf(40)
            env2 = dict(env); env2[loc['v_' + c['x']]] = xv
            L, R = lhs.subs(env2).evalf(40), rhs.subs(env2).evalf(40)
            scale = max(1, abs(L), abs(R))
            worst = max(worst, float(abs(L - R) / scale))
    out.append(worst)
print(json.dumps(out))
`;

test('SymPy oracle: every rearrangement satisfies its original equation', (t) => {
  const py = spawnSync('python3', ['-c', 'import sympy'], { encoding: 'utf8' });
  if (py.status !== 0){ t.skip('python3 with SymPy not found (pip install sympy)'); return; }
  const jobs = cases.map(({ id, x, e, iso }) => {
    const eq = X.parseEq(e.eq);
    const points = Array.from({ length: 3 }, () => Object.fromEntries(e.vars.filter(y => y !== x).map(y => [y, sample(y)])));
    return { id, x, lhs: sy(eq.lhs), rhs: sy(eq.rhs), sol: sy(iso.tree), points };
  });
  const r = spawnSync('python3', ['-c', ORACLE], { input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 1 << 24 });
  assert.equal(r.status, 0, r.stderr);
  const worst = JSON.parse(r.stdout);
  const bad = jobs.map((j, k) => ({ j, w: worst[k] })).filter(({ w }) => !(w < 1e-9)).map(({ j, w }) => `${j.id} → ${j.x}: off by ${w} at ${JSON.stringify(j.points[0])} (${j.sol})`);
  t.diagnostic(`${jobs.length} rearrangements checked by SymPy`);
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} fail ${seedNote}`);
});
