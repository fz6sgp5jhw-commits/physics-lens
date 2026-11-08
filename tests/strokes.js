// Recorded freehand strokes (strokes.json), in unit size: a line from (0, 0) to (1, 0), a loop of radius 1, a 2 × 1.2 box,
// a rounded square, a one-stroke arrow (shaft to (1, 0), one barb drawn back) and a scribble.
// at(name, { x, y, s | sx, sy, deg }) scales one, turns it counterclockwise (on screen) by deg and moves it to (x, y).
import { readFileSync } from 'node:fs';

const STROKES = JSON.parse(readFileSync(new URL('./strokes.json', import.meta.url)));
export const at = (name, { x = 0, y = 0, s = 1, sx = s, sy = s, deg = 0 } = {}) => {
  const a = -deg * Math.PI / 180, c = Math.cos(a), n = Math.sin(a);
  return STROKES[name].map(p => ({ x: x + c * p.x * sx - n * p.y * sy, y: y + n * p.x * sx + c * p.y * sy }));
};
