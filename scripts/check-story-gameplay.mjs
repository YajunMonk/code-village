#!/usr/bin/env node
// Deterministic checks for story routes, exercise outcomes and narrow-screen layouts.
// Runs the real story/screen code with I/O stubbed; does not edit browser saves or index.html.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const recorded = { screens: [], talks: [], chapters: [], terms: [], closed: [] };
const noop = () => {};
const gfx = new Proxy({
  measureText: s => ({ width: [...s].reduce((n, c) => n + (c.codePointAt(0) > 127 ? 12 : 6), 0) }),
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
}, { get: (o, k) => k in o ? o[k] : noop });
const input = { value: '', style: {}, addEventListener: noop, removeEventListener: noop, focus: noop, blur: noop };
const ctx = vm.createContext({
  console, setTimeout: fn => { fn(); return 0; }, clearTimeout: noop,
  VW: 480, VH: 270, PORTRAIT: false, TOUCH: false, cv: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 480 }) },
  $: () => input, makeCanvas: (w, h) => [{ width: w, height: h }, gfx],
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)), shuffle: a => a.reverse(), rand: () => .5,
  easeOut: n => n, mix: a => a, rgba: c => c, wait: async () => {},
  Audio: { sfx: noop, play: noop }, Input: { device: 'keyboard', pointer: {}, hit: () => false },
  parts: [], burst: noop, cached: (_, fn) => fn(), makeHeart: () => ({}), bossFrame: () => ({}),
  xaFrame: () => ({}), ICON: {}, PROP: {}, xa: {},
  G: { wrong: 0, done: 0, ach: [], terms: [], hats: [] }, unlock: noop, save: noop,
  recorded, mockTalk: async lines => { recorded.talks.push(...lines); },
  npcs: [{ kind: 'xaNpc', x: 1, y: 1 }], walls: [], NZ: 27, curZone: 0,
  zoneMusic: () => 'village', doorOpen: false, endingSequence: async () => {},
  giveTerms: async ids => { recorded.terms.push(...ids); },
});
const source = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
vm.runInContext(source('37_reactions.js'), ctx);
vm.runInContext(source('40_ui.js').replace(/^const talk = .*$/m, 'const talk = mockTalk;'), ctx);
vm.runInContext('drawPortrait = () => {}; openScreen = async s => { recorded.screens.push(s); return true; }; closeScreen = (s, v) => recorded.closed.push({ s, v });', ctx);
for (const name of ['51_puzzles.js', '52_games.js', '60_story.js']) vm.runInContext(source(name), ctx, { filename: name });
vm.runInContext(`
complete = async i => { recorded.chapters.push(i); G.done = i + 1; };
bossFight = async (cfg, pre, post) => { await talk(pre); await openScreen(new BattleScreen(cfg)); await talk(post); };
globalThis.testAPI = { CH, TERMS, HIDDEN, ACH, ARCH, WHO, AGENT_DESK, HalluScreen, AgentDeskScreen, BattleScreen, TerminalScreen };
`, ctx);
const a = ctx.testAPI;
assert.equal(a.CH.length, 27, 'The 27-area main route must remain intact');
for (let i = 0; i < a.CH.length; i++) await a.CH[i]();
assert.deepEqual(recorded.chapters, Array.from({ length: 27 }, (_, i) => i));
for (const id of recorded.terms) assert(a.TERMS.some(t => t.id === id) || a.HIDDEN.some(t => t.id === id), `Unknown term: ${id}`);
for (const line of recorded.talks) if (Array.isArray(line)) assert(a.WHO[line[0]], `Unknown speaker: ${line[0]}`);

for (const s of recorded.screens) {
  if (s.o?.options) assert.equal(s.o.options.filter(o => o.ok).length, 1, `Quiz needs one answer: ${s.o.q}`);
  if (s.cfg?.rounds) for (const r of s.cfg.rounds) {
    if (r.o) assert(r.o.length >= 2 && r.why, 'Rush round needs choices and feedback');
    if (r.choices) assert.equal(r.choices.filter(c => c.ok).length, 1, 'Agent desk needs one authorized outcome');
  }
  if (s.cfg?.qs) for (const q of s.cfg.qs) assert(q.o.length === 3 && q.why, 'Boss questions need three choices and feedback');
}

// Wrong answers stay on the current case; supported / contradicted / unverified are distinct.
const halluCfg = recorded.screens.find(s => s instanceof a.HalluScreen).cfg;
assert.deepEqual([...new Set(halluCfg.claims.map(c => c.verdict))].sort(), ['contradicted', 'supported', 'unverified']);
const hallu = new a.HalluScreen(halluCfg);
await hallu.submit(hallu.btns.find(b => b.verdict !== hallu.verdict(halluCfg.claims[0])));
assert.equal(hallu.i, 0);
assert.equal(hallu.fails, 1);
for (const claim of halluCfg.claims) await hallu.submit(hallu.btns.find(b => b.verdict === hallu.verdict(claim)));
assert.equal(hallu.i, halluCfg.claims.length);
assert.equal(recorded.closed.at(-1).v, false, 'Retry must not earn first-try achievement');

// Every unauthorized action gives a consequence and retries the same stage.
for (let i = 0; i < a.AGENT_DESK.rounds.length; i++) {
  for (const choice of a.AGENT_DESK.rounds[i].choices.filter(c => !c.ok)) {
    const desk = new a.AgentDeskScreen(a.AGENT_DESK); desk.i = i; desk.mk();
    desk.choose(desk.btns.find(b => b.choice === choice));
    assert(desk.feedback.receipt && desk.feedback.why);
    desk.btns[0].onPress();
    assert.equal(desk.i, i);
    assert.equal(desk.receipts.length, 0);
  }
}
const desk = new a.AgentDeskScreen(a.AGENT_DESK);
for (const round of a.AGENT_DESK.rounds) { desk.choose(desk.btns.find(b => b.choice.ok)); desk.btns[0].onPress(); }
assert.equal(desk.receipts.length, 3);
assert.equal(recorded.closed.at(-1).v, true);

// Verify interactive controls stay within the logical canvas at supported minimum sizes.
let layoutChecks = 0;
const layouts = [[480, 270, false], [420, 250, false], [270, 480, true], [260, 400, true]];
const checkButtons = (s, label) => {
  s.draw(gfx);
  for (const b of s.btns) {
    assert(b.x >= 0 && b.y >= 0 && b.x + b.w <= ctx.VW + 1 && b.y + b.h <= ctx.VH + 1,
      `${label}: control out of bounds at ${ctx.VW}x${ctx.VH}: ${b.label} (${b.x},${b.y},${b.w},${b.h})`);
  }
  layoutChecks++;
};
for (const [w, h, portrait] of layouts) {
  ctx.VW = w; ctx.VH = h; ctx.PORTRAIT = portrait;
  const hs = new a.HalluScreen(halluCfg);
  for (let i = 0; i < halluCfg.claims.length; i++) { hs.i = i; hs.mk(); checkButtons(hs, 'Evidence desk'); }
  for (let i = 0; i < a.AGENT_DESK.rounds.length; i++) {
    const ds = new a.AgentDeskScreen(a.AGENT_DESK); ds.i = i; ds.mk(); checkButtons(ds, 'Agent desk');
    for (const choice of a.AGENT_DESK.rounds[i].choices) { ds.mk(); ds.choose(ds.btns.find(b => b.choice === choice)); checkButtons(ds, 'Agent feedback'); }
  }
  for (const bs of recorded.screens.filter(s => s instanceof a.BattleScreen)) {
    bs.intro = 0;
    for (const q of bs.cfg.qs) {
      bs.pool = [q]; bs.qi = 0; bs.ask(); checkButtons(bs, 'Battle choices');
      bs.answer(bs.btns.find(b => !b.ok)); checkButtons(bs, 'Battle feedback');
    }
  }
}
const terminal = new a.TerminalScreen();
input.value = 'git status'; await terminal.submit(); assert.equal(terminal.doneT, -1);
input.value = 'GIT PUSH'; await terminal.submit(); assert.equal(terminal.doneT, -1);
input.value = 'git push'; await terminal.submit(); assert.equal(terminal.doneT, 0);
assert(terminal.out.some(l => l.s.includes('实际') || l.s.includes('验证试单')));
console.log(`PASS: 27 story areas, ${recorded.screens.length} exercises, all speakers/terms, three-state evidence, permission retries, ${layoutChecks} responsive layouts, simulated terminal.`);
