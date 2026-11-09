// Seeded random values for tests. Every test that draws random values uses rand() from here, so a failure
// can be replayed exactly: the seed is printed when the file fails, and `SEED=… npm run test:fast` reuses it.
const fromEnv = Number.parseInt(process.env.SEED, 10);
export const seed = Number.isFinite(fromEnv) ? fromEnv >>> 0 : (Math.random() * 2 ** 32) >>> 0;

// mulberry32: a small generator, good enough for sample values. seeded(s) is an independent stream (snapshots).
export function seeded(s){
  let st = s >>> 0;
  return () => {
    st = (st + 0x6D2B79F5) >>> 0;
    let t = Math.imul(st ^ (st >>> 15), st | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
export const rand = seeded(seed);
export const between = (lo, hi) => lo + (hi - lo) * rand();
// add to assertion messages so the seed travels with the failure
export const seedNote = `(random values: SEED=${seed} replays them)`;

process.on('exit', (code) => {
  if (code || process.exitCode) process.stderr.write(`\nRandom values in this file used SEED=${seed}. Replay: SEED=${seed} node --test ${process.argv[1] || ''}\n`);
});
