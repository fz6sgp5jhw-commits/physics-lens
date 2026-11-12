// Test-only pack (phase C2 gate): pressure under a liquid, P = P₀ + ρgh. It proves a new subject is only data:
// tests/core-packs.test.js serves js/packs/index.js with this pack added, and app.js is not changed. g is mechanics'.
export default {
  id: 'demo', name: 'Demo fluids', license: { code: 'MIT', content: 'original' },
  quantities: {
    demo_P:   { sym: 'P', plain: 'P', name: 'pressure at depth h', unit: 'Pa', units: { Pa: 1, kPa: 1000, atm: 101325 }, sample: 120000 },
    demo_P0:  { sym: 'P<sub>0</sub>', plain: 'P₀', name: 'pressure at the surface', unit: 'Pa', units: { Pa: 1, kPa: 1000, atm: 101325 }, sample: 101325 },
    demo_rho: { sym: 'ρ', plain: 'ρ', name: 'density of the liquid', unit: 'kg/m³', units: { 'kg/m³': 1 }, sample: 1000 },
    demo_h:   { sym: 'h', plain: 'h', name: 'depth below the surface', unit: 'm', units: { m: 1, cm: 0.01 }, sample: 2 },
  },
  equations: {
    demo_H1: { label: 'H1', eq: '{demo_P} = {demo_P0} + {demo_rho}{g}{demo_h}', kind: 'law', cue: 'pressure at a depth in a liquid at rest',
      meaning: 'The pressure grows with depth by the weight of the liquid above, per unit area.', condition: 'liquid at rest' },
  },
  chapters: {
    demo_depth: {
      title: 'Pressure with depth (demo)', short: 'Depth',
      vars: ['demo_P', 'demo_P0', 'demo_rho', 'g', 'demo_h'],
      axis: 'Depth h is measured down from the surface.',
      intro: '<p>In a liquid at rest, pressure grows with depth.</p>',
      sections: [{ title: 'Hydrostatics', note: 'One law.', eqs: ['demo_H1'] }],
      conditions: [{ key: 'earth', type: 'hidden', label: 'On Earth (g = 9.81 m/s²)', sets: { g: 9.81 }, default: true }],
      defaults: {}, startCond: { earth: true },
    },
  },
  printOrder: ['demo_rho', 'demo_h', 'demo_P0', 'demo_P'],
};
