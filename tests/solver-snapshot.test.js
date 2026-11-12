// Every solver still gives what the hand-written solvers gave before phase C1 (tests/fixtures/solvers.json,
// made by tests/make-solver-snapshot.js): same number (relative error < 1e-9), same ± branch, error where it erred.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EQS } from '../js/data.js';

const snap = JSON.parse(readFileSync(new URL('./fixtures/solvers.json', import.meta.url), 'utf8'));

test('solver snapshot: every solver agrees with the pre-C1 hand solvers', () => {
  // equations added after C1 (phase C3 on) aren't in the snapshot; none of the snapshot's solvers may go missing
  const old = new Set(snap.cases.map(c => c.eq));
  const count = [...old].reduce((n, id) => n + Object.keys(EQS[id]?.solve || {}).length, 0);
  assert.equal(count, snap.solvers, 'solver count of the pre-C1 equations changed');
  const bad = [];
  for (const c of snap.cases){
    const sol = EQS[c.eq] && EQS[c.eq].solve[c.x];
    const tag = `${c.eq} → ${c.x} at ${JSON.stringify(c.inputs)}`;
    if (!sol){ bad.push(`${tag}: solver missing`); continue; }
    const r = sol.f({ ...c.inputs });
    if (c.error){ if (!r.error) bad.push(`${tag}: want an error, got ${r.value}`); continue; }
    if (r.error){ bad.push(`${tag}: want ${c.value}, got error "${r.error}"`); continue; }
    const ok = Math.abs(r.value - c.value) <= 1e-9 * Math.max(1, Math.abs(c.value));
    if (!ok) bad.push(`${tag}: want ${c.value}, got ${r.value}`);
    else if (r.branch !== c.branch) bad.push(`${tag}: want branch ${c.branch}, got ${r.branch}`);
  }
  assert.deepEqual(bad.slice(0, 15), [], `${bad.length} of ${snap.cases.length} cases differ`);
});
