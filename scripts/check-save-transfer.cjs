#!/usr/bin/env node
'use strict';
// Exercise real save validation/transactions against fault-injectable memory storage.
// Does not read or write a browser's localStorage and never builds the game.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const noop = () => {};
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
let assertions = 0;
const cases = [];
const storage = new Map(), trace = [];
let fault = null;
function check(value, message) { assertions++; assert.ok(value, message); }
function equal(actual, expected, message) { assertions++; assert.deepEqual(plain(actual), plain(expected), message); }
function throws(fn, code, message) { assertions++; assert.throws(fn, e => e.code === code && typeof e.message === 'string' && e.message.length > 5, message); }
function surface() {
  return new Proxy({ createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
    measureText: text => ({ width: [...text].reduce((w, c) => w + (c.codePointAt(0) > 127 ? 12 : 6), 0) }),
  }, { get: (o, k) => k in o ? o[k] : noop });
}
function canvas() { const g = surface(); return { width: 480, height: 270, style: {}, addEventListener: noop, getContext: () => g }; }
const cv = canvas();
const context = vm.createContext({
  console, performance, URLSearchParams, TextEncoder, setTimeout, clearTimeout, location: { search: '' },
  window: { innerWidth: 960, innerHeight: 540, devicePixelRatio: 1, addEventListener: noop },
  document: { hidden: false, querySelector: s => s === '#game' ? cv : null, createElement: canvas, addEventListener: noop },
  matchMedia: () => ({ matches: false }), requestAnimationFrame: noop,
  localStorage: {
    getItem: key => { trace.push(['get', key]); if (fault) { const result = fault('get', key); if (result?.skip) return result.value; } return storage.has(key) ? storage.get(key) : null; },
    setItem: (key, value) => { trace.push(['set', key]); if (fault?.('set', key, value)?.skip) return; storage.set(key, value); },
    removeItem: key => { trace.push(['remove', key]); if (fault?.('remove', key)?.skip) return; storage.delete(key); },
  },
  Audio: { music: true, effects: true, play: noop, sfx: noop, unlock: noop }, ASSET_DATA: {},
});
for (const file of ['00_core.js', '20_art.js', '21_props.js', '22_art3.js', '30_world.js', '35_entities.js', '37_reactions.js', '40_ui.js', '50_screens.js', '55_journal.js', '56_interiors.js', '57_residents.js', '60_story.js']) vm.runInContext(read(file), context, { filename: file });
vm.runInContext(`let scene = 'title'; globalThis.api = {
  SaveTransfer, SAVE_KEY, freshState, normalizeSave, TERMS, HIDDEN, HATS, ACH, SIDES, COMICS, INTERIORS, RESIDENTS, NZ,
  get G() { return G; }, set G(v) { G = v; }, get player() { return player; }, setScene(v) { scene = v; }
};`, context);
const a = context.api, st = a.SaveTransfer, key = a.SAVE_KEY, backupKey = st.BACKUP_KEY;
const all = {
  ...plain(a.freshState()), version: 4, done: a.NZ, terms: [...a.TERMS, ...a.HIDDEN].map(t => t.id),
  side: a.SIDES.map(r => r[0]), ach: a.ACH.map(v => v.id), hats: Object.keys(a.HATS), hat: Object.keys(a.HATS)[0],
  signs: Array.from({ length: a.NZ }, (_, n) => n), comics: Object.keys(a.COMICS), roomsVisited: Object.keys(a.INTERIORS),
  keepsakes: Object.entries(a.INTERIORS).flatMap(([room, data]) => data.spots.map(spot => `${room}:${spot.id}`)),
  residentsSeen: Object.keys(a.RESIDENTS), residentVisits: Object.fromEntries(Object.keys(a.RESIDENTS).flatMap(id => [[`${id}:before`, 13], [`${id}:after`, 7]])),
  wrong: 19, t: 123456.75, px: 10080, py: 238, savedAt: 1792128279378,
};
const oldState = { ...plain(a.freshState()), version: 4, done: 3, terms: ['program', 'vibe'], comics: ['arrival'], px: 1200, py: 238, t: 180, savedAt: 1792128200000 };
const oldRaw = JSON.stringify(oldState), incomingRaw = JSON.stringify(all);
function reset() { fault = null; storage.clear(); trace.length = 0; a.setScene('title'); a.G = plain(a.freshState()); }
function writes() { return trace.filter(([op]) => op !== 'get'); }
function envelope(state = all) { return { gameId: 'code-village', formatVersion: 1, gameVersion: '1.2 · 星灯之约', exportedAt: '2026-10-16T08:00:00.000Z', state }; }
function run(name, fn) { reset(); fn(); cases.push(name); }

run('empty browser has no export or recovery', () => {
  equal(st.currentSummary(), null); equal(st.recovery(), null);
  throws(() => st.exportCurrent(), 'NO_SAVE'); throws(() => st.restore(), 'NO_BACKUP'); equal(writes(), []);
});
run('complete progress exports and round trips without mutation', () => {
  storage.set(key, incomingRaw);
  const exported = st.exportCurrent(), parsed = st.parse(exported.text);
  equal(parsed.state, all, 'Every progress field and fractional play time survives');
  equal(exported.envelope.gameId, 'code-village'); equal(exported.envelope.formatVersion, 1);
  check(exported.filename.endsWith('.json')); check(exported.summary.chapter === '已通关');
  equal(storage.get(key), incomingRaw); equal(writes(), []); check(!parsed.legacy);
  equal(st.parse('\uFEFF' + exported.text).state, all, 'UTF-8 BOM files work');
});
run('legacy minimal save migrates missing fields safely', () => {
  const parsed = st.parse(JSON.stringify({ done: 1, terms: ['program'], version: 3 }));
  check(parsed.legacy); equal(parsed.state.version, 4); equal(parsed.state.comics, []);
  equal(parsed.state.residentVisits, {}); check(parsed.state.px > 0); equal(writes(), []);
  equal(st.parse(JSON.stringify({ done: 0, terms: [] })).state.done, 0);
});
run('preview and cancel never touch either save key', () => {
  storage.set(key, oldRaw); storage.set(backupKey, 'old recovery bytes');
  const before = [...storage.entries()]; st.parse(JSON.stringify(envelope())); st.summary(all);
  equal([...storage.entries()], before); equal(writes(), []);
});
run('world export captures latest progress and preview keeps actual save time', () => {
  storage.set(key, oldRaw); a.setScene('world'); a.G = plain(all); a.G.t = 123500.5;
  a.player.x = 10090; a.player.y = 240;
  const before = plain(a.G); const shown = st.currentSummary();
  equal(shown.savedAt, all.savedAt, 'Viewing the panel does not invent a recent save');
  const exported = st.exportCurrent(); equal(exported.envelope.state.px, 10090); equal(exported.envelope.state.t, 123500.5);
  check(exported.envelope.state.savedAt >= all.savedAt); equal(a.G, before); equal(storage.get(key), oldRaw); equal(writes(), []);
});
run('confirm import backs up before writing and repeated restore retains recovery point', () => {
  storage.set(key, oldRaw); const beforeG = plain(a.G), result = st.import(all);
  equal(result.state, all); equal(JSON.parse(storage.get(key)), all); equal(a.G, beforeG, 'UI controls live-state adoption');
  equal(writes().map(r => r[1]), [backupKey, key], 'Backup must be verified before overwriting main save');
  equal(st.recovery().state, oldState);
  const backupBytes = storage.get(backupKey); equal(st.restore().state, oldState); equal(JSON.parse(storage.get(key)), oldState);
  equal(st.restore().state, oldState); equal(storage.get(backupKey), backupBytes, 'Restore never rotates the recovery point');
});
run('world import recovery includes progress newer than autosave', () => {
  storage.set(key, oldRaw); a.setScene('world'); a.G = { ...plain(oldState), wrong: 7, t: 194 };
  a.player.x = 1208; a.player.y = 240; st.import(all);
  const backup = st.recovery().state; equal(backup.t, 194); equal(backup.wrong, 7); equal(backup.px, 1208); equal(backup.savedAt, oldState.savedAt);
});
run('invalid files and fields fail without writes', () => {
  const bad = [
    ['', 'EMPTY_FILE'], ['{', 'INVALID_JSON'], ['[]', 'INVALID_FILE'], ['null', 'INVALID_FILE'],
    [JSON.stringify({ ...envelope(), gameId: 'another-game' }), 'WRONG_GAME'],
    [JSON.stringify({ ...envelope(), formatVersion: 2 }), 'FORMAT_VERSION'],
    [JSON.stringify({ ...envelope(), gameVersion: 12 }), 'FILE_METADATA'],
    [JSON.stringify({ ...envelope(), exportedAt: 'tomorrow' }), 'FILE_METADATA'],
    [JSON.stringify({ ...envelope(), unknown: 1 }), 'FILE_METADATA'],
    [JSON.stringify(envelope({ ...all, version: 5 })), 'STATE_VERSION'],
    [JSON.stringify(envelope({ ...all, done: 28 })), 'STATE_PROGRESS'],
    [JSON.stringify(envelope({ ...all, terms: 'program' })), 'STATE_PROGRESS'],
    [JSON.stringify(envelope({ ...all, terms: ['not-a-term'] })), 'STATE_IDS'],
    [JSON.stringify(envelope({ ...all, keepsakes: ['pantry:unknown'] })), 'STATE_IDS'],
    [JSON.stringify(envelope({ ...all, hats: [] })), 'STATE_HAT'],
    [JSON.stringify(envelope({ ...all, signs: [27] })), 'STATE_SIGNS'],
    [JSON.stringify(envelope({ ...all, residentVisits: { 'not-a-resident:before': 1 } })), 'STATE_VISITS'],
    [JSON.stringify(envelope({ ...all, residentVisits: { 'baiyu:before': 1.5 } })), 'STATE_VISITS'],
    [JSON.stringify(envelope({ ...all, wrong: Number.MAX_SAFE_INTEGER + 1 })), 'STATE_NUMBER'],
    [JSON.stringify(envelope({ ...all, t: -1 })), 'STATE_NUMBER'],
    [JSON.stringify(envelope({ ...all, savedAt: 1e30 })), 'STATE_NUMBER'],
    [JSON.stringify(envelope({ ...all, px: 1e30 })), 'STATE_POSITION'],
    [JSON.stringify(envelope({ ...all, unknownField: 'ignored?' })), 'STATE_FIELDS'],
    ['{"done":1,"terms":[],"__proto__":{"polluted":true}}', 'STATE_FIELDS'],
    ['{"done":1,"terms":[],"constructor":{"prototype":{"polluted":true}}}', 'STATE_FIELDS'],
    ['{"done":1,"terms":[],"residentVisits":{"__proto__":1}}', 'STATE_VISITS'],
    [JSON.stringify(envelope()) + ' '.repeat(st.MAX_BYTES), 'FILE_TOO_LARGE'],
    ['😀'.repeat(st.MAX_BYTES / 4 + 1), 'FILE_TOO_LARGE'],
  ];
  storage.set(key, oldRaw);
  for (const [text, code] of bad) throws(() => st.parse(text), code, text.slice(0, 60));
  throws(() => st.import({ ...all, t: Infinity }), 'STATE_NUMBER');
  equal(storage.get(key), oldRaw); equal(writes(), []); equal({}.polluted, undefined);
});
run('storage read denial cancels before any write', () => {
  storage.set(key, oldRaw); fault = (op) => { if (op === 'get') throw new Error('SecurityError'); };
  throws(() => st.import(all), 'STORAGE_READ'); equal(storage.get(key), oldRaw); equal(writes(), []);
});
run('backup quota failure preserves original and previous recovery', () => {
  storage.set(key, oldRaw); storage.set(backupKey, 'previous');
  fault = (op, k) => { if (op === 'set' && k === backupKey) throw new Error('QuotaExceededError'); };
  throws(() => st.import(all), 'BACKUP_WRITE'); equal(storage.get(key), oldRaw); equal(storage.get(backupKey), 'previous');
  check(!writes().some(([, k]) => k === key));
});
run('silent backup write failure cannot overwrite main save', () => {
  storage.set(key, oldRaw); fault = (op, k) => op === 'set' && k === backupKey ? { skip: true } : null;
  throws(() => st.import(all), 'BACKUP_WRITE'); equal(storage.get(key), oldRaw); check(!storage.has(backupKey));
});
run('main write throws and retains exact old save and recovery', () => {
  storage.set(key, oldRaw); storage.set(backupKey, 'previous');
  fault = (op, k) => { if (op === 'set' && k === key) throw new Error('QuotaExceededError'); };
  throws(() => st.import(all), 'IMPORT_WRITE'); equal(storage.get(key), oldRaw); equal(storage.get(backupKey), 'previous');
});
run('readback mismatch restores original bytes', () => {
  storage.set(key, oldRaw); let corrupted = false;
  fault = (op, k) => { if (op === 'set' && k === key && !corrupted) { corrupted = true; storage.set(key, 'corrupt'); return { skip: true }; } };
  throws(() => st.import(all), 'IMPORT_WRITE'); equal(storage.get(key), oldRaw); check(!storage.has(backupKey));
});
run('rollback failure retains verified recovery and reports it', () => {
  storage.set(key, oldRaw);
  fault = (op, k) => { if (op === 'set' && k === key) { storage.set(key, 'corrupt'); throw new Error('Storage failure'); } };
  throws(() => st.import(all), 'IMPORT_ROLLBACK'); fault = null;
  equal(st.recovery().state, oldState); equal(st.restore().state, oldState); equal(JSON.parse(storage.get(key)), oldState);
});
run('restore failure leaves current save and recovery untouched', () => {
  storage.set(key, oldRaw); st.import(all); const raw = storage.get(key), backup = storage.get(backupKey);
  fault = (op, k) => { if (op === 'set' && k === key) throw new Error('QuotaExceededError'); };
  throws(() => st.restore(), 'RESTORE_WRITE'); equal(storage.get(key), raw); equal(storage.get(backupKey), backup);
});
run('first import into empty browser is allowed without inventing old progress', () => {
  st.import(all); equal(JSON.parse(storage.get(key)), all); equal(st.recovery(), null); throws(() => st.restore(), 'NO_BACKUP');
});
run('corrupt recovery reports an error without modifying current save', () => {
  storage.set(key, incomingRaw); storage.set(backupKey, '{broken');
  throws(() => st.recovery(), 'BACKUP_INVALID'); throws(() => st.restore(), 'BACKUP_INVALID'); equal(storage.get(key), incomingRaw); equal(writes(), []);
});
const report = { passed: true, cases: cases.length, assertions, details: cases, coveredProgressFields: Object.keys(all), storage: 'isolated in-memory; no real browser storage touched' };
console.log(JSON.stringify(report, null, 2));
const out = process.argv.indexOf('--report');
if (out !== -1) { const file = path.resolve(root, process.argv[out + 1]); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n'); }
