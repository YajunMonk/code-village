#!/usr/bin/env node
'use strict';
// Exercise the real portrait lookup, WHO/resident registration and Canvas drawing.
// PNG headers supply the actual source dimensions. This is not a visual art review.
// Run: node scripts/check-portraits.cjs [--output artifacts/qa/portraits-check.json]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const report = { passed: false, groups: [], whoCount: 0, illustratedCharacters: 0, fallbackObjects: [], draws: 0, checks: 0, failures: [] };
const check = (ok, message) => { report.checks++; if (!ok) report.failures.push(message); };
const noop = () => {};
function gfx(record = false) {
  return new Proxy({
    createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    measureText: s => ({ width: [...s].length * 12 }),
    createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {
      if (!record) return;
      report.draws++;
      check(!!img && img.width > 0 && img.height > 0, 'drawImage has a valid image');
      if (!img) return;
      check([sx, sy, sw, sh, dx, dy, dw, dh].every(Number.isFinite), 'crop and destination are finite');
      check(sw > 0 && sh > 0 && sx >= 0 && sy >= 0 && sx + sw <= img.width + .001 && sy + sh <= img.height + .001, 'drawImage source rectangle stays within image');
      check(dw > 0 && dh > 0, 'drawImage destination is visible');
      const b = this.expectedBox;
      if (b) check(dx >= b.x && dy >= b.y && dx + dw <= b.x + b.size && dy + dh <= b.y + b.size, 'portrait fits its dialog frame');
    },
  }, { get: (o, k) => k in o ? o[k] : noop });
}
function canvas() { const ctx = gfx(); return { width: 1, height: 1, getContext: () => ctx }; }
const context = vm.createContext({ console, performance, check, report, document: { createElement: canvas, addEventListener: noop }, window: { addEventListener: noop }, surface: gfx(true) });
vm.runInContext(read('00_core.js').split('/* ---------- 画布 & 缩放 ---------- */')[0] + '\nconst resizeHooks=[];let VW=480,VH=270,PORTRAIT=false;const ART={};', context);
const modules = ['20_art.js', '21_props.js', '22_art3.js', '23_portraits.js', '35_entities.js', '37_reactions.js', '40_ui.js', '57_residents.js'];
for (const name of modules) vm.runInContext(read(name), context, { filename: name });
const api = vm.runInContext('({groups:PORTRAIT_GROUPS,lookup:PORTRAIT_LOOKUP,WHO,RESIDENTS,ART,illustratedPortrait,portraitOf,drawPortrait,buildProps,buildIcons,buildProps3,buildIcons3})', context);
api.buildProps(); api.buildIcons(); api.buildProps3(); api.buildIcons3();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source/assets/manifest.json'), 'utf8'));
const seenIds = new Set(), atlasSources = new Set(), cropKeys = new Set();
check(Object.keys(api.groups).length === 4, 'Four portrait atlases are registered');
for (const key of [...Object.keys(api.groups), 'portrait-hero']) {
  const relative = manifest[key];
  check(typeof relative === 'string', key + ' exists in the asset manifest');
  if (!relative) continue;
  const assetPath = path.resolve(root, 'source/assets', relative);
  const png = fs.readFileSync(assetPath);
  check(png.length >= 24 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), key + ' is PNG');
  const img = { key, width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  check(img.width > 0 && img.height > 0, key + ' has positive dimensions');
  api.ART[key] = img;
  if (key !== 'portrait-hero') {
    check(!atlasSources.has(assetPath), key + ' must not reuse another group image'); atlasSources.add(assetPath);
    report.groups.push({ key, source: relative, width: img.width, height: img.height, cells: api.groups[key].length });
  }
}
function validCrop(p, label) {
  check(!!p?.img, label + ' has an image'); if (!p?.img) return;
  check([p.sx, p.sy, p.sw, p.sh].every(Number.isFinite), label + ' crop is finite');
  check(p.sw > 0 && p.sh > 0 && p.sx >= 0 && p.sy >= 0 && p.sx + p.sw <= p.img.width + .001 && p.sy + p.sh <= p.img.height + .001, label + ' crop remains in source bounds');
}
for (const [key, ids] of Object.entries(api.groups)) {
  check(ids.length === 12, key + ' has twelve cells');
  const img = api.ART[key], crops = [];
  for (const [index, id] of ids.entries()) {
    check(!seenIds.has(id), id + ' occurs in only one atlas slot'); seenIds.add(id);
    const p = api.illustratedPortrait(id); validCrop(p, id);
    check(p?.img === img && p?.artwork === true, id + ' resolves to its loaded atlas');
    if (!p?.img) continue;
    // Containment in an independently specified 4 x 3 grid catches shifted rows and padding bleed.
    const left = index % 4 * img.width / 4, top = Math.floor(index / 4) * img.height / 3;
    check(p.sx >= left && p.sy >= top && p.sx + p.sw <= left + img.width / 4 + .001 && p.sy + p.sh <= top + img.height / 3 + .001, id + ' stays inside its declared grid cell');
    const cropKey = [key, p.sx, p.sy, p.sw, p.sh].join(':');
    check(!cropKeys.has(cropKey), id + ' does not map to another character crop'); cropKeys.add(cropKey);
    for (const other of crops) check(!(p.sx < other.sx + other.sw && p.sx + p.sw > other.sx && p.sy < other.sy + other.sh && p.sy + p.sh > other.sy), id + ' crop does not overlap an adjacent portrait');
    crops.push(p);
  }
}
check(Object.keys(api.lookup).length === seenIds.size, 'Lookup preserves every atlas slot without duplicate-id overwrite');
validCrop(api.illustratedPortrait('player'), 'player');
check(api.illustratedPortrait('player')?.img === api.ART['portrait-hero'], 'Male protagonist uses the independent hero art');
check(api.illustratedPortrait('__unknown__') === null, 'Unknown character has no accidental atlas match');
const objectPortraits = new Set(['sign', 'door']);
const visibleIds = new Set(Object.values(api.WHO).map(w => w.id));
report.whoCount = Object.keys(api.WHO).length;
for (const [who, data] of Object.entries(api.WHO)) {
  const p = api.portraitOf(data.id, false); validCrop(p, who);
  if (objectPortraits.has(data.id)) { check(!p.artwork, who + ' retains its object icon'); report.fallbackObjects.push(who); }
  else { check(p.artwork === true, who + ' has illustrated art when its atlas is loaded'); report.illustratedCharacters++; }
  for (const size of [34, 46, 52, 72]) for (const talking of [false, true]) {
    context.surface.expectedBox = { x: 11, y: 17, size };
    api.drawPortrait(context.surface, data.id, 11, 17, size, talking);
  }
}
for (const [key, resident] of Object.entries(api.RESIDENTS)) {
  const voice = api.WHO['resident_' + key];
  check(voice?.id === resident.avatar, key + ' voice uses its own avatar, not a main cast fallback');
  check(visibleIds.has(resident.avatar) && !!api.lookup[resident.avatar], key + ' is visible and mapped to an atlas cell');
}
// Failed/unloaded atlases must still leave every speaker drawable while retrying.
const cachedArt = { ...api.ART }; for (const key of Object.keys(api.ART)) delete api.ART[key];
for (const [who, data] of Object.entries(api.WHO)) {
  const p = api.portraitOf(data.id, false); validCrop(p, who + ' loading fallback');
  context.surface.expectedBox = { x: 11, y: 17, size: 46 }; api.drawPortrait(context.surface, data.id, 11, 17, 46, false);
}
Object.assign(api.ART, cachedArt);
report.passed = report.failures.length === 0;
report.sourceSha256 = Object.fromEntries(['23_portraits.js', '40_ui.js', '57_residents.js'].map(name => [name, crypto.createHash('sha256').update(read(name)).digest('hex')]));
report.limitation = 'Uses actual PNG dimensions and recording Canvas. It detects missing roles, duplicate mappings and crop/draw bounds; it cannot judge identity, anatomy, visual consistency or whether the generated image places the intended face in each cell.';
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) { const out = path.resolve(root, process.argv[outputIndex + 1]); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
