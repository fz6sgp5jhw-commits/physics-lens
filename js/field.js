// Physics Lens — the background: a live electric field, drawn as glowing pixel art.
// The field is rendered at low resolution (one art pixel = PX screen pixels) and scaled up with hard edges.
// Positive charges are gold suns, negative charges are pale crescent moons. A faint grid of pixel arrows shows
// the field; glowing motes flow along the field lines from suns to moons; a sky of small stars twinkles behind.
// The cursor is a small positive test charge (a gold sparkle) that bends the field. pulse() sends out a burst
// and a pixel ring (used when a step is solved). Calm mode (or "reduce motion") freezes it into one still frame.
// Plain canvas, no dependencies. Public API: createField(arrows, trails) → { pulse, setCalm, running }.

const PX = 3; // screen pixels per art pixel: chunky, a little larger than classic handheld games
const SUN = [255, 200, 92], MOON = [170, 186, 255], ARROW = [104, 124, 230];

export function createField(arrowsCanvas, trailsCanvas){
  const ca = arrowsCanvas.getContext('2d'), ct = trailsCanvas.getContext('2d');
  let W = 0, H = 0, raf = 0, running = false, calm = false, t0 = performance.now(), last = 0;
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
  // E at (x, y): Σ q r̂ / r², softened near each charge (all in art pixels)
  function E(x, y){
    let ex = 0, ey = 0;
    const s = Math.min(W, H) * 0.06;
    for (const c of cp){ const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy + s * s, k = c.q / (r2 * Math.sqrt(r2)); ex += k * dx; ey += k * dy; }
    if (mouse.on > 0.01){ const dx = x - mouse.x, dy = y - mouse.y, r2 = dx * dx + dy * dy + 100, k = 0.55 * mouse.on / (r2 * Math.sqrt(r2)); ex += k * dx * Math.min(W, H); ey += k * dy * Math.min(W, H); }
    return [ex, ey];
  }
  const potential = (x, y) => { let v = 0; const s = Math.min(W, H) * 0.06; for (const c of cp) v += c.q / Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2 + s * s); return v; };
  const mix = (a, b, f) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * f));

  // ---- pixel drawing helpers (whole art pixels only, so nothing is smoothed) ----
  const dot = (g, x, y, rgb, a) => { g.fillStyle = `rgba(${rgb},${a})`; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  function line(g, x0, y0, x1, y1){ // Bresenham, current fillStyle
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (let i = 0; i < 64; i++){ g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy){ e += dy; x0 += sx; } if (e2 <= dx){ e += dx; y0 += sy; } }
  }
  // sprites are painted once into small offscreen canvases, pixel by pixel
  function sprite(size, paint){ const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); paint(g, size); return c; }
  const sunSprite = (r) => sprite(2 * r + 9, (g, n) => {
    const m = (n - 1) / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++){
      const dx = x - m, dy = y - m, d = Math.hypot(dx, dy);
      if (d <= r) { g.fillStyle = d < r * 0.45 ? '#fff6d8' : d < r * 0.8 ? '#ffd46b' : '#f0a93a'; g.fillRect(x, y, 1, 1); }
      // eight pixel rays
      else if (d <= r + 4 && ((Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6) || (d <= r + 2.5 && Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.6))){ g.fillStyle = d <= r + 2 ? '#ffd46b' : 'rgba(255,212,107,.55)'; g.fillRect(x, y, 1, 1); }
    }
  });
  const moonSprite = (r) => sprite(2 * r + 3, (g, n) => {
    const m = (n - 1) / 2, ox = r * 0.55, oy = -r * 0.35;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++){
      const dx = x - m, dy = y - m, inA = Math.hypot(dx, dy) <= r, inB = Math.hypot(dx - ox, dy - oy) <= r * 0.92;
      if (inA && !inB){ const edge = Math.hypot(dx, dy) > r - 1.2 || Math.hypot(dx - ox, dy - oy) < r * 0.92 + 1.2; g.fillStyle = edge ? '#c9d4ff' : '#eef2ff'; g.fillRect(x, y, 1, 1); }
    }
  });
  const sparkle = sprite(7, (g) => { g.fillStyle = '#ffe6a3'; for (const [x, y] of [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3]]) g.fillRect(x, y, 1, 1); g.fillStyle = '#fff'; g.fillRect(3, 3, 1, 1); });
  const SPR = new Map();
  const spriteFor = (c) => { const r = Math.round(3 + 2.5 * Math.abs(c.q)), key = (c.q > 0 ? 's' : 'm') + r; if (!SPR.has(key)) SPR.set(key, c.q > 0 ? sunSprite(r) : moonSprite(r)); return SPR.get(key); };

  // the sky: small stars that twinkle (fixed positions in art pixels, regenerated on resize)
  let stars = [];
  function makeStars(){
    stars = [];
    const n = Math.round((W * H) / 520);
    for (let i = 0; i < n; i++){
      const r = Math.random();
      stars.push({ x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H), big: r < 0.07, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.6,
        rgb: r < 0.35 ? '255,214,140' : r < 0.75 ? '226,232,255' : '170,186,255', base: 0.25 + Math.random() * 0.45 });
    }
  }
  function drawStars(t){
    for (const s of stars){
      const a = s.base * (t === null ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
      dot(ca, s.x, s.y, s.rgb, a);
      if (s.big){ const b = a * 0.55; dot(ca, s.x - 1, s.y, s.rgb, b); dot(ca, s.x + 1, s.y, s.rgb, b); dot(ca, s.x, s.y - 1, s.rgb, b); dot(ca, s.x, s.y + 1, s.rgb, b); }
    }
  }

  // particles: born near suns (or anywhere), they follow E and die at moons or with age
  let parts = [];
  const N = () => Math.round(Math.min(420, (W * H) / 380));
  function spawn(p, x, y, boost = 0){
    const plus = cp.filter(c => c.q > 0);
    if (x === undefined){
      if (Math.random() < 0.6 && plus.length){ const c = plus[(Math.random() * plus.length) | 0], a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 10; x = c.x + r * Math.cos(a); y = c.y + r * Math.sin(a); }
      else { x = Math.random() * W; y = Math.random() * H; }
    }
    p.x = x; p.y = y; p.age = 0; p.life = 140 + Math.random() * 220; p.boost = boost;
    return p;
  }
  function resize(){
    const vw = innerWidth, vh = innerHeight;
    W = Math.ceil(vw / PX); H = Math.ceil(vh / PX);
    for (const cv of [arrowsCanvas, trailsCanvas]){ cv.width = W; cv.height = H; cv.style.width = W * PX + 'px'; cv.style.height = H * PX + 'px'; cv.style.imageRendering = 'pixelated'; }
    ca.setTransform(1, 0, 0, 1, 0, 0); ct.setTransform(1, 0, 0, 1, 0, 0);
    ca.imageSmoothingEnabled = false; ct.imageSmoothingEnabled = false;
    cp = charges.map(c => ({ ...pos(c, (performance.now() - t0) / 1000), q: c.q }));
    makeStars();
    while (parts.length < N()) parts.push(spawn({}));
    parts.length = N();
    if (!running) still();
  }

  // the field arrows (pixel glyphs on a grid), the suns and moons, and the cursor sparkle
  function drawArrows(t){
    ca.clearRect(0, 0, W, H);
    drawStars(t);
    const gap = 15, mn = Math.min(W, H);
    for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap){
      const [ex, ey] = E(x, y), m = Math.hypot(ex, ey) * mn * mn; if (m < 1e-6) continue;
      const a = Math.min(0.75, 0.10 + 0.16 * Math.log10(1 + m * 4)), L = Math.min(6, 2.5 + 1.4 * Math.log10(1 + m * 8));
      const ux = ex / Math.hypot(ex, ey), uy = ey / Math.hypot(ex, ey);
      const v = potential(x, y), col = mix(ARROW, v > 0 ? SUN : MOON, Math.min(1, Math.abs(v) * mn * 0.08));
      const x1 = x - ux * L / 2, y1 = y - uy * L / 2, x2 = x + ux * L / 2, y2 = y + uy * L / 2;
      ca.fillStyle = `rgba(${col},${a * 0.35})`; line(ca, x1 + uy, y1 - ux, x2 + uy, y2 - ux); // a faint glow beside the shaft
      ca.fillStyle = `rgba(${col},${a})`; line(ca, x1, y1, x2, y2);
      ca.fillRect(Math.round(x2 - ux * 1.6 - uy * 1.4), Math.round(y2 - uy * 1.6 + ux * 1.4), 1, 1);
      ca.fillRect(Math.round(x2 - ux * 1.6 + uy * 1.4), Math.round(y2 - uy * 1.6 - ux * 1.4), 1, 1);
    }
    for (const c of cp){
      const col = c.q > 0 ? SUN : MOON, R = 4 + 3 * Math.abs(c.q);
      const g = ca.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 5);
      g.addColorStop(0, `rgba(${col},0.45)`); g.addColorStop(0.3, `rgba(${col},0.14)`); g.addColorStop(1, `rgba(${col},0)`);
      ca.fillStyle = g; ca.fillRect(Math.round(c.x - R * 5), Math.round(c.y - R * 5), Math.round(R * 10), Math.round(R * 10));
      const s = spriteFor(c); ca.drawImage(s, Math.round(c.x - s.width / 2), Math.round(c.y - s.height / 2));
    }
    if (mouse.on > 0.05){ ca.globalAlpha = Math.min(1, mouse.on) * (t === null ? 1 : 0.75 + 0.25 * Math.sin(t * 6)); ca.drawImage(sparkle, Math.round(mouse.x - 3), Math.round(mouse.y - 3)); ca.globalAlpha = 1; }
  }
  // motes leave fading trails: fade the trail layer a little each frame, then add one bright pixel per mote
  let rings = [];
  function stepParticles(dt){
    ct.globalCompositeOperation = 'destination-out'; ct.fillStyle = 'rgba(0,0,0,0.11)'; ct.fillRect(0, 0, W, H);
    ct.globalCompositeOperation = 'lighter';
    const mn = Math.min(W, H), sp = 24 * dt;
    for (const p of parts){
      const [ex, ey] = E(p.x, p.y), m = Math.hypot(ex, ey); if (m < 1e-9){ spawn(p); continue; }
      const speed = sp * (0.6 + Math.min(2.2, Math.log10(1 + m * mn * mn * 6))) * (1 + p.boost);
      const nx = p.x + ex / m * speed, ny = p.y + ey / m * speed;
      const v = potential(p.x, p.y), col = v > 0 ? SUN : MOON, fade = Math.min(1, p.age / 20) * Math.min(1, (p.life - p.age) / 40);
      ct.fillStyle = `rgba(${col},${(0.45 + 0.5 * p.boost) * fade})`;
      line(ct, p.x, p.y, nx, ny);
      p.x = nx; p.y = ny; p.age++; p.boost *= 0.985;
      const sink = cp.some(c => c.q < 0 && (p.x - c.x) ** 2 + (p.y - c.y) ** 2 < 22);
      if (sink || p.age > p.life || p.x < -8 || p.y < -8 || p.x > W + 8 || p.y > H + 8) spawn(p);
    }
    for (const r of rings){
      r.r += 90 * dt; r.a *= 0.955;
      ct.fillStyle = `rgba(${r.col},${r.a})`;
      const n = Math.max(12, Math.round(r.r * 6.3));
      for (let i = 0; i < n; i++){ const a = i / n * Math.PI * 2; ct.fillRect(Math.round(r.x + r.r * Math.cos(a)), Math.round(r.y + r.r * Math.sin(a)), 1, 1); }
    }
    rings = rings.filter(r => r.a > 0.03);
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
    drawArrows(t); stepParticles(dt);
  }
  function still(){ ct.clearRect(0, 0, W, H); drawArrows(null); }
  function start(){ if (running || calm || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop(){ running = false; cancelAnimationFrame(raf); still(); }

  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / PX; mouse.y = e.clientY / PX; mouse.target = 1; });
  document.addEventListener('pointerleave', () => { mouse.target = 0; });
  addEventListener('blur', () => { mouse.target = 0; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  resize();

  return {
    // a burst of bright motes and a pixel ring, from (x, y) in screen pixels (default: the strongest sun)
    pulse(x, y, n = 90){
      if (calm || !running) return;
      let ax, ay;
      if (x === undefined){ const c = cp.filter(q => q.q > 0).sort((a, b) => b.q - a.q)[0]; ax = c.x; ay = c.y; }
      else { ax = x / PX; ay = y / PX; }
      for (let i = 0; i < n; i++){ const p = parts[(Math.random() * parts.length) | 0], a = Math.random() * Math.PI * 2, r = Math.random() * 8; spawn(p, ax + r * Math.cos(a), ay + r * Math.sin(a), 1.4); }
      rings.push({ x: ax, y: ay, r: 2, a: 0.8, col: '255,214,120' });
    },
    setCalm(on){ calm = on || reduce.matches; if (calm) stop(); else start(); },
    get running(){ return running; },
  };
}
