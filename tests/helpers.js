// Shared helpers for the browser tests: a tiny static server and a Playwright page driver.
// Uses playwright-core with the locally installed Google Chrome (no browser download).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.css': 'text/css' };

export function startServer(){
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)){ res.writeHead(403).end(); return; }
    try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body); }
    catch { res.writeHead(404).end('not found'); }
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

export async function launch(){
  const { server, url } = await startServer();
  const browser = await chromium.launch({ channel: process.env.RL_CHROME_CHANNEL || 'chrome', headless: true });
  const close = async () => { await browser.close(); server.close(); };
  return { browser, url, close };
}

// Open the app at 1440×900 and collect console errors / page errors.
// Guided mode (today's stages and sheet) unless { mode: 'draw' }: drawing-first, the app's default.
// { before(page) } runs before the first load (a test can route a file there).
export async function openApp(browser, url, { calm = true, mode = 'guided', before } = {}){
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  if (calm) await page.addInitScript(() => { try { localStorage.setItem('rl-calm', '1'); } catch {} });
  // only on the first load: a test that switches mode and reloads keeps what it chose
  await page.addInitScript((m) => { try { if (!sessionStorage.getItem('pl-test')){ sessionStorage.setItem('pl-test', '1'); if (m === 'draw') localStorage.removeItem('pl-mode'); else localStorage.setItem('pl-mode', m); } } catch {} }, mode);
  // the header's Tools menu holds Practice, Course, the libraries, Board, Notebook and Multiple choice: opening it is part of using them
  const inMenu = /^#(bankBtn|courseBtn|libBtn|diagBtn|dfSumBtn|boardBtn|nbBtn|mcBtn)$/, click = page.click.bind(page);
  page.click = async (sel, ...rest) => { if (inMenu.test(sel)) await page.evaluate(() => { document.getElementById('toolsMenu').open = true; }); return click(sel, ...rest); };
  if (before) await before(page);
  await page.goto(url);
  await page.waitForFunction(() => window.__rl && document.getElementById('steps').children.length > 0);
  return { page, errors };
}

// Load practice problem i from the bank through the UI.
export async function loadPractice(page, i){
  await page.click('#bankBtn');
  await page.click(`[data-load="${i}"]`);
}

// Add a given through the quantity palette + editor, like a student would.
// dir: 0 = first direction word (+), 1 = second (−).
// With { symbol: true } the given is entered as a symbol (no number), using the editor's kind switch.
export async function addGiven(page, id, mag, unit, dir = 0, { symbol = false } = {}){
  await page.evaluate(async ({ id }) => {
    const { VARS, CHAPTERS } = await import('./js/data.js');
    const ch = CHAPTERS[window.__rl.ch];
    const name = (ch.names && ch.names[id]) || VARS[id].name;
    const b = [...document.querySelectorAll('#palette button')].find(x => x.title === `Add ${name}`);
    if (!b) throw new Error(`no palette button for ${id}`);
    b.click();
  }, { id });
  if (symbol){
    await page.click('#editorSlot [data-kind="symbol"]');
    if (await page.locator(`#editorSlot [data-dir="${dir}"]`).count()) await page.click(`#editorSlot [data-dir="${dir}"]`);
    await page.click('#edSave');
    return;
  }
  if (await page.locator(`#editorSlot [data-dir="${dir}"]`).count()) await page.click(`#editorSlot [data-dir="${dir}"]`);
  await page.fill('#edVal', String(mag));
  await page.selectOption('#edUnit', unit);
  await page.click('#edSave');
}

// Set a condition through the conditions panel.
export async function setCondition(page, key, want){
  await page.evaluate(async ({ key, want }) => {
    const { CHAPTERS } = await import('./js/data.js');
    const ch = CHAPTERS[window.__rl.ch], c = ch.conditions.find(x => x.key === key);
    if (!c) throw new Error(`no condition ${key}`);
    const groups = [...document.querySelectorAll('#conds .cgroup')], el = groups[ch.conditions.indexOf(c)];
    if (c.type === 'choice') el.querySelectorAll('button')[c.options.findIndex(o => o[0] === want)].click();
    else if (c.type === 'locked') return;
    else { const box = el.querySelector('input'); if (box.checked !== want){ box.checked = want; box.dispatchEvent(new Event('change')); } }
  }, { key, want });
}

// Make a drawn surface rough (its "rough surface" property): the drawing then settles the friction condition.
export async function roughen(page, kind){
  await page.evaluate((kind) => { const S = window.__rl, s = S.build.shapes.find(x => x.kind === kind); s.props.friction = true; S.build.snap(); }, kind);
}

// Open one of the four stages (0 Setup, 1 Forces, 2 Conditions, 3 Solve) from the step tracker.
export async function openStage(page, i){ await page.click(`#steps [data-stage="${i}"]`); }

export async function confirmConditions(page){ await openStage(page, 2); await page.click('#condOk'); }

export async function addTarget(page, id){ await openStage(page, 3); await page.selectOption('#addTarget', id); }

// Hidden givens: which condition supplies a zero-valued given in each unit.
export const HIDDEN = {
  incline: { v0: 'rest', vf: 'stop', g: 'earth' },
  pulley: { v0: 'rest', a: 'steady', g: 'earth' },
  rotation: { w0: 'rest', w: 'stop' },
  rolling: { K0: 'rest', U: 'ground', Wnc: 'smooth', g: 'earth' },
  energy: { phi: 'along', K0: 'rest', K: 'stops', U: 'ground', U0: 'ground0', Us0: 'relax0', Us: 'relax1', Wnc: 'smooth', v2i: 'rest2', g: 'earth' },
};

// Apply an answer key the way a student would: zero / g givens via their hidden-given condition,
// everything else from the palette. `skip` / `flip` / `condOverride` / `skipTargets` let tests break it on purpose.
// With { symbols: true } every stated given is entered as a symbol, including g ("On Earth" is turned off).
export async function applyKey(page, p, { skip = [], flip = [], condOverride = {}, skipTargets = [], symbols = false } = {}){
  const hidden = HIDDEN[p.ch];
  const viaCond = new Set();
  // conditions first: some quantities (r for a point on the rim) only appear once their condition is on
  for (const [k, v] of Object.entries({ ...p.key.cond, ...condOverride })) await setCondition(page, k, v);
  if (symbols && hidden.g) await setCondition(page, 'earth', false); // g becomes a symbol, so it must be in the palette
  for (const [id, [mag, unit, dir]] of Object.entries(p.key.givens)){
    if (skip.includes(id)) continue;
    const c = hidden[id];
    const isHidden = c && (id === 'g' ? mag === 9.81 && !symbols : mag === 0);
    if (isHidden){ viaCond.add(c); continue; }
    await addGiven(page, id, mag, unit, flip.includes(id) ? 1 - (dir || 0) : (dir || 0), { symbol: symbols || mag === null }); // null: the problem gives no size
  }
  for (const [id, fn] of Object.entries(p.key.fns || {})) await addFunction(page, id, fn);
  // hidden givens that the key doesn't use must be off (earth defaults on in incline/pulley)
  for (const c of new Set(Object.values(hidden))) await setCondition(page, c, viaCond.has(c));
  await confirmConditions(page);
  for (const t of p.key.targets) if (!skipTargets.includes(t)) await addTarget(page, t);
}

export async function checkSetup(page){
  await page.click('#checkSetup');
  await page.waitForSelector('#dlg.show');
  const out = { title: await page.textContent('#dlgTitle'), msg: await page.innerText('#dlgMsg') };
  await page.click('#dlgOk');
  return out;
}

// Enter a function of time through the editor: coefficients of t⁰, t¹, t², t³ (signed numbers, or a new symbol's name like 'k').
// a function of time, typed in the one-box editor: a string like 'γ − βt²', or coefficients [c0, c1, c2 …] of tᵏ
const SUPS = ['', '', '²', '³', '⁴', '⁵'];
export const fnFromCoefs = (cs) => cs.map((c, k) => [c, k]).filter(([c]) => c !== '' && c !== 0 && c !== '0')
  .map(([c, k], i) => { const neg = String(c).startsWith('-'), mag = String(c).replace(/^-/, ''), t = k ? 't' + SUPS[k] : '';
    return `${neg ? (i ? ' − ' : '−') : i ? ' + ' : ''}${mag === '1' && k ? '' : mag}${/[A-Za-z]$/.test(mag) && t ? ' ' : ''}${t}`; }).join('');
export async function addFunction(page, id, fn){
  await page.evaluate(async ({ id }) => {
    const { VARS, CHAPTERS } = await import('./js/data.js');
    const ch = CHAPTERS[window.__rl.ch], name = (ch.names && ch.names[id]) || VARS[id].name;
    const b = [...document.querySelectorAll('#palette button')].find(x => x.title === `Add ${name}`);
    if (!b) throw new Error(`no palette button for ${id}`);
    b.click();
  }, { id });
  await page.click('#editorSlot [data-kind="fn"]');
  await page.fill('#edFn', Array.isArray(fn) ? fnFromCoefs(fn) : fn);
  await page.click('#edSave');
}

// Gather an equation from the library drawer (opens the drawer if it's closed).
export async function gather(page, e){
  if (!(await page.evaluate(() => document.getElementById('libDrawer')?.classList.contains('open')))) await page.click('#libBtn');
  await page.click(`#lib [data-gather="${e}"]`);
  await page.click('#libClose'); // the drawer covers the right side of the sheet while it's open
}
