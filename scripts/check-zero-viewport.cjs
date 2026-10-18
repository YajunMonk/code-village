#!/usr/bin/env node
'use strict';
// Exercise real resize() and the real world lighting resize hook.
// The recording Canvas rejects non-finite gradient arguments like the browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), noop = () => {};
let assertions = 0;
const check = (ok, message) => { assertions++; assert.ok(ok, message); };
const same = (a, b, message) => { assertions++; assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), message); };

function harness() {
  const device = { w: 0, h: 0, dpr: 1, coarse: false, deck: 0 };
  const trace = { gradients: 0, hooks: 0, rectReads: 0 };
  function canvas() {
    const g = new Proxy({
      createRadialGradient(...args) {
        check(args.length === 6 && args.every(Number.isFinite), 'All real lighting gradient arguments are finite');
        check(args[2] >= 0 && args[5] > 0, 'Lighting gradient radii are valid');
        trace.gradients++; return { addColorStop: noop };
      },
    }, { get: (o, k) => k in o ? o[k] : noop });
    return { width: 300, height: 150, style: {}, addEventListener: noop, getContext: () => g };
  }
  const cv = canvas(), touch = {};
  cv.getBoundingClientRect = () => {
    trace.rectReads++;
    if (!(Number.isFinite(device.w) && device.w > 0 && Number.isFinite(device.h) && device.h > 0)) return { top: 0, left: 0, width: 0, height: 0 };
    const width = parseFloat(cv.style.width), height = parseFloat(cv.style.height);
    return { left: (device.w - width) / 2, top: (device.h - height) / 2, width, height };
  };
  const context = vm.createContext({
    window: { get innerWidth() { return device.w; }, get innerHeight() { return device.h; }, get devicePixelRatio() { return device.dpr; }, addEventListener: noop },
    document: { querySelector: s => s === '#game' ? cv : touch, createElement: canvas, addEventListener: noop },
    matchMedia: () => ({ matches: device.coarse }), getComputedStyle: () => ({ height: device.deck + 'px' }),
    Audio: { unlock: noop }, trace,
  });
  for (const name of ['00_core.js', '30_world.js']) vm.runInContext(fs.readFileSync(path.join(root, 'source/src', name), 'utf8'), context, { filename: name });
  vm.runInContext('resizeHooks.push(()=>trace.hooks++); globalThis.api={resize,worldViewHeight,get state(){return {VW,VH,SCALE,PORTRAIT}}};', context);
  function resize(next) {
    Object.assign(device, next);
    const before = trace.hooks, previousGradient = trace.gradients;
    context.api.resize();
    check(trace.hooks === before + 1, 'Resize hooks run even at startup with an invalid viewport');
    check(trace.gradients === previousGradient + 1, 'The real world lighting hook was initialized');
    const state = context.api.state;
    check([state.VW, state.VH, state.SCALE, cv.width, cv.height, parseFloat(cv.style.width), parseFloat(cv.style.height), context.api.worldViewHeight()].every(n => Number.isFinite(n) && n > 0), 'Canvas, scale, CSS and camera dimensions stay finite and positive');
    return state;
  }
  return { resize, trace, api: context.api };
}

// Values captured from the unmodified sizing algorithm before this fix.
const normalCases = [
  [1280, 720, 1, false, 600, 340, 2, false],
  [1920, 1080, 2, false, 480, 270, 4, false],
  [390, 844, 3, true, 292, 633, 4 / 3, true],
  [844, 390, 3, true, 600, 292, 4 / 3, false],
  [320, 568, 2, true, 320, 568, 1, true],
  [600, 1000, 1, false, 600, 340, 1, false],
  [800, 600, 1.25, false, 500, 340, 1.6, false],
];
for (const [w, h, dpr, coarse, VW, VH, SCALE, PORTRAIT] of normalCases) {
  const harn = harness();
  same(harn.resize({ w, h, dpr, coarse }), { VW, VH, SCALE, PORTRAIT }, 'Normal viewport sizing remains unchanged');
}
const invalidSizes = [[0, 0], [0, 844], [390, 0], [-1, 720], [1280, -1], [NaN, 720], [1280, NaN], [Infinity, 720], [1280, Infinity]];
for (const coarse of [false, true]) for (const [w, h] of invalidSizes) {
  const harn = harness();
  same(harn.resize({ w, h, coarse, dpr: NaN }), { VW: 480, VH: 270, SCALE: 1, PORTRAIT: false }, 'Invalid initial viewport uses the safe 480x270 canvas');
}
const transition = harness();
const desktop = transition.resize({ w: 1280, h: 720, dpr: 1 });
for (const [w, h] of invalidSizes) same(transition.resize({ w, h, dpr: Infinity }), desktop, 'Invalid sizes retain the last desktop viewport');
const portrait = transition.resize({ w: 390, h: 844, dpr: 3, coarse: true, deck: 255.52 });
check(portrait.PORTRAIT, 'A background-started page can recover to touch portrait');
const safeHeight = transition.api.worldViewHeight(), rectReads = transition.trace.rectReads;
check(safeHeight < portrait.VH, 'Portrait camera reserves the actual touch deck');
same(transition.resize({ w: 0, h: 0, dpr: 0, coarse: false }), portrait, 'Background zero size retains orientation and scale');
same(transition.api.worldViewHeight(), safeHeight, 'Background zero-size DOM cannot erase the previous safe camera height');
same(transition.trace.rectReads, rectReads, 'No hidden-page DOM geometry is used for invalid viewport sizes');
const landscape = transition.resize({ w: 844, h: 390, dpr: 3, coarse: true, deck: 0 });
check(!landscape.PORTRAIT, 'Valid landscape recovers normally');
same(transition.resize({ w: 390, h: 844, dpr: NaN, coarse: true, deck: 255.52 }), portrait, 'Invalid DPR reuses the last valid DPR during portrait recovery');

for (const dpr of [undefined, 0, -1, NaN, Infinity, -Infinity, 1e308]) {
  const harn = harness();
  same(harn.resize({ w: 1280, h: 720, dpr }), desktop, 'Invalid or overflowing DPR uses a finite ratio');
}
const report = { passed: true, assertions, normalSizingCases: normalCases.length, invalidInitialCases: invalidSizes.length * 2, transitions: ['desktop → invalid sizes → touch portrait', 'portrait → zero-size background → landscape → portrait'], invalidDprCases: 7, realLightingHook: true, scope: 'Actual 00_core resize and 30_world lighting hook; Canvas rejects non-finite gradient parameters. Browser validation remains separate.' };
const arg = process.argv.indexOf('--output');
if (arg >= 0) { const file = path.resolve(root, process.argv[arg + 1]); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2));
