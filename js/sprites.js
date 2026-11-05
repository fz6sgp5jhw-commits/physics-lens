// Original pixel-art physics gags, painted procedurally and emitted as crisp SVG.

function canvas(w, h){
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  return {
    w, h, g,
    set(x, y, c){ x = Math.round(x); y = Math.round(y); if (inside(x, y)) g[y][x] = c; },
    rect(x, y, ww, hh, c){ for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) this.set(i, j, c); },
    disc(cx, cy, r, c){ for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) g[y][x] = c; },
    ring(cx, cy, r1, r2, c){ for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){ const d = (x - cx) ** 2 + (y - cy) ** 2; if (d <= r2 * r2 && d >= r1 * r1) g[y][x] = c; } },
  };
}
function svg(cv, px, cls = '', title = ''){
  let rects = '';
  for (let y = 0; y < cv.h; y++){
    let x = 0;
    while (x < cv.w){
      const c = cv.g[y][x];
      if (!c){ x++; continue; }
      let run = 1; while (x + run < cv.w && cv.g[y][x + run] === c) run++;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
      x += run;
    }
  }
  return `<svg class="${cls}" viewBox="0 0 ${cv.w} ${cv.h}" width="${cv.w * px}" height="${cv.h * px}" shape-rendering="crispEdges" aria-hidden="true">${title ? `<title>${title}</title>` : ''}${rects}</svg>`;
}

const K = '#14101e', W = '#f7f4ff', PINK = '#ff8fc8', HOT = '#ff2bd6', CY = '#19f0ff', YEL = '#ffe600';

export function cow(px = 4){                       // the spherical cow (in a vacuum)
  const c = canvas(26, 27);
  c.disc(13, 13, 11, K); c.disc(13, 13, 10, W);
  c.disc(7, 9, 2.6, K); c.disc(19, 18, 2.2, K); c.disc(16, 5, 1.6, K); c.disc(5, 16, 1.3, K);
  c.rect(4, 2, 2, 2, '#d9b36c'); c.set(3, 1, '#d9b36c'); c.rect(20, 2, 2, 2, '#d9b36c'); c.set(22, 1, '#d9b36c');
  c.rect(10, 11, 2, 2, K); c.rect(15, 11, 2, 2, K); c.set(10, 11, W); c.set(15, 11, W);
  c.disc(13, 17, 3.4, PINK); c.set(11, 17, '#b04a7f'); c.set(15, 17, '#b04a7f'); c.rect(12, 19, 3, 1, '#b04a7f');
  c.rect(7, 23, 2, 3, K); c.rect(17, 23, 2, 3, K); c.rect(11, 24, 2, 2, K); c.rect(14, 24, 2, 2, K);
  return svg(c, px, 'sprite cow', 'Spherical cow');
}

export function catToast(px = 3){                 // buttered toast + cat = perpetual motion
  const c = canvas(26, 22);
  c.rect(3, 12, 20, 9, '#9b5a1e'); c.rect(4, 13, 18, 7, '#f0c27a'); c.rect(8, 17, 9, 3, YEL);
  c.rect(6, 6, 13, 6, '#8d8aa0'); c.disc(20, 6, 3.5, '#8d8aa0'); c.set(18, 2, '#8d8aa0'); c.set(22, 2, '#8d8aa0');
  c.set(19, 6, '#2bff6a'); c.set(21, 6, '#2bff6a'); c.set(20, 8, PINK);
  c.rect(1, 5, 5, 2, '#8d8aa0'); c.set(0, 4, '#8d8aa0');
  c.rect(7, 12, 2, 1, '#6e6b80'); c.rect(15, 12, 2, 1, '#6e6b80');
  c.rect(11, 5, 2, 8, HOT);
  return svg(c, px, 'sprite cattoast', 'Cat strapped to buttered toast');
}

export function apple(px = 3){
  const c = canvas(9, 10);
  c.disc(4, 6, 3.6, '#ff2b3a'); c.set(3, 4, '#ff9aa2'); c.rect(4, 0, 1, 3, '#6b3d12'); c.rect(5, 1, 3, 1, '#2bd14a');
  return svg(c, px, 'sprite apple', 'Apple');
}
export function bonkHead(px = 3){
  const c = canvas(16, 18);
  c.disc(8, 6, 5.5, K); c.disc(8, 6, 4.6, '#ffd9b3');
  c.set(6, 6, K); c.set(10, 6, K); c.rect(7, 9, 3, 1, K);
  c.rect(8, 12, 1, 6, CY); c.rect(4, 13, 9, 1, CY);
  return svg(c, px, 'sprite bonkhead', 'Stick figure about to discover gravity');
}

export function blackHole(px = 3){
  const c = canvas(20, 20);
  c.disc(10, 10, 9.5, '#ff7a00'); c.disc(10, 10, 8, HOT); c.disc(10, 10, 6.5, '#7a1cff'); c.disc(10, 10, 5, '#2a0050'); c.disc(10, 10, 3.6, '#000');
  c.set(2, 6, YEL); c.set(17, 14, YEL); c.set(5, 17, W);
  return svg(c, px, 'sprite blackhole', 'Black hole');
}

export function box(px = 5){                         // Schrödinger's box
  const c = canvas(24, 20);
  c.rect(2, 6, 20, 13, '#7a4a1e'); c.rect(3, 7, 18, 11, '#c58a4a');
  c.rect(1, 4, 11, 3, '#a8692e'); c.rect(12, 4, 11, 3, '#a8692e');
  // question mark
  c.rect(10, 9, 4, 1, K); c.set(14, 10, K); c.set(14, 11, K); c.rect(12, 12, 2, 1, K); c.set(12, 13, K); c.set(12, 15, K);
  // ears peeking out
  c.set(7, 3, '#8d8aa0'); c.set(6, 2, '#8d8aa0'); c.set(9, 3, '#8d8aa0'); c.set(10, 2, '#8d8aa0');
  return svg(c, px, 'sprite box', 'Schrödinger’s box');
}

export function hamster(px = 3){
  const c = canvas(10, 7);
  c.disc(5, 4, 3.4, '#e8a35a'); c.disc(5, 5, 2, '#fff1dc'); c.set(7, 3, K); c.set(8, 4, PINK); c.set(3, 1, '#e8a35a');
  return svg(c, px, 'sprite hamster', 'Hamster');
}

export function piano(px = 3){
  const c = canvas(18, 14);
  c.rect(1, 2, 16, 8, K); c.rect(2, 9, 14, 3, W);
  for (let i = 3; i < 16; i += 2) c.rect(i, 9, 1, 2, K);
  c.rect(2, 12, 1, 2, K); c.rect(15, 12, 1, 2, K); c.rect(6, 0, 6, 2, '#5a3a1a');
  return svg(c, px, 'sprite piano', 'Falling piano');
}

export function car(px = 3){                       // a chunky pixel hatchback, facing right
  const c = canvas(32, 16);
  c.rect(2, 7, 28, 6, '#14101e'); c.rect(3, 8, 26, 4, HOT);
  c.rect(8, 2, 14, 6, '#14101e'); c.rect(9, 3, 12, 5, HOT);
  c.rect(10, 4, 5, 3, CY); c.rect(16, 4, 4, 3, CY);
  c.rect(27, 9, 3, 2, YEL); c.rect(2, 9, 2, 2, '#ff2b3a');
  c.disc(8, 13, 2.6, '#14101e'); c.disc(8, 13, 1.2, '#9a9aaa');
  c.disc(24, 13, 2.6, '#14101e'); c.disc(24, 13, 1.2, '#9a9aaa');
  return svg(c, px, 'sprite car', 'Car');
}
