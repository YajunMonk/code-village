#!/usr/bin/env node
'use strict';
// Deterministic glyph masks and recording output; no browser, font service or saves.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
let assertions = 0, fontGeneration = 0, measures = 0, rasterizations = 0;
const check = (condition, message) => { assertions++; assert.ok(condition, message); };
const equal = (actual, expected, message) => { assertions++; assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message); };
const widths = text => [...text].reduce((n, ch) => n + (ch.codePointAt(0) > 127 ? 12 : 6) + fontGeneration, 0);
function rgb(color) {
  if (color === 'rgba(24,48,96,0.5)') return [24, 48, 96, 128];
  const hex = color.slice(1); return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).concat(255);
}
function makeCanvas(width, height) {
  const canvas = { width, height }, pixels = new Uint8ClampedArray(width * height * 4);
  const g = { canvas, pixels, globalCompositeOperation: 'source-over', fillStyle: '#ffffff',
    measureText(text) { measures++; return { width: widths(text) }; },
    fillText(ch, x, y) {
      rasterizations++; canvas.character = ch; canvas.raster = { x, y, font: this.font, baseline: this.textBaseline };
      if (/\s/.test(ch)) return;
      [0, 1, 64, 127, 128, 129, 254, 255].forEach((a, i) => pixels.set([255, 255, 255, a], i * 4));
    },
    getImageData() { return { width, height, data: new Uint8ClampedArray(pixels) }; },
    putImageData(data) { pixels.set(data.data); },
    drawImage(source, x, y) { assert.equal(x, 0); assert.equal(y, 0); pixels.set(source.getContext('2d').pixels); canvas.character = source.character; },
    fillRect() {
      assert.equal(this.globalCompositeOperation, 'source-in');
      canvas.color = this.fillStyle; const color = rgb(this.fillStyle);
      for (let i = 0; i < pixels.length; i += 4) { const alpha = Math.round(pixels[i + 3] * color[3] / 255); pixels.set([color[0], color[1], color[2], alpha], i); }
    },
  };
  canvas.getContext = () => g; return [canvas, g];
}
const source = fs.readFileSync(path.join(root, 'source/src/40_ui.js'), 'utf8');
const sandbox = vm.createContext({ makeCanvas });
vm.runInContext(source.slice(0, source.indexOf('/* ---------- 窗口 ---------- */')), sandbox);
vm.runInContext('globalThis.api={pixelGlyph,drawPixelGlyph,clearTextCache,txt,drawLines,wrap,cw,textW,tokens,UIC};', sandbox);
const a = sandbox.api;
function destination() { const calls = []; return { calls, globalAlpha: .6, globalCompositeOperation: 'screen', drawImage(c, x, y) { calls.push({ character: c.character, color: c.color, x, y, source: c }); } }; }
function simplify(g) { return g.calls.map(({ character, color, x, y }) => ({ character, color, x, y })); }
function alphas(c) { return Array.from(c.getContext('2d').pixels).filter((_, i) => i % 4 === 3); }

// The exact threshold boundary matters: gray edges disappear without eroding 128+ strokes.
const red = a.pixelGlyph('字', '#ff0000');
equal(alphas(red).slice(0, 8), [0, 0, 0, 0, 255, 255, 255, 255], 'Alpha below 128 is removed and alpha from 128 is fully opaque');
check(alphas(red).every(v => v === 0 || v === 255), 'Opaque glyph colors have a strictly binary alpha mask');
equal(Array.from(red.getContext('2d').pixels.slice(16, 20)), [255, 0, 0, 255], 'Source-in coloring retains the mask and supplies the requested color');
const firstRasterCount = rasterizations;
check(a.pixelGlyph('字', '#ff0000') === red, 'Same character and color reuse the rendered glyph');
const green = a.pixelGlyph('字', '#00ff00');
check(green !== red && rasterizations === firstRasterCount, 'A new color shares the existing binary mask without rerasterizing');
equal(Array.from(green.getContext('2d').pixels.slice(16, 20)), [0, 255, 0, 255], 'Color variants do not mutate each other');
equal(Array.from(red.getContext('2d').pixels.slice(16, 20)), [255, 0, 0, 255], 'Previously cached colors remain intact');
const translucent = a.pixelGlyph('字', 'rgba(24,48,96,0.5)');
equal(Array.from(translucent.getContext('2d').pixels.slice(16, 20)), [24, 48, 96, 128], 'An explicit translucent text color keeps its intended opacity');
check(alphas(a.pixelGlyph(' ', '#ffffff')).every(v => v === 0), 'Spaces advance layout but do not create opaque pixels');

// Font loading must invalidate both widths and masks; a fallback width must never stick.
const oldWidth = a.cw('字'), beforeMeasure = measures;
a.cw('字'); equal(measures, beforeMeasure, 'Repeated measurements use the width cache');
fontGeneration = 1; equal(a.cw('字'), oldWidth, 'Test establishes the cached pre-load width');
a.clearTextCache(); equal(a.cw('字'), oldWidth + 1, 'Loading the real font invalidates cached fallback measurements');
check(a.pixelGlyph('字', '#ff0000') !== red && rasterizations > firstRasterCount, 'Font change invalidates both mask and colored glyph caches');
fontGeneration = 0; a.clearTextCache();

// Both public drawing APIs must agree on positions, baseline, width and shadows.
for (const text of ['代码 AI 12', '【先做】再改', 'A，B。', '你好']) {
  const plain = destination(), rich = destination();
  a.txt(plain, text, 10.4, 20.7, '#f4eedc', { shadow: '#06171f' });
  a.drawLines(rich, [[...text].map(ch => ({ ch, c: '#f4eedc' }))], 10.4, 20.7, { shadow: '#06171f' });
  equal(simplify(plain), simplify(rich), 'Plain and rich text use identical advance widths, origins and shadow positions');
  check(plain.calls.every(c => Number.isInteger(c.x) && Number.isInteger(c.y)), 'Every destination glyph starts on an integer logical pixel');
  equal([plain.globalAlpha, plain.globalCompositeOperation], [.6, 'screen'], 'Text rendering preserves the caller opacity and blend mode');
}
const single = destination(); a.drawPixelGlyph(single, '点', 10.4, 20.7, '#ffffff');
equal(simplify(single), [{ character: '点', color: '#ffffff', x: 8, y: 19 }], 'Glyph padding offsets preserve the prior x / y+10 text baseline');
const centered = destination(); a.txt(centered, '中文A', 100.2, 9.1, '#ffffff', { align: 'center', shadow: null });
equal(simplify(centered).map(c => c.x), [83, 95, 107], 'Center alignment uses the existing measured text width');
const right = destination(); a.txt(right, '中文A', 100.2, 9.1, '#ffffff', { align: 'right', shadow: null });
equal(simplify(right).map(c => c.x), [68, 80, 92], 'Right alignment uses the existing measured text width');
const lines = destination(), result = a.drawLines(lines, [[{ ch: '你', c: '#ff0000' }, { ch: '好', c: '#00ff00' }], [{ ch: 'A', c: '#0000ff' }]], 5.8, 7.2, { lh: 14, max: 2, shadow: null });
equal(result, 2, 'Typewriter max counts characters, not shadow layers');
equal(simplify(lines), [{ character: '你', color: '#ff0000', x: 4, y: 5 }, { character: '好', color: '#00ff00', x: 16, y: 5 }], 'Rich text colors and character limits are preserved');
const page = destination(); a.drawLines(page, [[{ ch: '你', c: '#ffffff' }], [{ ch: 'A', c: '#ffffff' }]], 0, 0, { lh: 14, align: 'center', width: 60, shadow: null });
equal(simplify(page).map(c => [c.x, c.y]), [[22, -2], [25, 12]], 'Multiline centering and line height remain unchanged');
const zero = destination(); equal(a.drawLines(zero, [[{ ch: '字', c: '#ffffff' }]], 0, 0, { max: 0 }), 0); equal(zero.calls, [], 'Zero revealed characters draw neither text nor shadow');

const dialogue = '不响，我们先修【点单系统】。写下 MVP，再用 AI 帮忙；先试一单。';
for (const width of [36, 60, 120, 216]) {
  const wrapped = a.wrap(dialogue, width), chars = wrapped.flat();
  equal(chars.map(t => t.ch).join(''), dialogue, 'Wrapping preserves every dialogue character and punctuation');
  check(wrapped.every(line => line.reduce((n, t) => n + a.cw(t.ch), 0) <= width), 'Wrapping retains the existing measured width contract');
  equal(chars.filter(t => t.c === a.UIC.gold).map(t => t.ch).join(''), '【点单系统】', 'Rich emphasis retains its original span and colors');
}

// Long sessions may evict a color variant, but never lose or rerasterize its mask.
a.clearTextCache(); const evicted = a.pixelGlyph('字', '#000000'), maskRasterCount = rasterizations;
for (let i = 1; i <= 2048; i++) a.pixelGlyph('字', '#' + i.toString(16).padStart(6, '0'));
check(a.pixelGlyph('字', '#000000') !== evicted, 'The 2048-entry color cache evicts its oldest variant');
equal(rasterizations, maskRasterCount, 'Color-cache eviction keeps the reusable character mask');
console.log(JSON.stringify({ passed: true, assertions, rasterizations, coverage: ['alpha threshold boundaries', 'color and opacity', 'mask and color cache reuse/eviction', 'font-load invalidation', 'integer origins and original baseline', 'plain/rich text layout equivalence', 'shadows and typewriter limits', 'wrapping and emphasis'], boundary: 'Synthetic raster inputs test rendering contracts. Native font rasterization and visual sharpness require browser verification.' }, null, 2));
