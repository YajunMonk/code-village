#!/usr/bin/env node
'use strict';
// UI lifecycle and file-reader races run in isolation; no real browser/save is opened.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const noop = () => {};
const plain = value => JSON.parse(JSON.stringify(value));
let assertions = 0;
const cases = [];
function check(value, label) { assertions++; assert.ok(value, label); }
function equal(actual, expected, label) { assertions++; assert.deepEqual(plain(actual), plain(expected), label); }
let document;
class Element {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.listeners = {}; this.attrs = new Map(); this.children = []; this.hidden = false; this.disabled = false; this.inert = false; this.isConnected = true; this.dataset = {}; this.textContent = ''; this.classList = { toggle: noop }; }
  set innerHTML(html) {
    this._html = html; this.parts = []; this.panel = new Element('section'); this.panel.parent = this;
    for (const match of html.matchAll(/<(button|input|p|section|h2)\b[^>]*\bdata-save="([^"]+)"[^>]*>/g)) {
      const el = new Element(match[1]); el.dataset.save = match[2]; el.hidden = /\bhidden\b/.test(match[0]); el.parent = this; this.parts.push(el);
    }
    const preview = this.parts.find(el => el.dataset.save === 'preview');
    for (const el of this.parts) if (['preview-heading', 'filename', 'preview-chapter', 'preview-progress', 'preview-date', 'confirm-copy', 'confirm', 'cancel'].includes(el.dataset.save)) el.parent = preview;
  }
  get innerHTML() { return this._html || ''; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  fire(type, event = {}) { for (const listener of this.listeners[type] || []) listener(event); }
  click() { this.fire('click'); }
  focus() { document.activeElement = this; }
  scrollIntoView() { this.scrolled = true; }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  setAttribute(key, value) { this.attrs.set(key, value); }
  removeAttribute(key) { this.attrs.delete(key); }
  appendChild(el) { el.parent = this; this.children.push(el); return el; }
  remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(el => el !== this); }
  contains(el) { while (el) { if (el === this) return true; el = el.parent; } return false; }
  closest(selector) { if (selector === '[hidden]') { let el = this; while (el) { if (el.hidden) return el; el = el.parent; } } return null; }
  querySelector(selector) { return selector === '.save-panel' ? this.panel : null; }
  querySelectorAll(selector) { return selector === '[data-save]' ? this.parts : this.parts.filter(el => el.tagName === 'BUTTON' && !el.disabled); }
}
const cv = new Element('canvas'), touch = new Element(), tin = new Element('input');
document = { activeElement: cv, body: new Element('body'), createElement: tag => new Element(tag), getElementById: id => id === 'tin' ? tin : null };
const initial = { done: 3, terms: ['program'], t: 300, savedAt: 1792128200000, px: 1200, py: 238 };
let stored, recovery, imports, downloads, saveCalls, saveResult, destinations;
const location = { pathname: '/', assign: value => destinations.push(value) };
const summary = s => ({ done: s.done, chapter: `章节 ${s.done}`, terms: s.terms.length, seconds: s.t, savedAt: s.savedAt });
const transfer = {
  MAX_BYTES: 131072,
  currentSummary: () => summary(stored),
  recovery: () => recovery ? { state: plain(recovery), summary: summary(recovery), createdAt: '2026-10-16T08:00:00.000Z' } : null,
  parse: text => { let state; try { state = JSON.parse(text); } catch (error) { const e = new Error('无法读取这个存档。'); e.code = 'INVALID_JSON'; throw e; } return { state, summary: summary(state), legacy: false }; },
  import: state => { imports++; recovery = plain(stored); stored = plain(state); return { state: plain(state), summary: summary(state) }; },
  restore: () => { stored = plain(recovery); return { state: plain(recovery), summary: summary(recovery) }; },
  exportCurrent: () => ({ text: JSON.stringify(stored), filename: '代码物语-存档.json' }),
};
const context = vm.createContext({
  console, document, location, navigator: {}, File: class File {}, Blob, URL: { createObjectURL: () => { downloads++; return 'blob:qa'; }, revokeObjectURL: noop }, setTimeout: noop,
  cv, Audio: { music: true, effects: true, unlock: noop, sfx: noop, play: noop, setMusic(v) { this.music = v; }, setSfx(v) { this.effects = v; } },
  Input: { reset: noop }, SaveTransfer: transfer, UIC: { mint: '#fff' }, save: important => { saveCalls.push(important); if (saveResult) stored = { ...plain(api.G), px: api.player.x, py: api.player.y }; return saveResult; }, toast: noop,
  loadSave: () => plain(stored), freshState: () => plain(initial), fadeTo: async () => {}, MAPH: 500, VH: 300,
});
const screenSource = read('40_ui.js');
vm.runInContext(`class Screen { constructor() { this.t = 0; } dimBg() {} }
let scene = 'world', touchBox = globalThis.qaTouch, G = {}, player = {x:0,y:0}, curZone = 0, curRegion = 0, doorOpen = false, cam = {y:0};`, Object.assign(context, { qaTouch: touch }));
vm.runInContext(screenSource.slice(screenSource.indexOf('const screens = [];'), screenSource.indexOf('class Screen {')), context);
const ui = read('50_screens.js');
vm.runInContext(ui.slice(ui.indexOf('class SaveScreen extends Screen'), ui.indexOf('class ConfirmScreen extends Screen')), context);
const main = read('70_main.js');
vm.runInContext('class TitleScreen extends Screen {}\n' + main.slice(main.indexOf('async function goTitle()'), main.indexOf('function enterWorld(')), context);
vm.runInContext(`globalThis.api = { SaveScreen, Screen, screens, openScreen, closeScreen, get G(){return G}, get scene(){return scene}, player,
  reset(state) { for(const s of [...screens].reverse()) closeScreen(s); G=state; scene='world'; player.x=state.px;player.y=state.py; },
  setScene(value) { scene=value; },
};`, context);
const api = context.api;
const next = { ...initial, done: 8, t: 900, px: 3200, py: 240 };
const file = (state = next, name = '旅途.json') => ({ size: 300, name, text: async () => JSON.stringify(state) });
function reset() { stored = plain(initial); recovery = null; imports = 0; downloads = 0; saveCalls = []; saveResult = true; destinations = []; location.pathname = '/'; api.reset(plain(initial)); document.activeElement = cv; }
function open() { const screen = new api.SaveScreen(); const result = api.openScreen(screen); return { screen, result }; }
async function run(name, fn) { reset(); await fn(); cases.push(name); }
function key(name, shiftKey = false) { return { key: name, shiftKey, stopped: false, prevented: false, stopPropagation() { this.stopped = true; }, preventDefault() { this.prevented = true; } }; }

(async () => {
  await run('DOM focus, keyboard activation and close cleanup', async () => {
    const { screen, result } = open(); check(cv.inert && touch.inert && tin.inert); equal(document.activeElement.tagName, 'SECTION');
    const enter = key('Enter'); screen.root.fire('keydown', enter); check(enter.stopped && !enter.prevented, 'Native button activation remains available');
    const space = key(' '); screen.root.fire('keydown', space); check(space.stopped && !space.prevented);
    screen.nodes.back.focus(); const tab = key('Tab'); screen.root.fire('keydown', tab); check(tab.prevented); check(document.activeElement === screen.nodes.close);
    const reverse = key('Tab', true); screen.root.fire('keydown', reverse); check(reverse.prevented); check(document.activeElement === screen.nodes.back);
    screen.root.fire('keydown', key('Escape')); await result; check(!screen.active && !screen.root.isConnected); check(!cv.inert && !touch.inert && !tin.inert); check(document.activeElement === cv);
  });
  await run('preview and cancel never commit, filenames remain text', async () => {
    const { screen } = open(); await screen.readFile(file(next, '<img src=x onerror=alert(1)>.json'));
    check(screen.pending.kind === 'import'); check(!screen.nodes.preview.hidden); equal(stored, initial); equal(imports, 0);
    equal(screen.nodes.filename.textContent, '<img src=x onerror=alert(1)>.json'); equal(screen.nodes.filename.innerHTML, '');
    screen.nodes.cancel.click(); check(!screen.pending && screen.nodes.preview.hidden); equal(stored, initial); equal(imports, 0);
  });
  await run('closing during file read ignores late completion', async () => {
    const { screen, result } = open(); let resolve; const reading = screen.readFile({ size: 200, name: 'pending.json', text: () => new Promise(r => { resolve = r; }) });
    screen.nodes.close.click(); await result; resolve(JSON.stringify(next)); await reading;
    check(!screen.active && !screen.pending); equal(imports, 0); equal(stored, initial);
  });
  await run('latest file selection wins when earlier read resolves last', async () => {
    const { screen } = open(); let resolve; const earlier = screen.readFile({ size: 200, name: 'earlier.json', text: () => new Promise(r => { resolve = r; }) });
    await screen.readFile(file(next, 'latest.json')); resolve(JSON.stringify(initial)); await earlier;
    equal(screen.pending.state, next); equal(screen.nodes.filename.textContent, 'latest.json'); equal(imports, 0);
  });
  await run('oversized and unreadable files preserve current progress', async () => {
    const { screen } = open(); let read = false;
    await screen.readFile({ size: 131073, text() { read = true; return Promise.resolve('{}'); } }); check(!read); check(screen.nodes.status.textContent.includes('128 KB'));
    await screen.readFile({ size: 10, name: 'broken.json', text: async () => '{' }); check(!screen.pending); check(screen.nodes.status.textContent.includes('无法读取'));
    equal(stored, initial); equal(imports, 0);
  });
  await run('download runs synchronously from DOM click without writing progress', async () => {
    const { screen } = open(); screen.nodes.export.click(); equal(downloads, 1); equal(imports, 0); equal(stored, initial); check(screen.nodes.status.textContent.includes('已发起下载'));
  });
  await run('commit adopts imported state and resolves all old screens before title', async () => {
    const parent = new api.Screen(); const parentResult = api.openScreen(parent); const { screen, result } = open(); await screen.readFile(file()); screen.nodes.confirm.click();
    await Promise.all([result, parentResult]); equal(api.G, next); equal(stored, next); equal(api.player.x, next.px); equal(api.player.y, next.py);
    equal(api.scene, 'title'); equal(api.screens.length, 1); equal(api.screens[0].constructor.name, 'TitleScreen'); check(!screen.active); equal(imports, 1);
  });
  await run('recovery requires separate confirmation and adopts restored state', async () => {
    recovery = plain(initial); stored = plain(next); const { screen, result } = open(); screen.nodes.recovery.click();
    equal(screen.pending.kind, 'restore'); equal(stored, next); screen.nodes.confirm.click(); await result;
    equal(api.G, initial); equal(stored, initial); equal(api.scene, 'title'); equal(recovery, initial);
  });
  await run('lake return appears only at the official game subpath', async () => {
    for (const pathname of ['/', '/index.html', '/other/game/', '/game/extra', '/game/', '/game/index.html']) {
      location.pathname = pathname; const { screen } = open();
      equal(screen.nodes.home.hidden, !['/game/', '/game/index.html'].includes(pathname), pathname);
      if (screen.nodes.home.hidden) { screen.nodes.home.click(); equal(destinations, []); equal(saveCalls, []); }
      api.closeScreen(screen);
    }
  });
  await run('lake return saves latest world state before same-origin navigation', async () => {
    location.pathname = '/game/'; const { screen } = open(); api.player.x += 48; api.G.t += 17;
    screen.nodes.home.click(); equal(saveCalls, [true]); equal(stored.px, initial.px + 48); equal(stored.t, initial.t + 17); equal(destinations, ['/']);
  });
  await run('failed saving blocks lake return and keeps export available', async () => {
    location.pathname = '/game/index.html'; saveResult = false; const { screen } = open(); screen.nodes.home.click();
    equal(saveCalls, [true]); equal(destinations, []); equal(stored, initial); check(screen.active && screen.root.isConnected);
    check(screen.nodes.status.textContent.includes('保存失败')); check(screen.nodes.status.scrolled); check(!screen.nodes.export.disabled);
    screen.nodes.export.click(); equal(downloads, 1); equal(destinations, []);
    saveResult = true; screen.nodes.home.click(); equal(destinations, ['/']);
  });
  await run('title return preserves existing save and closed panel cannot navigate', async () => {
    location.pathname = '/game/'; api.setScene('title'); const { screen } = open(); screen.nodes.home.click();
    equal(saveCalls, []); equal(stored, initial); equal(destinations, ['/']);
    api.closeScreen(screen); screen.nodes.home.click(); screen.returnToLake(); equal(destinations, ['/']);
  });
  const report = { passed: true, cases: cases.length, assertions, details: cases, boundary: 'UI lifecycle uses isolated DOM and storage doubles; native browser file activation and visual layout require browser QA.' };
  console.log(JSON.stringify(report, null, 2));
  const index = process.argv.indexOf('--report');
  if (index >= 0) { const output = path.resolve(root, process.argv[index + 1]); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); }
})().catch(error => { console.error(error); process.exitCode = 1; });
