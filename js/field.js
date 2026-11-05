// Physics Lens — the background: a live electric field.
// A few point charges drift slowly; faint arrows show the field on a grid; particles flow along the field lines
// from + to −. The cursor is a small positive test charge that bends the field. pulse() sends out a burst
// (used when a step is solved). Calm mode (or "reduce motion") freezes it into one still frame.
// Plain canvas, no dependencies.

const POS = [255, 93, 115], NEG = [79, 139, 255], ARROW = [120, 200, 255];

export function createField(arrowsCanvas, trailsCanvas){
  const ca = arrowsCanvas.getContext('2d'), ct = trailsCanvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, running = false, calm = false, t0 = performance.now(), last = 0;
  const mouse = { x: -1e4, y: -1e4, on: 0, target: 0 };
  // charges move on slow Lissajous paths, in units of the screen size
  const charges = [
    { q: 1.0, ax: 0.18, ay: 0.22, fx: 0.031, fy: 0.023, px: 0.2, py: 0.3, cx: 0.22, cy: 0.30 },
    { q: -1.0, ax: 0.16, ay: 0.18, fx: 0.019, fy: 0.029, px: 1.3, py: 0.7, cx: 0.74, cy: 0.62 },
    { q: 0.8, ax: 0.12, ay: 0.20, fx: 0.025, fy: 0.017, px: 2.1, py: 2.4, cx: 0.62, cy: 0.18 },
    { q: -0.8, ax: 0.14, ay: 0.12, fx: 0.021, fy: 0.033, px: 3.0, py: 1.1, cx: 0.30, cy: 0.80 },
    { q: 0.6, ax: 0.10, ay: 0.10, fx: 0.037, fy: 0.027, px: 4.2, py: 5.0, cx: 0.92, cy: 0.88 },
  ];
  const pos = (c, t) => ({ x: (c.cx + c.ax * Math.sin(c.fx * t + c.px)) * W, y: (c.cy + c.ay * Math.sin(c.fy * t + c.py)) * H });
  let cp = [];
  // E at (x, y): Σ q r̂ / r², softened near each charge
  function E(x, y){
    let ex = 0, ey = 0;
    const s = Math.min(W, H) * 0.06;
    for (const c of cp){ const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy + s * s, k = c.q / (r2 * Math.sqrt(r2)); ex += k * dx; ey += k * dy; }
    if (mouse.on > 0.01){ const dx = x - mouse.x, dy = y - mouse.y, r2 = dx * dx + dy * dy + 900, k = 0.55 * mouse.on / (r2 * Math.sqrt(r2)); ex += k * dx * Math.min(W, H); ey += k * dy * Math.min(W, H); }
    return [ex, ey];
  }
  const potential = (x, y) => { let v = 0; const s = Math.min(W, H) * 0.06; for (const c of cp) v += c.q / Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2 + s * s); return v; };

  // particles: born near positive charges (or anywhere), they follow E and die at negative charges or with age
  let parts = [];
  const N = () => Math.round(Math.min(520, (W * H) / 3200));
  function spawn(p, x, y, boost = 0){
    const plus = cp.filter(c => c.q > 0);
    if (x === undefined){
      if (Math.random() < 0.6 && plus.length){ const c = plus[(Math.random() * plus.length) | 0], a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 30; x = c.x + r * Math.cos(a); y = c.y + r * Math.sin(a); }
      else { x = Math.random() * W; y = Math.random() * H; }
    }
    p.x = x; p.y = y; p.age = 0; p.life = 140 + Math.random() * 220; p.boost = boost;
    return p;
  }
  function resize(){
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    for (const cv of [arrowsCanvas, trailsCanvas]){ cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    ca.setTransform(dpr, 0, 0, dpr, 0, 0); ct.setTransform(dpr, 0, 0, dpr, 0, 0);
    cp = charges.map(c => ({ ...pos(c, (performance.now() - t0) / 1000), q: c.q }));
    while (parts.length < N()) parts.push(spawn({}));
    parts.length = N();
    if (!running) still();
  }

  // the grid of field arrows and the charges themselves
  function drawArrows(){
    ca.clearRect(0, 0, W, H);
    const gap = 46, mn = Math.min(W, H);
    for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap){
      const [ex, ey] = E(x, y), m = Math.hypot(ex, ey) * mn * mn; if (m < 1e-6) continue;
      const a = Math.min(0.55, 0.06 + 0.12 * Math.log10(1 + m * 4)), L = Math.min(15, 6 + 4 * Math.log10(1 + m * 8));
      const ux = ex / Math.hypot(ex, ey), uy = ey / Math.hypot(ex, ey);
      const v = potential(x, y), col = v > 0 ? POS : NEG, mix = Math.min(1, Math.abs(v) * mn * 0.08);
      const r = Math.round(ARROW[0] + (col[0] - ARROW[0]) * mix), g = Math.round(ARROW[1] + (col[1] - ARROW[1]) * mix), b = Math.round(ARROW[2] + (col[2] - ARROW[2]) * mix);
      ca.strokeStyle = `rgba(${r},${g},${b},${a})`; ca.lineWidth = 1.2;
      const x1 = x - ux * L / 2, y1 = y - uy * L / 2, x2 = x + ux * L / 2, y2 = y + uy * L / 2;
      ca.beginPath(); ca.moveTo(x1, y1); ca.lineTo(x2, y2);
      ca.lineTo(x2 - ux * 4 - uy * 3, y2 - uy * 4 + ux * 3); ca.moveTo(x2, y2); ca.lineTo(x2 - ux * 4 + uy * 3, y2 - uy * 4 - ux * 3); ca.stroke();
    }
    for (const c of cp){
      const col = c.q > 0 ? POS : NEG, R = 7 + 6 * Math.abs(c.q);
      const g = ca.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 5);
      g.addColorStop(0, `rgba(${col},0.55)`); g.addColorStop(0.25, `rgba(${col},0.18)`); g.addColorStop(1, `rgba(${col},0)`);
      ca.fillStyle = g; ca.beginPath(); ca.arc(c.x, c.y, R * 5, 0, Math.PI * 2); ca.fill();
      ca.fillStyle = `rgba(${col},0.95)`; ca.beginPath(); ca.arc(c.x, c.y, R, 0, Math.PI * 2); ca.fill();
      ca.strokeStyle = 'rgba(5,7,13,0.9)'; ca.lineWidth = 2; ca.beginPath();
      ca.moveTo(c.x - R * 0.5, c.y); ca.lineTo(c.x + R * 0.5, c.y); if (c.q > 0){ ca.moveTo(c.x, c.y - R * 0.5); ca.lineTo(c.x, c.y + R * 0.5); } ca.stroke();
    }
    if (mouse.on > 0.05){ ca.strokeStyle = `rgba(255,209,102,${0.6 * mouse.on})`; ca.lineWidth = 1.5; ca.beginPath(); ca.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2); ca.stroke(); ca.beginPath(); ca.moveTo(mouse.x - 4, mouse.y); ca.lineTo(mouse.x + 4, mouse.y); ca.moveTo(mouse.x, mouse.y - 4); ca.lineTo(mouse.x, mouse.y + 4); ca.stroke(); }
  }
  // particles leave fading trails: fade the trail layer a little each frame, then draw the new segments
  let rings = [];
  function stepParticles(dt){
    ct.globalCompositeOperation = 'destination-out'; ct.fillStyle = 'rgba(0,0,0,0.085)'; ct.fillRect(0, 0, W, H);
    ct.globalCompositeOperation = 'lighter';
    const mn = Math.min(W, H), sp = 70 * dt;
    for (const p of parts){
      const [ex, ey] = E(p.x, p.y), m = Math.hypot(ex, ey); if (m < 1e-9){ spawn(p); continue; }
      const speed = sp * (0.6 + Math.min(2.2, Math.log10(1 + m * mn * mn * 6))) * (1 + p.boost);
      const nx = p.x + ex / m * speed, ny = p.y + ey / m * speed;
      const v = potential(p.x, p.y), col = v > 0 ? POS : NEG, fade = Math.min(1, p.age / 20) * Math.min(1, (p.life - p.age) / 40);
      ct.strokeStyle = `rgba(${col},${(0.35 + 0.5 * p.boost) * fade})`; ct.lineWidth = 1.3 + p.boost;
      ct.beginPath(); ct.moveTo(p.x, p.y); ct.lineTo(nx, ny); ct.stroke();
      p.x = nx; p.y = ny; p.age++; p.boost *= 0.985;
      const sink = cp.some(c => c.q < 0 && (p.x - c.x) ** 2 + (p.y - c.y) ** 2 < 200);
      if (sink || p.age > p.life || p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) spawn(p);
    }
    for (const r of rings){ r.r += 260 * dt; r.a *= 0.96; ct.strokeStyle = `rgba(${r.col},${r.a})`; ct.lineWidth = 2; ct.beginPath(); ct.arc(r.x, r.y, r.r, 0, Math.PI * 2); ct.stroke(); }
    rings = rings.filter(r => r.a > 0.02);
    ct.globalCompositeOperation = 'source-over';
  }
  function frame(now){
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return; // about 30 frames a second is plenty for a background
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    mouse.on += (mouse.target - mouse.on) * 0.08;
    cp = charges.map(c => ({ ...pos(c, t), q: c.q }));
    drawArrows(); stepParticles(dt);
  }
  function still(){ ct.clearRect(0, 0, W, H); drawArrows(); }
  function start(){ if (running || calm || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop(){ running = false; cancelAnimationFrame(raf); still(); }

  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.target = 1; });
  document.addEventListener('pointerleave', () => { mouse.target = 0; });
  addEventListener('blur', () => { mouse.target = 0; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  resize();

  return {
    // a burst of bright particles and a ring, from (x, y) in screen pixels (default: the strongest + charge)
    pulse(x, y, n = 90){
      if (calm || !running) return;
      if (x === undefined){ const c = cp.filter(q => q.q > 0).sort((a, b) => b.q - a.q)[0]; x = c.x; y = c.y; }
      for (let i = 0; i < n; i++){ const p = parts[(Math.random() * parts.length) | 0], a = Math.random() * Math.PI * 2, r = Math.random() * 24; spawn(p, x + r * Math.cos(a), y + r * Math.sin(a), 1.4); }
      rings.push({ x, y, r: 6, a: 0.7, col: '255,209,102' });
    },
    setCalm(on){ calm = on || reduce.matches; if (calm) stop(); else start(); },
    get running(){ return running; },
  };
}
