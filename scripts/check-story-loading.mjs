#!/usr/bin/env node
// Controlled async I/O regression. Real loading/entry/collection functions, manual image completion.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const journal = source('55_journal.js'), screens = source('50_screens.js'), rooms = source('56_interiors.js');
const functionText = (text, name) => text.match(new RegExp(`(?:async )?function ${name}\\([^]*?^}`, 'm'))?.[0];
const failures = [];
let assertions = 0;
const check = (ok, message) => { assertions++; if (!ok) failures.push(message); };
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function harness() {
  const requests = [], timers = new Map(), trace = { opened: [], toasts: [], saves: 0, music: [] }, stack = [];
  let timerId = 0;
  class Image {
    set src(value) { this.url = value; requests.push(this); }
  }
  class ComicScreen { constructor(key) { this.key = key; } }
  class InteriorScreen { constructor(key) { this.key = key; } }
  const keys = ['village-keyart', 'comic-arrival', 'portrait-hero', 'portraits-main', 'village-icon', 'comic-festival', 'room-cafe', 'room-library', 'portraits-residents'];
  const ctx = vm.createContext({
    Image, ComicScreen, InteriorScreen,
    ASSET_DATA: Object.fromEntries(keys.map(key => [key, `assets/${key}.webp`])),
    G: { done: 27, terms: [], comics: [] }, TOUCH: false, scene: 'world', curZone: 3,
    player: { x: 100, y: 80 }, scriptRunning: false,
    UIC: { mint: '#0f0', rose: '#f00' },
    COMICS: { arrival: { frames: [{ art: 'comic-arrival' }] }, farewell: { frames: [{ art: 'comic-festival' }] } },
    INTERIORS: { cafe: { zone: 1, art: 'room-cafe', resident: 'baiyu', theme: 'cafe' },
      hall: { zone: 2, art: 'room-library', resident: null, theme: 'library' } },
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    document: { querySelector: () => null, createElement: () => ({}), head: { appendChild() {} } },
    topScreen: () => stack.at(-1),
    openScreen: s => { trace.opened.push(s); stack.push(s); return new Promise(resolve => { s.resolve = resolve; }); },
    toast: text => trace.toasts.push(text), save: () => { trace.saves++; }, checkCollectAch() {},
    findTerm: id => ['vibe', 'program'].includes(id) ? { id } : undefined,
    Audio: { song: 'street', sfx() {}, play: song => trace.music.push(song) }, zoneMusic: () => 'street',
  });
  vm.runInContext(journal.slice(0, journal.indexOf('const reducedMotion')), ctx);
  const comicLock = journal.match(/^let comicActive\s*=\s*false\s*;/m)?.[0];
  if (comicLock) vm.runInContext(comicLock, ctx);
  const roomRequest = rooms.match(/^let interiorRequest\s*=\s*0\s*;/m)?.[0];
  if (roomRequest) vm.runInContext(roomRequest, ctx);
  for (const [text, name] of [[journal, 'playComic'], [screens, 'giveTerms'], [rooms, 'openInterior']]) {
    const code = functionText(text, name); if (!code) throw new Error(`Missing function: ${name}`);
    vm.runInContext(code, ctx);
  }
  vm.runInContext('globalThis.api={loadArt,ensureStoryArt,loadStoryArt,playComic,giveTerms,openInterior,ART,ART_STATUS,FIRST_ART};', ctx);
  const respond = (key, ok = true) => {
    const image = [...requests].reverse().find(im => im.url === ctx.ASSET_DATA[key] && !im.responded);
    if (!image) throw new Error(`No pending image: ${key}`);
    image.responded = true; if (ok) image.onload(); else image.onerror();
  };
  const close = screen => { stack.splice(stack.indexOf(screen), 1); screen.resolve?.(); };
  return { ctx, a: ctx.api, requests, timers, trace, stack, respond, close };
}

{
  const h = harness();
  await h.a.giveTerms(['vibe', 'program']);
  check(h.ctx.G.terms.join() === 'vibe,program', 'Terms collected without modal');
  check(h.trace.opened.length === 0, 'giveTerms must not open CardScreen');
  check(h.trace.toasts.length === 1 && h.trace.saves > 0, 'New terms toast and save');
  await h.a.giveTerms(['vibe', 'missing']);
  check(h.ctx.G.terms.length === 2 && h.trace.toasts.length === 1, 'Repeat/unknown terms do not duplicate rewards');
}
{
  const h = harness(), one = h.a.loadArt('comic-arrival'), two = h.a.loadArt('comic-arrival');
  check(one === two && h.requests.length === 1, 'Concurrent image requests deduplicate');
  h.respond('comic-arrival', false);
  check(await one === false && h.a.ART_STATUS.pending.size === 0, 'Failed request resolves and clears pending');
  const retry = h.a.loadArt('comic-arrival'); h.respond('comic-arrival');
  check(await retry && h.a.ART_STATUS.errors.length === 0 && h.a.ART_STATUS.loaded === 1, 'Successful retry clears previous error');
  const timeout = h.a.loadArt('comic-festival'); [...h.timers.values()][0]();
  check(await timeout === false, 'Timeout resolves without hanging');
  h.respond('comic-festival');
  check(!h.a.ART['comic-festival'], 'Late completion cannot turn timeout into success');
}
{
  const h = harness(); let done = false;
  const start = h.a.loadStoryArt().then(() => { done = true; });
  check(h.requests.length === h.a.FIRST_ART.length, 'Only first-screen images requested before readiness');
  for (const key of h.a.FIRST_ART) h.respond(key);
  await start;
  check(done && h.a.ART_STATUS.ready, 'Startup returns after required first-screen art');
  check(h.a.ART_STATUS.pending.size > 0, 'Remaining pictures preload without blocking startup');
}
{
  const h = harness();
  const failed = h.a.playComic('farewell'); h.respond('comic-festival', false); await failed;
  check(h.trace.opened.length === 0 && h.ctx.G.comics.length === 0, 'Failed comic load does not open or mark watched');
  check(h.trace.toasts.length === 1, 'Comic failure reports retryable feedback');
  const retry = h.a.playComic('farewell'); h.respond('comic-festival'); await flush();
  check(h.trace.opened.length === 1 && h.ctx.G.comics.length === 0, 'Comic waits for image, marks watched only after close');
  h.close(h.stack.at(-1)); await retry;
  check(h.ctx.G.comics.includes('farewell') && h.trace.saves === 1, 'Comic completes and saves');
}
{
  const h = harness(), origin = { name: 'journal' }; h.stack.push(origin);
  const first = h.a.playComic('arrival', true), second = h.a.playComic('arrival', true);
  h.respond('comic-arrival'); await flush();
  check(h.trace.opened.length === 1, 'Rapid replay clicks must not stack duplicate comics');
  for (const screen of [...h.trace.opened]) h.close(screen);
  await Promise.all([first, second]);
}
{
  const h = harness(), origin = { name: 'journal' }; h.stack.push(origin);
  const pending = h.a.playComic('arrival', true);
  h.close(origin); h.ctx.scene = 'title'; h.respond('comic-arrival'); await flush();
  check(h.trace.opened.length === 0, 'A comic requested by a closed journal must not appear later on title');
  for (const screen of [...h.trace.opened]) h.close(screen);
  await pending;
}
{
  const h = harness(), first = h.a.openInterior('cafe'), second = h.a.openInterior('cafe');
  check(h.trace.opened.length === 0, 'Room waits for room picture and resident portrait');
  h.respond('room-cafe'); await flush();
  check(h.trace.opened.length === 0, 'Room cannot open before resident portrait is ready');
  h.respond('portraits-residents'); await flush();
  check(h.trace.opened.length === 1, 'Rapid room entry opens only one room');
  h.close(h.stack.at(-1)); await Promise.all([first, second]);
  check(h.trace.music.at(-1) === 'street', 'Leaving room restores street music');
}
for (const interruption of ['screen', 'scene']) {
  const h = harness(), pending = h.a.openInterior('cafe');
  if (interruption === 'screen') h.stack.push({ name: 'pause' }); else h.ctx.scene = 'title';
  h.respond('room-cafe'); h.respond('portraits-residents'); await pending;
  check(h.trace.opened.length === 0, `Room ignores stale request after ${interruption} change`);
}
{
  const h = harness(), slow = h.a.openInterior('cafe'), fast = h.a.openInterior('hall');
  h.respond('room-library'); await flush();
  check(h.trace.opened.length === 1 && h.stack.at(-1)?.key === 'hall', 'Later ready room B opens while room A is still loading');
  h.close(h.stack.at(-1)); await fast;
  h.respond('room-cafe'); h.respond('portraits-residents'); await slow;
  check(h.trace.opened.length === 1 && h.stack.length === 0, 'Slow room A cannot reopen after room B has opened and closed');
}
{
  const h = harness(); h.ctx.scriptRunning = true;
  await h.a.openInterior('cafe');
  check(h.requests.length === 0 && h.trace.opened.length === 0, 'An active story prevents room loading and entry');
}
for (const interruption of ['story', 'movement', 'save']) {
  const h = harness(), pending = h.a.openInterior('cafe');
  if (interruption === 'story') h.ctx.scriptRunning = true;
  else if (interruption === 'movement') { h.ctx.player.x += 3; h.ctx.player.y += 3; }
  else h.ctx.G = { ...h.ctx.G };
  h.respond('room-cafe'); h.respond('portraits-residents'); await pending;
  check(h.trace.opened.length === 0, `Room ignores stale request after ${interruption} interruption`);
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} async flow findings / ${assertions} checks\n` + failures.map(s => `- ${s}`).join('\n'));
  process.exitCode = 1;
} else console.log(`PASS: ${assertions} async loading, non-modal terms, retry/timeout, stale-entry and duplicate-entry checks.`);
