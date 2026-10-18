#!/usr/bin/env node
'use strict';
// Exercise the real resize/presentation/input code without touching browser saves.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), noop = () => {};
let assertions = 0;
const check = (condition, message) => { assertions++; assert.ok(condition, message); };
const equal = (actual, expected, message) => { assertions++; assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message); };
const close = (actual, expected, message) => check(Math.abs(actual - expected) < 1e-8, message);
const device = { w: 0, h: 0, dpr: 1, coarse: false, deck: 0 }, canvases = [];
function canvas() {
  const listeners = new Map(), calls = [];
  const el = { style: {}, addEventListener: (name, fn) => listeners.set(name, fn), fire: (name, event) => listeners.get(name)?.(event) };
  const context = { canvas: el, calls, setTransform: (...args) => calls.push(['transform', ...args]), clearRect: (...args) => calls.push(['clear', ...args]), drawImage: (...args) => calls.push(['draw', ...args]) };
  const reset = () => { context.imageSmoothingEnabled = true; context.globalAlpha = 1; context.globalCompositeOperation = 'source-over'; };
  let width = 300, height = 150;
  Object.defineProperties(el, { width: { get: () => width, set: value => { width = value; reset(); } }, height: { get: () => height, set: value => { height = value; reset(); } } });
  el.getContext = () => context;
  el.getBoundingClientRect = () => ({ left: parseFloat(el.style.left) || 0, top: parseFloat(el.style.top) || 0, width: parseFloat(el.style.width), height: parseFloat(el.style.height) });
  reset(); canvases.push(el); return el;
}
const visible = canvas(), touch = {};
const sandbox = vm.createContext({
  window: { get innerWidth() { return device.w; }, get innerHeight() { return device.h; }, get devicePixelRatio() { return device.dpr; }, addEventListener: noop },
  document: { querySelector: selector => selector === '#game' ? visible : touch, createElement: canvas, addEventListener: noop },
  matchMedia: () => ({ matches: device.coarse }), getComputedStyle: () => ({ height: device.deck + 'px' }), Audio: { unlock: noop },
});
vm.runInContext(fs.readFileSync(path.join(root, 'source/src/00_core.js'), 'utf8'), sandbox);
vm.runInContext('globalThis.api={resize,presentFrame,presentationMetrics,toGame,Input,renderCanvas,get context(){return ctx},get layout(){return {VW,VH,SCALE,PORTRAIT}},worldViewHeight};', sandbox);
const api = sandbox.api, display = visible.getContext('2d');

api.resize();
equal(api.layout, { VW: 480, VH: 270, SCALE: 1, PORTRAIT: false }, 'Zero viewport startup keeps a usable logical canvas');
check(api.context !== display && api.context.canvas === api.renderCanvas, 'Logical drawing and presentation use separate canvases and contexts');

const cases = [
  // CSS viewport, DPR, coarse, unchanged logical size/scale, physical backing.
  [390, 844, 3, true, 292, 633, 4 / 3, 1168, 2532],
  [393, 852, 3, true, 294, 639, 4 / 3, 1176, 2556],
  [430, 739, 3, true, 322, 554, 4 / 3, 1288, 2216],
  [375, 635, 2, true, 360, 635, 1, 720, 1270],
  [844, 390, 3, true, 600, 292, 4 / 3, 2400, 1168],
  [800, 600, 1.25, false, 500, 340, 1.6, 1000, 680],
  [1280, 720, 1, false, 600, 340, 2, 1200, 680],
  [1920, 1080, 2, false, 480, 270, 4, 3840, 2160],
  [280, 300, 1, true, 420, 270, 2 / 3, 280, 180],
];
for (const [w, h, dpr, coarse, logicalW, logicalH, scale, backingW, backingH] of cases) {
  Object.assign(device, { w, h, dpr, coarse, deck: coarse && h > w * 1.08 ? 220 : 0 });
  // A resize resets native Canvas state, and must restore nearest filtering.
  api.resize();
  equal(api.layout, { VW: logicalW, VH: logicalH, SCALE: scale, PORTRAIT: coarse && h > w * 1.08 }, 'Existing layout and scale contracts remain unchanged');
  equal([visible.width, visible.height, api.renderCanvas.width, api.renderCanvas.height], [backingW, backingH, logicalW, logicalH], 'Physical presentation does not change source resolution');
  const m = api.presentationMetrics();
  close(m.cssWidth * dpr, backingW, 'CSS width maps backing pixels one-to-one to device pixels');
  close(m.cssHeight * dpr, backingH, 'CSS height maps backing pixels one-to-one to device pixels');
  close(m.left * dpr, Math.round(m.left * dpr), 'Left edge is aligned to physical pixels');
  close(m.top * dpr, Math.round(m.top * dpr), 'Top edge is aligned to physical pixels');
  check(m.left >= 0 && m.top >= 0 && m.left + m.cssWidth <= w + 1e-8 && m.top + m.cssHeight <= h + 1e-8, 'Presentation stays inside the viewport');
  check(m.nearest && m.separateContexts && !api.context.imageSmoothingEnabled, 'Both contexts disable image smoothing after resize');
  for (const [u, v] of [[0, 0], [.13, .27], [.5, .5], [1, 1]]) {
    const event = { clientX: m.left + m.cssWidth * u, clientY: m.top + m.cssHeight * v, pointerType: 'touch' };
    const point = api.toGame(event); close(point.x, logicalW * u, 'Pointer X maps to the logical coordinate'); close(point.y, logicalH * v, 'Pointer Y maps to the logical coordinate');
    visible.fire('pointerdown', event); close(api.Input.pointer.click.x, logicalW * u, 'Real pointer handler uses the same X mapping'); close(api.Input.pointer.click.y, logicalH * v, 'Real pointer handler uses the same Y mapping');
  }
  display.imageSmoothingEnabled = true; display.globalAlpha = .2; display.globalCompositeOperation = 'multiply'; display.calls.length = 0;
  api.context.globalAlpha = .6; api.presentFrame();
  equal(display.calls[0], ['transform', 1, 0, 0, 1, 0, 0], 'Presentation does not inherit scene transforms');
  equal(display.calls[1], ['clear', 0, 0, backingW, backingH], 'Presentation clears prior physical pixels');
  const draw = display.calls[2]; check(draw[1] === api.renderCanvas, 'Blit source is the logical frame, never the displayed bitmap');
  equal(draw.slice(2), [0, 0, logicalW, logicalH, 0, 0, backingW, backingH], 'One nearest blit presents the complete logical frame');
  check(display.calls.length === 3 && !display.imageSmoothingEnabled && display.globalAlpha === 1 && display.globalCompositeOperation === 'source-over', 'Presentation restores its own filtering, opacity and blend state');
  close(api.context.globalAlpha, .6, 'Presentation does not mutate the game context');
}

Object.assign(device, { w: 393, h: 852, dpr: 3, coarse: true, deck: 220 }); api.resize();
const before = JSON.parse(JSON.stringify(api.presentationMetrics())), safeHeight = api.worldViewHeight();
Object.assign(device, { w: 0, h: 0, dpr: 0 }); api.resize();
equal(api.presentationMetrics(), before, 'Hidden zero-size viewport keeps the last valid physical presentation');
equal(api.worldViewHeight(), safeHeight, 'Zero-size viewport preserves the touch-deck camera height');
Object.assign(device, { w: 844, h: 390, dpr: 3, coarse: true }); api.resize();
check(!api.layout.PORTRAIT && api.presentationMetrics().backingWidth === 2400, 'Orientation recovers after background zero-size reporting');

const main = fs.readFileSync(path.join(root, 'source/src/70_main.js'), 'utf8'), entities = fs.readFileSync(path.join(root, 'source/src/35_entities.js'), 'utf8');
check(main.indexOf('presentFrame();') > main.indexOf('if (fx.fade > 0)') && main.indexOf('presentFrame();') < main.indexOf('Input.endFrame();'), 'Presentation happens after all world, UI and transition drawing');
check(entities.includes('g.drawImage(g.canvas, Math.max(0, sx - 30)') && !entities.includes('g.drawImage(cv,'), 'Glitch self-copy uses the logical context canvas');
console.log(JSON.stringify({ passed: true, assertions, viewports: cases.length, coverage: ['DPR 1/1.25/2/3', 'physical pixel alignment', 'logical size preservation', 'actual pointer handlers', 'context reset and isolated nearest blit', 'zero viewport and orientation recovery', 'frame ordering and logical self-copy'], boundary: 'Recording contexts validate contracts; Safari raster appearance and frame rate require real-browser QA.' }, null, 2));
