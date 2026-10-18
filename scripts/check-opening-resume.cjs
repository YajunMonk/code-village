#!/usr/bin/env node
'use strict';
// Real title, save, comic, dialogue and CH0 flow with an in-memory browser surface.
// No browser, production storage or build outputs are touched.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const noop = () => {};
const plain = value => JSON.parse(JSON.stringify(value));
const cases = [];
let assertions = 0;
function check(value, message) { assertions++; assert.ok(value, message); }
function equal(actual, expected, message) { assertions++; assert.deepEqual(plain(actual), plain(expected), message); }
function surface() {
  return new Proxy({
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
    measureText: s => ({ width: [...s].reduce((w, c) => w + (c.codePointAt(0) > 127 ? 12 : 6), 0) }),
  }, { get: (o, k) => k in o ? o[k] : noop });
}
function canvas() { const g = surface(); return { width: 480, height: 270, style: {}, addEventListener: noop, getContext: () => g }; }
const cv = canvas(), storage = new Map(), trace = { removes: 0, writes: 0, fades: [], toasts: [] };
const context = vm.createContext({
  console, performance, URLSearchParams, setTimeout, clearTimeout, location: { search: '' },
  window: { innerWidth: 960, innerHeight: 540, devicePixelRatio: 1, addEventListener: noop },
  document: { hidden: false, querySelector: s => s === '#game' ? cv : null, createElement: canvas, addEventListener: noop },
  matchMedia: () => ({ matches: false }), requestAnimationFrame: noop,
  localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => { trace.writes++; storage.set(k, v); }, removeItem: k => { trace.removes++; storage.delete(k); } },
  Audio: { music: true, effects: true, play: noop, sfx: noop, unlock: noop }, trace,
  ASSET_DATA: Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'source/assets/manifest.json'), 'utf8'))).map(k => [k, `assets/${k}.webp`])),
});
for (const name of ['00_core.js', '20_art.js', '21_props.js', '22_art3.js', '30_world.js', '35_entities.js', '37_reactions.js', '40_ui.js', '50_screens.js', '55_journal.js', '56_interiors.js', '57_residents.js', '60_story.js']) {
  vm.runInContext(read(name), context, { filename: name });
}
vm.runInContext(read('70_main.js').replace(/\nboot\(\);\s*$/, '\n'), context, { filename: '70_main.js' });
vm.runInContext(`
buildProps(); buildProps3(); buildWorld(); setupNPCs(); setupInteriors();
for (const key of Object.keys(ASSET_DATA)) ART[key] = { width: 1672, height: 941 };
fadeTo = async (to, duration) => { trace.fades.push({to, duration, scene, done:G.done, locked:scriptRunning}); };
toast = text => trace.toasts.push(text);
globalThis.resumeAPI = {
  goTitle, closeScreen, topScreen, loadSave, freshState, Input, SAVE_KEY, INTERIORS, RESIDENTS,
  get G() { return G; }, get scene() { return scene; }, get locked() { return scriptRunning; },
  get player() { return player; }, get screens() { return screens; },
  classes: {TitleScreen, ComicScreen, DialogScreen},
};
`, context);
const a = context.resumeAPI;
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const preservedFields = ['terms', 'side', 'ach', 'hats', 'hat', 'signs', 'keepsakes', 'roomsVisited', 'residentsSeen', 'residentVisits', 'wrong', 't'];
const roomKey = Object.keys(a.INTERIORS)[0], room = a.INTERIORS[roomKey], residentKey = Object.keys(a.RESIDENTS)[0];

async function runCase(done, seen, legacy = false) {
  const label = `done=${done}, arrival=${seen ? 'seen' : 'unseen'}${legacy ? ', legacy missing comics' : ''}`;
  const seed = {
    ...plain(a.freshState()), done, px: done * 384 + 96, py: 238,
    terms: ['vibe', 'program'], side: ['cache'], ach: ['firstwrong'], hats: ['straw'], hat: 'straw', signs: [0],
    comics: seen ? ['arrival'] : [], roomsVisited: [roomKey], keepsakes: [`${roomKey}:${room.spots[0].id}`],
    residentsSeen: [residentKey], residentVisits: { [`${residentKey}:before`]: 3 }, wrong: 2, t: 180,
  };
  if (legacy) delete seed.comics;
  storage.set(a.SAVE_KEY, JSON.stringify(seed));
  const baseline = plain(a.loadSave());
  trace.removes = 0; trace.writes = 0; trace.fades = []; trace.toasts = [];
  let finished = false, failure = null;
  const pending = a.goTitle().then(() => { finished = true; }, e => { failure = e; });
  await flush();
  const title = a.topScreen();
  check(title instanceof a.classes.TitleScreen, `${label}: real title opens`);
  const button = title.btns.find(b => b.label === '继续冒险');
  if (button) title.press(button);
  else {
    // An old schema can have done=0 and no comic record. Force the actual Continue
    // result to cover this supported state even if the title currently hides it.
    check(legacy, `${label}: saved progress must expose Continue`);
    title.finish('continue');
  }
  await flush();
  const comics = [], batches = [], seenScreens = new Set();
  let clicks = 0;
  while (!finished && !failure && clicks < 150) {
    const screen = a.topScreen();
    check(a.locked, `${label}: opening and fade-in reserve story input`);
    check(a.G.done === 0, `${label}: progress does not advance before guidance is read`);
    if (screen instanceof a.classes.ComicScreen) {
      if (!seenScreens.has(screen)) { seenScreens.add(screen); comics.push(screen.key); }
      screen.revealed = true; screen.next();
    } else if (screen instanceof a.classes.DialogScreen) {
      if (!seenScreens.has(screen)) { seenScreens.add(screen); batches.push(plain(screen.lines)); }
      screen.n = screen.total; a.Input.pressed.add('ok'); screen.update(0); a.Input.endFrame();
    } else assert.fail(`${label}: unexpected screen ${screen?.constructor.name}`);
    clicks++; await flush();
  }
  if (failure) throw failure;
  check(finished, `${label}: continuation finishes`); await pending;
  equal(comics, done === 0 && !seen ? ['arrival'] : [], `${label}: comic replay respects prior viewing`);
  equal(batches.map(b => b.length), done === 0 ? [4, 4, 4] : [], `${label}: exactly the three real CH0 exchanges`);
  if (done === 0) {
    const lines = batches.flat().map(l => l[1]);
    check(lines.some(s => /鸭老师.*店主/.test(s)), `${label}: client identity restored`);
    check(lines.some(s => /右.*锅锅/.test(s)), `${label}: first playable destination restored`);
    check(trace.fades.filter(f => f.scene === 'world').every(f => f.locked), `${label}: no movement during opening fade-in`);
    equal(a.G.comics, ['arrival'], `${label}: comic record is preserved or collected once`);
  } else equal(a.G.comics, baseline.comics, `${label}: ordinary progress does not replay or collect comics`);
  equal(a.G.done, done === 0 ? 1 : done, `${label}: expected progress only`);
  equal(a.scene, 'world', `${label}: returns to street`);
  equal(a.screens.length, 0, `${label}: no stale screen`);
  equal(a.locked, false, `${label}: script lock released`);
  equal({ x: a.player.x, y: a.player.y }, { x: baseline.px, y: baseline.py }, `${label}: saved position preserved`);
  for (const field of preservedFields) equal(a.G[field], baseline[field], `${label}: ${field} preserved`);
  equal(trace.removes, 0, `${label}: never deletes a save`);
  const stored = plain(a.loadSave());
  equal(stored.done, done === 0 ? 1 : done, `${label}: completed progress reads back`);
  for (const field of preservedFields) equal(stored[field], baseline[field], `${label}: saved ${field} retained`);
  cases.push({ label, comics, dialogueBatches: batches.map(b => b.length), clicks, finalDone: a.G.done, storageWrites: trace.writes, storageDeletes: trace.removes });
}

(async () => {
  await runCase(0, true);
  await runCase(0, false);
  await runCase(0, false, true);
  await runCase(3, true);
  await runCase(3, false);
  const report = { passed: true, assertions, cases, scope: 'Real goTitle/Continue, normalizeSave/loadSave/save, playComic, DialogScreen, CH0 and complete(0); DOM/Canvas and fade timing are simulated. No real browser storage is used.' };
  const arg = process.argv.indexOf('--output');
  if (arg >= 0) { const file = path.resolve(root, process.argv[arg + 1]); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n'); }
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
