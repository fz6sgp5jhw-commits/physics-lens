// Records what every hand-written solver gives at seeded sample values, into tests/fixtures/solvers.json.
// Run once, before phase C1 changed any solver (`node tests/make-solver-snapshot.js`); tests/solver-snapshot.test.js
// then checks the current solvers against it, even after the hand solvers are gone. Don't rerun it to make a test
// pass: the snapshot is the old code checking the new code.
import { writeFileSync } from 'node:fs';
import { EQS, SAMPLE } from '../js/data.js';
import { seeded } from './rand.js';

const rnd = seeded(20261109);
const POINTS = 4; // two with every input positive, two with random signs (to reach every branch and error)
const cases = [];
for (const [id, eq] of Object.entries(EQS)) for (const x of Object.keys(eq.solve)){
  for (let k = 0; k < POINTS; k++){
    const inputs = {};
    for (const y of eq.vars) if (y !== x){
      let v = y === 'inc' ? 10 + 60 * rnd() : SAMPLE[y] * (0.5 + rnd());
      if (k >= 2 && y !== 'inc' && rnd() < 0.4) v = -v;
      inputs[y] = +v.toPrecision(12);
    }
    if (k === 3) inputs.__u0sign = rnd() < 0.5 ? -1 : 1;
    const r = eq.solve[x].f(inputs);
    cases.push({ eq: id, x, inputs, ...(r.error ? { error: true } : { value: r.value, branch: r.branch }) });
  }
}
writeFileSync(new URL('./fixtures/solvers.json', import.meta.url), JSON.stringify({ made: '2026-11-09, before phase C1', solvers: Object.values(EQS).reduce((n, e) => n + Object.keys(e.solve).length, 0), cases }, null, 0).replace(/\},\{/g, '},\n{') + '\n');
console.log(`${cases.length} cases`);
