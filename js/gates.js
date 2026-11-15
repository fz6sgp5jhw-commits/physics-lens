// Physics Lens — setup gates (phase M3, docs/mistake-plan.md section 4): the problem-solving checklist inside the app.
// Each gate stops the student at a step the exam showed was skipped and says the physics of why it matters. Every gate can be
// switched off; the switches live in pl-gates (validated on read) with a button that forgets them.
export const GATE_KEY = 'pl-gates';
export const GATES = [
  ['target', 'Name the target before the equation library opens (in a lesson)'],
  ['why', 'Say why each law holds (route card)'],
  ['owner', 'Give each mass its owner when there are two bodies'],
  ['readback', 'Read your relation back before the options are checked'],
];
export function loadGates(){
  const on = Object.fromEntries(GATES.map(([k]) => [k, true]));
  try { const s = JSON.parse(localStorage.getItem(GATE_KEY)); if (s && typeof s === 'object') for (const [k] of GATES) if (typeof s[k] === 'boolean') on[k] = s[k]; } catch {}
  return on;
}
const save = (g) => { try { localStorage.setItem(GATE_KEY, JSON.stringify(g)); } catch {} };
const forget = () => { try { localStorage.removeItem(GATE_KEY); } catch {} };

// the switches, in a box of their own (host): changing one saves it; "Forget" puts every gate back on and clears the key
export function renderGates(host, gates){
  const el = (tag, p = {}, kids = []) => { const e = document.createElement(tag); Object.assign(e, p); e.append(...kids); return e; };
  const boxes = GATES.map(([k, t]) => { const c = el('input', { type: 'checkbox', checked: gates[k] }); c.dataset.gate = k; c.onchange = () => { gates[k] = c.checked; save(gates); }; return el('label', { className: 'rchoice' }, [c, ' ' + t]); });
  const reset = el('button', { id: 'gatesForget', textContent: 'Forget my gate switches' });
  reset.onclick = () => { forget(); Object.assign(gates, loadGates()); renderGates(host, gates); };
  host.replaceChildren(el('details', {}, [el('summary', { textContent: 'Setup gates' }),
    el('p', { className: 'small muted', textContent: 'Each gate stops you at a step that is easy to skip and says why it matters. Switch off any you no longer need.' }), ...boxes, reset]));
}

// "Why does this law hold?": per law, the reason it applies and the reasons that sound right but aren't (each explained)
export const LAW_WHY = {
  energy: { holds: 'Only conservative forces do work, or the work of the others is counted as W_nc',
    decoys: [['Energy is always conserved', 'Total energy is, but K + U alone is not: friction, a hand lowering a mass or a collision move energy out of it. The law holds only with that work counted as W_nc, or when it is zero.'],
      ['A force acts on the body, so it does work', 'A force does work only with a part along the motion: W = F d cos φ. Tension or a normal force at right angles to the motion does none.']] },
  pmomentum: { holds: 'No outside force acts along that direction during the event (or it is too brief to matter)',
    decoys: [['Momentum is conserved because the speeds are equal', 'Speeds have nothing to do with it: momentum is conserved when the outside forces add to zero (or act too briefly), whatever the speeds.'],
      ['Kinetic energy is conserved, so momentum is too', 'Momentum and kinetic energy are separate laws: in a sticky collision momentum is conserved and kinetic energy is not.']] },
  momentum: { holds: 'No outside torque acts about the axis',
    decoys: [['The body keeps spinning at the same rate', 'ω can change while L stays fixed: pull the arms in and I falls, so ω rises. It is Iω that is conserved, and only with no outside torque.']] },
  impulse: { holds: 'Newton’s second law integrated over the contact time: ∫F dt = Δp for the body the force acts on',
    decoys: [['The force on the other body gives this body’s impulse', 'That is the Newton’s third law partner: it acts on the other body. The impulse on this body comes from the force on this body, and it is opposite.']] },
  forces: { holds: 'It holds for every body at every moment: ΣF = ma (and Στ = Iα about an axis)',
    decoys: [['The body is at rest, so no forces act', 'At rest means the forces add to zero (ΣF = 0), not that there are none: gravity and the spring still pull, equally hard.']] },
  work: { holds: 'The force is steady over the stretch, so W = F d cos φ',
    decoys: [['Work is force times distance whatever the angle', 'Only the part of the force along the motion does work: that is the cos φ.']] },
  kinematics: { holds: 'The acceleration is constant over the motion',
    decoys: [['The body moves, so the equations of motion hold', 'The constant-acceleration equations need a constant a; with a changing force, use F = ma and the motion ladder.']] },
};
