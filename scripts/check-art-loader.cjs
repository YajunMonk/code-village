#!/usr/bin/env node
'use strict';
// Drive the real art loader with controllable Image events and a virtual timeout clock.
// No browser, network, localStorage or generated artifacts are touched unless --output is used.
// Run: node scripts/check-art-loader.cjs [--output artifacts/qa/art-loader-check.json]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'source/src/55_journal.js'), 'utf8');
const boundary = source.indexOf('const reducedMotion');
assert.ok(boundary > 0, 'Loader section boundary exists');
const loaderSource = source.slice(0, boundary);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source/assets/manifest.json'), 'utf8'));
const report = { passed: false, scenarios: [], checks: 0, failures: [] };
const check = (ok, message) => { report.checks++; assert.ok(ok, message); };
function fixture(omit = []) {
  const assets = Object.fromEntries(Object.keys(manifest).filter(key => !omit.includes(key)).map(key => [key, 'fixture://art/' + key]));
  const requests = [], timers = new Map(), links = []; let timerId = 0;
  class FakeImage {
    constructor() { this.width = 1448; this.height = 1086; }
    set src(value) { this._src = value; const key = Object.keys(assets).find(k => assets[k] === value); requests.push({ image: this, key, value, settled: false }); }
    get src() { return this._src; }
  }
  const context = vm.createContext({
    ASSET_DATA: assets, Image: FakeImage,
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    document: { createElement: () => ({}), querySelector: selector => links.find(link => selector === `link[rel="${link.rel}"]`) || null, head: { appendChild: link => links.push(link) } },
  });
  vm.runInContext(loaderSource, context, { filename: '55_journal-art-loader.js' });
  const api = vm.runInContext('({loadArt,ensureStoryArt,loadStoryArt,art:ART,status:ART_STATUS,critical:[...FIRST_ART]})', context);
  return {
    ...api, assets, requests, links, timers,
    async flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); },
    requestsFor(key) { return requests.filter(r => r.key === key); },
    settle(key, ok = true) { const r = requests.find(r => r.key === key && !r.settled); assert.ok(r, 'Expected an outstanding request for ' + key); r.settled = true; (ok ? r.image.onload : r.image.onerror)(); return r.image; },
    settleOutstanding(ok = true) { for (const r of requests.filter(r => !r.settled)) { r.settled = true; (ok ? r.image.onload : r.image.onerror)(); } },
    expire() { const waiting = [...timers.values()]; timers.clear(); for (const timer of waiting) timer.fn(); },
  };
}
function watch(promise) { const state = { settled: false, value: undefined }; promise.then(value => { state.value = value; state.settled = true; }, error => { state.error = error; }); return state; }
async function scenario(name, fn) {
  let watchdog;
  try {
    await Promise.race([fn(), new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('Test did not settle within 2 seconds')), 2000); })]);
    report.scenarios.push({ name, passed: true });
  } catch (error) { report.scenarios.push({ name, passed: false }); report.failures.push(name + ': ' + error.message); }
  finally { clearTimeout(watchdog); }
}
async function main() {
  await scenario('critical-first; background failure or pending image does not delay startup', async () => {
    const h = fixture(), startup = watch(h.loadStoryArt());
    check(h.critical.includes('title-keyart') && h.critical.includes('comic-arrival'), 'Title and arrival are critical assets');
    const background = Object.keys(h.assets).filter(k => !h.critical.includes(k));
    check(background.length > 1, 'Fixture has noncritical images to defer');
    check(h.requests.length === h.critical.length && h.requests.every(r => h.critical.includes(r.key)), 'Only critical images start before the first screen is ready');
    for (const key of h.critical.slice(0, -1)) h.settle(key);
    await h.flush();
    check(!startup.settled && !h.status.ready, 'Startup waits for the last critical image');
    check(h.requests.every(r => h.critical.includes(r.key)), 'Background requests do not steal the critical phase');
    h.settle(h.critical.at(-1)); await h.flush();
    check(startup.settled && h.status.ready, 'Startup resolves after critical images, even with pending background work');
    check(background.every(key => h.requestsFor(key).length === 1), 'Every background image starts after the critical phase');
    h.settle(background[0], false); await h.flush();
    check(h.status.ready && startup.settled, 'A noncritical failure cannot reverse startup readiness');
    check(h.status.errors.includes(background[0]) && !h.art[background[0]], 'Background failure is recorded and not cached');
    h.settleOutstanding(); await h.flush();
    check(h.timers.size === 0, 'Completed requests clear their watchdogs');
  });
  await scenario('concurrent callers share work; duplicate keys and loaded cache are reused', async () => {
    const h = fixture(), key = 'portraits-town';
    const one = h.loadArt(key), two = h.loadArt(key), batch = h.ensureStoryArt([key, key]);
    check(h.requestsFor(key).length === 1, 'Two direct callers and one batch cause one image load');
    const image = h.settle(key);
    check((await Promise.all([one, two, batch])).every(Boolean), 'All concurrent callers receive success');
    check(h.art[key] === image && h.status.loaded === 1, 'One decoded image is cached once');
    check(await h.loadArt(key), 'Cached image succeeds immediately');
    check(await h.ensureStoryArt([key, key]), 'Cached duplicate batch succeeds');
    check(h.requestsFor(key).length === 1 && h.art[key] === image, 'Cache reuse does not allocate or replace an image');
  });
  await scenario('failure settles every waiter; a later call retries and clears the error', async () => {
    const h = fixture(), key = 'room-library', one = h.loadArt(key), two = h.loadArt(key);
    h.settle(key, false);
    check((await Promise.all([one, two])).every(v => v === false), 'Failure reaches every concurrent waiter');
    check(!h.art[key] && h.status.errors.includes(key), 'Failed image is not treated as a cached success');
    const retry = h.loadArt(key);
    check(h.requestsFor(key).length === 2, 'Next caller starts a new request after failure');
    const recovered = h.settle(key);
    check(await retry, 'Retry can succeed');
    check(h.art[key] === recovered && !h.status.errors.includes(key), 'Success replaces failure state with the recovered image');
  });
  await scenario('timeout releases waiters; late events cannot overwrite a successful retry', async () => {
    const h = fixture(), key = 'room-workshop', initial = h.loadArt(key), stale = h.requestsFor(key)[0].image;
    check(h.timers.size > 0, 'A hanging image has a timeout'); h.expire();
    check(await initial === false, 'A hanging image eventually reports failure');
    check(!h.art[key], 'Timed-out request is not cached');
    // Mark the expired network request as no longer selectable by the fake event dispatcher.
    h.requestsFor(key)[0].settled = true;
    const retry = h.loadArt(key), good = h.settle(key); check(await retry, 'Retry works after timeout');
    stale.onload(); stale.onerror(); await h.flush();
    check(h.art[key] === good && !h.status.errors.includes(key), 'Late success/error from the expired request is ignored');
    check(h.status.loaded === 1, 'Late events do not inflate the loaded count');
  });
  await scenario('critical failure is reported; retry reuses already-loaded critical images', async () => {
    const h = fixture(), failed = h.critical[0], first = watch(h.loadStoryArt());
    for (const key of h.critical) h.settle(key, key !== failed);
    await h.flush(); check(first.settled && !h.status.ready, 'Failed critical set does not claim to be ready');
    const second = watch(h.loadStoryArt());
    check(h.requestsFor(failed).length === 2, 'Startup retry reloads the failed critical image');
    check(h.critical.filter(k => k !== failed).every(k => h.requestsFor(k).length === 1), 'Successful critical images are reused during retry');
    h.settle(failed); await h.flush();
    check(second.settled && h.status.ready, 'Recovered critical set becomes ready');
    check(h.requests.filter(r => !h.critical.includes(r.key)).every(r => h.requestsFor(r.key).length === 1), 'Background loads also remain deduplicated during startup retry');
    h.settleOutstanding(); await h.flush();
  });
  await scenario('missing asset returns false; mixed batch reports incomplete readiness', async () => {
    const h = fixture();
    check(await h.loadArt('__missing__') === false, 'Missing resource reports false');
    check(h.requests.length === 0, 'Missing resource does not create a bogus Image request');
    const batch = h.ensureStoryArt(['village-keyart', '__missing__', 'village-keyart']);
    check(h.requests.length === 1, 'Known duplicate in a mixed batch still starts once');
    h.settle('village-keyart'); check(await batch === false, 'One missing image makes the batch incomplete');
  });
  await scenario('absent critical manifest key cannot silently count as ready', async () => {
    const h = fixture(['title-keyart']), startup = watch(h.loadStoryArt());
    h.settleOutstanding(); await h.flush();
    check(startup.settled, 'Missing critical configuration settles without hanging');
    check(h.status.ready === false, 'Missing title art must not be removed from the required startup set');
    h.settleOutstanding(); await h.flush();
  });
  report.passed = report.failures.length === 0;
  report.sourceSha256 = { '55_journal.js': crypto.createHash('sha256').update(source).digest('hex') };
  report.limitation = 'Controllable Image events test observable ordering, completion, reuse and recovery. This does not validate real HTTP/CORS/cache headers, browser decoding, memory pressure, or image appearance.';
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex >= 0) { const out = path.resolve(root, process.argv[outputIndex + 1]); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); }
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
